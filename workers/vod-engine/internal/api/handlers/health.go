package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/a_ashraf_tech/vod-engine/internal/config"
	"github.com/a_ashraf_tech/vod-engine/internal/monitor"
	"github.com/a_ashraf_tech/vod-engine/internal/worker"
)

// HealthHandler serves the enhanced health endpoint.
type HealthHandler struct {
	cfg              *config.Config
	scheduler        *worker.Scheduler
	monitor          *monitor.Monitor
	startTime        time.Time
	recoveryComplete bool // set to true after queue recovery from disk completes (m-02)
}

// NewHealthHandler creates a new health handler.
func NewHealthHandler(cfg *config.Config, scheduler *worker.Scheduler, mon *monitor.Monitor) *HealthHandler {
	return &HealthHandler{
		cfg:       cfg,
		scheduler: scheduler,
		monitor:   mon,
		startTime: time.Now(),
	}
}

// SetRecoveryComplete marks queue recovery as finished (m-02).
// Called from main.go after LoadPending() completes.
func (h *HealthHandler) SetRecoveryComplete() {
	h.recoveryComplete = true
}

// HandleHealth responds with detailed system status.
// Supports probe differentiation (OPS-19):
//
//	GET /health?probe=live    -> liveness (always 200 if running)
//	GET /health?probe=ready   -> readiness (200 if fully initialized)
//	GET /health?probe=startup -> startup (200 if completed 2 monitor cycles)
//	bare /health              -> full detailed health response (backward compatible)
func (h *HealthHandler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	// Parse probe query parameter (OPS-19)
	probe := r.URL.Query().Get("probe")

	switch probe {
	case "live":
		// Liveness probe: respond 200 if engine is running (OPS-19)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "alive"})
		return

	case "ready":
		// Readiness probe: 200 if queue recovery complete and not shutting down (OPS-19, m-02)
		if !h.recoveryComplete {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(map[string]string{"status": "not_ready", "reason": "queue_recovery_incomplete"})
			return
		}
		if h.scheduler.IsShuttingDown() {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(map[string]string{"status": "not_ready", "reason": "shutting_down"})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ready"})
		return

	case "startup":
		// Startup probe: 200 if engine has completed 2 full monitor cycles (OPS-19)
		uptime := int(time.Since(h.startTime).Seconds())
		startupThreshold := h.cfg.MonitorIntervalS * 2
		if uptime < startupThreshold {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(map[string]string{
				"status":   "starting",
				"reason":   "initializing",
				"uptime_s": strconv.Itoa(uptime),
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "started"})
		return
	}

	// Default: full detailed health response (backward compatible)
	snap := h.monitor.Snapshot()
	activeJobs := h.scheduler.ActiveJobCount()
	pending, dead := h.scheduler.QueueStats()
	uptime := int(time.Since(h.startTime).Seconds())

	h.cfg.RLock()

	// Determine overall status
	status := "healthy"
	if snap.CPULoad1m > h.cfg.MaxCPULoadAvg {
		status = "degraded"
	}
	if snap.RAMAvailableMB < h.cfg.MinFreeRAMMB {
		status = "degraded"
	}
	if h.scheduler.IsShuttingDown() {
		status = "shutting_down"
	}

	resp := map[string]interface{}{
		"status":           status,
		"uptime_seconds":   uptime,
		"version":          "2.0.0",
		"active_jobs":      activeJobs,
		"pending_jobs":     pending,
		"dead_letter_jobs": dead,
		"resources": map[string]interface{}{
			"cpu_load_1m":          snap.CPULoad1m,
			"cpu_load_5m":          snap.CPULoad5m,
			"cpu_load_15m":         snap.CPULoad15m,
			"ram_total_mb":         snap.RAMTotalMB,
			"ram_available_mb":     snap.RAMAvailableMB,
			"ram_used_pct":         snap.RAMUsedPct,
			"swap_free_mb":         snap.SwapFreeMB,
			"disk_free_gb":         snap.DiskFreeGB,
			"disk_used_pct":        snap.DiskUsedPct,
			"disk_io_pct":          snap.DiskIOPct,
			"network_out_mbps":     snap.NetworkOutMbps,
			"network_in_mbps":      snap.NetworkInMbps,
			"active_ffmpeg_pids":   snap.ActiveFFmpegPIDs,
			"temperature_c":        snap.Temperature,
			"nvme_temp_celsius":    snap.NVMeTemperatureCelsius, // OPS-07
			"open_file_descriptors": snap.OpenFileDescriptors,   // OPS-13
		},
		"config": map[string]interface{}{
			"max_concurrent_jobs": h.cfg.MaxConcurrentJobs,
			"max_cpu_load_avg":    h.cfg.MaxCPULoadAvg,
			"min_free_ram_mb":     h.cfg.MinFreeRAMMB,
			"min_free_disk_gb":    h.cfg.MinFreeDiskGB,
			"ffmpeg_preset":       h.cfg.FFmpegPreset,
			"ffmpeg_threads":      h.cfg.FFmpegThreads,
			"ffmpeg_nice":         h.cfg.FFmpegNice,
			"max_retries":         h.cfg.MaxRetries,
		},
	}

	h.cfg.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
