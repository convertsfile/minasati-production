package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func main() {
	url := "http://localhost:8080/api/v1/video/process"
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		fmt.Println("Fatal: JWT_SECRET environment variable is not set")
		return
	}

	lectures := []string{"1", "2", "3"}

	for _, id := range lectures {
		payload := map[string]interface{}{
			"lecture_id": id,
			"raw_key":    fmt.Sprintf("raw/%s.mp4", id),
			"qualities":  []string{"480p", "360p", "720p"},
		}

		body, _ := json.Marshal(payload)

		req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
		if err != nil {
			fmt.Printf("Failed to create request for lecture %s: %v\n", id, err)
			continue
		}

		req.Header.Set("Content-Type", "application/json")
		// يوقّع بـ JWT بدلاً من الـ Shared Secret القديم (متوافق مع Laravel)
		if token, err := signInternalJWT(secret, id, "video.process"); err == nil {
			req.Header.Set("Authorization", "Bearer "+token)
		} else {
			fmt.Printf("Failed to sign JWT for lecture %s: %v\n", id, err)
			continue
		}

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			fmt.Printf("Failed to send request for lecture %s: %v\n", id, err)
			continue
		}

		respBody, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		fmt.Printf("Response for lecture %s [Status %d]: %s\n", id, resp.StatusCode, string(respBody))
	}
}

// signInternalJWT يصدر JWT موقّع بـ HS256 متوافق مع InternalJwtService في Laravel.
func signInternalJWT(secret, subject, event string) (string, error) {
	now := time.Now().Unix()
	claims := jwt.MapClaims{
		"iss":   "laravel",
		"aud":   "vod-engine",
		"sub":   subject,
		"iat":   now,
		"exp":   now + 60,
		"kid":   "v1",
		"event": event,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	token.Header["kid"] = "v1"
	return token.SignedString([]byte(secret))
}
