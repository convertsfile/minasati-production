# Implementation Plan — VOD Encoding Production Readiness Upgrade

## Overview

Transform the VOD Engine (Go) from a stable encoding server into a self-healing, fully observable production system with predictive resource management, automatic failure recovery, and complete per-job telemetry.

This plan builds on the existing foundation from `video-encoding-pipeline-redesign` (26 scenarios, priority queue + resource guardian + FFmpeg isolation) and `vod-encoding-ops-hardening` (23 scenarios, telemetry, metrics, OS hardening). All those scenarios must be passing before this plan is applied.

**Risk Level:** HIGH — core infrastructure enhancement. Adds a watchdog (process supervision), predictive guardian (trend analysis), circuit breakers (self-healing external dependency protection), and comprehensive structured logging. Every component of the encoding pipeline is touched.

**Prerequisite Verification:**
- All 26 scenarios from `video-encoding-pipeline-redesign` passing
- All 23 scenarios from `vod-encoding-ops-hardening` passing
- VOD Engine v2.x running as systemd service
- FFmpeg 6.0+ installed at `/usr/bin/ffmpeg`

---

## Architecture

### New & Modified Components

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  Production Readiness Layer (THIS FEATURE)                                          │
│                                                                                     │
│  ┌──────────────────────────────────┐   ┌──────────────────────────────────────┐   │
│  │  watchdog/                       │   │  circuitbreaker/                     │   │
│  │  ┌────────────────────────────┐  │   │  ┌─────────────────────────────────┐│   │
│  │  │ watchdog.go                │  │   │  │ circuitbreaker.go               ││   │
│  │  │  • Progress monitor        │  │   │  │  • CLOSED/OPEN/HALF_OPEN FSM    ││   │
│  │  │  • CPU activity monitor    │  │   │  │  • Per-service instances        ││   │
│  │  │  • HLS segment monitor     │  │   │  │  • Auto-recovery via probes     ││   │
│  │  │  • Safe termination        │  │   │  │  • Metrics integration          ││   │
│  │  │  • Short-video handling    │  │   │  └─────────────────────────────────┘│   │
│  │  └────────────────────────────┘  │   │  ┌─────────────────────────────────┐│   │
│  └──────────────────────────────────┘   │  │ webhook_buffer.go                ││   │
│                                          │  │  • Bounded FIFO queue           ││   │
│  ┌──────────────────────────────────┐   │  │  • Circuit-aware draining       ││   │
│  │  guardian/predictive.go         │   │  └─────────────────────────────────┘│   │
│  │  ┌────────────────────────────┐  │   └──────────────────────────────────────┘   │
│  │  │ Predictive Guardian        │  │                                              │
│  │  │  • Ring buffer (60 samples) │  │   ┌──────────────────────────────────────┐   │
│  │  │  • Linear regression trend │  │   │  logging/                             │   │
│  │  │  • CPU/RAM prediction      │  │   │  ┌─────────────────────────────────┐│   │
│  │  │  • Hysteresis unblocking   │  │   │  │ correlation.go                  ││   │
│  │  └────────────────────────────┘  │   │  │  • UUIDv4 generation            ││   │
│  └──────────────────────────────────┘   │  │  • Component tagging             ││   │
│                                          │  └─────────────────────────────────┘│   │
│  ┌──────────────────────────────────┐   └──────────────────────────────────────┘   │
│  │  Modified components:            │                                              │
│  │  • config/config.go (+36 vars)  │   ┌──────────────────────────────────────┐   │
│  │  • encoding/pipeline.go         │   │  deploy/systemd/                     │   │
│  │    (+watchdog integration)      │   │  ┌─────────────────────────────────┐│   │
│  │  • encoding/ffmpeg.go           │   │  │ vod-engine.service              ││   │
│  │    (threads 2→4, OOM score)     │   │  │  • CPUQuota=400%                ││   │
│  │  • telemetry/telemetry.go       │   │  │  • TasksMax=128                 ││   │
│  │    (+5 new telemetry fields)    │   │  │  • LimitNPROC=64                ││   │
│  │  • worker/pool.go               │   │  │  • IOWeight=50                  ││   │
│  │    (+predictive guardian,       │   │  └─────────────────────────────────┘│   │
│  │      circuit breaker delays,    │   └──────────────────────────────────────┘   │
│  │      activeGroups GC)           │                                              │
│  │  • metrics/metrics.go           │                                              │
│  │    (+6 new metric families)     │                                              │
│  │  • queue/job.go (+TeacherID)    │                                              │
│  │  • api/handlers/process.go      │                                              │
│  │    (+teacher_id in request)     │                                              │
│  │  • cmd/api/main.go              │                                              │
│  │    (+wiring for new components) │                                              │
│  └──────────────────────────────────┘                                              │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow (Watchdog + Predictive + Circuit Breaker)

```
FFmpeg Process
  │ stdout: out_time_us=..., fps=...
  │
  ├──→ watchdog.Watchdog (per-job goroutine)
  │      │  Monitor stdout every WATCHDOG_PROGRESS_TIMEOUT_S (30s)
  │      │  Monitor /proc/<pid>/stat every WATCHDOG_CPU_POLL_INTERVAL_S (10s)
  │      │  Monitor output .ts directory every WATCHDOG_SEGMENT_POLL_INTERVAL_S (15s)
  │      │
  │      ├──→ Stall detected → SIGTERM → SIGKILL → job retryable (ERR_WATCHDOG_KILL)
  │      └──→ Normal exit → no action
  │
  └──→ Pipeline.Run()
         │
         ├──→ On completion: telemetry includes exit_reason, fps, teacher_id, etc.
         └──→ On failure: telemetry with exit_reason, proper categorization

Monitor (5s sampling)
  │  ResourceSnapshot
  │
  ├──→ Guardian.CanStart() (static thresholds) ← existing
  │
  └──→ PredictiveGuardian (wraps Guardian)
         │  Ring buffer: 60 samples × 5 resources
         │  Linear regression trend computation
         │
         ├──→ Trend detected → Blocked{resource: "cpu_trend"|"ram_trend"}
         ├──→ Trend reversed → Unblock with hysteresis
         └──→ Insufficient data → Fallback to static thresholds

B2 Client
  │
  ├──→ circuitbreaker.CircuitBreaker (B2)
  │      │  CLOSED → OPEN (after 5 failures) → HALF_OPEN (after 60s) → CLOSED
  │      │  Fast-fail ErrCircuitOpen when OPEN
  │      │  Auto-recovery probing
  │      └──→ Delays new jobs by CB_B2_JOB_DELAY_S (30s) when open
  │
  └──→ API Webhook sender
         │
         └──→ circuitbreaker.CircuitBreaker (API)
                │  CLOSED → OPEN (after 5 failures) → HALF_OPEN (after 30s) → CLOSED
                │  Buffers webhooks when OPEN
                │  Flushes when CLOSED
```

