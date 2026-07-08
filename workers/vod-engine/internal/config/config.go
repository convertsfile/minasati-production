package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"sync"
)

// Config holds all configuration for the VOD Engine.
// Every field is populated from environment variables with sensible defaults.
// The mutex protects runtime-mutable fields accessed across goroutines (OPS-18, M-03).
type Config struct {
	mu sync.RWMutex
	// Server
	Port              string
	AllowedOrigin     string
	LaravelURL        string
	LaravelPublicURL  string
	JWTSecret         string
	B2KeyID           string
	B2AppKey          string

	// Concurrency & Queue
	MaxConcurrentJobs int
	MaxQueueSize      int

	// Resource Guardian Thresholds
	MaxCPULoadAvg       float64
	RecoveryHysteresis  float64
	MinFreeRAMMB        int64
	MinFreeSwapMB       int64
	MinFreeDiskGB       int64
	MaxDiskIOPct        float64
	MaxNetworkMbps      float64
	MaxWorkDirUsageGB   int64

	// Refined thresholds (OPS-14)
	MaxPerJobDiskGB    int64  // default: 25

	// NVMe wear monitoring (OPS-22)
	NVMeWearWarnPct    int    // default: 80
	NVMeWearCritPct    int    // default: 95
	NVMeCheckIntervalM int    // default: 5

	// Resource block counters (for metrics tracking)
	ResourceBlockCPU   uint64
	ResourceBlockRAM   uint64
	ResourceBlockDisk  uint64
	ResourceBlockDiskIO uint64
	ResourceBlockNetwork uint64

	// FFmpeg Resource Limits
	CPUAffinityMask   string
	FFmpegThreads     int
	FFmpegPreset      string
	FFmpegNice        int
	FFmpegIoniceClass int
	FFmpegIoniceLevel int

	// Retry
	MaxRetries       int
	RetryBaseDelayS  int

	// Shutdown
	GracefulTimeoutS int

	// Polling
	ResourcePollIntervalS int
	MonitorIntervalS      int

	// Network
	DownloadRateLimitKbps int
	UploadConcurrency     int

	// HLS
	HLSSegmentDurationS  int
	HLSKeyframeInterval  int

	// Paths
	VODWorkDir       string
	VODQueueDir      string
	VODLogDir        string
	VODCrashDir      string // FFmpeg crash log dir (OPS-17)

	// Max stderr capture size (OPS-17)
	MaxStderrCaptureBytes int // default: 4096

	// === Watchdog (WDG) ===
	WatchdogProgressTimeoutS     int     // default: 30
	WatchdogCPUPollIntervalS     int     // default: 10
	WatchdogCPUIdleTimeoutS      int     // default: 60
	WatchdogCPUIdleThresholdPct  float64 // default: 1.0
	WatchdogSegmentPollIntervalS  int     // default: 15
	WatchdogSegmentStallTimeoutS  int     // default: 120
	WatchdogStallThreshold       int     // default: 3
	WatchdogTermWaitS            int     // default: 10
	WatchdogForceExitTimeoutS    int     // default: 30
	WatchdogShortVideoThresholdS  int     // default: 30
	WatchdogShortVideoTimeoutS    int     // default: 60

	// === Predictive Guardian (PRED) ===
	PredictiveHistorySize         int     // default: 60
	PredictiveMinSamples          int     // default: 10
	PredictiveTrendWindowCount    int     // default: 6
	PredictiveCPUSlopeThreshold   float64 // default: 0.05
	PredictiveLookaheadS          int     // default: 120
	PredictiveRecoveryFactor      int     // default: 3

	// === Circuit Breaker (CB) ===
	CBB2FailureThreshold          int     // default: 5
	CBB2RecoveryTimeoutS          int     // default: 60
	CBB2HalfOpenMaxRequests       int     // default: 3
	CBAPIFailureThreshold         int     // default: 5
	CBAPIRecoveryTimeoutS         int     // default: 30
	CBAPIHalfOpenMaxRequests      int     // default: 3
	CBAPIWebhookBufferSize        int     // default: 100
	CBB2JobDelayS                 int     // default: 30

	// === Telemetry ===
	TelemetrySampleIntervalS      int     // default: 10

	// === Storage (STORE-01) ===
	MinFreeDiskPct                float64 // default: 15.0

	// === Queue (QUEUE-01) ===
	MaxJobAgeHours                int     // default: 24
	ActiveGroupsGCIntervalM       int     // default: 60
}

