package config

import (
	"os"
	"strings"
	"testing"
)

func TestLoadDefaults(t *testing.T) {
	// Clear relevant env vars before test
	clearEnvVars()
	defer clearEnvVars()

	cfg := Load()

	// Server
	if cfg.Port != "8080" {
		t.Errorf("expected Port '8080', got %q", cfg.Port)
	}
	if cfg.AllowedOrigin != "http://localhost:3000" {
		t.Errorf("expected AllowedOrigin 'http://localhost:3000', got %q", cfg.AllowedOrigin)
	}

	// Concurrency & Queue
	if cfg.MaxConcurrentJobs != 1 {
		t.Errorf("expected MaxConcurrentJobs 1, got %d", cfg.MaxConcurrentJobs)
	}
	if cfg.MaxQueueSize != 1000 {
		t.Errorf("expected MaxQueueSize 1000, got %d", cfg.MaxQueueSize)
	}

	// Resource Guardian Thresholds (OPS-14)
	if cfg.MaxCPULoadAvg != 4.5 {
		t.Errorf("expected MaxCPULoadAvg 4.5, got %f", cfg.MaxCPULoadAvg)
	}
	if cfg.RecoveryHysteresis != 0.5 {
		t.Errorf("expected RecoveryHysteresis 0.5, got %f", cfg.RecoveryHysteresis)
	}
	if cfg.MinFreeRAMMB != 1536 {
		t.Errorf("expected MinFreeRAMMB 1536, got %d", cfg.MinFreeRAMMB)
	}
	if cfg.MinFreeSwapMB != 1024 {
		t.Errorf("expected MinFreeSwapMB 1024, got %d", cfg.MinFreeSwapMB)
	}
	if cfg.MinFreeDiskGB != 15 {
		t.Errorf("expected MinFreeDiskGB 15, got %d", cfg.MinFreeDiskGB)
	}
	if cfg.MaxDiskIOPct != 75.0 {
		t.Errorf("expected MaxDiskIOPct 75.0, got %f", cfg.MaxDiskIOPct)
	}
	if cfg.MaxNetworkMbps != 225.0 {
		t.Errorf("expected MaxNetworkMbps 225.0, got %f", cfg.MaxNetworkMbps)
	}
	if cfg.MaxWorkDirUsageGB != 75 {
		t.Errorf("expected MaxWorkDirUsageGB 75, got %d", cfg.MaxWorkDirUsageGB)
	}
	if cfg.MaxPerJobDiskGB != 25 {
		t.Errorf("expected MaxPerJobDiskGB 25, got %d", cfg.MaxPerJobDiskGB)
	}

	// NVMe wear (OPS-22)
	if cfg.NVMeWearWarnPct != 80 {
		t.Errorf("expected NVMeWearWarnPct 80, got %d", cfg.NVMeWearWarnPct)
	}
	if cfg.NVMeWearCritPct != 95 {
		t.Errorf("expected NVMeWearCritPct 95, got %d", cfg.NVMeWearCritPct)
	}
	if cfg.NVMeCheckIntervalM != 5 {
		t.Errorf("expected NVMeCheckIntervalM 5, got %d", cfg.NVMeCheckIntervalM)
	}

	// FFmpeg
	if cfg.FFmpegThreads != 4 {
		t.Errorf("expected FFmpegThreads 4 (FFMPEG-01), got %d", cfg.FFmpegThreads)
	}
	if cfg.FFmpegPreset != "medium" {
		t.Errorf("expected FFmpegPreset 'medium', got %q", cfg.FFmpegPreset)
	}
	if cfg.FFmpegNice != 15 {
		t.Errorf("expected FFmpegNice 15, got %d", cfg.FFmpegNice)
	}
	if cfg.FFmpegIoniceClass != 2 {
		t.Errorf("expected FFmpegIoniceClass 2, got %d", cfg.FFmpegIoniceClass)
	}

	// Retry
	if cfg.MaxRetries != 3 {
		t.Errorf("expected MaxRetries 3, got %d", cfg.MaxRetries)
	}
	if cfg.RetryBaseDelayS != 30 {
		t.Errorf("expected RetryBaseDelayS 30, got %d", cfg.RetryBaseDelayS)
	}

	// Shutdown
	if cfg.GracefulTimeoutS != 300 {
		t.Errorf("expected GracefulTimeoutS 300, got %d", cfg.GracefulTimeoutS)
	}

	// Polling
	if cfg.ResourcePollIntervalS != 10 {
		t.Errorf("expected ResourcePollIntervalS 10, got %d", cfg.ResourcePollIntervalS)
	}

	// Network
	if cfg.UploadConcurrency != 3 {
		t.Errorf("expected UploadConcurrency 3, got %d", cfg.UploadConcurrency)
	}

	// Paths
	if cfg.VODWorkDir != "/var/tmp/vod-engine" {
		t.Errorf("expected VODWorkDir '/var/tmp/vod-engine', got %q", cfg.VODWorkDir)
	}
	if cfg.VODCrashDir != "/var/log/vod-engine/crash" {
		t.Errorf("expected VODCrashDir '/var/log/vod-engine/crash', got %q", cfg.VODCrashDir)
	}

	// Stderr capture
	if cfg.MaxStderrCaptureBytes != 4096 {
		t.Errorf("expected MaxStderrCaptureBytes 4096, got %d", cfg.MaxStderrCaptureBytes)
	}
}

