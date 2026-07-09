package handlers

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/a_ashraf_tech/vod-engine/internal/auth"
	"github.com/a_ashraf_tech/vod-engine/internal/b2"
	"github.com/a_ashraf_tech/vod-engine/internal/queue"
	"github.com/a_ashraf_tech/vod-engine/internal/worker"
)

// UploadHandler handles video processing and deletion requests from Laravel.
type UploadHandler struct {
	B2Client  *b2.Client
	JWTSecret string
	Scheduler *worker.Scheduler
}

// NewUploadHandler creates a new upload handler.
func NewUploadHandler(b2Client *b2.Client, jwtSecret string, scheduler *worker.Scheduler) *UploadHandler {
	return &UploadHandler{
		B2Client:  b2Client,
		JWTSecret: jwtSecret,
		Scheduler: scheduler,
	}
}

// isDigitsOnly checks if a string contains only digits (SEC-01).
func isDigitsOnly(s string) bool {
	if s == "" {
		return false
	}
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

// HandleProcessVideo handles POST /api/v1/video/process
// Validates the request, creates sub-jobs, enqueues them, and returns immediately.
func (h *UploadHandler) HandleProcessVideo(w http.ResponseWriter, r *http.Request) {
	// 1. JWT-based auth (HS256, iss=laravel, aud=vod-engine, kid=v1, 60s iat window)
	bearer := auth.ExtractBearerToken(r.Header.Get("Authorization"))
	if _, err := auth.VerifyInternalToken(bearer, h.JWTSecret, "video.process"); err != nil {
		slog.Warn("Unauthorized process trigger attempt", "ip", r.RemoteAddr, "err", err)
		http.Error(w, `{"error": "Unauthorized: `+err.Error()+`"}`, http.StatusForbidden)
		return
	}

	// 2. Parse request body
	var req queue.EnqueueRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid JSON payload"}`, http.StatusBadRequest)
		return
	}

	// 3. Validate
	if req.LectureID == "" {
		http.Error(w, `{"error": "lecture_id is required"}`, http.StatusBadRequest)
		return
	}
	if req.RawKey == "" {
		http.Error(w, `{"error": "raw_key is required"}`, http.StatusBadRequest)
		return
	}
	// SEC-01: Validate teacher_id if provided
	if req.TeacherID != "" && !isDigitsOnly(req.TeacherID) {
		slog.Warn("Invalid teacher_id format", "teacher_id", req.TeacherID)
		http.Error(w, `{"error": "teacher_id must be numeric"}`, http.StatusBadRequest)
		return
	}
	// SEC-02: Path traversal prevention — raw_key must start with allowed prefix
	if !strings.HasPrefix(req.RawKey, "raw/") && !strings.HasPrefix(req.RawKey, "lectures/") {
		slog.Warn("Invalid raw_key prefix", "raw_key", req.RawKey)
		http.Error(w, `{"error": "Invalid raw_key: must start with raw/ or lectures/"}`, http.StatusBadRequest)
		return
	}
	// OPS-SEC-02: Reject path traversal sequences
	if strings.Contains(req.RawKey, "..") {
		slog.Warn("Path traversal attempt blocked", "raw_key", req.RawKey, "ip", r.RemoteAddr)
		http.Error(w, `{"error": "Invalid raw_key: path traversal not allowed"}`, http.StatusBadRequest)
		return
	}
	if len(req.Qualities) == 0 {
		req.Qualities = []string{"480p"} // Default to 480p only
	}

	slog.Info("Received processing request from Laravel",
		"lecture_id", req.LectureID,
		"qualities", req.Qualities,
		"teacher_id", req.TeacherID,
	)

	// 4. Create sub-jobs with teacher_id (TEL-02)
	subJobs := queue.NewSubJobs(req, h.Scheduler.MaxRetries(), req.TeacherID)

	// 5. Enqueue
	if err := h.Scheduler.AddJob(subJobs); err != nil {
		slog.Error("Failed to enqueue job", "lecture_id", req.LectureID, "error", err)

		status := http.StatusServiceUnavailable
		if strings.Contains(err.Error(), "queue full") {
			status = http.StatusTooManyRequests
		}

		http.Error(w, `{"error": "`+err.Error()+`"}`, status)
		return
	}

	// 6. Respond immediately
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":     "accepted",
		"lecture_id": req.LectureID,
	})
}

// HandleDeleteVideo handles DELETE /api/v1/video/{lecture_id}
func (h *UploadHandler) HandleDeleteVideo(w http.ResponseWriter, r *http.Request) {
	bearer := auth.ExtractBearerToken(r.Header.Get("Authorization"))
	if _, err := auth.VerifyInternalToken(bearer, h.JWTSecret, "video.delete"); err != nil {
		slog.Warn("Unauthorized delete attempt", "ip", r.RemoteAddr, "err", err)
		http.Error(w, `{"error": "Unauthorized: `+err.Error()+`"}`, http.StatusForbidden)
		return
	}

	lectureID := r.PathValue("lecture_id")
	if lectureID == "" {
		http.Error(w, `{"error": "lecture_id is required"}`, http.StatusBadRequest)
		return
	}

	// Validate numeric
	for _, c := range lectureID {
		if c < '0' || c > '9' {
			slog.Warn("Invalid lecture ID format", "lecture_id", lectureID)
			http.Error(w, `{"error": "Invalid lecture ID"}`, http.StatusBadRequest)
			return
		}
	}

	// Delete from B2 in background
	go func() {
		rawKey := "raw/lecture_" + lectureID + ".mp4"
		streamsPrefix := "streams/lecture_" + lectureID + "/"
		ctx := context.Background()

		if err := h.B2Client.DeleteObject(ctx, rawKey); err != nil {
			slog.Error("Failed to delete raw video", "lecture_id", lectureID, "error", err)
		}
		if err := h.B2Client.DeletePrefix(ctx, streamsPrefix); err != nil {
			slog.Error("Failed to delete streams", "lecture_id", lectureID, "error", err)
		}
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": "Video deletion process started",
	})
}

// HandleRequeueVideo handles POST /api/v1/video/requeue
func (h *UploadHandler) HandleRequeueVideo(w http.ResponseWriter, r *http.Request) {
	bearer := auth.ExtractBearerToken(r.Header.Get("Authorization"))
	if _, err := auth.VerifyInternalToken(bearer, h.JWTSecret, "video.requeue"); err != nil {
		slog.Warn("Unauthorized requeue attempt", "ip", r.RemoteAddr, "err", err)
		http.Error(w, `{"error": "Unauthorized: `+err.Error()+`"}`, http.StatusForbidden)
		return
	}

	var req struct {
		LectureID string `json:"lecture_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid JSON payload"}`, http.StatusBadRequest)
		return
	}

	if req.LectureID == "" {
		http.Error(w, `{"error": "lecture_id is required"}`, http.StatusBadRequest)
		return
	}

	if err := h.Scheduler.RequeueDeadLetter(req.LectureID); err != nil {
		slog.Error("Failed to requeue dead-letter job", "lecture_id", req.LectureID, "error", err)
		http.Error(w, `{"error": "Failed to requeue job"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":     "success",
		"lecture_id": req.LectureID,
	})
}
