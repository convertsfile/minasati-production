package metrics

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestTextfileWrite(t *testing.T) {
	// Create a temp directory for the textfile
	tmpDir := t.TempDir()
	textfilePath := filepath.Join(tmpDir, "vod_engine.prom")

	mc := NewMetricsCollector()
	populateMetrics(mc)

	tw := NewTextfileWriter(mc, textfilePath, 100*time.Millisecond)

	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()

	// Run the writer for a brief period
	done := make(chan struct{})
	go func() {
		tw.Start(ctx)
		close(done)
	}()

	// Wait for at least one write cycle
	time.Sleep(250 * time.Millisecond)
	cancel()
	<-done

	// Verify the file was created
	data, err := os.ReadFile(textfilePath)
	if err != nil {
		t.Fatalf("Failed to read textfile: %v", err)
	}

	content := string(data)
	if !strings.Contains(content, "vod_engine_active_jobs") {
		t.Errorf("expected metrics in textfile, got:\n%s", content)
	}
}

func TestTextfileWriteAtomicity(t *testing.T) {
	tmpDir := t.TempDir()
	textfilePath := filepath.Join(tmpDir, "vod_engine.prom")

	mc := NewMetricsCollector()
	populateMetrics(mc)

	tw := NewTextfileWriter(mc, textfilePath, time.Hour) // Only write once

	// Manually trigger a write
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	done := make(chan struct{})
	go func() {
		tw.Start(ctx)
		close(done)
	}()
	<-done

	// Verify the file exists and is not a .tmp file
	_, err := os.Stat(textfilePath)
	if err != nil {
		t.Errorf("expected textfile to exist: %v", err)
	}

	// Verify no .tmp files remain
	tmpFiles, _ := filepath.Glob(filepath.Join(tmpDir, "*.tmp"))
	if len(tmpFiles) > 0 {
		t.Errorf("expected no .tmp files, found: %v", tmpFiles)
	}
}

func TestTextfileWriteCustomPath(t *testing.T) {
	tmpDir := t.TempDir()
	customPath := filepath.Join(tmpDir, "custom", "metrics.prom")

	mc := NewMetricsCollector()
	populateMetrics(mc)

	tw := NewTextfileWriter(mc, customPath, time.Hour)
	if got := tw.GetPath(); got != customPath {
		t.Errorf("expected path %q, got %q", customPath, got)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	done := make(chan struct{})
	go func() {
		tw.Start(ctx)
		close(done)
	}()
	<-done

	if _, err := os.Stat(customPath); err != nil {
		t.Errorf("expected custom path file to exist: %v", err)
	}
}