func Load() *Config {
	return &Config{
		Port:              getEnv("PORT", "8080"),
		AllowedOrigin:     getEnv("ALLOWED_ADMIN_ORIGIN", "http://localhost:3000"),
		LaravelURL:        getEnv("LARAVEL_URL", "http://127.0.0.1:8000"),
		LaravelPublicURL:  getEnv("LARAVEL_PUBLIC_URL", "http://127.0.0.1:8000"),
		JWTSecret:         os.Getenv("JWT_SECRET"),
		B2KeyID:           os.Getenv("B2_KEY_ID"),
		B2AppKey:          os.Getenv("B2_APP_KEY"),

		MaxConcurrentJobs: getEnvInt("MAX_CONCURRENT_JOBS", 1),
		MaxQueueSize:      getEnvInt("MAX_QUEUE_SIZE", 1000),

		MaxCPULoadAvg:      getEnvFloat("MAX_CPU_LOAD_AVG", 4.5),
		RecoveryHysteresis: getEnvFloat("RECOVERY_HYSTERESIS", 0.5),
		MinFreeRAMMB:       getEnvInt64("MIN_FREE_RAM_MB", 1536),
		MinFreeSwapMB:      getEnvInt64("MIN_FREE_SWAP_MB", 1024),
		MinFreeDiskGB:      getEnvInt64("MIN_FREE_DISK_GB", 15),
		MaxDiskIOPct:       getEnvFloat("MAX_DISK_IO_PCT", 75.0),
		MaxNetworkMbps:     getEnvFloat("MAX_NETWORK_MBPS", 225.0),
		MaxWorkDirUsageGB:  getEnvInt64("MAX_WORK_DIR_USAGE_GB", 75),

		MaxPerJobDiskGB:    getEnvInt64("MAX_PER_JOB_DISK_GB", 25),

		NVMeWearWarnPct:    getEnvInt("NVME_WEAR_WARN_PCT", 80),
		NVMeWearCritPct:    getEnvInt("NVME_WEAR_CRIT_PCT", 95),
		NVMeCheckIntervalM: getEnvInt("NVME_CHECK_INTERVAL_M", 5),

		CPUAffinityMask:   getEnv("CPU_AFFINITY_MASK", "0-4"),
		FFmpegThreads:     getEnvInt("FFMPEG_THREADS", 4), // FFMPEG-01: changed from 2 to 4
		FFmpegPreset:      getEnv("FFMPEG_PRESET", "medium"),
		FFmpegNice:        getEnvInt("FFMPEG_NICE", 15),
		FFmpegIoniceClass: getEnvInt("FFMPEG_IONICE_CLASS", 2),
		FFmpegIoniceLevel: getEnvInt("FFMPEG_IONICE_LEVEL", 7),

		MaxRetries:       getEnvInt("MAX_RETRIES", 3),
		RetryBaseDelayS:  getEnvInt("RETRY_BASE_DELAY_S", 30),

		GracefulTimeoutS: getEnvInt("GRACEFUL_TIMEOUT_S", 300),

		ResourcePollIntervalS: getEnvInt("RESOURCE_POLL_INTERVAL_S", 10),
		MonitorIntervalS:      getEnvInt("MONITOR_INTERVAL_S", 5),

		DownloadRateLimitKbps: getEnvInt("DOWNLOAD_RATE_LIMIT_KBPS", 0),
		UploadConcurrency:     getEnvInt("UPLOAD_CONCURRENCY", 3),

		HLSSegmentDurationS: getEnvInt("HLS_SEGMENT_DURATION_S", 6),
		HLSKeyframeInterval: getEnvInt("HLS_KEYFRAME_INTERVAL", 48),

		VODWorkDir:  getEnv("VOD_WORK_DIR", "/var/tmp/vod-engine"),
		VODQueueDir: getEnv("VOD_QUEUE_DIR", "/var/lib/vod-engine/queue"),
		VODLogDir:   getEnv("VOD_LOG_DIR", "/var/log/vod-engine"),
		VODCrashDir: getEnv("VOD_CRASH_DIR", "/var/log/vod-engine/crash"),

		// === Watchdog ===
		WatchdogProgressTimeoutS:     getEnvInt("WATCHDOG_PROGRESS_TIMEOUT_S", 30),
		WatchdogCPUPollIntervalS:     getEnvInt("WATCHDOG_CPU_POLL_INTERVAL_S", 10),
		WatchdogCPUIdleTimeoutS:      getEnvInt("WATCHDOG_CPU_IDLE_TIMEOUT_S", 60),
		WatchdogCPUIdleThresholdPct:  getEnvFloat("WATCHDOG_CPU_IDLE_THRESHOLD_PCT", 1.0),
		WatchdogSegmentPollIntervalS:  getEnvInt("WATCHDOG_SEGMENT_POLL_INTERVAL_S", 15),
		WatchdogSegmentStallTimeoutS:  getEnvInt("WATCHDOG_SEGMENT_STALL_TIMEOUT_S", 120),
		WatchdogStallThreshold:       getEnvInt("WATCHDOG_STALL_THRESHOLD", 3),
		WatchdogTermWaitS:            getEnvInt("WATCHDOG_TERM_WAIT_S", 10),
		WatchdogForceExitTimeoutS:    getEnvInt("WATCHDOG_FORCE_EXIT_TIMEOUT_S", 30),
		WatchdogShortVideoThresholdS:  getEnvInt("WATCHDOG_SHORT_VIDEO_THRESHOLD_S", 30),
		WatchdogShortVideoTimeoutS:    getEnvInt("WATCHDOG_SHORT_VIDEO_TIMEOUT_S", 60),

		// === Predictive Guardian ===
		PredictiveHistorySize:       getEnvInt("PREDICTIVE_HISTORY_SIZE", 60),
		PredictiveMinSamples:        getEnvInt("PREDICTIVE_MIN_SAMPLES", 10),
		PredictiveTrendWindowCount:  getEnvInt("PREDICTIVE_TREND_WINDOW_COUNT", 6),
		PredictiveCPUSlopeThreshold: getEnvFloat("PREDICTIVE_CPU_SLOPE_THRESHOLD", 0.05),
		PredictiveLookaheadS:        getEnvInt("PREDICTIVE_LOOKAHEAD_S", 120),
		PredictiveRecoveryFactor:    getEnvInt("PREDICTIVE_RECOVERY_FACTOR", 3),

		// === Circuit Breaker ===
		CBB2FailureThreshold:     getEnvInt("CB_B2_FAILURE_THRESHOLD", 5),
		CBB2RecoveryTimeoutS:     getEnvInt("CB_B2_RECOVERY_TIMEOUT_S", 60),
		CBB2HalfOpenMaxRequests:  getEnvInt("CB_B2_HALF_OPEN_MAX_REQUESTS", 3),
		CBAPIFailureThreshold:    getEnvInt("CB_API_FAILURE_THRESHOLD", 5),
		CBAPIRecoveryTimeoutS:    getEnvInt("CB_API_RECOVERY_TIMEOUT_S", 30),
		CBAPIHalfOpenMaxRequests: getEnvInt("CB_API_HALF_OPEN_MAX_REQUESTS", 3),
		CBAPIWebhookBufferSize:   getEnvInt("CB_API_WEBHOOK_BUFFER_SIZE", 100),
		CBB2JobDelayS:            getEnvInt("CB_B2_JOB_DELAY_S", 30),

		// === Telemetry ===
		TelemetrySampleIntervalS: getEnvInt("TELEMETRY_SAMPLE_INTERVAL_S", 10),

		// === Storage ===
		MinFreeDiskPct: getEnvFloat("MIN_FREE_DISK_PCT", 15.0),

		// === Queue ===
		MaxJobAgeHours:          getEnvInt("MAX_JOB_AGE_HOURS", 24),
		ActiveGroupsGCIntervalM: getEnvInt("ACTIVE_GROUPS_GC_INTERVAL_M", 60),

		MaxStderrCaptureBytes: getEnvInt("MAX_STDERR_CAPTURE_BYTES", 4096),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func getEnvInt64(key string, fallback int64) int64 {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			return n
		}
	}
	return fallback
}

