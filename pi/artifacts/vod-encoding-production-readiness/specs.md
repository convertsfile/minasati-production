# BDD Specification — VOD Encoding Production Readiness Upgrade

**Business Value:** Eliminate silent FFmpeg hangs, prevent resource exhaustion before it happens, add self-healing circuit breakers for external dependencies, and achieve full observability of every encoding job. The encoding server must run continuously for months with predictable behavior, automatic recovery, and zero manual intervention for operational failures.

**Risk Level:** HIGH — core infrastructure enhancement. New watchdog, circuit breakers, predictive guardian, and telemetry changes touch every aspect of the encoding pipeline. Mistakes can stall all video processing.

**Prerequisite:** The existing VOD Engine (workers/vod-engine/) is deployed and operational. All scenarios from `video-encoding-pipeline-redesign` (26 scenarios) and `vod-encoding-ops-hardening` (23 scenarios) are passing.

---

## Actors

| Actor | Role |
|-------|------|
| `Laravel Backend` | Initiates encoding jobs via API, receives webhook callbacks, provides teacher_id |
| `VOD Engine (Go)` | Encoding server daemon — owns queue, runs FFmpeg, monitors resources |
| `FFmpeg Process` | Child process spawned by VOD Engine for each encoding task |
| `Backblaze B2` | Remote object storage: sources raw videos, stores encrypted HLS outputs |
| `System Administrator` | Monitors logs, adjusts config thresholds, responds to alerts |

---

## Preconditions

1. **Encoding Server Spec:** 6 vCPU, 12 GB RAM, 100 GB NVMe, 300 Mbps port.
2. **VOD Engine** v2.x compiled as Go binary, running as `systemd` service with cgroups isolation.
3. **Backblaze B2** bucket configured with account-level application keys.
4. **Laravel Backend** reachable at `LARAVEL_INTERNAL_URL`.
5. **FFmpeg** 6.0+ installed at `/usr/bin/ffmpeg`.
6. **Existing features** (Resource Guardian, Capacity Guard, Priority Queue, Dead Letter Queue, Atomic Persistence, Exponential Backoff, Automatic Queue Recovery, Storage Cleanup, systemd limits, Prometheus metrics, Telemetry logging, Linux tuning, AES-128 HLS encryption, B2 upload/download) remain fully operational.

---

## Scenarios

---

### 🔴 1. FFmpeg Watchdog — Detect and Terminate Frozen Encodes

**Business Justification:** FFmpeg can freeze silently due to corrupted input, codec bugs, or resource starvation. Without a watchdog, `cmd.Wait()` blocks indefinitely, the job slot is permanently occupied, and the queue stalls.

#### Current Implementation
- `cmd.Wait()` blocks until FFmpeg exits.
- No progress monitoring.
- No health checking.
- No timeout mechanism.

#### Recommended Solution
A dedicated Watchdog goroutine per encoding job that monitors five health signals with configurable timeouts.

#### Scenarios

**Scenario WDG-01: Watchdog monitors FFmpeg progress output**

**Given** an FFmpeg encoding process is running  
**When** the watchdog goroutine starts  
**Then** it MUST monitor stdout for `out_time_us=` progress lines  
**And** it MUST track the wall clock since the last progress line received  
**And** if `WATCHDOG_PROGRESS_TIMEOUT_S` (default: 30s) elapses without any progress line, the watchdog MUST declare a stall  
**And** the watchdog MUST increment a stall counter; only after `WATCHDOG_STALL_THRESHOLD` (default: 3 consecutive stalls) is the job terminated

**Scenario WDG-02: Watchdog detects frozen CPU activity**

**Given** an FFmpeg encoding process is running  
**When** the watchdog samples the process CPU time from `/proc/<pid>/stat` every `WATCHDOG_CPU_POLL_INTERVAL_S` (default: 10s)  
**Then** if the CPU time delta over `WATCHDOG_CPU_IDLE_TIMEOUT_S` (default: 60s) is less than `WATCHDOG_CPU_IDLE_THRESHOLD_PCT` (default: 1% of one core = 0.01 cores × 60s = 0.6s of CPU time), the watchdog MUST declare a frozen process  
**And** this check MUST run concurrently with the progress output check

**Scenario WDG-03: Watchdog detects no HLS segment growth**

**Given** an FFmpeg encoding process is running  
**When** the watchdog monitors the output directory for `.ts` segment file creation every `WATCHDOG_SEGMENT_POLL_INTERVAL_S` (default: 15s)  
**Then** if no new `.ts` files were created and the total encoded output size has not grown for `WATCHDOG_SEGMENT_STALL_TIMEOUT_S` (default: 120s), the watchdog MUST declare a stall  
**And** this check is secondary to the progress output check (prevents false positives when encoding a very short video)

**Scenario WDG-04: Watchdog terminates frozen FFmpeg safely**

**Given** the watchdog has declared a stall exceeding `WATCHDOG_STALL_THRESHOLD` consecutive samples  
**When** the watchdog triggers termination  
**Then** the watchdog MUST send `SIGTERM` to the FFmpeg process group (via `kill -TERM -PID`)  
**And** wait `WATCHDOG_TERM_WAIT_S` (default: 10s) for graceful exit  
**And** if FFmpeg is still running, send `SIGKILL`  
**And** mark the job as retryable with error code `ERR_WATCHDOG_KILL`  
**And** increment the `vod_engine_watchdog_kills_total` counter metric  
**And** log: `"WATCHDOG_KILL: FFmpeg PID 1234 terminated after Ns of inactivity. Job {id} marked retryable."`

**Scenario WDG-05: Watchdog never leaves cmd.Wait() hanging**

**Given** the watchdog has terminated FFmpeg  
**When** `cmd.Wait()` is still blocking  
**Then** the watchdog MUST close the stdout pipe to unblock the progress parser goroutine  
**And** the pipeline MUST NOT wait longer than `WATCHDOG_FORCE_EXIT_TIMEOUT_S` (default: 30s) after SIGKILL before giving up on `cmd.Wait()`  
**And** if `cmd.Wait()` still hasn't returned after the force-exit timeout, the pipeline MUST log a critical error and abandon the process object  
**And** the job is moved to dead-letter if retries exhausted, else re-queued for retry

**Scenario WDG-06: Watchdog respects short videos**

**Given** the input video is under `WATCHDOG_SHORT_VIDEO_THRESHOLD_S` (default: 30s)  
**When** the watchdog detects no progress for a period exceeding the video duration  
**Then** the watchdog MUST NOT trigger termination if FFmpeg exits normally within `WATCHDOG_SHORT_VIDEO_TIMEOUT_S` (default: 60s)  
**And** this prevents false-positive kills on very short encodes

---

