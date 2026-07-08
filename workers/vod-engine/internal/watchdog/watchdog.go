// Package watchdog monitors FFmpeg processes during encoding (WDG-01 through WDG-06).
// Each encoding job gets its own Watchdog instance that monitors stdout progress,
// CPU activity via /proc/<pid>/stat, and HLS segment file creation.
package watchdog

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/a_ashraf_tech/vod-engine/internal/config"
	"github.com/a_ashraf_tech/vod-engine/internal/logging"
	"github.com/a_ashraf_tech/vod-engine/internal/metrics"
	"github.com/a_ashraf_tech/vod-engine/internal/queue"
)

// KillReason describes why the watchdog terminated a process.
type KillReason string

const (
	KillReasonNoProgress KillReason = "no_progress"
	KillReasonFrozenCPU  KillReason = "frozen_cpu"
	KillReasonNoSegments KillReason = "no_segments"
)

// Watchdog monitors an FFmpeg process for stalls and freezes.
type Watchdog struct {
	cfg *config.Config
	cmd *exec.Cmd
	pid int
	job *queue.SubJob
	mc  *metrics.MetricsCollector

	// Progress monitoring
	progressCh   chan int64
	lastProgress time.Time
	stallCount   int

	// CPU monitoring
	lastCPUTime     float64
	lastCPUSampleAt time.Time

	// Segment monitoring
	outputDir     string
	lastSegmentAt time.Time
	lastFileCount int
	lastDirSize   int64

	// Lifecycle
	ctx        context.Context
	cancel     context.CancelFunc
	wg         sync.WaitGroup
	killReason atomic.Value // stores KillReason

	// Whether the input video is short
	isShortVideo bool

	// For unblocking cmd.Wait()
	stdoutPipeClosed bool

	// termination guard
	terminated atomic.Bool
}

// NewWatchdog creates a new Watchdog for an FFmpeg process.
func NewWatchdog(cfg *config.Config, cmd *exec.Cmd, pid int, job *queue.SubJob, mc *metrics.MetricsCollector, outputDir string) *Watchdog {
	ctx, cancel := context.WithCancel(context.Background())
	return &Watchdog{
		cfg:         cfg,
		cmd:         cmd,
		pid:         pid,
		job:         job,
		mc:          mc,
		progressCh:  make(chan int64, 1000),
		outputDir:   outputDir,
		ctx:         ctx,
		cancel:      cancel,
		isShortVideo: false,
	}
}

// SetShortVideo marks this encoding as a short video (WDG-06).
func (w *Watchdog) SetShortVideo(short bool) {
	w.isShortVideo = short
}

// ProgressCh returns the channel that receives out_time_us values.
func (w *Watchdog) ProgressCh() chan<- int64 {
	return w.progressCh
}

// KillReason returns the reason for the kill, or empty string if not killed.
func (w *Watchdog) KillReason() KillReason {
	if r, ok := w.killReason.Load().(KillReason); ok {
		return r
	}
	return ""
}

// WasKilled returns true if the watchdog terminated the process.
func (w *Watchdog) WasKilled() bool {
	return w.terminated.Load()
}

// Start launches the monitoring goroutines (WDG-01, WDG-02, WDG-03).
func (w *Watchdog) Start(ctx context.Context) {
	attrs := logging.LogAttrs("watchdog", w.job.ID, w.job.LectureID, w.job.CorrelationID)
	attrs = append(attrs, slog.Int("pid", w.pid))
	slog.LogAttrs(ctx, slog.LevelInfo, "watchdog.started", attrs...)

	w.wg.Add(3)
	go w.progressWatcher(ctx)
	go w.cpuWatcher(ctx)
	go w.segmentWatcher(ctx)
}

// Stop signals all monitoring goroutines to exit gracefully.
func (w *Watchdog) Stop() {
	w.cancel()
}

// WaitDone blocks until all monitoring goroutines have exited.
func (w *Watchdog) WaitDone() {
	w.wg.Wait()
}

// progressWatcher monitors stdout for out_time_us= progress lines (WDG-01).
func (w *Watchdog) progressWatcher(ctx context.Context) {
	defer w.wg.Done()

	// Determine timeout based on short video detection (WDG-06)
	timeout := time.Duration(w.cfg.WatchdogProgressTimeoutS) * time.Second
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	if w.isShortVideo {
		timeout = time.Duration(w.cfg.WatchdogShortVideoTimeoutS) * time.Second
		if timeout <= 0 {
			timeout = 60 * time.Second
		}
	}

	// Reset the progress timer on each received progress value
	w.lastProgress = time.Now()

	progressTicker := time.NewTicker(timeout)
	defer progressTicker.Stop()

	for {
		select {
		case <-w.progressCh:
			w.lastProgress = time.Now()
			w.stallCount = 0

		case <-progressTicker.C:
			if w.terminated.Load() {
				return
			}
			elapsed := time.Since(w.lastProgress)
			if elapsed >= timeout {
				w.stallCount++
				attrs := logging.LogAttrs("watchdog", w.job.ID, w.job.LectureID, w.job.CorrelationID)
				attrs = append(attrs,
					slog.Int("stall_count", w.stallCount),
					slog.Float64("elapsed_s", elapsed.Seconds()),
					slog.Int("threshold", w.cfg.WatchdogStallThreshold),
				)
				slog.LogAttrs(ctx, slog.LevelWarn, "watchdog.stall_detected", attrs...)

				if w.stallCount >= w.cfg.WatchdogStallThreshold {
					w.killReason.Store(KillReasonNoProgress)
					w.terminate(ctx)
					return
				}
			}

		case <-ctx.Done():
			return
		}
	}
}

