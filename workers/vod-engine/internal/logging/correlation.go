// Package logging provides correlation IDs and structured logging helpers
// for the VOD Engine (LOG-01 through LOG-04).
package logging

import (
	"crypto/rand"
	"fmt"
	"log/slog"
)

// NewCorrelationID generates a UUIDv4 formatted string for a job group.
func NewCorrelationID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	// Set version 4
	b[6] = (b[6] & 0x0f) | 0x40
	// Set variant bits
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// LogAttrs returns base log attributes that every log line should include.
// - correlation_id (UUIDv4)
// - component (source subsystem)
// - job_id (if applicable, use "" for none)
// - lecture_id (if applicable, use "" for none)
func LogAttrs(component, jobID, lectureID, correlationID string) []slog.Attr {
	attrs := []slog.Attr{
		slog.String("component", component),
	}
	if correlationID != "" {
		attrs = append(attrs, slog.String("correlation_id", correlationID))
	}
	if jobID != "" {
		attrs = append(attrs, slog.String("job_id", jobID))
	}
	if lectureID != "" {
		attrs = append(attrs, slog.String("lecture_id", lectureID))
	}
	return attrs
}

// SeverityCritical returns an attribute marking a log line as critical.
// Use with slog.Warn/Error and add this attribute:
//
//	slog.LogAttrs(ctx, slog.LevelError, "message", logging.SeverityCritical(), ...)
func SeverityCritical() slog.Attr {
	return slog.Bool("critical", true)
}