### 🔴 2. Predictive Capacity Guard — Trend-Based Resource Protection

**Business Justification:** Static threshold checks catch only current violations. A resource can be below the threshold now but on a trajectory to exhaust in 30 seconds. Predictive monitoring prevents resource exhaustion before it happens.

#### Current Implementation
- Static threshold checks in `Guardian.CanStart()`.
- Hysteresis only for CPU (`RecoveryThreshold`).
- No trend analysis or prediction.

#### Recommended Solution
A Predictive Guardian wrapper that stores resource history in a ring buffer, computes linear trend slopes, and predicts when thresholds will be crossed.

#### Scenarios

**Scenario PRED-01: Predictive Guardian collects resource history**

**Given** the monitoring loop samples resources every `MONITOR_INTERVAL_S`  
**When** the Predictive Guardian runs  
**Then** it MUST store the last `PREDICTIVE_HISTORY_SIZE` (default: 60) samples in a ring buffer per resource type  
**And** each sample MUST include: timestamp, CPU load, RAM available MB, disk I/O %, network out Mbps, disk free GB  
**And** the ring buffer MUST be memory-safe — oldest samples are evicted when capacity is reached  
**And** the ring buffer MUST be protected by a `sync.RWMutex`

**Scenario PRED-02: Predictive Guardian detects upward CPU trend**

**Given** the ring buffer contains at least `PREDICTIVE_MIN_SAMPLES` (default: 10) valid samples  
**When** the CPU load average has been continuously increasing for `PREDICTIVE_TREND_WINDOW_COUNT` (default: 6 consecutive samples)  
**And** the linear regression slope exceeds `PREDICTIVE_CPU_SLOPE_THRESHOLD` (default: 0.05 load per sample)  
**And** the predicted time to reach `MAX_CPU_LOAD_AVG` is less than `PREDICTIVE_LOOKAHEAD_S` (default: 120s)  
**Then** the guardian MUST return `Blocked: true, Resource: "cpu_trend"`  
**And** the system logs: `"PREDICTIVE_BLOCK: CPU trend predicted to exceed {threshold} in {X}s. Current trend: {slope}/sample. Blocking new jobs."`  
**And** increment `vod_engine_predictive_blocked_total{resource="cpu"}` metric

**Scenario PRED-03: Predictive Guardian detects downward RAM trend**

**Given** available RAM has been continuously decreasing for `PREDICTIVE_TREND_WINDOW_COUNT` consecutive samples  
**When** the linear regression predicts RAM will fall below `MIN_FREE_RAM_MB` within `PREDICTIVE_LOOKAHEAD_S`  
**Then** the guardian MUST block with `Resource: "ram_trend"`  
**And** log the prediction with the estimated time-to-exhaustion

**Scenario PRED-04: Predictive Guardian uses hysteresis to prevent oscillation**

**Given** the guardian is currently blocking due to a predictive CPU warning  
**When** the CPU trend reverses and the predicted time-to-threshold exceeds `PREDICTIVE_RECOVERY_FACTOR` (default: 3× `PREDICTIVE_LOOKAHEAD_S`)  
**Then** the guardian MUST unblock and log: `"PREDICTIVE_UNBLOCK: CPU trend relaxed. Predicted exhaustion pushed to {X}s. Resuming."`  
**And** the system MUST NOT unblock immediately when the trend flattens — hysteresis prevents flapping

**Scenario PRED-05: Predictive Guardian degrades gracefully with insufficient data**

**Given** the ring buffer has fewer than `PREDICTIVE_MIN_SAMPLES` samples  
**When** the scheduler calls `CanStart()`  
**Then** the Predictive Guardian MUST bypass trend analysis and fall back to static threshold checking  
**And** MUST NOT block jobs due to insufficient data  
**And** log a debug message: `"PREDICTIVE_GUARDIAN: Insufficient history ({count}/{min}) — using static thresholds."`

**Scenario PRED-06: Predictive Guardian resets history on restart**

**Given** the VOD Engine restarts  
**When** initialization completes  
**Then** the ring buffer MUST be empty (history is in-memory only)  
**And** the guardian MUST use static thresholds until `PREDICTIVE_MIN_SAMPLES` have been collected

---

### 🔴 3. Configuration — Eliminate All Hardcoded Limits

**Business Justification:** Every operational parameter must be tunable without code changes. This enables operators to adapt the encoding server without redeploying.

#### Current Implementation
- Most limits are already configurable via environment variables in `config.Load()`.
- The following are hardcoded: none (all are configurable).
- However, the watchdog timeout values are new and must be added.

#### What To Add

**Scenario CFG-01: Watchdog timeouts are configurable**

**Given** the VOD Engine runs  
**Then** the following new environment variables MUST be accepted:

| Variable | Default | Description |
|----------|---------|-------------|
| `WATCHDOG_PROGRESS_TIMEOUT_S` | `30` | Max seconds without stdout progress before declaring stall |
| `WATCHDOG_CPU_POLL_INTERVAL_S` | `10` | Seconds between CPU activity samples |
| `WATCHDOG_CPU_IDLE_TIMEOUT_S` | `60` | Seconds of CPU inactivity before declaring frozen |
| `WATCHDOG_CPU_IDLE_THRESHOLD_PCT` | `1` | Minimum CPU % of a single core to consider active |
| `WATCHDOG_SEGMENT_POLL_INTERVAL_S` | `15` | Seconds between HLS segment directory checks |
| `WATCHDOG_SEGMENT_STALL_TIMEOUT_S` | `120` | Seconds without new segments before declaring stall |
| `WATCHDOG_STALL_THRESHOLD` | `3` | Consecutive stall samples before termination |
| `WATCHDOG_TERM_WAIT_S` | `10` | Seconds to wait after SIGTERM before SIGKILL |
| `WATCHDOG_FORCE_EXIT_TIMEOUT_S` | `30` | Max seconds to wait for cmd.Wait() after SIGKILL |
| `WATCHDOG_SHORT_VIDEO_THRESHOLD_S` | `30` | Videos under this duration use short-video timeout |
| `WATCHDOG_SHORT_VIDEO_TIMEOUT_S` | `60` | Max wait for short videos before watchdog triggers |

**Scenario CFG-02: Predictive guardian thresholds are configurable**

| Variable | Default | Description |
|----------|---------|-------------|
| `PREDICTIVE_HISTORY_SIZE` | `60` | Max samples in ring buffer (60 × 5s = 5 min window) |
| `PREDICTIVE_MIN_SAMPLES` | `10` | Minimum samples before trend analysis activates |
| `PREDICTIVE_TREND_WINDOW_COUNT` | `6` | Consecutive same-direction samples to qualify as trend |
| `PREDICTIVE_CPU_SLOPE_THRESHOLD` | `0.05` | Minimum load increase per sample to consider trending up |
| `PREDICTIVE_LOOKAHEAD_S` | `120` | How far ahead (seconds) to predict threshold crossing |
| `PREDICTIVE_RECOVERY_FACTOR` | `3` | Multiplier of lookahead for recovery hysteresis |