func TestLoadFromEnv(t *testing.T) {
	clearEnvVars()

	// Set specific env vars
	os.Setenv("PORT", "9090")
	os.Setenv("MAX_CONCURRENT_JOBS", "2")
	os.Setenv("MAX_CPU_LOAD_AVG", "3.5")
	os.Setenv("MIN_FREE_RAM_MB", "2048")
	os.Setenv("VOD_WORK_DIR", "/custom/work")
	os.Setenv("JWT_SECRET", "test-secret")

	defer func() {
		os.Unsetenv("PORT")
		os.Unsetenv("MAX_CONCURRENT_JOBS")
		os.Unsetenv("MAX_CPU_LOAD_AVG")
		os.Unsetenv("MIN_FREE_RAM_MB")
		os.Unsetenv("VOD_WORK_DIR")
		os.Unsetenv("JWT_SECRET")
	}()

	cfg := Load()

	if cfg.Port != "9090" {
		t.Errorf("expected Port '9090', got %q", cfg.Port)
	}
	if cfg.MaxConcurrentJobs != 2 {
		t.Errorf("expected MaxConcurrentJobs 2, got %d", cfg.MaxConcurrentJobs)
	}
	if cfg.MaxCPULoadAvg != 3.5 {
		t.Errorf("expected MaxCPULoadAvg 3.5, got %f", cfg.MaxCPULoadAvg)
	}
	if cfg.MinFreeRAMMB != 2048 {
		t.Errorf("expected MinFreeRAMMB 2048, got %d", cfg.MinFreeRAMMB)
	}
	if cfg.VODWorkDir != "/custom/work" {
		t.Errorf("expected VODWorkDir '/custom/work', got %q", cfg.VODWorkDir)
	}
	if cfg.JWTSecret != "test-secret" {
		t.Errorf("expected JWTSecret 'test-secret', got %q", cfg.JWTSecret)
	}
}

func TestLoadJWTSecret(t *testing.T) {
	clearEnvVars()

	// JWT_SECRET not set
	cfg := Load()
	if cfg.JWTSecret != "" {
		t.Errorf("expected empty JWTSecret, got %q", cfg.JWTSecret)
	}

	// Set JWT_SECRET
	os.Setenv("JWT_SECRET", "my-secret-key")
	defer os.Unsetenv("JWT_SECRET")

	cfg = Load()
	if cfg.JWTSecret != "my-secret-key" {
		t.Errorf("expected JWTSecret 'my-secret-key', got %q", cfg.JWTSecret)
	}
}

func TestGetEnvInt(t *testing.T) {
	os.Setenv("TEST_INT", "42")
	defer os.Unsetenv("TEST_INT")

	val := getEnvInt("TEST_INT", 0)
	if val != 42 {
		t.Errorf("expected 42, got %d", val)
	}

	// Fallback
	val = getEnvInt("NONEXISTENT", 99)
	if val != 99 {
		t.Errorf("expected 99, got %d", val)
	}

	// Invalid value
	os.Setenv("TEST_INVALID", "not-a-number")
	val = getEnvInt("TEST_INVALID", 10)
	if val != 10 {
		t.Errorf("expected 10 (fallback), got %d", val)
	}
}

func TestGetEnvFloat(t *testing.T) {
	os.Setenv("TEST_FLOAT", "3.14")
	defer os.Unsetenv("TEST_FLOAT")

	val := getEnvFloat("TEST_FLOAT", 0)
	if val != 3.14 {
		t.Errorf("expected 3.14, got %f", val)
	}

	// Fallback
	val = getEnvFloat("NONEXISTENT", 1.5)
	if val != 1.5 {
		t.Errorf("expected 1.5, got %f", val)
	}
}

