package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/a_ashraf_tech/vod-engine/internal/api/handlers"
	"github.com/a_ashraf_tech/vod-engine/internal/api/middlewares"
	"github.com/a_ashraf_tech/vod-engine/internal/auth"
	"github.com/a_ashraf_tech/vod-engine/internal/b2"
	"github.com/a_ashraf_tech/vod-engine/internal/circuitbreaker"
	"github.com/a_ashraf_tech/vod-engine/internal/config"
	"github.com/a_ashraf_tech/vod-engine/internal/guardian"
	"github.com/a_ashraf_tech/vod-engine/internal/metrics"
	"github.com/a_ashraf_tech/vod-engine/internal/monitor"
	"github.com/a_ashraf_tech/vod-engine/internal/queue"
	"github.com/a_ashraf_tech/vod-engine/internal/worker"
	"github.com/joho/godotenv"
)

func main() {
	// 1. Structured logging
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	// 2. Load .env if available
	if err := godotenv.Load(); err != nil {
		slog.Info("No .env file found, relying on system environment variables")
	}

	// 3. Load typed configuration
	cfg := config.Load()

	if cfg.JWTSecret == "" {
		slog.Error("Fatal: JWT_SECRET environment variable is missing")
		os.Exit(1)
	}

	// SEC-CRIT-01: refuse to boot with a known-leaked or low-entropy JWT secret.
	if err := auth.ValidateJWTSecret(cfg.JWTSecret); err != nil {
		slog.Error("Fatal: JWT_SECRET rejected", "error", err)
		os.Exit(1)
	}

	// SEC-06: Validate configuration at startup (fatal error if invalid)
	if err := cfg.Validate(); err != nil {
		slog.Error("Fatal: invalid configuration", "error", err)
		os.Exit(1)
	}

	// 4. OOM score protection (OPS-12)
	if err := setOOMScore(); err != nil {
		slog.Warn("Failed to set OOM score adjustment (non-fatal on systems without /proc)", "error", err)
	}

	// 5. Initialize Backblaze B2 client
	b2Config := b2.Config{
		KeyID:      os.Getenv("B2_KEY_ID"),
		AppKey:     os.Getenv("B2_APP_KEY"),
		BucketName: os.Getenv("B2_BUCKET_NAME"),
		Region:     os.Getenv("B2_REGION"),
		Endpoint:   os.Getenv("B2_ENDPOINT"),
	}

	ctx := context.Background()
	b2Client, err := b2.NewClient(ctx, b2Config)
	if err != nil {
		slog.Error("Failed to initialize B2 client", "error", err)
		os.Exit(1)
	}

	// 6. Ensure work/queue/log/crash directories exist
	dirs := []string{cfg.VODWorkDir, cfg.VODQueueDir, cfg.VODLogDir}
	if cfg.VODCrashDir != "" {
		dirs = append(dirs, cfg.VODCrashDir)
	}
	for _, dir := range dirs {
		perm := os.FileMode(0755)
		if dir == cfg.VODCrashDir {
			perm = 0750
		}
		if err := os.MkdirAll(dir, perm); err != nil {
			slog.Error("Failed to create directory", "dir", dir, "error", err)
			os.Exit(1)
		}
	}

	// 7. Initialize queue persistence
	persist, err := queue.NewPersistence(cfg.VODQueueDir)
	if err != nil {
		slog.Error("Failed to initialize queue persistence", "error", err)
		os.Exit(1)
	}

	// 8. Recover pending jobs from disk (resume after reboot)
	pq := queue.NewPriorityQueue()
	recoveredJobs, err := persist.LoadPending()
	if err != nil {
		slog.Warn("Failed to load pending jobs from disk", "error", err)
	} else {
		recoveredCount := 0
		for _, job := range recoveredJobs {
			if job.Status == queue.StatusPending || job.Status == queue.StatusInterrupted {
				job.Status = queue.StatusPending
				pq.Push(job)
				recoveredCount++
				slog.Info("queue.recovery",
					"event", "job_recovered",
					"lecture_id", job.LectureID,
					"quality", job.Quality,
					"correlation_id", job.CorrelationID,
				)
			}
		}
		slog.Info("queue.recovery", "event", "queue_recovered", "recovered_count", recoveredCount, "active", pq.Len())
	}

	// 9. Initialize metrics collector (OPS-16)
	metricsCollector := metrics.NewMetricsCollector()
	registerMetrics(metricsCollector)

	// 10. Initialize scheduler
	scheduler := worker.NewPool(cfg, b2Client, pq, persist)
	scheduler.SetMetricsCollector(metricsCollector)

	// 11. Initialize circuit breakers (CB-01, CB-03)
	b2CircuitBreaker := circuitbreaker.NewCircuitBreaker("b2",
		cfg.CBB2FailureThreshold,
		time.Duration(cfg.CBB2RecoveryTimeoutS)*time.Second,
		cfg.CBB2HalfOpenMaxRequests,
		metricsCollector)
	apiCircuitBreaker := circuitbreaker.NewCircuitBreaker("api",
		cfg.CBAPIFailureThreshold,
		time.Duration(cfg.CBAPIRecoveryTimeoutS)*time.Second,
		cfg.CBAPIHalfOpenMaxRequests,
		metricsCollector)
	webhookBuffer := circuitbreaker.NewWebhookBuffer(cfg.CBAPIWebhookBufferSize)

	scheduler.SetCircuitBreakers(b2CircuitBreaker, apiCircuitBreaker, webhookBuffer)

	// 12. Orphan cleanup: kill any stray FFmpeg processes from unclean shutdown
	scheduler.OrphanCleanup()

	// 13. Start system monitor
	monitorInterval := time.Duration(cfg.MonitorIntervalS) * time.Second
	mon := monitor.New(monitorInterval, cfg.VODWorkDir)
	mon.SetNVMeCheckInterval(time.Duration(cfg.NVMeCheckIntervalM) * time.Minute)

	monitorStop := make(chan struct{})
	go func() {
		defer func() {
			if r := recover(); r != nil {
				slog.Error("Monitor goroutine panicked", "panic", r)
			}
		}()
		mon.Start(monitorStop)
	}()

	// Link monitor to scheduler
	scheduler.SetMonitor(mon)

	// 14. Initialize predictive guardian and wire to monitor
	innerGuardian := guardian.New(cfg, mon)
	innerGuardian.SetB2Client(b2Client)
	predictiveGuardian := guardian.NewPredictiveGuardian(innerGuardian, cfg)
	predictiveCh := predictiveGuardian.SampleCh()
	mon.SetPredictiveChannel(predictiveCh)
	scheduler.SetPredictiveGuardian(predictiveGuardian)

	// Start the predictive guardian's sample processor goroutine (PRED-01, fix C-01)
	go predictiveGuardian.ProcessSamples(ctx)

	// 15. Start scheduler
	schedulerCtx, schedulerCancel := context.WithCancel(context.Background())
	defer schedulerCancel()
	scheduler.Start(schedulerCtx)

	// 16. HTTP handlers and health checks
	healthHandler := handlers.NewHealthHandler(cfg, scheduler, mon)
	healthHandler.SetRecoveryComplete()
	uploadHandler := handlers.NewUploadHandler(b2Client, cfg.JWTSecret, scheduler)

	mux := http.NewServeMux()

	// Health endpoint (enhanced)
	mux.HandleFunc("GET /health", healthHandler.HandleHealth)

	// Metrics endpoint (OPS-16)
	mux.HandleFunc("GET /metrics", metricsCollector.ServeHTTP)

	// Video processing
	mux.HandleFunc("POST /api/v1/video/process", uploadHandler.HandleProcessVideo)
	mux.HandleFunc("DELETE /api/v1/video/{lecture_id}", uploadHandler.HandleDeleteVideo)

	// Re-queue dead-letter job
	mux.HandleFunc("POST /api/v1/video/requeue", uploadHandler.HandleRequeueVideo)

	// Apply CORS
	protectedHandler := middlewares.StrictCORS(mux)

	// 17. HTTP server
	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           protectedHandler,
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      0,
		IdleTimeout:       120 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	// 18. Start FFmpeg PID metrics goroutine (OPS-06/OPS-16)
	ffmpegPidCtx, ffmpegPidCancel := context.WithCancel(context.Background())
	go func() {
		defer func() {
			if r := recover(); r != nil {
				slog.Error("FFmpeg PID gauge goroutine panicked", "panic", r)
			}
		}()
		feedFFmpegPIDsGauge(ffmpegPidCtx, mon, metricsCollector)
	}()

	// 19. Start textfile writer goroutine (OPS-06)
	textfileCtx, textfileCancel := context.WithCancel(context.Background())
	go func() {
		defer func() {
			if r := recover(); r != nil {
				slog.Error("Textfile writer goroutine panicked", "panic", r)
			}
		}()
		textfileWriterLoop(textfileCtx, metricsCollector)
	}()

	// 20. Start server
	go func() {
		slog.Info("VOD Engine v2.0 ready",
			"port", cfg.Port,
			"max_concurrent_jobs", cfg.MaxConcurrentJobs,
			"ffmpeg_preset", cfg.FFmpegPreset,
			"ffmpeg_threads", cfg.FFmpegThreads,
			"metrics_enabled", true,
			"predictive_guardian_enabled", true,
			"circuit_breakers_enabled", true,
			"watchdog_enabled", true,
		)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Server failed", "error", err)
			os.Exit(1)
		}
	}()

	// 21. Signal handling (OPS-18)
	sighupCh := make(chan os.Signal, 1)
	signal.Notify(sighupCh, syscall.SIGHUP)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// SIGHUP handler (OPS-18)
	go func() {
		defer func() {
			if r := recover(); r != nil {
				slog.Error("SIGHUP handler goroutine panicked", "panic", r)
			}
		}()
		for range sighupCh {
			handleSIGHUP(cfg, mon, scheduler)
		}
	}()

	sig := <-quit
	slog.Info("Received signal, initiating graceful shutdown sequence...", "signal", sig)

	gracefulTimeout := time.Duration(cfg.GracefulTimeoutS) * time.Second
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), gracefulTimeout)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("HTTP server forced to shutdown", "error", err)
	} else {
		slog.Info("HTTP server stopped accepting new requests")
	}

	slog.Info("Waiting for active encoding jobs to finish...")
	schedulerCancel()

	// Persist remaining queue to disk
	scheduler.PersistQueueOnShutdown()

	// Stop the monitor
	close(monitorStop)

	// Stop FFmpeg PID gauge goroutine
	ffmpegPidCancel()

	// Stop textfile writer
	textfileCancel()

	// Wait for scheduler to fully stop
	scheduler.StopWait()

	// Flush webhook buffer before exit
	if buffered := webhookBuffer.Len(); buffered > 0 {
		slog.Warn("Webhook buffer non-empty on shutdown", "count", buffered)
		scheduler.FlushWebhookBuffer() // Adding this method via Scheduler
	}

	slog.Info("Shutdown complete. All systems offline safely.")
}