func getEnvFloat(key string, fallback float64) float64 {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.ParseFloat(v, 64); err == nil {
			return n
		}
	}
	return fallback
}

// Validate checks all configuration values and returns an error if any are invalid (SEC-06).
func (c *Config) Validate() error {
	c.RLock()
	defer c.RUnlock()

	var errs []string

	// Watchdog timeouts must be > 0
	if c.WatchdogProgressTimeoutS <= 0 {
		errs = append(errs, "WATCHDOG_PROGRESS_TIMEOUT_S must be > 0")
	}
	if c.WatchdogCPUPollIntervalS <= 0 {
		errs = append(errs, "WATCHDOG_CPU_POLL_INTERVAL_S must be > 0")
	}
	if c.WatchdogCPUIdleTimeoutS <= 0 {
		errs = append(errs, "WATCHDOG_CPU_IDLE_TIMEOUT_S must be > 0")
	}
	if c.WatchdogCPUIdleThresholdPct <= 0 {
		errs = append(errs, "WATCHDOG_CPU_IDLE_THRESHOLD_PCT must be > 0")
	}
	if c.WatchdogSegmentPollIntervalS <= 0 {
		errs = append(errs, "WATCHDOG_SEGMENT_POLL_INTERVAL_S must be > 0")
	}
	if c.WatchdogSegmentStallTimeoutS <= 0 {
		errs = append(errs, "WATCHDOG_SEGMENT_STALL_TIMEOUT_S must be > 0")
	}
	if c.WatchdogStallThreshold <= 0 {
		errs = append(errs, "WATCHDOG_STALL_THRESHOLD must be > 0")
	}
	if c.WatchdogTermWaitS <= 0 {
		errs = append(errs, "WATCHDOG_TERM_WAIT_S must be > 0")
	}
	if c.WatchdogForceExitTimeoutS <= 0 {
		errs = append(errs, "WATCHDOG_FORCE_EXIT_TIMEOUT_S must be > 0")
	}
	if c.WatchdogShortVideoThresholdS <= 0 {
		errs = append(errs, "WATCHDOG_SHORT_VIDEO_THRESHOLD_S must be > 0")
	}
	if c.WatchdogShortVideoTimeoutS <= 0 {
		errs = append(errs, "WATCHDOG_SHORT_VIDEO_TIMEOUT_S must be > 0")
	}

	// Predictive guardian
	if c.PredictiveHistorySize <= 0 {
		errs = append(errs, "PREDICTIVE_HISTORY_SIZE must be > 0")
	}
	if c.PredictiveMinSamples <= 0 {
		errs = append(errs, "PREDICTIVE_MIN_SAMPLES must be > 0")
	}
	if c.PredictiveTrendWindowCount <= 0 {
		errs = append(errs, "PREDICTIVE_TREND_WINDOW_COUNT must be > 0")
	}
	if c.PredictiveCPUSlopeThreshold <= 0 {
		errs = append(errs, "PREDICTIVE_CPU_SLOPE_THRESHOLD must be > 0")
	}
	if c.PredictiveLookaheadS <= 0 {
		errs = append(errs, "PREDICTIVE_LOOKAHEAD_S must be > 0")
	}
	if c.PredictiveRecoveryFactor < 1 {
		errs = append(errs, "PREDICTIVE_RECOVERY_FACTOR must be >= 1")
	}

	// Circuit breaker
	if c.CBB2FailureThreshold <= 0 {
		errs = append(errs, "CB_B2_FAILURE_THRESHOLD must be > 0")
	}
	if c.CBB2RecoveryTimeoutS <= 0 {
		errs = append(errs, "CB_B2_RECOVERY_TIMEOUT_S must be > 0")
	}
	if c.CBB2HalfOpenMaxRequests < 1 {
		errs = append(errs, "CB_B2_HALF_OPEN_MAX_REQUESTS must be >= 1")
	}
	if c.CBAPIFailureThreshold <= 0 {
		errs = append(errs, "CB_API_FAILURE_THRESHOLD must be > 0")
	}
	if c.CBAPIRecoveryTimeoutS <= 0 {
		errs = append(errs, "CB_API_RECOVERY_TIMEOUT_S must be > 0")
	}
	if c.CBAPIHalfOpenMaxRequests < 1 {
		errs = append(errs, "CB_API_HALF_OPEN_MAX_REQUESTS must be >= 1")
	}
	if c.CBAPIWebhookBufferSize < 10 {
		errs = append(errs, "CB_API_WEBHOOK_BUFFER_SIZE must be >= 10")
	}
	if c.CBB2JobDelayS < 0 {
		errs = append(errs, "CB_B2_JOB_DELAY_S must be >= 0")
	}

	// Telemetry
	if c.TelemetrySampleIntervalS <= 0 {
		errs = append(errs, "TELEMETRY_SAMPLE_INTERVAL_S must be > 0")
	}

	// Storage
	if c.MinFreeDiskPct < 1 || c.MinFreeDiskPct > 100 {
		errs = append(errs, "MIN_FREE_DISK_PCT must be between 1 and 100")
	}

	// Queue
	if c.MaxJobAgeHours <= 0 {
		errs = append(errs, "MAX_JOB_AGE_HOURS must be > 0")
	}
	if c.ActiveGroupsGCIntervalM <= 0 {
		errs = append(errs, "ACTIVE_GROUPS_GC_INTERVAL_M must be > 0")
	}

	if len(errs) > 0 {
		return fmt.Errorf("config validation failed:\n%s", strings.Join(errs, "\n"))
	}
	return nil
}

// Lock acquires the write lock for thread-safe config updates (OPS-18, M-03).
func (c *Config) Lock() {
	c.mu.Lock()
}

// Unlock releases the write lock.
func (c *Config) Unlock() {
	c.mu.Unlock()
}

// RLock acquires the read lock for concurrent-safe config reads.
func (c *Config) RLock() {
	c.mu.RLock()
}

// RUnlock releases the read lock.
func (c *Config) RUnlock() {
	c.mu.RUnlock()
}

// WithRLock executes fn under a read lock and automatically releases it (m-04).
func (c *Config) WithRLock(fn func()) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	fn()
}

// WithLock executes fn under a write lock and automatically releases it (m-04).
func (c *Config) WithLock(fn func()) {
	c.mu.Lock()
	defer c.mu.Unlock()
	fn()
}
