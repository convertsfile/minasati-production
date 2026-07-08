package circuitbreaker

import (
	"log/slog"
	"sync"
	"time"
)

// WebhookEntry represents a single buffered webhook payload.
// SEC-05: MUST NOT store credentials or secrets. Only lecture_id, status, m3u8_path.
type WebhookEntry struct {
	LectureID      string
	Status         string
	M3U8Path       string
	TotalSizeBytes int64
	Timestamp      time.Time
}

// WebhookBuffer is a bounded FIFO queue for webhooks when the API circuit is OPEN (CB-03).
type WebhookBuffer struct {
	mu      sync.Mutex
	buffer  []WebhookEntry
	maxSize int
}

// NewWebhookBuffer creates a bounded webhook buffer.
// maxSize: maximum number of entries to buffer (oldest dropped when full).
func NewWebhookBuffer(maxSize int) *WebhookBuffer {
	if maxSize < 1 {
		maxSize = 100
	}
	return &WebhookBuffer{
		buffer:  make([]WebhookEntry, 0, maxSize),
		maxSize: maxSize,
	}
}

// Push adds a webhook to the buffer. If the buffer is full, the oldest entry
// is dropped (non-blocking).
func (wb *WebhookBuffer) Push(entry WebhookEntry) {
	wb.mu.Lock()
	defer wb.mu.Unlock()

	if len(wb.buffer) >= wb.maxSize {
		// Drop the oldest entry
		dropped := wb.buffer[0]
		wb.buffer = wb.buffer[1:]
		slog.Warn("webhook.buffer_overflow",
			slog.String("lecture_id", dropped.LectureID),
			slog.Time("dropped_at", dropped.Timestamp),
			slog.Int("buffer_size", wb.maxSize),
			slog.String("message", "Oldest webhook dropped due to buffer full"),
		)
	}

	wb.buffer = append(wb.buffer, entry)
	slog.Debug("webhook.buffered",
		slog.String("lecture_id", entry.LectureID),
		slog.String("status", entry.Status),
		slog.Int("buffer_size", len(wb.buffer)),
	)
}

// Drain returns all buffered entries in FIFO order and clears the buffer.
func (wb *WebhookBuffer) Drain() []WebhookEntry {
	wb.mu.Lock()
	defer wb.mu.Unlock()

	if len(wb.buffer) == 0 {
		return nil
	}

	entries := make([]WebhookEntry, len(wb.buffer))
	copy(entries, wb.buffer)
	wb.buffer = wb.buffer[:0]
	return entries
}

// Len returns the current number of buffered webhooks.
func (wb *WebhookBuffer) Len() int {
	wb.mu.Lock()
	defer wb.mu.Unlock()
	return len(wb.buffer)
}
