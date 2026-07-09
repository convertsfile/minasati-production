package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// TestRoundTripWithLaravelSecret يضمن أن التوكن الموقَّع في Go
// يمكن التحقق منه بنفس القواعد التي يستخدمها Laravel (HS256, iss, aud, kid, iat window).
func TestRoundTripWithLaravelSecret(t *testing.T) {
	secret := "test-jwt-secret-32-chars-min-len-12345"

	// 1. إصدار JWT يحاكي توقيع الـ Laravel
	now := time.Now().Unix()
	claims := jwt.MapClaims{
		"iss":   IssuerLaravel,
		"aud":   AudienceEngine,
		"sub":   "42",
		"iat":   now,
		"exp":   now + 60,
		"kid":   KidV1,
		"event": "video.encoded",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	token.Header["kid"] = KidV1
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("signing failed: %v", err)
	}

	// 2. التحقق في Go
	got, err := VerifyInternalToken(tokenString, secret, "video.encoded")
	if err != nil {
		t.Fatalf("verify failed: %v", err)
	}
	if got.Subject != "42" {
		t.Errorf("expected sub=42, got %q", got.Subject)
	}
	if got.Event != "video.encoded" {
		t.Errorf("expected event=video.encoded, got %q", got.Event)
	}
}

func TestRejectsWrongEvent(t *testing.T) {
	secret := "test-jwt-secret-32-chars-min-len-12345"
	now := time.Now().Unix()
	claims := jwt.MapClaims{
		"iss":   IssuerLaravel,
		"aud":   AudienceEngine,
		"sub":   "1",
		"iat":   now,
		"exp":   now + 60,
		"kid":   KidV1,
		"event": "video.encoded",
	}
	tok, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))

	if _, err := VerifyInternalToken(tok, secret, "video.process"); err == nil {
		t.Fatal("expected error for wrong event")
	}
}

func TestRejectsExpiredIat(t *testing.T) {
	secret := "test-jwt-secret-32-chars-min-len-12345"
	now := time.Now().Unix()
	claims := jwt.MapClaims{
		"iss":   IssuerLaravel,
		"aud":   AudienceEngine,
		"sub":   "1",
		"iat":   now - 600, // 10 min ago > 120s window
		"exp":   now + 60,
		"kid":   KidV1,
		"event": "video.encoded",
	}
	tok, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))

	if _, err := VerifyInternalToken(tok, secret, ""); err == nil {
		t.Fatal("expected error for stale iat")
	}
}

func TestRejectsWrongIssuer(t *testing.T) {
	secret := "test-jwt-secret-32-chars-min-len-12345"
	now := time.Now().Unix()
	claims := jwt.MapClaims{
		"iss":   "attacker",
		"aud":   AudienceEngine,
		"sub":   "1",
		"iat":   now,
		"exp":   now + 60,
		"kid":   KidV1,
		"event": "video.encoded",
	}
	tok, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))

	if _, err := VerifyInternalToken(tok, secret, ""); err == nil {
		t.Fatal("expected error for wrong issuer")
	}
}

func TestExtractBearerToken(t *testing.T) {
	cases := []struct {
		header string
		want   string
	}{
		{"Bearer abc.def.ghi", "abc.def.ghi"},
		{"bearer abc.def.ghi", "abc.def.ghi"},
		{"Basic abc", ""},
		{"", ""},
		{"Bearer", ""},
		{"Bearer   spaced.token.here", "spaced.token.here"},
	}
	for _, c := range cases {
		got := ExtractBearerToken(c.header)
		if got != c.want {
			t.Errorf("ExtractBearerToken(%q) = %q, want %q", c.header, got, c.want)
		}
	}
}

// TestValidateJWTSecret يضمن أن المنع يمتد إلى السرود المعروفة بأنها مسرّبة
// والسرود منخفضة الإنتروبيا، تطبيقاً لـ SEC-CRIT-01.
func TestValidateJWTSecret(t *testing.T) {
	cases := []struct {
		name    string
		secret  string
		wantErr bool
	}{
		{"empty", "", true},
		{"compromised_old", "Makeen_Enterprise_VOD_Secret_Key_2026_!@#", true},
		{"compromised_trim", "  Makeen_Enterprise_VOD_Secret_Key_2026_!@#  ", true},
		{"trivial_changeme", "changeme", true},
		{"too_short", "short", true},
		{"low_entropy_repeated", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", true},
		{"low_entropy_8_uniques_but_short", "12345678", true},
		{"valid_long_random", "q437/gDqC+I5eZP2Mx+vPQccSzYmw2DiT3LwNz3xNd1Q", false},
		{"valid_with_lots_of_entropy", "9K3mP2xQ7nRv8sL4jF6hG1cZ0bN5yT2aE", false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := ValidateJWTSecret(c.secret)
			if c.wantErr && err == nil {
				t.Errorf("expected error for secret %q, got nil", c.secret)
			}
			if !c.wantErr && err != nil {
				t.Errorf("expected no error for secret %q, got %v", c.secret, err)
			}
		})
	}
}