**Scenario CFG-03: Circuit breaker thresholds are configurable**

| Variable | Default | Description |
|----------|---------|-------------|
| `CB_B2_FAILURE_THRESHOLD` | `5` | Consecutive B2 failures before circuit opens |
| `CB_B2_RECOVERY_TIMEOUT_S` | `60` | Seconds before half-open probe attempt |
| `CB_B2_HALF_OPEN_MAX_REQUESTS` | `3` | Max probes in half-open state |
| `CB_API_FAILURE_THRESHOLD` | `5` | Consecutive API failures before circuit opens |
| `CB_API_RECOVERY_TIMEOUT_S` | `30` | Seconds before half-open probe attempt |
| `CB_API_HALF_OPEN_MAX_REQUESTS` | `3` | Max probes in half-open state |

**Scenario CFG-04: Telemetry sampling interval is configurable**

| Variable | Default | Description |
|----------|---------|-------------|
| `TELEMETRY_SAMPLE_INTERVAL_S` | `10` | Seconds between resource samples during encoding |

---

### 🔴 4. FFmpeg Resource Utilization — Technical Review and Optimization

**Business Justification:** Underutilized CPU means slower encodes and wasted server capacity. Overutilized CPU risks OS starvation. The optimal balance maximizes sustainable throughput without destabilizing the server.

#### Current Implementation
- `FFMPEG_THREADS = 2` (hardcoded default)
- `FFMPEG_PRESET = "medium"`
- `CPU_AFFINITY_MASK = "0-4"` (reserves core 5 for OS)
- `FFMPEG_NICE = 15` (lowest priority)
- `FFMPEG_IONICE_CLASS = 2`, `FFMPEG_IONICE_LEVEL = 7`
- `systemd CPUQuota=500%` (5 cores worth)

#### Technical Analysis

| Factor | Current | Proposed | Reasoning |
|--------|---------|----------|-----------|
| Threads | `2` | `4` | 6 vCPU server. FFmpeg libx264 at `-threads 4` uses ~4 cores efficiently. `threads=2` leaves ~60% of 5 allocated CPU cores idle. 4 threads → ~65-75% sustained CPU utilization (within target). |
| Preset | `medium` | `medium` | NO CHANGE. `medium` is the optimal balance. `fast` produces larger files (more B2 storage cost, more upload bandwidth). `slow` increases CPU without proportional bitrate savings for 720p source. |
| CPU Affinity | `0-4` | `0-4` | NO CHANGE. Reserving core 5 for OS/Go is critical. Without affinity, FFmpeg threads can migrate to core 5 and starve the HTTP server and B2 uploads. |
| Nice | `15` | `15` | NO CHANGE. Lowest priority ensures OS never stalls for FFmpeg. |
| Ionice | `c2 n7` | `c2 n7` | NO CHANGE. Best-effort, lowest priority. Ensures OS I/O always preempts encoding I/O. |
| CPUQuota | `500%` | `400%` | With `threads=4`, a quota of 400% (4 full cores) prevents FFmpeg from borrowing more than 4 cores' worth of CPU even if the OS is idle. This maintains headroom for burst workloads (B2 uploads, API calls). 5 cores @ threads=4 is overprovisioned. |

**Scenario FFMPEG-01: FFmpeg thread count changed from 2 to 4**

**Given** the default `FFMPEG_THREADS` is changed from `2` to `4`  
**When** FFmpeg starts  
**Then** the command MUST include `-threads 4`  
**And** libx264 will use up to 4 encoding threads  
**And** expected CPU utilization: ~65-75% sustained (up from ~30-40% with threads=2)  
**And** expected encoding speed: ~1.5× to 1.8× faster than threads=2  
**And** OS responsiveness MUST remain unaffected (verified by `GET /health` response time < 200ms during encoding)

**Scenario FFMPEG-02: CPU quota reduced from 500% to 400%**

**Given** the systemd unit `CPUQuota` is changed from `500%` to `400%`  
**When** FFmpeg runs with `-threads 4`  
**Then** FFmpeg MUST be throttled by cgroups to at most 4 cores' worth of CPU time  
**And** OS core 5 remains fully available for Go runtime, HTTP server, B2 uploads/downloads  
**And** if FFmpeg under `CPUQuota=400%` causes the encoding speed regression to exceed 10% vs. unbounded, the quota MUST be re-evaluated (systemd CPUQuota can cause extra context switching at limit)

**Scenario FFMPEG-03: Monitoring validates thread count decision**

**Given** the system is running production encodes with `FFMPEG_THREADS=4`  
**When** the monitoring loop samples CPU  
**Then** sustained CPU utilization MUST be between 60% and 80% during encoding  
**And** if CPU utilization exceeds 85% sustained for 5 minutes, a WARNING alert fires  
**And** if CPU utilization stays below 40% with threads=4, FFMPEG_THREADS should be increased to 5  

---

### 🔴 5. Linux Resource Isolation — Production Stability Review

**Business Justification:** Proper isolation prevents noisy-neighbor scenarios where encoding impacts API responsiveness. Every limit must be justified against the 6vCPU/12GB/100GB spec.

#### Current Implementation (systemd unit)

```ini
CPUQuota=500%
MemoryMax=10G
MemoryHigh=8G
IOWeight=100
OOMScoreAdjust=-500
LimitNOFILE=65536
LimitNPROC=32
Nice=0
```

#### Review And Recommendations