func TestGetEnvInt64(t *testing.T) {
	os.Setenv("TEST_INT64", "8589934592") // 8GB
	defer os.Unsetenv("TEST_INT64")

	val := getEnvInt64("TEST_INT64", 0)
	if val != 8589934592 {
		t.Errorf("expected 8589934592, got %d", val)
	}

	// Fallback
	val = getEnvInt64("NONEXISTENT", 999)
	if val != 999 {
		t.Errorf("expected 999, got %d", val)
	}
}

func TestGetEnv(t *testing.T) {
	os.Setenv("TEST_STRING", "hello")
	defer os.Unsetenv("TEST_STRING")

	val := getEnv("TEST_STRING", "fallback")
	if val != "hello" {
		t.Errorf("expected 'hello', got %q", val)
	}

	val = getEnv("NONEXISTENT", "fallback")
	if val != "fallback" {
		t.Errorf("expected 'fallback', got %q", val)
	}

	// Empty string should use fallback
	os.Setenv("TEST_EMPTY", "")
	val = getEnv("TEST_EMPTY", "empty-fallback")
	if val != "empty-fallback" {
		t.Errorf("expected 'empty-fallback', got %q", val)
	}
}

// ===== Validate() tests (M-03) =====

func TestValidateValid(t *testing.T) {
	clearEnvVars()
	cfg := Load()
	if err := cfg.Validate(); err != nil {
		t.Errorf("expected nil error for valid config, got: %v", err)
	}
}

func TestValidateWatchdogTimeoutZero(t *testing.T) {
	clearEnvVars()
	cfg := Load()
	cfg.WatchdogProgressTimeoutS = 0
	err := cfg.Validate()
	if err == nil {
		t.Error("expected error for WATCHDOG_PROGRESS_TIMEOUT_S = 0, got nil")
	}
}

func TestValidatePredictiveThresholdZero(t *testing.T) {
	clearEnvVars()
	cfg := Load()
	cfg.PredictiveCPUSlopeThreshold = 0
	err := cfg.Validate()
	if err == nil {
		t.Error("expected error for PREDICTIVE_CPU_SLOPE_THRESHOLD = 0, got nil")
	}
}

func TestValidateRecoveryFactorZero(t *testing.T) {
	clearEnvVars()
	cfg := Load()
	cfg.PredictiveRecoveryFactor = 0
	err := cfg.Validate()
	if err == nil {
		t.Error("expected error for PREDICTIVE_RECOVERY_FACTOR = 0 (< 1), got nil")
	}
}

func TestValidateWebhookBufferSizeTooSmall(t *testing.T) {
	clearEnvVars()
	cfg := Load()
	cfg.CBAPIWebhookBufferSize = 5
	err := cfg.Validate()
	if err == nil {
		t.Error("expected error for CB_API_WEBHOOK_BUFFER_SIZE = 5 (< 10), got nil")
	}
}

func TestValidateMinFreeDiskPctBelowRange(t *testing.T) {
	clearEnvVars()
	cfg := Load()
	cfg.MinFreeDiskPct = 0
	err := cfg.Validate()
	if err == nil {
		t.Error("expected error for MIN_FREE_DISK_PCT = 0 (< 1), got nil")
	}
}

func TestValidateMinFreeDiskPctAboveRange(t *testing.T) {
	clearEnvVars()
	cfg := Load()
	cfg.MinFreeDiskPct = 150
	err := cfg.Validate()
	if err == nil {
		t.Error("expected error for MIN_FREE_DISK_PCT = 150 (> 100), got nil")
	}
}

func TestValidateMultipleErrors(t *testing.T) {
	clearEnvVars()
	cfg := Load()
	// Set multiple invalid values
	cfg.WatchdogProgressTimeoutS = -1
	cfg.WatchdogCPUPollIntervalS = -1
	cfg.PredictiveLookaheadS = 0
	cfg.PredictiveRecoveryFactor = 0
	cfg.CBB2FailureThreshold = 0
	cfg.MinFreeDiskPct = 0
	cfg.CBAPIWebhookBufferSize = 1
	cfg.MaxJobAgeHours = 0

	err := cfg.Validate()
	if err == nil {
		t.Fatal("expected error for multiple invalid fields, got nil")
	}

	errStr := err.Error()
	// All errors should be reported, not just the first
	checks := []string{
		"WATCHDOG_PROGRESS_TIMEOUT_S",
		"WATCHDOG_CPU_POLL_INTERVAL_S",
		"PREDICTIVE_LOOKAHEAD_S",
		"PREDICTIVE_RECOVERY_FACTOR",
		"CB_B2_FAILURE_THRESHOLD",
		"MIN_FREE_DISK_PCT",
		"CB_API_WEBHOOK_BUFFER_SIZE",
		"MAX_JOB_AGE_HOURS",
	}
	for _, field := range checks {
		if !strings.Contains(errStr, field) {
			t.Errorf("expected error message to contain %q", field)
		}
	}
}