// setOOMScore sets the OOM score adjustment to -500 (OPS-12).
func setOOMScore() error {
	return os.WriteFile("/proc/self/oom_score_adj", []byte("-500"), 0644)
}

// handleSIGHUP re-reads configuration on SIGHUP (OPS-18).
func handleSIGHUP(cfg *config.Config, mon *monitor.Monitor, sched *worker.Scheduler) {
	slog.Info("SIGHUP received. Configuration reloaded.")

	newCfg := config.Load()

	cfg.Lock()

	// Update safe-to-change-at-runtime fields
	cfg.MaxCPULoadAvg = newCfg.MaxCPULoadAvg
	cfg.RecoveryHysteresis = newCfg.RecoveryHysteresis
	cfg.MinFreeRAMMB = newCfg.MinFreeRAMMB
	cfg.MinFreeSwapMB = newCfg.MinFreeSwapMB
	cfg.MinFreeDiskGB = newCfg.MinFreeDiskGB
	cfg.MaxDiskIOPct = newCfg.MaxDiskIOPct
	cfg.MaxNetworkMbps = newCfg.MaxNetworkMbps
	cfg.MaxWorkDirUsageGB = newCfg.MaxWorkDirUsageGB
	cfg.MaxPerJobDiskGB = newCfg.MaxPerJobDiskGB
	cfg.ResourcePollIntervalS = newCfg.ResourcePollIntervalS
	cfg.MonitorIntervalS = newCfg.MonitorIntervalS
	cfg.NVMeCheckIntervalM = newCfg.NVMeCheckIntervalM
	cfg.NVMeWearWarnPct = newCfg.NVMeWearWarnPct
	cfg.NVMeWearCritPct = newCfg.NVMeWearCritPct

	// Runtime-reloadable new config fields (safe to reload)
	cfg.WatchdogProgressTimeoutS = newCfg.WatchdogProgressTimeoutS
	cfg.WatchdogCPUIdleTimeoutS = newCfg.WatchdogCPUIdleTimeoutS
	cfg.WatchdogCPUIdleThresholdPct = newCfg.WatchdogCPUIdleThresholdPct
	cfg.WatchdogSegmentStallTimeoutS = newCfg.WatchdogSegmentStallTimeoutS
	cfg.WatchdogStallThreshold = newCfg.WatchdogStallThreshold
	cfg.WatchdogTermWaitS = newCfg.WatchdogTermWaitS
	cfg.PredictiveHistorySize = newCfg.PredictiveHistorySize
	cfg.PredictiveMinSamples = newCfg.PredictiveMinSamples
	cfg.PredictiveTrendWindowCount = newCfg.PredictiveTrendWindowCount
	cfg.PredictiveCPUSlopeThreshold = newCfg.PredictiveCPUSlopeThreshold
	cfg.PredictiveLookaheadS = newCfg.PredictiveLookaheadS
	cfg.PredictiveRecoveryFactor = newCfg.PredictiveRecoveryFactor
	cfg.CBB2FailureThreshold = newCfg.CBB2FailureThreshold
	cfg.CBB2RecoveryTimeoutS = newCfg.CBB2RecoveryTimeoutS
	cfg.CBB2HalfOpenMaxRequests = newCfg.CBB2HalfOpenMaxRequests
	cfg.CBAPIFailureThreshold = newCfg.CBAPIFailureThreshold
	cfg.CBAPIRecoveryTimeoutS = newCfg.CBAPIRecoveryTimeoutS
	cfg.CBAPIHalfOpenMaxRequests = newCfg.CBAPIHalfOpenMaxRequests
	cfg.CBAPIWebhookBufferSize = newCfg.CBAPIWebhookBufferSize
	cfg.CBB2JobDelayS = newCfg.CBB2JobDelayS
	cfg.TelemetrySampleIntervalS = newCfg.TelemetrySampleIntervalS
	cfg.MinFreeDiskPct = newCfg.MinFreeDiskPct
	cfg.MaxJobAgeHours = newCfg.MaxJobAgeHours
	cfg.ActiveGroupsGCIntervalM = newCfg.ActiveGroupsGCIntervalM

	if newCfg.JWTSecret != "" && newCfg.JWTSecret != cfg.JWTSecret {
		slog.Warn("SIGHUP: JWT_SECRET change detected and IGNORED (OPS-SEC-05). " +
			"Restart the service to rotate credentials.")
	}
	if newCfg.B2KeyID != "" && newCfg.B2KeyID != cfg.B2KeyID {
		slog.Warn("SIGHUP: B2_KEY_ID change detected and IGNORED (OPS-SEC-05). " +
			"Restart the service to rotate credentials.")
	}
	if newCfg.B2AppKey != "" && newCfg.B2AppKey != cfg.B2AppKey {
		slog.Warn("SIGHUP: B2_APP_KEY change detected and IGNORED (OPS-SEC-05). " +
			"Restart the service to rotate credentials.")
	}

	cfg.Unlock()

	mon.Reconfigure(time.Duration(cfg.MonitorIntervalS) * time.Second)
	mon.SetNVMeCheckInterval(time.Duration(cfg.NVMeCheckIntervalM) * time.Minute)
	sched.Reconfigure(time.Duration(cfg.ResourcePollIntervalS) * time.Second)

	slog.Info("Configuration updated from SIGHUP",
		"max_cpu_load_avg", cfg.MaxCPULoadAvg,
		"min_free_ram_mb", cfg.MinFreeRAMMB,
		"min_free_disk_gb", cfg.MinFreeDiskGB,
		"monitor_interval_s", cfg.MonitorIntervalS,
		"poll_interval_s", cfg.ResourcePollIntervalS,
	)
}