| Setting | Current | Change | Rationale |
|---------|---------|--------|-----------|
| `CPUQuota` | `500%` | `400%` | See FFMPEG-02. Threads=4 needs at most 400%. Extra quota permits CPU borrowing that can steal from OS core when kernel decides to overcommit. |
| `MemoryMax` | `10G` | `10G` | NO CHANGE. 12 GB total - 10 GB = 2 GB for OS + monitoring. FFmpeg + Go runtime rarely exceed 6 GB total. |
| `MemoryHigh` | `8G` | `8G` | NO CHANGE. Soft limit at 8G, hard at 10G. Provides throttling warning before OOM. |
| `OOMScoreAdjust` | `-500` | `-800` | CURRENTLY -500. Strengthen to -800 to make VOD Engine even harder to OOM-kill relative to FFmpeg. FFmpeg inherits Go's OOM score by default (same process group). At -800, the engine is virtually never killed; FFmpeg children would need their own score. **Alternative:** keep `-500` and add explicit OOM score for FFmpeg children via `/proc/<ffmpeg_pid>/oom_score_adj` set to `500` (high kill priority) so the OS kills FFmpeg before the VOD Engine. This is safer — let FFmpeg be killed, not the orchestrator. |
| `IOWeight` | `100` | `50` | Reduce I/O weight from 100 to 50. Default is 100. Setting to 50 reduces encoding I/O priority relative to other services. With NVMe, this still provides ample throughput but prevents I/O starvation for SSH and monitoring. |
| `LimitNOFILE` | `65536` | `65536` | NO CHANGE. Adequate for HLS segments + B2 connections. |
| `LimitNPROC` | `32` | `64` | Increase from 32 to 64. Go runtime's goroutine scheduler creates OS threads for cgo calls and network I/O. FFmpeg with threads=4 adds 6-8 processes. With 64, we leave headroom for monitoring, upload, and crash handlers. |
| `Nice` | `0` | `0` | NO CHANGE. Nice=0 at service level; FFmpeg gets nice=15 via wrapper. Service-level nice 0 means the Go orchestrator gets default priority (not penalized). |
| `TasksMax` | not set | `128` | ADD. systemd default is 15% of `kernel.pid_max` (usually ~4915). Setting TasksMax=128 prevents runaway goroutines. |

**Scenario LINUX-01: FFmpeg OOM score explicitly set to high priority for killing**

**Given** the VOD Engine starts an FFmpeg child process  
**When** FFmpeg PID is obtained  
**Then** the engine MUST write `500` to `/proc/<ffmpeg_pid>/oom_score_adj`  
**And** this MUST be done immediately after `cmd.Start()` succeeds  
**And** if the write fails (EPERM), the engine MUST log a warning but continue  
**And** this ensures that if OOM triggers, FFmpeg is killed before the VOD Engine

**Scenario LINUX-02: TasksMax added to systemd unit**

**Given** the systemd unit is reloaded  
**Then** it MUST contain `TasksMax=128`  
**And** `systemctl daemon-reload` followed by `systemctl restart vod-engine` applies the change

---

### 🔴 6. Circuit Breakers — Self-Healing External Dependency Protection

**Business Justification:** Without circuit breakers, a B2 outage causes all jobs to fail simultaneously (retry storm), then retry in synchrony (thundering herd). A circuit breaker decouples failure detection from retry scheduling.

#### Current Implementation
- Retry with exponential backoff (3 attempts, base 30s).
- No state machine for B2 health.
- No API server health tracking.

#### Recommended Solution
A `CircuitBreaker` package with per-service state machines.

#### Scenarios

**Scenario CB-01: Circuit breaker tracks B2 failures**

**Given** the VOD Engine uses Backblaze B2 for download and upload  
**When** B2 operations fail consecutively and the failure count reaches `CB_B2_FAILURE_THRESHOLD` (default: 5)  
**Then** the circuit breaker MUST transition from `CLOSED` to `OPEN` state  
**And** all subsequent B2 operations MUST fail immediately with `ErrCircuitOpen` without attempting the real operation  
**And** increment `vod_engine_circuit_breaker_total{service="b2",state="open"}` counter  
**And** log: `"CIRCUIT_BREAKER: B2 circuit OPEN after {N} consecutive failures. All B2 operations fast-failing."`

**Scenario CB-02: Circuit breaker auto-recovery via half-open probes**

**Given** the B2 circuit is `OPEN`  
**When** `CB_B2_RECOVERY_TIMEOUT_S` (default: 60s) has elapsed  
**Then** the circuit MUST transition to `HALF_OPEN` state  
**And** allow up to `CB_B2_HALF_OPEN_MAX_REQUESTS` (default: 3) probes  
**And** if at least one probe succeeds, the circuit transitions to `CLOSED`  
**And** if all probes fail, the circuit returns to `OPEN` and waits another `CB_B2_RECOVERY_TIMEOUT_S`  
**And** increment counters: `vod_engine_circuit_breaker_total{service="b2",state="half_open"}` / `{state="closed"}`  
**And** log state transitions

**Scenario CB-03: Circuit breaker for API server communication**

**Given** the VOD Engine sends webhooks to the Laravel API server  
**When** API calls fail consecutively reaching `CB_API_FAILURE_THRESHOLD` (default: 5)  
**Then** the API circuit opens  
**And** webhooks are queued in a bounded in-memory buffer (max `CB_API_WEBHOOK_BUFFER_SIZE`, default: 100)  
**And** when the circuit closes, buffered webhooks are sent  
**And** if the buffer is full, oldest webhooks are dropped with a warning  
**And** increment `vod_engine_circuit_breaker_total{service="api",state="open"}`

**Scenario CB-04: Circuit breaker integrates with guardian**

**Given** the B2 circuit is OPEN  
**When** the scheduler dequeues a job  
**Then** the guardian MUST NOT block the job (B2 state is not a resource issue)  
**But** the scheduler SHOULD delay job start by `CB_B2_JOB_DELAY_S` (default: 30s) to avoid immediate failure  
**And** log: `"CIRCUIT_BREAKER: B2 circuit open — delaying job {id} by 30s before attempt"`

**Scenario CB-05: Circuit breaker prevents retry storms**

**Given** the B2 circuit is OPEN  
**When** an encoding job fails with B2-related error  
**Then** the exponential backoff retry counter MUST still tick (30s → 60s → 120s)  
**But** the actual B2 operation MUST NOT be attempted until the circuit transitions to HALF_OPEN or CLOSED  
**And** the job remains pending with status `waiting: circuit_breaker`  
**And** the scheduler re-checks the circuit state at each poll interval

---

### 🔴 7. Enhanced Per-Job Telemetry

**Business Justification:** Complete job telemetry enables cost analysis, performance tuning, and failure root-cause analysis. Missing fields lead to guesswork during incidents.

#### Current Implementation

Existing telemetry fields (from `telemetry.ToLogEvent()`):
- lecture_id, quality, encoding_duration_s
- cpu_avg_pct, cpu_peak_pct
- ram_avg_mb, ram_peak_mb
- disk_read_mb, disk_write_mb
- download_speed_mbps, upload_speed_mbps
- total_size_mb, segments_count
- retry_count, final_status

Missing fields:
- teacher_id
- queue_wait_time_s
- encoding_speed_fps
- exit_reason
- video_duration_s (original input duration)

#### Scenarios

**Scenario TEL-01: Telemetry includes queue wait time**

**Given** a sub-job is created  
**When** the sub-job is created (`CreatedAt` timestamp set)  
**And** encoding actually starts (`StartTime` in JobTelemetry)  
**Then** the telemetry MUST compute `queue_wait_time_s = StartTime - CreatedAt`  
**And** this MUST be included in the telemetry log line as `queue_wait_time_s`