---

## Files to Create (12 new files)

### 1. `workers/vod-engine/internal/watchdog/watchdog.go` — NEW
**Purpose:** Per-FFmpeg-process health monitor that detects and terminates frozen encodes (WDG-01 through WDG-06).

```go
type Watchdog struct {
    cfg *config.Config
    cmd *exec.Cmd
    pid int
    job *queue.SubJob
    mc  *metrics.MetricsCollector // for watchdog_kills_total

    // Progress monitoring
    progressCh   chan int64 // out_time_us values from stdout parser
    lastProgress time.Time
    stallCount   int

    // CPU monitoring
    lastCPUTime     float64
    lastCPUSampleAt time.Time

    // Segment monitoring
    outputDir     string
    lastSegmentAt time.Time
    lastFileCount int

    // Lifecycle
    ctx    context.Context
    cancel context.CancelFunc
    done   chan struct{}
}
```

**Key behaviors from BDD:**
- **WDG-01:** Monitors stdout for `out_time_us=` lines; declares stall after `WATCHDOG_PROGRESS_TIMEOUT_S` (30s) with no progress; increments stall counter; terminates after `WATCHDOG_STALL_THRESHOLD` (3) consecutive stalls.
- **WDG-02:** Concurrently samples CPU time from `/proc/<pid>/stat` every `WATCHDOG_CPU_POLL_INTERVAL_S` (10s); declares frozen if CPU delta over `WATCHDOG_CPU_IDLE_TIMEOUT_S` (60s) < `WATCHDOG_CPU_IDLE_THRESHOLD_PCT` (1% of one core = 0.6s).
- **WDG-03:** Monitors output directory for `.ts` file creation every `WATCHDOG_SEGMENT_POLL_INTERVAL_S` (15s); declares stall if no new segments and no size growth for `WATCHDOG_SEGMENT_STALL_TIMEOUT_S` (120s). Secondary to progress check.
- **WDG-04:** Sends SIGTERM to process group, waits `WATCHDOG_TERM_WAIT_S` (10s), then SIGKILL. Marks job retryable with `ERR_WATCHDOG_KILL`. Increments `vod_engine_watchdog_kills_total` counter.
- **WDG-05:** Closes stdout pipe to unblock `cmd.Wait()`. If `cmd.Wait()` doesn't return within `WATCHDOG_FORCE_EXIT_TIMEOUT_S` (30s), logs critical error and abandons process object. Job moved to dead-letter if retries exhausted.
- **WDG-06:** If video shorter than `WATCHDOG_SHORT_VIDEO_THRESHOLD_S` (30s), uses longer timeout `WATCHDOG_SHORT_VIDEO_TIMEOUT_S` (60s) before triggering.

**Constructor:** `NewWatchdog(cfg, cmd, pid, job, mc, outputDir) *Watchdog`

**Methods:**
- `Start(ctx)` — launches monitoring goroutines
- `Stop()` — signals graceful stop
- `WaitDone()` — blocks until all goroutines exit
- `ProgressCh() chan<- int64` — receive out_time_us

**Monitoring goroutines (3):**
1. `progressWatcher()` — receives out_time_us values from pipeline stdout parser; resets a timer each time. If timer fires (no progress for timeout), increments stall count.
2. `cpuWatcher()` — samples `/proc/<pid>/stat`; computes delta since last sample. If cumulative delta over `CPU_IDLE_TIMEOUT_S` is below threshold, declares frozen.
3. `segmentWatcher()` — stats output directory; tracks file count and total size. If unchanged for `SEGMENT_STALL_TIMEOUT_S`, declares stall.

**Interactions:**
- Pipeline passes stdout progress lines to watchdog via `ProgressCh()`
- Watchdog signals termination by calling `cancel()` on the pipeline's context
- Pipeline checks watchdog state after `cmd.Wait()` returns

**Performance:** Watchdog checks must consume < 0.5% CPU per job (PERF-01).

### 2. `workers/vod-engine/internal/guardian/predictive.go` — NEW
**Purpose:** Wraps the existing Guardian with trend-based resource prediction (PRED-01 through PRED-06).

```go
type PredictiveGuardian struct {
    inner  *Guardian
    cfg    *config.Config

    // Ring buffers per resource type
    cpuHistory  *ringBuffer
    ramHistory  *ringBuffer
    diskIOHistory *ringBuffer
    netHistory  *ringBuffer
    diskFreeHistory *ringBuffer

    // Current block state (for hysteresis)
    blocked       map[string]bool
    blockedSince  map[string]time.Time

    mu sync.RWMutex
}

type ringBuffer struct {
    samples []resourceSample
    head    int
    count   int
    capacity int
    mu      sync.RWMutex
}

type resourceSample struct {
    Timestamp      time.Time
    CPULoad1m      float64
    RAMAvailableMB int64
    DiskIOPct      float64
    NetworkOutMbps float64
    DiskFreeGB     int64
}
```

**Key behaviors from BDD:**
- **PRED-01:** Ring buffer stores last `PREDICTIVE_HISTORY_SIZE` (60) samples; memory-safe (evicts oldest); protected by `sync.RWMutex`.
- **PRED-02:** Linear regression slope on CPU; if slope > `PREDICTIVE_CPU_SLOPE_THRESHOLD` (0.05/sample) for `PREDICTIVE_TREND_WINDOW_COUNT` (6) consecutive samples AND predicted time to `MAX_CPU_LOAD_AVG` < `PREDICTIVE_LOOKAHEAD_S` (120s) → block with `"cpu_trend"`.
- **PRED-03:** Same for RAM; predicts when `RAMAvailableMB` will fall below `MIN_FREE_RAM_MB`.
- **PRED-04:** When blocking due to predictive warning, only unblock when predicted time-to-threshold exceeds `PREDICTIVE_RECOVERY_FACTOR` (3× `PREDICTIVE_LOOKAHEAD_S` = 360s).
- **PRED-05:** If ring buffer has < `PREDICTIVE_MIN_SAMPLES` (10), fall back to static threshold guardian.
- **PRED-06:** On restart, ring buffer is empty; static thresholds used until enough samples.

