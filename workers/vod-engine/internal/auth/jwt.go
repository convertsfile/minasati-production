package auth

import (
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/golang-jwt/jwt/v5"
)

// CompromisedSecrets is a denylist of known-leaked JWT secrets (SEC-CRIT-01).
// If the running engine is configured with any of these, it refuses to start.
var CompromisedSecrets = map[string]struct{}{
	"Makeen_Enterprise_VOD_Secret_Key_2026_!@#": {},
	"Makeen_Enterprise_VOD_Secret_Key_2026_":   {},
	"changeme":                                 {},
	"secret":                                   {},
	"test":                                     {},
	"dev":                                      {},
	"default":                                  {},
}

// MinJWTSecretLength is the minimum acceptable secret length (32 chars of high-entropy data).
const MinJWTSecretLength = 32

// ValidateJWTSecret rejects known-leaked or low-entropy secrets at boot.
// The Laravel side (backend/app/Services/InternalJwtService.php) enforces the same rules.
func ValidateJWTSecret(secret string) error {
	s := strings.TrimSpace(secret)
	if s == "" {
		return errors.New("jwt secret is not configured: generate one with `openssl rand -base64 48` and set JWT_SECRET")
	}
	if _, leaked := CompromisedSecrets[s]; leaked {
		return fmt.Errorf("jwt secret matches a known-compromised value: rotate JWT_SECRET immediately with `openssl rand -base64 48`")
	}
	if utf8.RuneCountInString(s) < MinJWTSecretLength {
		return fmt.Errorf("jwt secret too short (got %d, need >= %d characters of high-entropy data); generate with `openssl rand -base64 48`", utf8.RuneCountInString(s), MinJWTSecretLength)
	}
	// Detect trivially low-entropy secrets (e.g. "aaaa...aaaa", "1111...1111").
	seen := make(map[rune]struct{}, 64)
	for _, r := range s {
		seen[r] = struct{}{}
		if len(seen) >= 8 {
			break
		}
	}
	if len(seen) < 8 {
		return fmt.Errorf("jwt secret has insufficient entropy (only %d unique characters); generate with `openssl rand -base64 48`", len(seen))
	}
	return nil
}

// Standard claim names used by both Laravel and the VOD engine.
const (
	IssuerLaravel  = "laravel"
	AudienceEngine = "vod-engine"
	KidV1          = "v1"
	MaxIatAge      = 120 * time.Second
	ClockSkew      = 5 * time.Second
)

// Claims is the strongly-typed view of the JWT we expect from Laravel.
type Claims struct {
	Subject string `json:"sub"`
	Event   string `json:"event"`
	KID     string `json:"kid"`
	jwt.RegisteredClaims
}

// ValidateUploadToken parses + validates the JWT and returns the lecture_id (sub).
// يحل هذا محل مقارنة الـ Shared Secret القديمة.
func ValidateUploadToken(tokenString string, secret string) (string, error) {
	claims, err := VerifyInternalToken(tokenString, secret, "")
	if err != nil {
		return "", err
	}
	return claims.Subject, nil
}

// VerifyInternalToken verifies the JWT against the same rules used by Laravel's
// InternalJwtService: HS256 signature, kid=v1, iss=laravel, aud=vod-engine,
// 60-second iat window. If expectedEvent is non-empty, it must also match.
//
// On success it returns the parsed claims.
func VerifyInternalToken(tokenString string, secret string, expectedEvent string) (*Claims, error) {
	if tokenString == "" {
		return nil, errors.New("missing token")
	}
	if secret == "" {
		return nil, errors.New("jwt secret is not configured")
	}
	// Defensive runtime check (also enforced at boot via ValidateJWTSecret).
	if err := ValidateJWTSecret(secret); err != nil {
		return nil, fmt.Errorf("jwt secret rejected: %w", err)
	}

	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(IssuerLaravel),
		jwt.WithAudience(AudienceEngine),
		jwt.WithLeeway(ClockSkew),
	)

	claims := &Claims{}
	token, err := parser.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		if t.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}
	if !token.Valid {
		return nil, errors.New("token is not valid")
	}

	// iat window check (60s default, 120s leeway ceiling)
	if claims.IssuedAt == nil {
		return nil, errors.New("iat claim missing")
	}
	age := time.Since(claims.IssuedAt.Time)
	if age < -ClockSkew {
		return nil, errors.New("iat is in the future")
	}
	if age > MaxIatAge {
		return nil, fmt.Errorf("iat outside acceptable window (age=%s)", age)
	}

	if claims.KID != KidV1 {
		return nil, fmt.Errorf("unsupported kid: %q", claims.KID)
	}

	if expectedEvent != "" && claims.Event != expectedEvent {
		return nil, fmt.Errorf("unexpected event: %q (expected %q)", claims.Event, expectedEvent)
	}

	if strings.TrimSpace(claims.Subject) == "" {
		return nil, errors.New("sub claim is empty")
	}

	return claims, nil
}

// ExtractBearerToken pulls the token out of an Authorization header value.
func ExtractBearerToken(authHeader string) string {
	if authHeader == "" {
		return ""
	}
	const prefix = "Bearer "
	if len(authHeader) <= len(prefix) || !strings.EqualFold(authHeader[:len(prefix)], prefix) {
		return ""
	}
	return strings.TrimSpace(authHeader[len(prefix):])
}