**Scenario TEL-02: Telemetry includes teacher_id**

**Given** Laravel enqueues a job via `POST /api/v1/video/process`  
**When** the `EnqueueRequest` includes a `teacher_id` field  
**Then** the VOD Engine MUST store `teacher_id` in the `SubJob` struct  
**And** propagate it to `JobTelemetry.TeacherID`  
**And** include it in the telemetry log line as `teacher_id`

**Note:** The `EnqueueRequest` struct MUST be extended to accept an optional `teacher_id` field. If absent, `teacher_id` MUST default to `""`.

**Scenario TEL-03: Telemetry includes encoding speed (FPS)**

**Given** FFmpeg outputs progress lines with `fps=` field  
**When** the pipeline parses stdout progress  
**Then** it MUST capture the last `fps=` value from the progress line  
**And** include it in telemetry as `encoding_speed_fps`  
**And** if FFmpeg does not output fps (stderr-only), the value defaults to 0

**Scenario TEL-04: Telemetry includes exit reason**

**Given** a job completes (success or failure)  
**When** the engine logs telemetry  
**Then** the `exit_reason` field MUST contain:  
- For success: `"completed"`  
- For FFmpeg crash: `"ffmpeg_crash:{exit_code}"`  
- For watchdog kill: `"watchdog_kill:{reason}"`  
- For circuit breaker: `"circuit_breaker:{service}"`  
- For max retries: `"max_retries_exceeded"`  
- For disk quota: `"disk_quota_exceeded"`  
- For B2 failure: `"b2_failure:{operation}"`

**Scenario TEL-05: Telemetry includes original video duration**

**Given** the pipeline calls `ffmpeg.GetTotalDuration(inputFile)` during download  
**When** the JobTelemetry is computed  
**Then** it MUST include `video_duration_s` in the telemetry log line

**Scenario TEL-06: Complete telemetry log line format**

**Given** any job completes  
**When** the telemetry is logged  
**Then** the JSON log MUST contain:

```json
{
  "event": "job.telemetry",
  "lecture_id": "42",
  "teacher_id": "15",
  "quality": "480p",
  "queue_wait_time_s": 120.5,
  "encoding_duration_s": 342.1,
  "video_duration_s": 1800.0,
  "encoding_speed_fps": 45.2,
  "cpu_avg_pct": 65.3,
  "cpu_peak_pct": 82.1,
  "ram_avg_mb": 2048,
  "ram_peak_mb": 3100,
  "disk_read_mb": 512,
  "disk_write_mb": 4096,
  "download_speed_mbps": 85.3,
  "upload_speed_mbps": 42.7,
  "total_size_mb": 512,
  "segments_count": 85,
  "retry_count": 0,
  "exit_reason": "completed",
  "final_status": "completed"
}
```

---

### 🟡 8. Improved Observability Prometheus Metrics

**Business Justification:** Without comprehensive metrics, operators are blind to queue health, encoding performance trends, and resource contention. Each missing metric represents a blind spot.

#### Current Implementation
- Gauges: active_jobs, pending_jobs, dead_letter_jobs, queue_oldest_age_seconds, ffmpeg_pids
- Counters: jobs_processed_total{status}, resource_blocked_total{resource}
- Histograms: encoding_duration_seconds

Missing metrics (from request):
- retry count per job (as a gauge or counter)
- watchdog kills counter
- guardian pauses counter (done via resource_blocked_total — but no finer detail)
- guardian resumes counter (NOT done)
- worker state (idle/encoding/uploading)
- current encoding stage (waiting/downloading/encoding/uploading/cleaning)

#### Scenarios

**Scenario OBS-01: Watchdog kill counter exposed**

**Given** the watchdog terminates a frozen FFmpeg  
**Then** `vod_engine_watchdog_kills_total` counter MUST be incremented  
**And** the metric MUST have labels: `{reason="no_progress"|"frozen_cpu"|"no_segments"}`  
**And** registered as a counter metric

**Scenario OBS-02: Guardian resume counter exposed**

**Given** the Predictive Guardian was blocking jobs  
**When** it unblocks due to trend recovery  
**Then** `vod_engine_guardian_resumes_total` counter MUST be incremented  
**And** labeled by `{resource="cpu_trend"|"ram_trend"|...}`

**Scenario OBS-03: Worker state gauge exposed**

**Given** the scheduler is running  
**Then** `vod_engine_worker_state` gauge MUST be exposed  
**And** values: `0` = idle, `1` = downloading, `2` = encoding, `3` = uploading, `4` = cleaning  
**And** updated in real-time in `Scheduler.startJob()` and `handleJobSuccess/Failure`

**Scenario OBS-04: Encoding stage gauge exposed**

**Given** a job is running  
**Then** `vod_engine_encoding_stage` gauge MUST be exposed with current stage  
**And** values: `0` = waiting, `1` = downloading, `2` = encoding, `3` = uploading, `4` = webhook, `5` = cleaning  
**And** updated via progress callback in `Pipeline.Run()`

**Scenario OBS-05: Retry count histogram exposed**

**Given** jobs complete (success or failure)  
**Then** `vod_engine_retry_count` histogram MUST record the number of retries  
**And** buckets: `[0, 1, 2, 3, 5, +Inf]`  
**And** this enables operators to detect jobs that succeed on retry vs. fail permanently

**Scenario OBS-06: Circuit breaker metrics exposed**

**Given** circuit breakers are implemented  
**Then** the following metrics MUST be exposed:
- `vod_engine_circuit_breaker_total{service="b2"|"api",state="open"|"half_open"|"closed"}` counter
- `vod_engine_circuit_breaker_current_state{service="b2"|"api"}` gauge (0=closed, 1=half_open, 2=open)

---

### 🟡 9. Queue Implementation Review

**Business Justification:** The queue is the heart of the encoding pipeline. Any race condition, memory leak, or correctness bug causes job loss or duplicate processing.

#### Review