**Constructor:** `NewPredictiveGuardian(inner *Guardian, cfg *config.Config) *PredictiveGuardian`

**Methods:**
- `AddSample(snap *monitor.ResourceSnapshot)` — called by monitor loop
- `CanStart() *Result` — wraps `inner.CanStart()` with predictive check
- `LogBlock(r *Result)`, `LogUnblock(r *Result)` — logging with new event names

**Trend Computation:**
- Simple linear regression (least squares) over the last N samples
- `y = a + bx` where `x` = sample index, `y` = resource value
- Slope `b = (n*Σxy - Σx*Σy) / (n*Σx² - (Σx)²)`
- Time to threshold = `(threshold - current_value) / slope`

**Performance:** Trend computation must complete in < 5ms (PERF-02).

### 3. `workers/vod-engine/internal/circuitbreaker/circuitbreaker.go` — NEW
**Purpose:** State machine for external service health (CB-01 through CB-05).

```go
type State int
const (
    StateClosed   State = 0
    StateHalfOpen State = 1
    StateOpen     State = 2
)

type CircuitBreaker struct {
    name             string
    state            int32 // atomic: 0=closed, 1=half_open, 2=open
    failureThreshold int32
    recoveryTimeout  time.Duration
    halfOpenMaxReqs  int32

    failureCount     int32
    lastFailureTime  time.Time
    halfOpenReqs     int32
    mu               sync.Mutex

    mc               *metrics.MetricsCollector
}

// ErrCircuitOpen is returned when the circuit is open and the operation is fast-failed.
var ErrCircuitOpen = errors.New("circuit breaker: circuit is open")
```

**Key behaviors from BDD:**
- **CB-01:** Tracks consecutive failures; at `CB_B2_FAILURE_THRESHOLD` (5) → OPEN. All operations fail with `ErrCircuitOpen`.
- **CB-02:** After `CB_B2_RECOVERY_TIMEOUT_S` (60s) → HALF_OPEN; allows up to `CB_B2_HALF_OPEN_MAX_REQUESTS` (3) probes. One success → CLOSED. All fail → OPEN again.
- **CB-03:** Same for API server; webhook calls buffered when OPEN.
- **CB-04:** When B2 circuit is OPEN, scheduler delays job start by `CB_B2_JOB_DELAY_S` (30s).
- **CB-05:** Retry counters still tick when circuit is OPEN; actual B2 operation not attempted until CLOSED/HALF_OPEN.

**Methods:**
- `NewCircuitBreaker(name string, threshold int, timeout time.Duration, halfOpenMax int, mc *MetricsCollector) *CircuitBreaker`
- `Execute(fn func() error) error` — executes fn if circuit allows; tracks success/failure
- `ForceState(state State)` — for testing
- `State() State` — atomic load
- Metrics: `vod_engine_circuit_breaker_total{service,state}` counter, `vod_engine_circuit_breaker_current_state{service}` gauge

**Performance:** State check is atomic load < 1μs (PERF-03).

### 4. `workers/vod-engine/internal/circuitbreaker/webhook_buffer.go` — NEW
**Purpose:** Bounded FIFO queue for webhooks when API circuit is OPEN (FT-02, CB-03).

```go
type WebhookBuffer struct {
    mu      sync.Mutex
    buffer  []webhookEntry
    maxSize int
}

type webhookEntry struct {
    LectureID       string
    Status          string
    M3U8Path        string
    EncryptionKeyHex string
    TotalSizeBytes  int64
    Timestamp       time.Time
}
```

**Behaviors:**
- Push with non-blocking drop (oldest entry dropped when full)
- Drain all entries FIFO when circuit closes
- Each entry logged before drop with `event: webhook.buffer_overflow`
- Dropped webhooks don't affect job status (only notification lost)

### 5. `workers/vod-engine/internal/logging/correlation.go` — NEW
**Purpose:** Correlation ID generation and structured logging helpers (LOG-01 through LOG-04).

```go
// NewCorrelationID generates a UUIDv4 for a job group.
func NewCorrelationID() string

// LogAttrs returns base log attributes every log line should include:
// - correlation_id (UUIDv4)
// - component (source subsystem)
// - job_id (if applicable)
// - lecture_id (if applicable)
func LogAttrs(component, jobID, lectureID string) []slog.Attr

// SeverityCritical returns an attribute marking a log line as critical.
func SeverityCritical() slog.Attr
```

**Event naming (LOG-04):**
- `pipeline.telemetry` (was `job.telemetry`)
- `guardian.resource_block` (was `RESOURCE_BLOCK`)
- `guardian.resource_unblock` (was `RESOURCE_UNBLOCK`)
- `watchdog.kill` (new)
- `circuit_breaker.state_change` (new)
- `queue.recovery` (new)
- `queue.requeue` (new)

**Correlation ID:** Generated once in `NewSubJobs()` → stored in `SubJob.CorrelationID` → propagated to all log lines.

### 6. `deploy/systemd/vod-engine.service` — NEW (overwrites previous version)
**Purpose:** Updated systemd unit with production-tuned limits.

**Changes from previous version:**
| Setting | Old Value | New Value | Rationale (FFMPEG-02, LINUX-02) |
|---------|-----------|-----------|----------------------------------|
| `CPUQuota` | `500%` | `400%` | Threads=4 needs at most 400%. Prevents CPU borrowing from OS core. |
| `OOMScoreAdjust` | `-500` | `-500` | Kept at -500; FFmpeg children get explicit oom_score_adj=500 (LINUX-01) |
| `LimitNPROC` | `32` | `64` | Go runtime + FFmpeg threads=4 needs headroom |
| `IOWeight` | `100` | `50` | Reduces encoding I/O priority relative to OS |
| `TasksMax` | (not set) | `128` | Prevents runaway goroutines from exhausting task limit |

---

## Files to Modify (11 existing files)

### 7. `workers/vod-engine/internal/config/config.go` — MODIFY
**Changes:**

Add new struct fields (with defaults):

```go
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

// === FFMPEG ===
// Change default FFMPEG_THREADS from 2 to 4
// Already configurable; just change the default value
```