// cpuWatcher samples /proc/<pid>/stat for CPU activity (WDG-02).
func (w *Watchdog) cpuWatcher(ctx context.Context) {
	defer w.wg.Done()

	pollInterval := time.Duration(w.cfg.WatchdogCPUPollIntervalS) * time.Second
	if pollInterval <= 0 {
		pollInterval = 10 * time.Second
	}
	idleTimeout := time.Duration(w.cfg.WatchdogCPUIdleTimeoutS) * time.Second
	if idleTimeout <= 0 {
		idleTimeout = 60 * time.Second
	}
	thresholdCPU := w.cfg.WatchdogCPUIdleThresholdPct / 100.0

	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()

	var windowStart time.Time
	var windowStartCPU float64

	for {
		select {
		case <-ticker.C:
			if w.terminated.Load() {
				return
			}

			cpuTime, err := readProcessCPUTime(w.pid)
			if err != nil {
				attrs := logging.LogAttrs("watchdog", w.job.ID, w.job.LectureID, w.job.CorrelationID)
				attrs = append(attrs, slog.Int("pid", w.pid), slog.String("error", err.Error()))
				slog.LogAttrs(ctx, slog.LevelDebug, "watchdog.cpu_read_error", attrs...)
				continue
			}

			now := time.Now()

			if w.lastCPUTime == 0 {
				w.lastCPUTime = cpuTime
				w.lastCPUSampleAt = now
				windowStart = now
				windowStartCPU = cpuTime
				continue
			}

			if now.Sub(windowStart) >= idleTimeout {
				cpuDelta := cpuTime - windowStartCPU
				elapsed := now.Sub(windowStart).Seconds()
				expectedMinCPU := elapsed * thresholdCPU

				if cpuDelta < expectedMinCPU && elapsed >= idleTimeout.Seconds() {
					w.killReason.Store(KillReasonFrozenCPU)
					attrs := logging.LogAttrs("watchdog", w.job.ID, w.job.LectureID, w.job.CorrelationID)
					attrs = append(attrs,
						slog.Int("pid", w.pid),
						slog.Float64("cpu_delta_s", cpuDelta),
						slog.Float64("expected_min_s", expectedMinCPU),
						slog.Float64("window_s", elapsed),
					)
					slog.LogAttrs(ctx, slog.LevelWarn, "watchdog.cpu_frozen", attrs...)
					w.terminate(ctx)
					return
				}

				windowStart = now
				windowStartCPU = cpuTime
			}

			w.lastCPUTime = cpuTime
			w.lastCPUSampleAt = now

		case <-ctx.Done():
			return
		}
	}
}

// segmentWatcher monitors the output directory for .ts file creation (WDG-03).
func (w *Watchdog) segmentWatcher(ctx context.Context) {
	defer w.wg.Done()

	pollInterval := time.Duration(w.cfg.WatchdogSegmentPollIntervalS) * time.Second
	if pollInterval <= 0 {
		pollInterval = 15 * time.Second
	}
	stallTimeout := time.Duration(w.cfg.WatchdogSegmentStallTimeoutS) * time.Second
	if stallTimeout <= 0 {
		stallTimeout = 120 * time.Second
	}

	if w.isShortVideo {
		stallTimeout = time.Duration(w.cfg.WatchdogShortVideoTimeoutS) * time.Second
	}

	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()

	w.updateSegmentStats()
	w.lastSegmentAt = time.Now()

	for {
		select {
		case <-ticker.C:
			if w.terminated.Load() {
				return
			}

			prevCount := w.lastFileCount
			prevSize := w.lastDirSize

			w.updateSegmentStats()

			if w.lastFileCount <= prevCount && w.lastDirSize <= prevSize {
				elapsed := time.Since(w.lastSegmentAt)
				if elapsed >= stallTimeout {
					w.killReason.Store(KillReasonNoSegments)
					attrs := logging.LogAttrs("watchdog", w.job.ID, w.job.LectureID, w.job.CorrelationID)
					attrs = append(attrs,
						slog.Int("file_count", w.lastFileCount),
						slog.Int64("dir_size_bytes", w.lastDirSize),
						slog.Float64("elapsed_s", elapsed.Seconds()),
					)
					slog.LogAttrs(ctx, slog.LevelWarn, "watchdog.segment_stall", attrs...)
					w.terminate(ctx)
					return
				}
			} else {
				w.lastSegmentAt = time.Now()
			}

		case <-ctx.Done():
			return
		}
	}
}