| Aspect | Current Implementation | Verdict | Notes |
|--------|----------------------|---------|-------|
| **FIFO** | Binary heap: `<` on priority, then `<` on `CreatedAt` | ✅ CORRECT | `Less()` correctly implements priority-first, FIFO-within-priority |
| **Priority** | Numeric: 1=480p, 2=360p, 3=720p | ✅ CORRECT | Lower number = higher priority per spec |
| **Atomic Persistence** | `.tmp` + `rename(2)` | ✅ CORRECT | Atomic on same filesystem; no risk of partial writes |
| **Recovery** | `LoadPending()` on startup reads pending dir | ✅ CORRECT | Reads all `.json` files; status `interrupted` → `pending` |
| **Dead Queue** | `MoveToDead()` + `failure_report.json` | ✅ CORRECT | Safe; preserves errors for manual review |
| **Retry Logic** | `NextRetryAt` check; backoff: base×2^retry | ✅ CORRECT | Exponential backoff formula is correct |
| **Race Conditions** | `sync.Mutex` on queue operations | ✅ CORRECT | Push/Pop/Peek/Drain all hold the mutex |
| **Mutex Correctness** | `sync.Mutex` (not RWMutex) | ✅ CORRECT | Queue operations are fast; RWMutex adds complexity with no benefit |
| **Memory Safety** | `heap.Pop()` sets index=-1; nil the popped slot | ✅ CORRECT | Prevents reference leaks in the underlying slice |
| **Map Growth** | `activeGroups` map | ⚠️ NEEDS ATTENTION | Map entries are deleted when `activeGroups[jobGroup]` hits 0. However, if a job group never completes (stays at >0 indefinitely due to bug), the map leaks. **Recommendation:** Add periodic GC sweep for stale activeGroup entries older than `MAX_JOB_AGE_HOURS` (configurable, default 24h). |
| **Progress Map Growth** | `progressTicker` map | ⚠️ IMPROVED | `cleanupProgressTicker()` is called in success and failure paths. Verified in handleJobSuccess and handleJobFailure. ✅ CORRECT after M-01 fix. |
| **Empty Queue** | `Pop()` returns nil | ✅ CORRECT | Handle nil in caller |
| **Concurrent Enqueue** | Per-lecture mutex in `AddJob()` | ✅ CORRECT | Prevents TOCTOU race between duplicate check and push |

**Scenario QUEUE-01: Active groups map has periodic GC**

**Given** the scheduler tracks active job groups in `activeGroups` map  
**When** a job group has been in map with count > 0 for more than `MAX_JOB_AGE_HOURS` (default: 24h)  
**Then** the GC sweep MUST log a warning and remove the stale entry  
**And** run on a periodic ticker every `ACTIVE_GROUPS_GC_INTERVAL_M` (default: 60 minutes)

**Scenario QUEUE-02: Queue drains all jobs on shutdown**

**Given** the scheduler is shutting down  
**When** `PersistQueueOnShutdown()` is called  
**Then** all in-memory jobs are popped via `Drain()`  
**And** saved to disk with `status: interrupted`  
**AND** the drain must not panic even if the heap has been modified concurrently  
**And** the mutex in `Drain()` prevents concurrent modification

---

### 🟡 10. Storage Protection Review

**Business Justification:** Temporary storage exhaustion during encoding causes FFmpeg crashes, corrupt HLS segments, and job failures. Protection must prevent this.

#### Review

| Aspect | Current Implementation | Verdict |
|--------|----------------------|---------|
| **Automatic Cleanup** | `CleanupJobGroup()` on completion | ✅ CORRECT — removes work dir + raw B2 file |
| **Disk Watermark** | `MinFreeDiskGB` (default 15 GB) | ✅ CORRECT — prevents new jobs when disk low |
| **Work Dir Usage** | `MaxWorkDirUsageGB` (default 75 GB) | ✅ CORRECT — caps total work dir size |
| **Per-Job Quota** | `MaxPerJobDiskGB` (default 25 GB) | ✅ CORRECT — estimated before job start |
| **Temp File Cleanup** | `OrphanCleanup()` on startup, files >24h | ✅ CORRECT |
| **Crash Recovery** | `tmpfiles.d` rule for `/var/tmp/vod-engine` | ✅ CORRECT — systemd cleans orphaned temp files |

**Scenario STORE-01: Disk watermarks use percentage-based thresholds**

**Given** the encoding server has 100 GB NVMe  
**When** `MIN_FREE_DISK_GB` is configured  
**Then** the guardian MUST also accept a percentage-based alternative: `MIN_FREE_DISK_PCT` (default: 15%)  
**And** if both `MIN_FREE_DISK_GB` and `MIN_FREE_DISK_PCT` are set, the MORE RESTRICTIVE (lower free space) threshold is used  
**And** this accommodates servers with different disk sizes without hardcoded GB values

---

### 🟡 11. Fault Tolerance — Graceful Degradation Review

**Business Justification:** Production encoding servers must survive power loss, kernel panics, and network partitions without data corruption or job loss.

#### Review

| Failure Mode | Current Protection | Status | Improvement |
|-------------|-------------------|--------|-------------|
| **SIGTERM/SIGINT** | Graceful shutdown: wait for FFmpeg, persist queue | ✅ DONE | — |
| **SIGHUP** | Config reload without restart | ✅ DONE | — |
| **OOM** | OOMScoreAdjust=-500 (systemd + in-process) | ✅ DONE | FFmpeg OOM score set to 500 (HIGH) — see LINUX-01 |
| **Disk Full** | Guardian blocks new jobs; MinFreeDiskGB | ✅ DONE | — |
| **B2 Unavailable** | Retry 3× with backoff → dead letter | ✅ DONE | Circuit breaker (CB-01) adds fast-fail + auto-recovery |
| **API Unavailable** | Webhook call failure → logged (no retry) | ⚠️ IMPROVABLE | Add circuit breaker + webhook buffer (CB-03) |
| **Network Interruption** | Retry with backoff | ✅ DONE | — |
| **Partial Upload** | B2 SDK handles multipart retry internally | ✅ DONE | — |
| **Partial Download** | B2 SDK download manager resumes chunks | ✅ DONE | — |
| **Power Loss / Kernel Reboot** | `tmpfiles.d` cleanup on next boot | ✅ DONE | `OrphanCleanup()` kills stale FFmpeg; `LoadPending()` recovers jobs |
| **Kernel Panic** | `kernel.panic=30` → reboot | ✅ DONE (OPS-02) | After reboot, same recovery as power loss |
| **Filesystem Corruption** | `data=ordered` ext4 mount option | ✅ DONE (OPS-03) | Journal ensures metadata consistency |

**Scenario FT-01: Partial upload recovery on restart**

**Given** the VOD Engine crashes mid-upload  
**When** the engine restarts  
**Then** `OrphanCleanup()` MUST clean up any stale `.tmp` upload files  
**And** any interrupted upload from B2 multipart is discarded (B2 auto-deletes incomplete parts after 7 days)  
**And** the job is recovered from disk queue and retried

**Scenario FT-02: Webhook buffer for API unavailability**

**Given** the API server (Laravel) is unreachable  
**When** the VOD Engine needs to send a completion webhook  
**Then** if the API circuit is OPEN, the webhook payload is stored in an in-memory buffer (max `CB_API_WEBHOOK_BUFFER_SIZE`, default: 100)  
**And** when the circuit transitions to CLOSED, buffered webhooks are sent FIFO  
**And** dropped webhooks are logged with `event: webhook.buffer_overflow`  
**And** the job itself is NOT retried — only the notification is buffered

