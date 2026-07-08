package middlewares

import (
	"net/http"
	"os"
)

// StrictCORS هو حاجز أمني يمنع المواقع الأخرى من استغلال الـ API
func StrictCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		allowedOrigin := os.Getenv("ALLOWED_ADMIN_ORIGIN")
		if allowedOrigin == "" {
			allowedOrigin = "http://localhost:3000" // النطاق الافتراضي
		}

		origin := r.Header.Get("Origin")
		if origin == allowedOrigin {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}

		// تحديد دقيق للطرق والترويسات المسموحة
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept")

		// الرد الفوري لطلبات Preflight
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}