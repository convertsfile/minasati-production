package auth

import (
	"fmt"
	"github.com/golang-jwt/jwt/v5"
)

// ValidateUploadToken تقوم بفك تشفير التوكن القادم من Laravel والتأكد من هويته
func ValidateUploadToken(tokenString string, secret string) (string, error) {
	// 1. تحليل التوكن والتحقق من التوقيع باستخدام الـ Secret
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		// التأكد من أن خوارزمية التشفير هي HMAC (القياسية في Laravel/Sanctum غالباً)
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return "", fmt.Errorf("invalid token: %w", err)
	}

	// 2. استخراج البيانات (Claims)
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		// نفترض أن التوكن يحتوي على حقل lecture_id
		if lectureID, exists := claims["lecture_id"]; exists {
			return fmt.Sprintf("%v", lectureID), nil
		}
		return "", fmt.Errorf("lecture_id missing in token claims")
	}

	return "", fmt.Errorf("invalid token claims")
}