---

### 🟢 12. Structured Logging — Correlation IDs and Machine Readability

**Business Justification:** Without correlation IDs, tracing a single encoding job across multiple log lines requires grep-based detective work. Machine-readable JSON enables automated log analysis.

#### Current Implementation
- `slog.NewJSONHandler(os.Stdout, nil)` — JSON structured logging
- Job events include `job_id` and `lecture_id`
- Telemetry logged as single JSON line with `event: job.telemetry`

#### Scenarios

**Scenario LOG-01: Every log line includes correlation IDs**

**Given** any component logs an event related to a specific job  
**When** the log handler is invoked  
**Then** the log line MUST include:
- `correlation_id` — a UUIDv4 generated per job group (lecture_id level)  
- `job_id` — the specific sub-job ID (if applicable)  
- `lecture_id` — the lecture being processed  

**And** the correlation_id is generated once when `NewSubJobs()` is called and attached to all sub-jobs in the group

**Scenario LOG-02: Component-level breakdown in logs**

**Given** a log line is emitted  
**Then** it MUST include a `component` field indicating the source:
- `vod-engine` — main lifecycle  
- `scheduler` — job scheduling  
- `guardian` — resource checks  
- `watchdog` — FFmpeg health monitoring  
- `pipeline` — download/encode/upload  
- `b2-client` — B2 operations  
- `circuit-breaker` — circuit state changes  

**Scenario LOG-03: Machine-readable severity classification**

**Given** a log event is emitted  
**Then** the `severity` field MUST be one of: `debug`, `info`, `warn`, `error`, `critical`  
**And** `slog.Level` MUST map as:
- `slog.LevelDebug` → `debug`  
- `slog.LevelInfo` → `info`  
- `slog.LevelWarn` → `warn`  
- `slog.LevelError` → `error`  
- No built-in `critical`; use `slog.LevelError` with `"critical": true` attribute  

**Scenario LOG-04: Consistent event naming**

**Given** a structured log event  
**Then** event names MUST follow the pattern: `{component}.{action}`  
**And** existing events MUST be renamed (breaking change — requires coordinated migration):

| Current | New |
|---------|-----|
| `job.telemetry` | `pipeline.telemetry` |
| `RESOURCE_BLOCK` | `guardian.resource_block` |
| `RESOURCE_UNBLOCK` | `guardian.resource_unblock` |
| — (new) | `watchdog.kill` |
| — (new) | `circuit_breaker.state_change` |
| — (new) | `queue.recovery` |
| — (new) | `queue.requeue` |

---

### 🟢 13. Assumptions Review — Challenge Every Decision

**Business Justification:** Previous implementations may contain cargo-cult configurations or outdated assumptions. Each parameter must be questioned and either revalidated or changed.

#### Assumptions Challenged

**Assumption A: `CPUAffinityMask=0-4` is correct**

✅ **RE-VALIDATED.** 6 vCPU server. Reserving core 5 (the last core) for OS/Go is standard practice for encoding workloads. FFmpeg's pthreads scheduler distributes threads across cores 0-4. The OS scheduler on core 5 handles HTTP, B2 I/O, monitoring, and SSH. Without affinity, the OS scheduler may migrate FFmpeg threads to core 5, causing API latency spikes during encoding.

**Assumption B: `FFMPEG_THREADS=2` is optimal for stability**

❌ **CHANGED TO `FFMPEG_THREADS=4`.** With 6 vCPU and 5 cores allocated to encoding (affinity 0-4), threads=2 leaves at least 55% of available CPU idle. Threads=4 achieves ~65-75% utilization. The risk of OS starvation at 75% utilization is minimal because:
- Nice=15 ensures OS processes preempt FFmpeg
- Core 5 is reserved exclusively for OS
- B2 uploads/downloads are I/O-bound, not CPU-bound
- Monitoring is negligible (<0.1% CPU)

**Assumption C: `CPUQuota=500%` is correct**

❌ **CHANGED TO `CPUQuota=400%`.** With threads=4, FFmpeg cannot effectively use more than 4 cores. 500% allows the cgroup to borrow time from core 5 (the OS core) when the kernel decides to overcommit. 400% caps it precisely to the allocated cores.

**Assumption D: `Nice=0` at service level is correct**

✅ **RE-VALIDATED.** Nice=0 at the systemd service level gives the Go orchestrator default priority. FFmpeg gets nice=15 via the wrapper. This ensures:
- Go runtime (HTTP server, B2 uploads, monitoring) runs at normal priority
- FFmpeg runs at lowest priority
- OS processes (sshd, systemd-journald, monitoring agents) preempt everything

**Assumption E: Backblaze B2 operations always succeed with retries**

❌ **IMPROVED.** Retry-only is insufficient. B2 can be unavailable for extended periods (minutes to hours). Circuit breaker adds:
- Fast-fail during known outages (no unnecessary retries)
- Gradual recovery probing (no thundering herd)
- Configurable thresholds per operation type

**Assumption F: `cmd.Wait()` always returns within a reasonable time**

❌ **REFUTED.** FFmpeg can freeze indefinitely. Watchdog is mandatory.

**Assumption G: Static threshold guardian is sufficient**

❌ **IMPROVED.** Static thresholds catch only current violations. Predictive guardian catches trends before they become violations. Both are needed.

**Assumption H: `MemoryHigh=8G` is sufficient for all workloads**

✅ **RE-VALIDATED.** 8 GB soft limit. FFmpeg with threads=4 + libx264 + HLS muxing uses ~3-4 GB RSS. Go runtime uses ~100-500 MB. Total: 4-5 GB. 8 GB provides 3-4 GB headroom. 10 GB hard limit prevents actual OOM.

**Assumption I: `IOWait` impact on NVMe is negligible**

✅ **RE-VALIDATED.** NVMe drives have sub-100μs latency. Even at 75% disk I/O utilization, the impact on other processes is negligible due to NVMe's parallel queue architecture. `ionice -c 2 -n 7` further ensures FFmpeg I/O yields to other processes.

**Assumption J: Single encoding worker is sufficient for the workload**

✅ **RE-VALIDATED.** The spec explicitly states "Only ONE encoding worker is allowed." This simplifies queue management, prevents resource contention between workers, and ensures predictable resource usage.

---

## Security Requirements

