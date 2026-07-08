package guardian

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/a_ashraf_tech/vod-engine/internal/b2"
	"github.com/a_ashraf_tech/vod-engine/internal/config"
	"github.com/a_ashraf_tech/vod-engine/internal/monitor"
	"github.com/a_ashraf_tech/vod-engine/internal/queue"
)

// Result describes which resource is blocking, or nil if clear.
type Result struct {
	Blocked     bool
	Resource    string
	Current     string
	Threshold   string
	Description string
}

// Guardian checks system resources before allowing a new encoding job.
type Guardian struct {
	cfg      *config.Config
	mon      *monitor.Monitor
	b2Client *b2.Client
}

// New creates a Resource Guardian.
func New(cfg *config.Config, mon *monitor.Monitor) *Guardian {
	return &Guardian{
		cfg: cfg,
		mon: mon,
	}
}

// SetB2Client attaches the B2 client to the Guardian for per-job disk quota checks (OPS-23).
func (g *Guardian) SetB2Client(b2Client *b2.Client) {
	g.b2Client = b2Client
}

// CanStart checks all resource thresholds. Returns nil if OK, or a Result describing the block.
func (g *Guardian) CanStart() *Result {
	snap := g.mon.Snapshot()

	g.cfg.RLock()
	defer g.cfg.RUnlock()

	// 1. CPU load check
	if snap.CPULoad1m > g.cfg.MaxCPULoadAvg {
		return &Result{
			Blocked:     true,
			Resource:    "cpu",
			Current:     fmt.Sprintf("%.1f", snap.CPULoad1m),
			Threshold:   fmt.Sprintf("%.1f", g.cfg.MaxCPULoadAvg),
			Description: fmt.Sprintf("CPU load avg=%.1f exceeds threshold %.1f", snap.CPULoad1m, g.cfg.MaxCPULoadAvg),
		}
	}

	// 2. RAM check
	if snap.RAMAvailableMB < g.cfg.MinFreeRAMMB {
		return &Result{
			Blocked:     true,
			Resource:    "ram",
			Current:     fmt.Sprintf("%d MB", snap.RAMAvailableMB),
			Threshold:   fmt.Sprintf("%d MB", g.cfg.MinFreeRAMMB),
			Description: fmt.Sprintf("Available RAM %dMB below threshold %dMB", snap.RAMAvailableMB, g.cfg.MinFreeRAMMB),
		}
	}

	// 3. Swap check
	if snap.SwapFreeMB < g.cfg.MinFreeSwapMB {
		return &Result{
			Blocked:     true,
			Resource:    "swap",
			Current:     fmt.Sprintf("%d MB", snap.SwapFreeMB),
			Threshold:   fmt.Sprintf("%d MB", g.cfg.MinFreeSwapMB),
			Description: fmt.Sprintf("Free swap %dMB below threshold %dMB", snap.SwapFreeMB, g.cfg.MinFreeSwapMB),
		}
	}

	// 4. Disk space check (STORE-01: use more restrictive of GB vs %)
	effectiveMinDiskGB := g.cfg.MinFreeDiskGB
	if g.cfg.MinFreeDiskPct > 0 && g.cfg.MinFreeDiskPct <= 100 && snap.DiskTotalGB > 0 {
		freeFromPct := int64(float64(snap.DiskTotalGB) * g.cfg.MinFreeDiskPct / 100.0)
		if freeFromPct < effectiveMinDiskGB {
			effectiveMinDiskGB = freeFromPct
		}
	}
	if snap.DiskFreeGB < effectiveMinDiskGB {
		return &Result{
			Blocked:     true,
			Resource:    "disk",
			Current:     fmt.Sprintf("%d GB", snap.DiskFreeGB),
			Threshold:   fmt.Sprintf("%d GB (min: GB=%d, pct=%.0f%%)", effectiveMinDiskGB, g.cfg.MinFreeDiskGB, g.cfg.MinFreeDiskPct),
			Description: fmt.Sprintf("Free disk %dGB below effective threshold %dGB", snap.DiskFreeGB, effectiveMinDiskGB),
		}
	}

	// 5. Work directory usage check
	if snap.DiskUsedGB >= g.cfg.MaxWorkDirUsageGB {
		return &Result{
			Blocked:     true,
			Resource:    "workdir",
			Current:     fmt.Sprintf("%d GB", snap.DiskUsedGB),
			Threshold:   fmt.Sprintf("%d GB", g.cfg.MaxWorkDirUsageGB),
			Description: fmt.Sprintf("Work dir usage %dGB exceeds max %dGB", snap.DiskUsedGB, g.cfg.MaxWorkDirUsageGB),
		}
	}

	// 6. Disk I/O check
	if snap.DiskIOPct > g.cfg.MaxDiskIOPct {
		return &Result{
			Blocked:     true,
			Resource:    "disk_io",
			Current:     fmt.Sprintf("%.0f%%", snap.DiskIOPct),
			Threshold:   fmt.Sprintf("%.0f%%", g.cfg.MaxDiskIOPct),
			Description: fmt.Sprintf("Disk I/O at %.0f%% exceeds threshold %.0f%%", snap.DiskIOPct, g.cfg.MaxDiskIOPct),
		}
	}

	// 7. Network check (M-01: compare against Mbps threshold directly)
	if snap.NetworkOutMbps > g.cfg.MaxNetworkMbps {
		return &Result{
			Blocked:     true,
			Resource:    "network",
			Current:     fmt.Sprintf("%.0f Mbps", snap.NetworkOutMbps),
			Threshold:   fmt.Sprintf("%.0f Mbps", g.cfg.MaxNetworkMbps),
			Description: fmt.Sprintf("Network outbound %.0fMbps exceeds threshold %.0fMbps", snap.NetworkOutMbps, g.cfg.MaxNetworkMbps),
		}
	}

	return nil
}