// updateSegmentStats reads the current state of the output directory.
func (w *Watchdog) updateSegmentStats() {
	entries, err := os.ReadDir(w.outputDir)
	if err != nil {
		return
	}

	var count int
	var totalSize int64

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if strings.HasSuffix(entry.Name(), ".ts") {
			count++
			if info, err := entry.Info(); err == nil {
				totalSize += info.Size()
			}
		}
	}

	w.lastFileCount = count
	w.lastDirSize = totalSize
}

// terminate sends SIGTERM, waits, then SIGKILL (WDG-04).
func (w *Watchdog) terminate(ctx context.Context) {
	if !w.terminated.CompareAndSwap(false, true) {
		return
	}

	reason := w.KillReason()
	if reason == "" {
		reason = KillReasonNoProgress
	}

	attrs := logging.LogAttrs("watchdog", w.job.ID, w.job.LectureID, w.job.CorrelationID)
	attrs = append(attrs,
		slog.Int("pid", w.pid),
		slog.String("reason", string(reason)),
		slog.Int("stall_count", w.stallCount),
	)
	slog.LogAttrs(ctx, slog.LevelWarn, "watchdog.kill", attrs...)

	if w.mc != nil {
		w.mc.CounterInc("vod_engine_watchdog_kills_total{reason=\"" + string(reason) + "\"}")
	}

	// Send SIGTERM to process group (WDG-04)
	processGroup := -w.pid
	if w.pid > 0 {
		termCmd := exec.Command("kill", "-TERM", strconv.Itoa(processGroup))
		_ = termCmd.Run()
	}

	termWait := time.Duration(w.cfg.WatchdogTermWaitS) * time.Second
	time.Sleep(termWait)

	if w.pid <= 0 || !processExists(w.pid) {
		return
	}

	// Send SIGKILL (WDG-04)
	killCmd := exec.Command("kill", "-KILL", strconv.Itoa(processGroup))
	_ = killCmd.Run()

	// Close stdout pipe to unblock cmd.Wait() (WDG-05)
	if !w.stdoutPipeClosed && w.cmd != nil && w.cmd.Stdout != nil {
		if closer, ok := w.cmd.Stdout.(interface{ Close() error }); ok {
			_ = closer.Close()
			w.stdoutPipeClosed = true
		}
	}

	forceWait := time.Duration(w.cfg.WatchdogForceExitTimeoutS) * time.Second
	time.Sleep(forceWait)

	if w.pid > 0 && processExists(w.pid) {
		critAttrs := logging.LogAttrs("watchdog", w.job.ID, w.job.LectureID, w.job.CorrelationID)
		critAttrs = append(critAttrs, slog.Int("pid", w.pid), logging.SeverityCritical())
		slog.LogAttrs(ctx, slog.LevelError, "watchdog.force_exit_timeout", critAttrs...)
	}

	w.cancel()
}

// readProcessCPUTime reads the total CPU time (utime + stime) from /proc/<pid>/stat.
// Uses strings.LastIndex to find the closing paren of the comm field, handling
// spaces in the process command name (e.g., "(ffmpeg -filter_complex ...)").
func readProcessCPUTime(pid int) (float64, error) {
	data, err := os.ReadFile(filepath.Join("/proc", strconv.Itoa(pid), "stat"))
	if err != nil {
		return 0, err
	}

	content := string(data)
	closeParen := strings.LastIndex(content, ")")
	if closeParen < 0 {
		return 0, fmt.Errorf("unexpected /proc/%d/stat format: no closing paren", pid)
	}

	fields := strings.Fields(content[closeParen+1:])
	if len(fields) < 13 {
		return 0, fmt.Errorf("unexpected /proc/%d/stat format: got %d fields after comm", pid, len(fields))
	}

	// fields[0] = state, fields[1] = ppid, ..., fields[11] = utime, fields[12] = stime
	utime, err := strconv.ParseFloat(fields[11], 64)
	if err != nil {
		return 0, fmt.Errorf("parse utime: %w", err)
	}

	stime, err := strconv.ParseFloat(fields[12], 64)
	if err != nil {
		return 0, fmt.Errorf("parse stime: %w", err)
	}

	const clkTck = 100.0
	return (utime + stime) / clkTck, nil
}

// processExists checks if a process with the given PID is running.
func processExists(pid int) bool {
	_, err := os.Stat(filepath.Join("/proc", strconv.Itoa(pid)))
	return err == nil
}