func TestValidateNegativeCBJobDelay(t *testing.T) {
	clearEnvVars()
	cfg := Load()
	cfg.CBB2JobDelayS = -1
	err := cfg.Validate()
	if err == nil {
		t.Error("expected error for CB_B2_JOB_DELAY_S = -1 (< 0), got nil")
	}
}

func clearEnvVars() {
	envVars := []string{
		// Server
		"PORT", "ALLOWED_ADMIN_ORIGIN", "LARAVEL_URL", "LARAVEL_PUBLIC_URL",
		"JWT_SECRET", "B2_KEY_ID", "B2_APP_KEY",
		// Concurrency & Queue
		"MAX_CONCURRENT_JOBS", "MAX_QUEUE_SIZE",
		// Resource Guardian Thresholds
		"MAX_CPU_LOAD_AVG", "RECOVERY_HYSTERESIS", "MIN_FREE_RAM_MB",
		"MIN_FREE_SWAP_MB", "MIN_FREE_DISK_GB", "MAX_DISK_IO_PCT",
		"MAX_NETWORK_MBPS", "MAX_WORK_DIR_USAGE_GB", "MAX_PER_JOB_DISK_GB",
		// NVMe wear
		"NVME_WEAR_WARN_PCT", "NVME_WEAR_CRIT_PCT", "NVME_CHECK_INTERVAL_M",
		// FFmpeg
		"CPU_AFFINITY_MASK", "FFMPEG_THREADS", "FFMPEG_PRESET",
		"FFMPEG_NICE", "FFMPEG_IONICE_CLASS", "FFMPEG_IONICE_LEVEL",
		// Retry
		"MAX_RETRIES", "RETRY_BASE_DELAY_S",
		// Shutdown
		"GRACEFUL_TIMEOUT_S",
		// Polling
		"RESOURCE_POLL_INTERVAL_S", "MONITOR_INTERVAL_S",
		// Network
		"DOWNLOAD_RATE_LIMIT_KBPS", "UPLOAD_CONCURRENCY",
		// HLS
		"HLS_SEGMENT_DURATION_S", "HLS_KEYFRAME_INTERVAL",
		// Paths
		"VOD_WORK_DIR", "VOD_QUEUE_DIR", "VOD_LOG_DIR", "VOD_CRASH_DIR",
		"MAX_STDERR_CAPTURE_BYTES",
		// === Watchdog (WDG) ===
		"WATCHDOG_PROGRESS_TIMEOUT_S",
		"WATCHDOG_CPU_POLL_INTERVAL_S",
		"WATCHDOG_CPU_IDLE_TIMEOUT_S",
		"WATCHDOG_CPU_IDLE_THRESHOLD_PCT",
		"WATCHDOG_SEGMENT_POLL_INTERVAL_S",
		"WATCHDOG_SEGMENT_STALL_TIMEOUT_S",
		"WATCHDOG_STALL_THRESHOLD",
		"WATCHDOG_TERM_WAIT_S",
		"WATCHDOG_FORCE_EXIT_TIMEOUT_S",
		"WATCHDOG_SHORT_VIDEO_THRESHOLD_S",
		"WATCHDOG_SHORT_VIDEO_TIMEOUT_S",
		// === Predictive Guardian (PRED) ===
		"PREDICTIVE_HISTORY_SIZE",
		"PREDICTIVE_MIN_SAMPLES",
		"PREDICTIVE_TREND_WINDOW_COUNT",
		"PREDICTIVE_CPU_SLOPE_THRESHOLD",
		"PREDICTIVE_LOOKAHEAD_S",
		"PREDICTIVE_RECOVERY_FACTOR",
		// === Circuit Breaker (CB) ===
		"CB_B2_FAILURE_THRESHOLD",
		"CB_B2_RECOVERY_TIMEOUT_S",
		"CB_B2_HALF_OPEN_MAX_REQUESTS",
		"CB_API_FAILURE_THRESHOLD",
		"CB_API_RECOVERY_TIMEOUT_S",
		"CB_API_HALF_OPEN_MAX_REQUESTS",
		"CB_API_WEBHOOK_BUFFER_SIZE",
		"CB_B2_JOB_DELAY_S",
		// === Telemetry ===
		"TELEMETRY_SAMPLE_INTERVAL_S",
		// === Storage ===
		"MIN_FREE_DISK_PCT",
		// === Queue ===
		"MAX_JOB_AGE_HOURS",
		"ACTIVE_GROUPS_GC_INTERVAL_M",
	}
	for _, v := range envVars {
		os.Unsetenv(v)
	}
}