Add env var input validation (SEC-06): `Validate() error` method that checks:
- All timeout values > 0
- Threshold values > 0
- Slope threshold > 0
- Failure thresholds > 0
- Recovery factors >= 1
- Half-open max requests >= 1
- Webhook buffer size >= 10
- Disk percentage between 1 and 100

Call `cfg.Validate()` at startup in `main.go`; fatal error if invalid.

### 8. `workers/vod-engine/internal/encoding/ffmpeg.go` — MODIFY
**Changes:**

1. **FFMPEG-01:** Change `FFMPEG_THREADS` default from `2` to `4` in the FFmpeg command builder.
   - Update the default in `BuildHLSCommand()`: `-threads 4`
   - The config default already reads from `FFMPEG_THREADS` env var; just change the fallback in `config.go` from `2` to `4`.

2. **LINUX-01:** Add OOM score adjustment for FFmpeg child process:
   - New method: `SetFFmpegOOMScore(cmd *exec.Cmd) error`
   - After `cmd.Start()` succeeds, write `"500"` to `/proc/<ffmpeg_pid>/oom_score_adj`
   - Called from `pipeline.go` right after `cmd.Start()`
   - Log warning if write fails (EPERM) but continue

### 9. `workers/vod-engine/internal/encoding/pipeline.go` — MODIFY
**Changes:**

1. **Watchdog Integration (WDG-01 through WDG-06):**
   - In `runFFmpeg()`, after `cmd.Start()`, create a `watchdog.Watchdog` instance
   - Pass the FFmpeg PID, output dir, config, and metrics collector
   - Wire stdout `out_time_us=` scanner to watchdog's `ProgressCh()`
   - Pass watchdog's context to the `cmd.Wait()` call
   - After `cmd.Wait()`, check if watchdog triggered: if so, mark job retryable with `ERR_WATCHDOG_KILL`
   - On watchdog kill, update telemetry `exit_reason = "watchdog_kill:{reason}"`

2. **FPS Capture (TEL-03):**
   - In stdout progress parser, also parse `fps=` field
   - Store last fps value in `JobTelemetry.EncodingSpeedFPS`

3. **Video Duration Capture (TEL-05):**
   - Already calling `GetTotalDuration()` before encoding
   - Store in `JobTelemetry.VideoDurationS`

4. **Exit Reason (TEL-04):**
   - Add `exitReason` string to telemetry computation
   - Values: `"completed"`, `"ffmpeg_crash:{exit_code}"`, `"watchdog_kill:{reason}"`, `"max_retries_exceeded"`, `"disk_quota_exceeded"`, `"b2_failure:{operation}"`

5. **Webhook circuit breaker integration:**
   - In `SendCompletionWebhook()` and `SendProgressWebhook()`, use circuit breaker's `Execute()` instead of direct HTTP call
   - If circuit is OPEN, push to `WebhookBuffer`

### 10. `workers/vod-engine/internal/telemetry/telemetry.go` — MODIFY
**Changes:**

Add new fields to `JobTelemetry`:

```go
type JobTelemetry struct {
    // ... existing fields ...

    // NEW FIELDS (TEL-01 through TEL-06)
    TeacherID        string  // TEL-02
    QueueWaitTimeS   float64 // TEL-01
    EncodingSpeedFPS float64 // TEL-03
    ExitReason       string  // TEL-04
    VideoDurationS   float64 // TEL-05
}
```

Update `ToLogEvent()`:
```go
func (jt *JobTelemetry) ToLogEvent() []slog.Attr {
    return []slog.Attr{
        slog.String("event", "pipeline.telemetry"),  // LOG-04: renamed from job.telemetry
        slog.String("lecture_id", jt.LectureID),
        slog.String("teacher_id", jt.TeacherID),      // NEW
        slog.String("quality", jt.Quality),
        slog.Float64("queue_wait_time_s", jt.QueueWaitTimeS), // NEW
        slog.Float64("encoding_duration_s", jt.EncodingDurationS),
        slog.Float64("video_duration_s", jt.VideoDurationS),   // NEW
        slog.Float64("encoding_speed_fps", jt.EncodingSpeedFPS), // NEW
        slog.Float64("cpu_avg_pct", jt.CPUAvgPct),
        slog.Float64("cpu_peak_pct", jt.CPUPeakPct),
        slog.Float64("ram_avg_mb", jt.RAMAvgMB),
        slog.Float64("ram_peak_mb", jt.RAMPeakMB),
        slog.Int64("disk_read_mb", jt.DiskReadMB),
        slog.Int64("disk_write_mb", jt.DiskWriteMB),
        slog.Float64("download_speed_mbps", jt.DownloadSpeedMbps),
        slog.Float64("upload_speed_mbps", jt.UploadSpeedMbps),
        slog.Float64("total_size_mb", jt.TotalSizeMB),
        slog.Int("segments_count", jt.SegmentsCount),
        slog.Int("retry_count", jt.RetryCount),
        slog.String("exit_reason", jt.ExitReason),    // NEW
        slog.String("final_status", jt.FinalStatus),
    }
}
```

Same updates for `Serialize()`.

### 11. `workers/vod-engine/internal/queue/job.go` — MODIFY
**Changes:**

1. Add `TeacherID` field to `EnqueueRequest`:
```go
type EnqueueRequest struct {
    LectureID string   `json:"lecture_id"`
    RawKey    string   `json:"raw_key"`
    Qualities []string `json:"qualities"`
    TeacherID string   `json:"teacher_id,omitempty"`  // NEW (TEL-02, SEC-01)
}
```

2. Add `TeacherID` and `CorrelationID` fields to `SubJob`:
```go
type SubJob struct {
    // ... existing fields ...
    TeacherID      string    `json:"teacher_id,omitempty"`       // NEW
    CorrelationID  string    `json:"correlation_id,omitempty"`   // NEW (LOG-01)
}
```

3. Update `NewSubJobs()` to accept `teacherID string` parameter and generate correlation ID:
```go
func NewSubJobs(req EnqueueRequest, maxRetries int, teacherID string) []*SubJob {
    // ...
    correlationID := logging.NewCorrelationID()
    for _, q := range req.Qualities {
        subJobs = append(subJobs, &SubJob{
            // ...
            TeacherID:     teacherID,
            CorrelationID: correlationID,
        })
    }
}
```