// textfileWriterLoop starts the Node Exporter textfile collector writer (OPS-06).
func textfileWriterLoop(ctx context.Context, mc *metrics.MetricsCollector) {
	tw := metrics.NewTextfileWriter(mc, "", 0)
	tw.Start(ctx)
}

// feedFFmpegPIDsGauge periodically reads the monitor's ActiveFFmpegPIDs count.
func feedFFmpegPIDsGauge(ctx context.Context, mon *monitor.Monitor, mc *metrics.MetricsCollector) {
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	mc.GaugeSet("vod_engine_ffmpeg_pids", float64(mon.Snapshot().ActiveFFmpegPIDs))

	for {
		select {
		case <-ticker.C:
			snap := mon.Snapshot()
			mc.GaugeSet("vod_engine_ffmpeg_pids", float64(snap.ActiveFFmpegPIDs))
		case <-ctx.Done():
			return
		}
	}
}

// registerMetrics registers all the Prometheus metrics (OPS-16).
func registerMetrics(mc *metrics.MetricsCollector) {
	// Gauges
	mc.GaugeRegister("vod_engine_active_jobs", "Currently active encoding jobs")
	mc.GaugeRegister("vod_engine_pending_jobs", "Total pending jobs in queue")
	mc.GaugeRegister("vod_engine_dead_letter_jobs", "Jobs in dead-letter queue")
	mc.GaugeRegister("vod_engine_queue_oldest_age_seconds", "Age of oldest pending job")
	mc.GaugeRegister("vod_engine_ffmpeg_pids", "Number of active FFmpeg processes")

	// Counters (with status label)
	mc.CounterRegister("vod_engine_jobs_processed_total{status=\"success\"}", "Total successful jobs")
	mc.CounterRegister("vod_engine_jobs_processed_total{status=\"failed\"}", "Total failed jobs")
	mc.CounterRegister("vod_engine_jobs_processed_total{status=\"dead_letter\"}", "Total dead-letter jobs")

	// Resource blocked counters
	mc.CounterRegister("vod_engine_resource_blocked_total{resource=\"cpu\"}", "CPU blocks")
	mc.CounterRegister("vod_engine_resource_blocked_total{resource=\"ram\"}", "RAM blocks")
	mc.CounterRegister("vod_engine_resource_blocked_total{resource=\"swap\"}", "Swap blocks")
	mc.CounterRegister("vod_engine_resource_blocked_total{resource=\"disk\"}", "Disk blocks")
	mc.CounterRegister("vod_engine_resource_blocked_total{resource=\"disk_io\"}", "Disk I/O blocks")
	mc.CounterRegister("vod_engine_resource_blocked_total{resource=\"disk_quota\"}", "Disk quota blocks")
	mc.CounterRegister("vod_engine_resource_blocked_total{resource=\"network\"}", "Network blocks")
	mc.CounterRegister("vod_engine_resource_blocked_total{resource=\"workdir\"}", "Workdir blocks")

	// Histograms
	mc.HistogramRegister("vod_engine_encoding_duration_seconds",
		"Encoding duration histogram",
		map[string]string{"quality": "480p"},
		[]float64{60, 300, 600},
	)

	// Gauge for FFmpeg exit codes
	mc.GaugeRegister("vod_engine_ffmpeg_exit_code", "FFmpeg exit codes (label: lecture_id, quality)")

	// NEW: OBS-01: Watchdog kills
	mc.CounterRegister("vod_engine_watchdog_kills_total{reason=\"no_progress\"}", "Watchdog kills: no progress")
	mc.CounterRegister("vod_engine_watchdog_kills_total{reason=\"frozen_cpu\"}", "Watchdog kills: frozen CPU")
	mc.CounterRegister("vod_engine_watchdog_kills_total{reason=\"no_segments\"}", "Watchdog kills: no segments")

	// NEW: OBS-02: Guardian resumes
	mc.CounterRegister("vod_engine_guardian_resumes_total{resource=\"cpu_trend\"}", "Predictive guardian unblocks: cpu_trend")
	mc.CounterRegister("vod_engine_guardian_resumes_total{resource=\"ram_trend\"}", "Predictive guardian unblocks: ram_trend")

	// NEW: OBS-03: Worker state gauge
	mc.GaugeRegister("vod_engine_worker_state", "Worker state: 0=idle 1=downloading 2=encoding 3=uploading 4=cleaning")

	// NEW: OBS-04: Encoding stage gauge
	mc.GaugeRegister("vod_engine_encoding_stage", "Encoding stage: 0=waiting 1=downloading 2=encoding 3=uploading 4=webhook 5=cleaning")

	// NEW: OBS-05: Retry count histogram
	mc.HistogramRegister("vod_engine_retry_count", "Retry count distribution",
		map[string]string{}, []float64{0, 1, 2, 3, 5})

	// NEW: OBS-06: Circuit breaker metrics (registered by NewCircuitBreaker)
	// Already registered in the constructor
}
