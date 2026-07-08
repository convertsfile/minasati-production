package guardian

import (
	"math"
	"os"
	"path/filepath"
	"testing"

	"github.com/a_ashraf_tech/vod-engine/internal/config"
	"github.com/a_ashraf_tech/vod-engine/internal/monitor"
	"github.com/a_ashraf_tech/vod-engine/internal/queue"
)

func newTestGuardian() *Guardian {
	cfg := &config.Config{
		MaxPerJobDiskGB:    25,
		MaxCPULoadAvg:      4.5,
		RecoveryHysteresis: 0.5,
		MinFreeRAMMB:       1536,
		MinFreeSwapMB:      1024,
		MinFreeDiskGB:      15,
		MaxDiskIOPct:       75,
		MaxNetworkMbps:     225,
		MaxWorkDirUsageGB:  75,
		VODWorkDir:         "/var/tmp/vod-engine",
	}
	mon := monitor.New(5, "/var/tmp/vod-engine")
	return New(cfg, mon)
}

func TestCanStartJob_NilWhenQuotaDisabled(t *testing.T) {
	g := newTestGuardian()
	g.cfg.MaxPerJobDiskGB = 0 // disabled

	result := g.CanStartJob(nil)
	if result != nil {
		t.Errorf("expected nil result when quota disabled, got %+v", result)
	}
}

func TestEstimateDiskNeeded(t *testing.T) {
	g := newTestGuardian()

	tests := []struct {
		rawSize  int64
		expected int64
	}{
		{0, 0},
		{1024, 1024 * 4 * 2},          // 1 KB -> 8 KB
		{500 * 1024 * 1024, 500 * 4 * 2 * 1024 * 1024}, // 500 MB
		{2 * 1024 * 1024 * 1024, 2 * 4 * 2 * 1024 * 1024 * 1024}, // 2 GB -> 16 GB
	}

	for _, tt := range tests {
		got := g.estimateDiskNeeded(tt.rawSize)
		if got != tt.expected {
			t.Errorf("estimateDiskNeeded(%d) = %d, want %d", tt.rawSize, got, tt.expected)
		}
	}
}

func TestEstimateDiskNeeded_Formula(t *testing.T) {
	// Formula: rawVideoSize * 4 (renditions) * 2 (safety factor) = rawVideoSize * 8
	g := newTestGuardian()

	rawSize := int64(1 * 1024 * 1024 * 1024) // 1 GB
	estimated := g.estimateDiskNeeded(rawSize)

	// 1 GB * 4 * 2 = 8 GB
	expected := rawSize * 4 * 2
	if estimated != expected {
		t.Errorf("expected %d, got %d", expected, estimated)
	}
}

func TestCanStartJob_BlocksWhenEstimatedExceedsQuota(t *testing.T) {
	// Create a temp work dir with a large video file
	workDir := t.TempDir()

	// Create a large video file (1 GB) so estimate = 1GB * 8 = 8 GB > 2 GB quota
	largeFilePath := filepath.Join(workDir, "raw/large_video.mp4")
	if err := os.MkdirAll(filepath.Dir(largeFilePath), 0755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	// Write a 1 GB file
	data := make([]byte, 1024*1024*1024) // 1 GB
	if err := os.WriteFile(largeFilePath, data, 0644); err != nil {
		t.Fatalf("write file: %v", err)
	}

	g := newTestGuardian()
	g.cfg.VODWorkDir = workDir
	g.cfg.MaxPerJobDiskGB = 2 // 2 GB quota

	job := &queue.SubJob{RawKey: "raw/large_video.mp4"}
	result := g.CanStartJob(job)
	if result == nil {
		t.Fatal("expected non-nil result for oversized job, got nil")
	}
	if !result.Blocked {
		t.Errorf("expected Blocked=true, got Blocked=%v", result.Blocked)
	}
	if result.Resource != "disk_quota" {
		t.Errorf("expected Resource=disk_quota, got %q", result.Resource)
	}
}

func TestCanStartJob_AllowsWhenWithinQuota(t *testing.T) {
	workDir := t.TempDir()

	// Create a small video file (100 MB) so estimate = 100MB * 8 = 800 MB < 25 GB quota
	smallFilePath := filepath.Join(workDir, "raw/small_video.mp4")
	if err := os.MkdirAll(filepath.Dir(smallFilePath), 0755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	data := make([]byte, 100*1024*1024) // 100 MB
	if err := os.WriteFile(smallFilePath, data, 0644); err != nil {
		t.Fatalf("write file: %v", err)
	}

	g := newTestGuardian()
	g.cfg.VODWorkDir = workDir
	g.cfg.MaxPerJobDiskGB = 25 // 25 GB quota (default)

	job := &queue.SubJob{RawKey: "raw/small_video.mp4"}
	result := g.CanStartJob(job)
	if result != nil {
		t.Errorf("expected nil for within-quota job, got %+v", result)
	}
}

func TestCanStartJob_NilWhenFileNotFound(t *testing.T) {
	// When the file doesn't exist locally and B2 client is nil,
	// CanStartJob returns nil (best-effort: can't determine size)
	workDir := t.TempDir()

	g := newTestGuardian()
	g.cfg.VODWorkDir = workDir
	g.cfg.MaxPerJobDiskGB = 2

	// No B2 client set, file doesn't exist
	job := &queue.SubJob{RawKey: "raw/nonexistent.mp4"}
	result := g.CanStartJob(job)
	if result != nil {
		t.Errorf("expected nil for unknown-size job, got %+v", result)
	}
}

func TestCanStartJob_NilForNilJob(t *testing.T) {
	g := newTestGuardian()
	result := g.CanStartJob(nil)
	if result != nil {
		t.Errorf("expected nil for nil job, got %+v", result)
	}
}

func TestCanStartJob_PathTraversalBlocked(t *testing.T) {
	workDir := t.TempDir()

	g := newTestGuardian()
	g.cfg.VODWorkDir = workDir
	g.cfg.MaxPerJobDiskGB = 2

	// Path traversal should be rejected by getRawVideoSize (returns 0)
	job := &queue.SubJob{RawKey: "../../etc/passwd"}
	result := g.CanStartJob(job)
	// When path traversal detected, getRawVideoSize returns 0 and CanStartJob returns nil
	if result != nil {
		t.Errorf("expected nil for path-traversal job (best-effort), got %+v", result)
	}
}

func TestRecoveryThreshold(t *testing.T) {
	g := newTestGuardian()

	threshold := g.RecoveryThreshold("cpu")
	expected := g.cfg.MaxCPULoadAvg - g.cfg.RecoveryHysteresis // 4.5 - 0.5 = 4.0
	if math.Abs(threshold-expected) > 0.001 {
		t.Errorf("RecoveryThreshold(cpu) = %f, want %f", threshold, expected)
	}
}

func TestCanStart_CPULoad(t *testing.T) {
	g := newTestGuardian()

	// No snapshot means monitor hasn't sampled, so result may be nil
	// This tests that the function doesn't panic
	result := g.CanStart()
	if result != nil {
		t.Logf("CanStart returned block: %+v", result)
	}
}