4. **SEC-01:** Validate `teacher_id` in `HandleProcessVideo` — must be empty or numeric string (digits only):
```go
if req.TeacherID != "" {
    if !isDigitsOnly(req.TeacherID) {
        http.Error(w, `{"error": "teacher_id must be numeric"}`, http.StatusBadRequest)
        return
    }
}
```

### 12. `workers/vod-engine/internal/worker/pool.go` — MODIFY
**Changes:**

1. **Predictive Guardian Integration (PRED-01 through PRED-06):**
   - `Scheduler` holds a `*guardian.PredictiveGuardian` instead of `*guardian.Guardian`
   - In `tryDequeue()`, call `s.predictiveGuardian.CanStart()` instead of `s.guardian.CanStart()`
   - Monitor feeds samples to predictive guardian: `s.predictiveGuardian.AddSample(snap)`
   - Call `AddSample` from the scheduler's metrics refresh loop or via a dedicated channel

2. **Circuit Breaker Job Delay (CB-04):**
   - In `tryDequeue()`, after guardian check, before `startJob()`:
   ```go
   if s.b2CircuitBreaker.State() == circuitbreaker.StateOpen {
       slog.Warn("B2 circuit open, delaying job start", "job_id", job.ID, "delay_s", s.cfg.CBB2JobDelayS)
       time.Sleep(time.Duration(s.cfg.CBB2JobDelayS) * time.Second)
   }
   ```

3. **Circuit Breaker Retry Handling (CB-05):**
   - In `handleJobFailure()`, if error is B2-related AND circuit is OPEN, still tick retry counter but don't attempt actual B2 operation (already handled by circuit breaker in B2 client).
   - Job stays pending with `"waiting: circuit_breaker"` status.

4. **Active Groups GC (QUEUE-01):**
   - Add `activeGroupsGCTicker` in `scheduleLoop()`
   - Every `ACTIVE_GROUPS_GC_INTERVAL_M` (60 min), sweep `activeGroups` for entries older than `MAX_JOB_AGE_HOURS` (24h)
   - Log warning and remove stale entries

5. **Queue Drain on Shutdown (QUEUE-02):**
   - `PersistQueueOnShutdown()` already calls `Drain()` — verify it's mutex-protected (it is, in `PriorityQueue.Drain()`).

6. **Telemetry Queue Wait Time (TEL-01):**
   - In `startJob()`, compute `queue_wait_time_s = time.Since(job.CreatedAt).Seconds()`
   - Pass to pipeline so it's included in telemetry

7. **Storage Percentage-Based Threshold (STORE-01):**
   - In `tryDequeue()`, when checking guardian, the guardian must also check `MinFreeDiskPct`
   - Modify `Guardian.CanStart()` to compute disk threshold from both `MinFreeDiskGB` and `MinFreeDiskPct`, using the more restrictive

8. **Webhook Buffer Integration (FT-02, CB-03):**
   - Pass `webhookBuffer` to scheduler for flush on circuit close
   - When API circuit transitions to CLOSED, flush buffered webhooks

### 13. `workers/vod-engine/internal/guardian/guardian.go` — MODIFY
**Changes:**

1. **STORE-01:** Add percentage-based disk threshold:
   - Read `MinFreeDiskPct` from config
   - Compute `freeDiskGB_fromPct = totalGB * (pct/100)`
   - Use `min(freeDiskGB_fromPct, MinFreeDiskGB)` as effective threshold
   - Log config choice at startup

2. **Log event naming (LOG-04):**
   - `LogBlock()` uses `slog.Warn("guardian.resource_block", ...)`
   - `LogUnblock()` uses `slog.Info("guardian.resource_unblock", ...)`
   - Add correlation ID and component tags

### 14. `workers/vod-engine/internal/monitor/monitor.go` — MODIFY
**Changes:**

1. After each sample is collected, notify the predictive guardian:
   - Add a `predictiveCh chan<- *ResourceSnapshot` field
   - `SetPredictiveChannel(ch chan<- *ResourceSnapshot)`
   - After collecting sample, non-blocking send to this channel

### 15. `workers/vod-engine/internal/metrics/metrics.go` — MODIFY
**Changes:**

Register new metrics in `registerMetrics()` called from `main.go`:

```go
// OBS-01: Watchdog kills
mc.CounterRegister("vod_engine_watchdog_kills_total{reason=\"no_progress\"}", "Watchdog kills: no progress")
mc.CounterRegister("vod_engine_watchdog_kills_total{reason=\"frozen_cpu\"}", "Watchdog kills: frozen CPU")
mc.CounterRegister("vod_engine_watchdog_kills_total{reason=\"no_segments\"}", "Watchdog kills: no segments")

// OBS-02: Guardian resumes
mc.CounterRegister("vod_engine_guardian_resumes_total{resource=\"cpu_trend\"}", "Predictive guardian unblocks: cpu_trend")
mc.CounterRegister("vod_engine_guardian_resumes_total{resource=\"ram_trend\"}", "Predictive guardian unblocks: ram_trend")

// OBS-03: Worker state gauge
mc.GaugeRegister("vod_engine_worker_state", "Worker state: 0=idle 1=downloading 2=encoding 3=uploading 4=cleaning")

// OBS-04: Encoding stage gauge
mc.GaugeRegister("vod_engine_encoding_stage", "Encoding stage: 0=waiting 1=downloading 2=encoding 3=uploading 4=webhook 5=cleaning")

// OBS-05: Retry count histogram
mc.HistogramRegister("vod_engine_retry_count", "Retry count distribution",
    map[string]string{}, []float64{0, 1, 2, 3, 5})

// OBS-06: Circuit breaker metrics
mc.CounterRegister("vod_engine_circuit_breaker_total{service=\"b2\",state=\"open\"}", "B2 circuit open")
mc.CounterRegister("vod_engine_circuit_breaker_total{service=\"b2\",state=\"half_open\"}", "B2 circuit half-open")
mc.CounterRegister("vod_engine_circuit_breaker_total{service=\"b2\",state=\"closed\"}", "B2 circuit closed")
mc.CounterRegister("vod_engine_circuit_breaker_total{service=\"api\",state=\"open\"}", "API circuit open")
mc.CounterRegister("vod_engine_circuit_breaker_total{service=\"api\",state=\"half_open\"}", "API circuit half-open")
mc.CounterRegister("vod_engine_circuit_breaker_total{service=\"api\",state=\"closed\"}", "API circuit closed")
mc.GaugeRegister("vod_engine_circuit_breaker_current_state{service=\"b2\"}", "B2 circuit state: 0=closed 1=half_open 2=open")
mc.GaugeRegister("vod_engine_circuit_breaker_current_state{service=\"api\"}", "API circuit state: 0=closed 1=half_open 2=open")
```