// LogBlock logs a blocked resource situation (LOG-04).
func (g *Guardian) LogBlock(r *Result) {
	slog.Warn("guardian.resource_block",
		"resource", r.Resource,
		"current", r.Current,
		"threshold", r.Threshold,
		"description", r.Description,
	)
}

// LogUnblock logs when a previously blocked resource recovers (LOG-04).
func (g *Guardian) LogUnblock(r *Result) {
	slog.Info("guardian.resource_unblock",
		"resource", r.Resource,
		"description", fmt.Sprintf("%s now within safe range", r.Resource),
	)
}

// RecoveryThreshold returns the threshold at which a blocked resource is considered recovered
// (threshold - hysteresis).
func (g *Guardian) RecoveryThreshold(resource string) float64 {
	g.cfg.RLock()
	defer g.cfg.RUnlock()

	switch resource {
	case "cpu":
		return g.cfg.MaxCPULoadAvg - g.cfg.RecoveryHysteresis
	default:
		return 0
	}
}

// CanStartJob checks if a specific job can be started based on per-job disk quota (OPS-23).
// It estimates the disk space the job will need and blocks if it exceeds MaxPerJobDiskGB.
func (g *Guardian) CanStartJob(job *queue.SubJob) *Result {
	g.cfg.RLock()
	defer g.cfg.RUnlock()

	if job == nil {
		return nil // defensive: nil job cannot be checked (m-01)
	}

	if g.cfg.MaxPerJobDiskGB <= 0 {
		return nil // Quota check disabled
	}

	rawSize := g.getRawVideoSize(job.RawKey)
	if rawSize <= 0 {
		// Can't determine size — allow to proceed (best-effort check)
		return nil
	}

	estimated := g.estimateDiskNeeded(rawSize)
	maxBytes := g.cfg.MaxPerJobDiskGB * 1024 * 1024 * 1024

	if estimated > maxBytes {
		return &Result{
			Blocked:     true,
			Resource:    "disk_quota",
			Current:     fmt.Sprintf("%d GB", estimated/(1024*1024*1024)),
			Threshold:   fmt.Sprintf("%d GB", g.cfg.MaxPerJobDiskGB),
			Description: fmt.Sprintf("Estimated disk need %d GB exceeds max %d GB per job", estimated/(1024*1024*1024), g.cfg.MaxPerJobDiskGB),
		}
	}

	return nil
}

// estimateDiskNeeded estimates the disk space needed for encoding a raw video.
// Formula: rawVideoSize * 4 (renditions) * 2 (safety factor).
func (g *Guardian) estimateDiskNeeded(rawVideoSizeBytes int64) int64 {
	return rawVideoSizeBytes * 4 * 2
}

// getRawVideoSize attempts to determine the size of the raw video file.
// It first checks the local cache, then issues a B2 HeadObject request.
// rawKey is sanitized to prevent path traversal (OPS-SEC-02).
func (g *Guardian) getRawVideoSize(rawKey string) int64 {
	// Sanitise path: reject traversal and clean the path (OPS-SEC-02)
	if strings.Contains(rawKey, "..") {
		slog.Warn("Path traversal attempt blocked in getRawVideoSize", "raw_key", rawKey)
		return 0
	}

	// Check local cache first
	workDir := g.cfg.VODWorkDir
	localPath := filepath.Join(workDir, rawKey)

	// Ensure the resolved path is within workDir (defence in depth)
	cleanPath := filepath.Clean(localPath)
	cleanWorkDir := filepath.Clean(workDir) + string(filepath.Separator)
	if !strings.HasPrefix(cleanPath, cleanWorkDir) {
		slog.Warn("Path traversal detected after clean", "resolved", cleanPath, "work_dir", cleanWorkDir)
		return 0
	}

	if info, err := statLocal(cleanPath); err == nil {
		return info
	}

	// Fall back to B2 HeadObject via the S3-compatible API (OPS-23)
	if g.b2Client == nil {
		slog.Warn("B2 client not set in Guardian, cannot determine raw video size via HeadObject")
		return 0
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	size, err := g.b2Client.HeadObject(ctx, rawKey)
	if err != nil {
		slog.Warn("Failed to get raw video size from B2 HeadObject", "raw_key", rawKey, "error", err)
		return 0
	}

	return size
}

// statLocal returns the file size of a local file, or 0 if not accessible.
func statLocal(path string) (int64, error) {
	info, err := os.Stat(path)
	if err != nil {
		return 0, err
	}
	return info.Size(), nil
}