| ID | Requirement | Rationale |
|----|------------|-----------|
| SEC-01 | `EnqueueRequest` `teacher_id` field MUST be validated as numeric string (digits only) | Prevents injection via teacher_id |
| SEC-02 | Watchdog must not have any filesystem write access beyond its own logs | Watchdog runs in VOD Engine process; inherits the user's permissions |
| SEC-03 | Circuit breaker state MUST NOT be observable via unauthenticated endpoints | Circuit state reveals service health; only `/metrics` may expose aggregated counters |
| SEC-04 | FFmpeg OOM score adjustment to 500 MUST be done with appropriate capability check | Writing to `/proc/<pid>/oom_score_adj` requires `CAP_SYS_RESOURCE` or ownership |
| SEC-05 | Webhook buffer MUST NOT store credentials or secrets | Only lecture_id, status, m3u8_path — no JWT tokens or encryption keys |
| SEC-06 | All new configuration environment variables MUST be validated at startup | Invalid values (negative timeouts, zero thresholds) must cause a fatal error |

---

## Performance Requirements

| ID | Requirement | Measurement |
|----|------------|-------------|
| PERF-01 | Watchdog checks MUST consume < 0.5% CPU per job | Measured by monitoring loop overhead |
| PERF-02 | Predictive Guardian trend computation MUST complete in < 5ms | O(n) linear regression over 60 samples |
| PERF-03 | Circuit breaker state check MUST complete in < 1μs | Simple atomic load of state variable |
| PERF-04 | Webhook buffer flush MUST not block encoding completion | Async goroutine with buffered channel |
| PERF-05 | Telemetry with new fields MUST not increase log volume by more than 20% vs v2.0 | Baseline: ~400 bytes per telemetry line |
| PERF-06 | FFmpeg with threads=4 MUST not increase RAM peak by more than 20% vs threads=2 | Expected: RSS ~4 GB vs ~3 GB at threads=2 |

---

## Out of Scope

- **GPU/NVENC encoding** — CPU-only libx264 remains  
- **Multi-worker encoding** — Single worker remains; all improvements assume one encoding slot  
- **Distributed queue (Redis)** — Local file-based queue remains  
- **Dynamic resource threshold tuning** — Thresholds are configurable but not auto-tuned  
- **Real-time encoding progress streaming** — Webhook updates at fixed intervals  
- **Client-side dashboard** — All monitoring via Prometheus/Grafana  
- **Encryption key rotation** — HLS keys are per-lecture, not rotated during encoding  
- **Watermarking logic changes** — Handled externally by FFmpeg filter chains  
- **Thumbnail generation** — Future feature  
- **Transcription / subtitles** — Future feature  

---

## Configuration Reference (New Variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `WATCHDOG_PROGRESS_TIMEOUT_S` | `30` | Max seconds without stdout progress before declaring stall |
| `WATCHDOG_CPU_POLL_INTERVAL_S` | `10` | Seconds between CPU activity samples |
| `WATCHDOG_CPU_IDLE_TIMEOUT_S` | `60` | Seconds of CPU inactivity before declaring frozen |
| `WATCHDOG_CPU_IDLE_THRESHOLD_PCT` | `1` | Minimum CPU % of a single core to consider active |
| `WATCHDOG_SEGMENT_POLL_INTERVAL_S` | `15` | Seconds between HLS segment directory checks |
| `WATCHDOG_SEGMENT_STALL_TIMEOUT_S` | `120` | Seconds without new segments before declaring stall |
| `WATCHDOG_STALL_THRESHOLD` | `3` | Consecutive stall samples before termination |
| `WATCHDOG_TERM_WAIT_S` | `10` | Seconds to wait after SIGTERM before SIGKILL |
| `WATCHDOG_FORCE_EXIT_TIMEOUT_S` | `30` | Max seconds to wait for cmd.Wait() after SIGKILL |
| `WATCHDOG_SHORT_VIDEO_THRESHOLD_S` | `30` | Videos under this duration use short-video timeout |
| `WATCHDOG_SHORT_VIDEO_TIMEOUT_S` | `60` | Max wait for short videos before watchdog triggers |
| `PREDICTIVE_HISTORY_SIZE` | `60` | Max samples in ring buffer |
| `PREDICTIVE_MIN_SAMPLES` | `10` | Minimum samples before trend analysis activates |
| `PREDICTIVE_TREND_WINDOW_COUNT` | `6` | Consecutive same-direction samples to qualify as trend |
| `PREDICTIVE_CPU_SLOPE_THRESHOLD` | `0.05` | Minimum load increase per sample to consider trending up |
| `PREDICTIVE_LOOKAHEAD_S` | `120` | How far ahead to predict threshold crossing |
| `PREDICTIVE_RECOVERY_FACTOR` | `3` | Multiplier of lookahead for recovery hysteresis |
| `CB_B2_FAILURE_THRESHOLD` | `5` | Consecutive B2 failures before circuit opens |
| `CB_B2_RECOVERY_TIMEOUT_S` | `60` | Seconds before half-open probe attempt |
| `CB_B2_HALF_OPEN_MAX_REQUESTS` | `3` | Max probes in half-open state |
| `CB_API_FAILURE_THRESHOLD` | `5` | Consecutive API failures before circuit opens |
| `CB_API_RECOVERY_TIMEOUT_S` | `30` | Seconds before half-open probe attempt |
| `CB_API_HALF_OPEN_MAX_REQUESTS` | `3` | Max probes in half-open state |
| `CB_API_WEBHOOK_BUFFER_SIZE` | `100` | Max buffered webhooks when API circuit is open |
| `CB_B2_JOB_DELAY_S` | `30` | Job delay when B2 circuit is open |
| `TELEMETRY_SAMPLE_INTERVAL_S` | `10` | Seconds between resource samples during encoding |
| `MIN_FREE_DISK_PCT` | `15` | Alternative disk threshold as % of total (more restrictive of GB vs % wins) |
| `MAX_JOB_AGE_HOURS` | `24` | Max age of job group entry before GC sweep removes it |
| `ACTIVE_GROUPS_GC_INTERVAL_M` | `60` | Minutes between active groups map GC sweeps |

## Glossary (New Terms)

| Term | Definition |
|------|------------|
| `Watchdog` | Goroutine that monitors FFmpeg health during encoding and terminates frozen processes |
| `Predictive Guardian` | Enhanced resource guardian that uses trend analysis to predict future resource exhaustion |
| `Circuit Breaker` | State machine (CLOSED → OPEN → HALF_OPEN) that fast-fails during known outages and auto-recovers |
| `Ring Buffer` | Fixed-size circular buffer storing the last N resource samples for trend analysis |
| `Stall Threshold` | Number of consecutive failed health checks before watchdog declares a stall |
| `Half-Open Probe` | Limited test request sent by a circuit breaker to verify service recovery |
| `Webhook Buffer` | In-memory FIFO queue for webhooks when the API circuit is open |
| `Correlation ID` | UUIDv4 shared across all log lines for a single job group (lecture) |