### 16. `workers/vod-engine/internal/api/handlers/process.go` — MODIFY
**Changes:**

1. **TEL-02:** Extract `teacher_id` from request body (already in `EnqueueRequest`):
   ```go
   // After decoding req:
   if req.TeacherID != "" && !isDigitsOnly(req.TeacherID) {
       http.Error(w, `{"error": "teacher_id must be numeric"}`, http.StatusBadRequest)
       return
   }
   ```

2. Pass `req.TeacherID` to `NewSubJobs()`:
   ```go
   subJobs := queue.NewSubJobs(req, h.Scheduler.MaxRetries(), req.TeacherID)
   ```

### 17. `workers/vod-engine/cmd/api/main.go` — MODIFY
**Changes:**

1. **Config validation:**
   ```go
   if err := cfg.Validate(); err != nil {
       slog.Error("Fatal: invalid configuration", "error", err)
       os.Exit(1)
   }
   ```

2. **Circuit breaker initialization:**
   ```go
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
   ```

3. **Pass circuit breakers to scheduler:**
   ```go
   scheduler.SetCircuitBreakers(b2CircuitBreaker, apiCircuitBreaker, webhookBuffer)
   ```

4. **Predictive guardian wiring:**
   ```go
   predictiveGuardian := guardian.NewPredictiveGuardian(
       guardian.New(cfg, mon),
       cfg,
   )
   scheduler.SetPredictiveGuardian(predictiveGuardian)
   // Wire monitor to feed predictive guardian
   predictiveCh := predictiveGuardian.SampleCh()
   mon.SetPredictiveChannel(predictiveCh)
   ```

5. **Register new metrics:**
   - Add `registerProductionMetrics(metricsCollector)` call alongside existing `registerMetrics()`

6. **SIGHUP updates:**
   - Add new config fields to the SIGHUP handler for runtime-reloadable values
   - Safe-to-reload: watchdog timeouts, predictive thresholds, circuit breaker thresholds, telemetry interval, disk percentage
   - NOT reloadable: circuit breaker instances (must restart)

---

## Data Models & Types

### New Types

```go
// watchdog/watchdog.go

type Watchdog struct {
    cfg *config.Config
    cmd *exec.Cmd
    pid int
    job *queue.SubJob
    mc  *metrics.MetricsCollector
    progressCh   chan int64
    lastProgress time.Time
    stallCount   int
    lastCPUTime     float64
    lastCPUSampleAt time.Time
    outputDir     string
    lastSegmentAt time.Time
    lastFileCount int
    ctx           context.Context
    cancel        context.CancelFunc
    done          chan struct{}
    killReason    string // "no_progress", "frozen_cpu", "no_segments"
}

// guardian/predictive.go

type PredictiveGuardian struct {
    inner         *Guardian
    cfg           *config.Config
    cpuHistory    *ringBuffer
    ramHistory    *ringBuffer
    diskIOHistory *ringBuffer
    netHistory    *ringBuffer
    diskFreeHist  *ringBuffer
    blocked       map[string]bool
    blockedSince  map[string]time.Time
    mu            sync.RWMutex
    sampleCh      chan *monitor.ResourceSnapshot
}

type ringBuffer struct {
    samples  []resourceSample
    head     int
    count    int
    capacity int
    mu       sync.RWMutex
}

type resourceSample struct {
    Timestamp      time.Time
    CPULoad1m      float64
    RAMAvailableMB int64
    DiskIOPct      float64
    NetworkOutMbps float64
    DiskFreeGB     int64
}

// circuitbreaker/circuitbreaker.go

type State int32
const (
    StateClosed   State = 0
    StateHalfOpen State = 1
    StateOpen     State = 2
)

type CircuitBreaker struct {
    name             string
    state            int32
    failureThreshold int32
    recoveryTimeout  time.Duration
    halfOpenMaxReqs  int32
    failureCount     int32
    lastFailureTime  time.Time
    halfOpenReqs     int32
    mu               sync.Mutex
    mc               *metrics.MetricsCollector
}

// circuitbreaker/webhook_buffer.go

type WebhookBuffer struct {
    mu      sync.Mutex
    buffer  []webhookEntry
    maxSize int
}

type webhookEntry struct {
    LectureID        string
    Status           string
    M3U8Path         string
    EncryptionKeyHex string
    TotalSizeBytes   int64
    Timestamp        time.Time
}

// logging/correlation.go

func NewCorrelationID() string   // UUIDv4
func LogAttrs(component, jobID, lectureID, correlationID string) []slog.Attr
func SeverityCritical() slog.Attr
```

### Modified Types

```go
// queue/job.go

type EnqueueRequest struct {
    LectureID string   `json:"lecture_id"`
    RawKey    string   `json:"raw_key"`
    Qualities []string `json:"qualities"`
    TeacherID string   `json:"teacher_id,omitempty"` // NEW
}

type SubJob struct {
    // ... existing ...
    TeacherID     string `json:"teacher_id,omitempty"`     // NEW
    CorrelationID string `json:"correlation_id,omitempty"` // NEW
}

// telemetry/telemetry.go

type JobTelemetry struct {
    // ... existing ...
    TeacherID        string  // NEW
    QueueWaitTimeS   float64 // NEW
    EncodingSpeedFPS float64 // NEW
    ExitReason       string  // NEW
    VideoDurationS   float64 // NEW
}
```

---

## Dependencies

| Package | Change | Version | Reason |
|---------|--------|---------|--------|
| No new Go external dependencies | — | — | All new code uses only stdlib (`os`, `time`, `context`, `sync/atomic`, `log/slog`, `math`, `crypto/rand`) |
| `golang.org/x/exp` (optional) | May add for `slices` package | Latest | Only if needed for ring buffer operations; can hand-roll instead |

---

## Security Boundaries (New & Modified)

