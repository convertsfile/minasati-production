package metrics

import (
	"bytes"
	"context"
	"log/slog"
	"os"
	"path/filepath"
	"time"
)

const (
	// defaultTextfileInterval is how often the textfile is written.
	defaultTextfileInterval = 30 * time.Second

	// defaultTextfilePath is the default path for the textfile collector output.
	defaultTextfilePath = "/var/lib/node_exporter/textfile/vod_engine.prom"

	// maxWriteDuration is the maximum allowed time for a textfile write (OPS-PERF-04).
	maxWriteDuration = 50 * time.Millisecond
)

// TextfileWriter periodically writes the metrics collector's current state
// to a file in Node Exporter's textfile collector directory.
type TextfileWriter struct {
	collector *MetricsCollector
	path      string
	interval  time.Duration
}

// NewTextfileWriter creates a new TextfileWriter.
// If path is empty, the default path is used.
// If interval is 0, the default interval (30s) is used.
func NewTextfileWriter(collector *MetricsCollector, path string, interval time.Duration) *TextfileWriter {
	if path == "" {
		path = defaultTextfilePath
	}
	if interval <= 0 {
		interval = defaultTextfileInterval
	}
	return &TextfileWriter{
		collector: collector,
		path:      path,
		interval:  interval,
	}
}

// Start begins the periodic textfile write loop. Blocks until context is cancelled.
func (tw *TextfileWriter) Start(ctx context.Context) {
	// Ensure parent directory exists (OPS-06)
	// Permissions 0755 ensure Node Exporter (running as node_exporter user) can read
	// the .prom files even when the directory owner is vod-engine (m-05).
	dir := filepath.Dir(tw.path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		slog.Warn("Failed to create textfile directory, textfile writer disabled",
			"dir", dir, "error", err)
		return
	}

	// Verify write access to the directory (M-03 fix)
	testFile := filepath.Join(dir, ".write_test")
	if err := os.WriteFile(testFile, []byte{}, 0644); err != nil {
		slog.Error("TEXTFILE COLLECTOR DISABLED: directory is not writable by this user. "+
			"Create the directory with correct ownership: sudo mkdir -p "+dir+
			" && sudo chown vod-engine:vod-engine "+dir,
			"dir", dir, "user", "vod-engine", "error", err,
		)
		return
	}
	os.Remove(testFile)

	ticker := time.NewTicker(tw.interval)
	defer ticker.Stop()

	// Write immediately on start
	tw.write()

	for {
		select {
		case <-ticker.C:
			tw.write()
		case <-ctx.Done():
			// Final write before exit
			tw.write()
			return
		}
	}
}

// write performs one atomic write of the metrics to the textfile.
func (tw *TextfileWriter) write() {
	start := time.Now()

	var buf bytes.Buffer
	if err := tw.collector.RenderPrometheusText(&buf); err != nil {
		slog.Warn("Failed to render metrics for textfile", "error", err)
		return
	}

	// Write to temp file and atomically rename
	tmpPath := tw.path + ".tmp"
	if err := os.WriteFile(tmpPath, buf.Bytes(), 0644); err != nil {
		slog.Warn("Failed to write textfile tmp", "path", tmpPath, "error", err)
		return
	}

	if err := os.Rename(tmpPath, tw.path); err != nil {
		slog.Warn("Failed to rename textfile", "src", tmpPath, "dst", tw.path, "error", err)
		os.Remove(tmpPath)
		return
	}

	elapsed := time.Since(start)
	if elapsed > maxWriteDuration {
		slog.Warn("Textfile write exceeded performance budget",
			"elapsed_ms", elapsed.Milliseconds(),
			"max_ms", maxWriteDuration.Milliseconds(),
		)
	}
}

// GetPath returns the configured textfile path.
func (tw *TextfileWriter) GetPath() string {
	return tw.path
}