| ID | Requirement | Implementation | Enforced In |
|----|-------------|----------------|-------------|
| SEC-01 | `teacher_id` validated as numeric string | `isDigitsOnly()` check in `HandleProcessVideo` | `process.go` |
| SEC-02 | Watchdog has no filesystem write access beyond logs | Watchdog runs in VOD Engine process; inherits process permissions; no new capabilities needed | `watchdog.go` |
| SEC-03 | Circuit breaker state not observable via unauthenticated endpoints | Circuit state is internal; only aggregated counters exposed via `/metrics` | `circuitbreaker.go`, `main.go` |
| SEC-04 | FFmpeg OOM score requires capability check | `os.WriteFile("/proc/<pid>/oom_score_adj", ...)` may fail with EPERM; warning logged, non-fatal | `ffmpeg.go` |
| SEC-05 | Webhook buffer stores no credentials | Only `lecture_id`, `status`, `m3u8_path`, `encryption_key_hex`, `total_size_bytes` — no JWT, no B2 keys | `webhook_buffer.go` |
| SEC-06 | All new config env vars validated at startup | `cfg.Validate()` called in `main.go`; negative timeouts or zero thresholds cause fatal error | `config.go`, `main.go` |

---

## Config Reference (All New Variables)

See BDD spec "Configuration Reference (New Variables)" section — all 36 new environment variables with defaults.

---

## Test Strategy

### New Test Files

#### `internal/watchdog/watchdog_test.go`
| Scenario | Test | Key Assertions |
|----------|------|----------------|
| WDG-01 | `TestWatchdog_ProgressTimeout` | Stalls after `WATCHDOG_PROGRESS_TIMEOUT_S` without progress; increments stall counter; terminates after threshold |
| WDG-02 | `TestWatchdog_CPUFrozen` | Detects frozen CPU via `/proc/<pid>/stat`; declares frozen when delta below threshold |
| WDG-03 | `TestWatchdog_SegmentStall` | Detects no new `.ts` files; secondary check after progress |
| WDG-04 | `TestWatchdog_TerminateSequence` | SIGTERM → wait → SIGKILL; marks job retryable; increments counter |
| WDG-05 | `TestWatchdog_ForceExit` | Closes stdout pipe; abandons process if `cmd.Wait()` hangs |
| WDG-06 | `TestWatchdog_ShortVideo` | Short videos (<30s) use longer timeout; normal exit not falsely killed |

#### `internal/guardian/predictive_test.go`
| Scenario | Test | Key Assertions |
|----------|------|----------------|
| PRED-01 | `TestPredictive_RingBuffer` | Stores 60 samples; evicts oldest; thread-safe |
| PRED-02 | `TestPredictive_CPU_Trend` | Detects upward CPU trend; blocks with `cpu_trend` |
| PRED-03 | `TestPredictive_RAM_Trend` | Detects downward RAM trend; blocks with `ram_trend` |
| PRED-04 | `TestPredictive_Hysteresis` | Stays blocked after trend reversal; unblocks after recovery factor |
| PRED-05 | `TestPredictive_InsufficientData` | Falls back to static thresholds with < 10 samples |
| PRED-06 | `TestPredictive_ResetOnRestart` | Ring buffer empty on fresh instance |

#### `internal/circuitbreaker/circuitbreaker_test.go`
| Scenario | Test | Key Assertions |
|----------|------|----------------|
| CB-01 | `TestCB_TracksFailures` | Opens after threshold consecutive failures |
| CB-02 | `TestCB_HalfOpenRecovery` | Transitions to HALF_OPEN after timeout; probe success → CLOSED |
| CB-03 | `TestCB_APICircuit` | Same FSM for API; webhooks buffered when open |
| CB-04 | `TestCB_GuardianIntegration` | Circuit open doesn't block guardian; scheduler delays job |
| CB-05 | `TestCB_RetryStormPrevention` | Retry counter ticks; B2 ops not attempted until CLOSED |

#### `internal/logging/correlation_test.go`
| Scenario | Test | Key Assertions |
|----------|------|----------------|
| LOG-01 | `TestCorrelationID` | UUIDv4 format; unique per call |
| LOG-02 | `TestLogAttrs` | Correct component, job_id, lecture_id, correlation_id |
| LOG-03 | `TestSeverityCritical` | `"critical": true` attribute present |
| LOG-04 | `TestEventNaming` | Events follow `{component}.{action}` pattern |

### Existing Test Files to Update

| File | Changes |
|------|---------|
| `config_test.go` | Add tests for all 36 new config env vars |
| `telemetry_test.go` | Add tests for new telemetry fields (TeacherID, QueueWaitTimeS, etc.) |
| `pool_test.go` | Add tests for predictive guardian integration |
| `guardian_test.go` | Add tests for percentage-based disk threshold |
| `metrics_test.go` | Add tests for new metric families |

---

## Implementation Phases

### Phase 1: Configuration & Validation
1. Add all 36 new config fields to `config.go`
2. Implement `Validate()` method with SEC-06 checks
3. Add `getEnvFloat` and `getEnvInt` for new types (already exist)
4. Wire validation in `main.go`

### Phase 2: Logging Framework
1. Implement `logging/correlation.go` — UUIDv4 generator, structured log helpers
2. Update all existing log call sites to include `correlation_id`, `component`, new event names
3. Rename events per LOG-04 table

### Phase 3: Watchdog
1. Implement `watchdog/watchdog.go` — all 5 monitoring goroutines
2. Integrate into `pipeline.go` — start after `cmd.Start()`, wire progress, handle termination
3. Handle `cmd.Wait()` unblocking (close stdout pipe)
4. Short-video edge case handling

### Phase 4: Predictive Guardian
1. Implement ring buffer in `guardian/predictive.go`
2. Implement linear regression trend computation
3. Implement hysteresis logic
4. Wire `AddSample()` from monitor, `CanStart()` from scheduler

### Phase 5: Circuit Breakers
1. Implement `circuitbreaker/circuitbreaker.go` — FSM with atomic state
2. Implement `circuitbreaker/webhook_buffer.go` — bounded FIFO
3. Wire B2 circuit breaker into B2 client calls
4. Wire API circuit breaker into webhook sending
5. Integrate with scheduler: job delay when B2 open

### Phase 6: Enhanced Telemetry
1. Add `TeacherID`, `QueueWaitTimeS`, `EncodingSpeedFPS` fields
2. Add `ExitReason` categorization
3. Add `VideoDurationS` capture
4. Update `ToLogEvent()` with new fields
5. Parse `fps=` from FFmpeg stdout

### Phase 7: FFmpeg Resource Tuning
1. Change `FFMPEG_THREADS` default from 2 to 4
2. Add FFmpeg OOM score adjustment (write `500` to `/proc/<pid>/oom_score_adj`)
3. Update systemd unit: `CPUQuota=400%`, `TasksMax=128`, `LimitNPROC=64`, `IOWeight=50`

### Phase 8: Metrics & Queue Improvements
1. Register all new metric families
2. Implement active groups GC sweep
3. Implement percentage-based disk threshold
4. Add worker state and encoding stage gauges

### Phase 9: HTTP API Changes
1. Accept `teacher_id` in `EnqueueRequest`
2. Validate `teacher_id` as numeric string

### Phase 10: Tests
1. Write all unit tests for new packages
2. Update existing tests
3. Verify integration: watchdog + pipeline, circuit breaker + B2, predictive guardian + monitor

---

## Rollback Plan

| Change | Rollback Action | Safety |
|--------|----------------|--------|
| Watchdog | Remove `watchdog/` dir; revert `pipeline.go` changes | Safe — FFmpeg runs without supervision (previous behavior) |
| Predictive Guardian | Remove `predictive.go`; revert guardian wiring in pool.go | Safe — falls back to static thresholds only |
| Circuit Breaker | Remove `circuitbreaker/` dir; revert B2 client / webhook calls | Safe — retries without fast-fail (previous behavior) |
| Webhook Buffer | Remove `webhook_buffer.go`; revert circuit breaker wiring | Safe — webhooks sent directly (previous behavior) |
| Correlation IDs | Revert all log call sites; remove `logging/` dir | Safe — logs work without correlation IDs |
| New Telemetry Fields | Revert `telemetry.go` changes | Safe — extra fields absent from logs |
| FFMPEG_THREADS=4 | Set env var `FFMPEG_THREADS=2` — no code revert needed | Safe — runtime config change |
| CPUQuota=400% | Replace systemd unit with old one; `daemon-reload && restart` | Safe — old unit works |
| OOM Score for FFmpeg | Remove the `WriteFile` call in `ffmpeg.go` | Safe — OS OOM killer behavior unchanged |
| Disk Percentage | Remove `MinFreeDiskPct` from config and guardian | Safe — falls back to GB-only threshold |
| Active Groups GC | Remove GC ticker from scheduler | Safe — map may leak over time but no functional impact |

### Critical Rollback Order
1. **First:** Revert `internal/config/config.go` to remove new fields (old env vars still work)
2. **Then:** Revert `internal/encoding/pipeline.go` to remove watchdog integration
3. **Then:** Remove new packages (`watchdog/`, `circuitbreaker/`, `logging/`)
4. **Then:** Revert `internal/worker/pool.go` to remove predictive guardian
5. **Then:** Revert systemd unit to old limits
6. **Finally:** Recompile and restart: `go build -o /usr/local/bin/vod-engine ./cmd/api/ && systemctl restart vod-engine`

### Rollback Script
Create `deploy/rollback-production-readiness.sh`:
```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/var/backups/vod-engine/$(date +%Y%m%d_%H%M%S)"
echo "Creating backup at $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Backup current binary
cp /usr/local/bin/vod-engine "$BACKUP_DIR/vod-engine.bak"

# Restore old binary
cp /usr/local/bin/vod-engine.pre-prod /usr/local/bin/vod-engine

# Revert systemd unit
cp deploy/systemd/vod-engine.service.pre-prod /etc/systemd/system/vod-engine.service
systemctl daemon-reload

# Restart
systemctl restart vod-engine
echo "Rollback complete. VOD Engine restarted with pre-production binary."
```

---

## Estimated Files

**Total: 23 files** (12 new + 11 modified)

| Count | Type | Description |
|-------|------|-------------|
| 1 | New | `internal/watchdog/watchdog.go` |
| 1 | New | `internal/guardian/predictive.go` |
| 2 | New | `internal/circuitbreaker/circuitbreaker.go`, `webhook_buffer.go` |
| 1 | New | `internal/logging/correlation.go` |
| 1 | New | `deploy/systemd/vod-engine.service` (updated) |
| 4 | New | `internal/watchdog/watchdog_test.go`, `internal/guardian/predictive_test.go`, `internal/circuitbreaker/circuitbreaker_test.go`, `internal/logging/correlation_test.go` |
| 1 | New | `deploy/rollback-production-readiness.sh` |
| 10 | Modified | `internal/config/config.go`, `internal/encoding/ffmpeg.go`, `internal/encoding/pipeline.go`, `internal/telemetry/telemetry.go`, `internal/queue/job.go`, `internal/worker/pool.go`, `internal/guardian/guardian.go`, `internal/monitor/monitor.go`, `internal/metrics/metrics.go`, `internal/api/handlers/process.go`, `cmd/api/main.go` |

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Watchdog false-positive kills on very short videos | WDG-06: Short video timeout is 2× the video duration threshold; separate configurable timeout |
| Watchdog `SIGKILL` leaves FFmpeg child processes | WDG-04: Sends SIGTERM to process group; only escalates to SIGKILL after 10s grace period |
| Predictive guardian blocks jobs due to transient spikes | PRED-04: Hysteresis factor (3× lookahead) prevents oscillation; min samples guard prevents cold-start blocks |
| Circuit breaker rapid toggling under intermittent failures | CB-02: Half-open state with limited probes (default 3); full recovery window between attempts |
| Webhook buffer memory exhaustion | CB-03: Bounded buffer (default 100); oldest entries dropped with warning |
| Telemetry log volume increase > 20% | PERF-05: Only 5 new fields per telemetry line; total increase ~120 bytes per event (within 20% of ~400 byte baseline) |
| Predictive trend computation CPU overhead | PERF-02: O(n) linear regression over 60 samples completes in < 5ms; runs once per sample interval (10s) |
| Watchdog CPU overhead | PERF-01: Three goroutines with 10-30s sleep intervals; < 0.5% CPU per job |
| Config validation missed on startup | SEC-06: `Validate()` called before any component starts; fatal error with clear message |
| OOM score write to /proc fails on Linux | LINUX-01: Warning logged, engine continues; systemd OOMScoreAdjust still protects |

**requiresHumanApproval: true** — Risk level is HIGH (core infrastructure). Touches FFmpeg process supervision (watchdog can SIGKILL), circuit breakers for B2 and API, predictive resource guardian, OS-level OOM score tuning, systemd cgroups changes, and comprehensive config changes. Estimated 23 files > 10 threshold. Changes could stall all video processing if incorrectly implemented.
