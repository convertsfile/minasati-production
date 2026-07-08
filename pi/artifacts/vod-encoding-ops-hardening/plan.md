# Implementation Plan — VOD Encoding Operational Hardening

## Overview

Enhance the existing VOD Engine (Go) and its host operating system to ensure 24/7 reliable operation with zero manual intervention. This plan hardens the encoding server at every layer: OS kernel tuning, service management with cgroups, filesystem optimization, job-level telemetry, Prometheus/Grafana monitoring, health probes, idempotency, graceful degradation, and log lifecycle management.

**Risk Level:** MEDIUM — enhances existing stable infrastructure. Does not change encoding logic. Adds new OS-level components and telemetry subsystems.

---

## Architecture

### New & Modified Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Operational Hardening Layer (this feature)                             │
│                                                                         │
│  ┌──────────────────┐   ┌───────────────────┐   ┌──────────────────┐   │
│  │  telemetry/       │   │   metrics/         │   │  deploy/         │   │
│  │  ┌──────────────┐ │   │  ┌───────────────┐ │   │  ┌────────────┐ │   │
│  │  │ telemetry.go │ │   │  │ metrics.go    │ │   │  │ systemd/   │ │   │
│  │  │ sampler.go   │ │   │  │ textfile.go   │ │   │  │ sysctl/    │ │   │
│  │  └──────────────┘ │   │  └───────────────┘ │   │  │ logrotate/ │ │   │
│  └──────────────────┘   └───────────────────┘   │  │ prometheus/ │ │   │
│                                                  │  │ grafana/    │ │   │
│  ┌──────────────────┐   ┌───────────────────┐   │  │ udev/       │ │   │
│  │  Modified:        │   │  Modified:         │   │  │ tmpfiles.d/│ │   │
│  │  monitor/         │   │  guardian/         │   │  └────────────┘ │   │
│  │  (+NVMe, +FD)    │   │  (+disk_quota)     │   └──────────────────┘   │
│  └──────────────────┘   └───────────────────┘                           │
│                                                                         │
│  ┌──────────────────┐   ┌───────────────────┐   ┌──────────────────┐   │
│  │  Modified:        │   │  Modified:         │   │  Modified:       │   │
│  │  encoding/        │   │  worker/pool.go    │   │  api/handlers/   │   │
│  │  (+stderr, +pv)  │   │  (+idempotency,    │   │  (+probes)       │   │
│  │                   │   │   +B2 degradation) │   │                  │   │
│  └──────────────────┘   └───────────────────┘   └──────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Modified: cmd/api/main.go (+SIGHUP, +OOMscore, +metrics route)  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow (Telemetry & Metrics)

```
FFmpeg process ──(10s sampling)──→ telemetry.Sampler ──→ slog (event=job.telemetry)
                                        │
                                        └──→ metrics.Collector (in-memory)
                                                  │
                                                  ├──→ /metrics endpoint (Prometheus scrape)
                                                  │
                                                  └──→ /var/lib/node_exporter/textfile/vod_engine.prom (30s)
                                                            │
                                                            └──→ Node Exporter textfile collector
                                                                        │
                                                                  Prometheus ──→ Alertmanager ──→ Grafana
```

---

## Files to Create (15 new files)

### 1. `workers/vod-engine/internal/telemetry/telemetry.go` — NEW
**Purpose:** Types and public API for per-job resource telemetry.

- `JobTelemetry` struct with job metadata, `[]ResourceSample`, computed aggregates
- `ResourceSample` struct with `Timestamp`, `CPUPct`, `RSSMB`, `ReadBytes`, `WriteBytes`
- `NewJobTelemetry(jobID, lectureID, quality string) *JobTelemetry`
- `AddSample(sample ResourceSample)` method
- `Compute()` method that calculates CPUAvgPct, CPUPeakPct, RAMAvgMB, RAMPeakMB, DiskReadMB, DiskWriteMB
- `ToLogEvent() slog.Attr` converting to structured log attributes
- `Serialize() map[string]interface{}` for JSON output

### 2. `workers/vod-engine/internal/telemetry/sampler.go` — NEW
**Purpose:** Sampling loop that reads FFmpeg PID resource usage every 10s from /proc.

- `Sampler` struct holding reference to `JobTelemetry` and FFmpeg PID
- `NewSampler(pid int, telemetry *JobTelemetry) *Sampler`
- `Start(ctx context.Context)` goroutine that:
  - Reads `/proc/<pid>/stat` for utime/stime → CPU%
  - Reads `/proc/<pid>/status` (VmRSS) → RAM
  - Reads `/proc/<pid>/io` (read_bytes, write_bytes) → Disk I/O
  - Samples every `MONITOR_INTERVAL_S` (5s, per spec OPS-04 says 10s; use cfg value)
  - Adds `ResourceSample` to telemetry
  - Stops when context is cancelled or process exits
- `Stop()` method to signal sampler to finish
- Warning log if any single /proc read exceeds 100ms (OPS-PERF-03)

### 3. `workers/vod-engine/internal/metrics/metrics.go` — NEW
**Purpose:** Prometheus-format metrics endpoint, hand-rolled / using `expfmt`.

- `MetricsCollector` struct that aggregates counters, gauges, histograms
- Thread-safe atomic counters via `sync/atomic` or a mutex-protected map
- Metrics exposed (per OPS-16):
  - `vod_engine_active_jobs` (gauge)
  - `vod_engine_pending_jobs` (gauge)
  - `vod_engine_dead_letter_jobs` (gauge)
  - `vod_engine_jobs_processed_total{status="success"|"failed"|"dead_letter"}` (counter)
  - `vod_engine_encoding_duration_seconds{quality="..."}` (histogram with buckets: 60, 300, 600, +Inf)
  - `vod_engine_queue_oldest_age_seconds` (gauge)
  - `vod_engine_resource_blocked_total{resource="cpu"|"ram"|"disk"|"disk_io"|"network"}` (counter)
  - `vod_engine_ffmpeg_exit_code{lecture_id="...",quality="..."}` (gauge)
- `NewMetricsCollector() *MetricsCollector`
- `ServeHTTP(w http.ResponseWriter, r *http.Request)` implements `http.Handler`
- Expose plaintext Prometheus format (no authentication per OPS-SEC-04)
- Must respond within 100ms (OPS-PERF-02)
- Helper: `RenderPrometheusText(w io.Writer, metrics map[string]Metric)` using `fmt.Fprintf`

### 4. `workers/vod-engine/internal/metrics/textfile.go` — NEW
**Purpose:** Write Node Exporter textfile collector .prom file every 30s.

- `TextfileWriter` struct referencing `MetricsCollector` and file path
- `NewTextfileWriter(collector *MetricsCollector, path string) *TextfileWriter`
- `Start(ctx context.Context)` goroutine that:
  - Every 30 seconds, renders metrics to a temp file
  - Atomically renames to `/var/lib/node_exporter/textfile/vod_engine.prom`
  - Must complete within 50ms (OPS-PERF-04)
- `GetPath() string` returns the configured path

### 5. `deploy/systemd/vod-engine.service` — NEW
**Purpose:** systemd unit file with cgroups resource limits (OPS-01).

```ini
[Unit]
Description=VOD Encoding Engine
After=network-online.target
Wants=network-online.target

[Service]
User=vod-engine
Group=vod-engine
EnvironmentFile=/etc/vod-engine/env
ExecStart=/usr/local/bin/vod-engine
Restart=always
RestartSec=10

# CPU — reserve 1 core for OS, give 5 to encoding
CPUQuota=500%

# Memory
MemoryMax=10G
MemoryHigh=8G

# I/O
IOWeight=100

# OOM protection (belt-and-suspenders with in-process OOM score)
OOMScoreAdjust=-500

# File descriptors
LimitNOFILE=65536
LimitNPROC=32

# Nice level
Nice=0

# Restart behavior
StartLimitBurst=3
StartLimitIntervalSec=60

[Install]
WantedBy=multi-user.target
```

### 6. `deploy/sysctl/99-vod-engine.conf` — NEW
**Purpose:** Kernel parameters for encoding server (OPS-02, OPS-SEC-06).

- Virtual memory: `vm.swappiness=10`, `vm.vfs_cache_pressure=50`, `vm.overcommit_memory=2`, `vm.overcommit_ratio=50`, `vm.dirty_ratio=20`, `vm.dirty_background_ratio=5`, `vm.dirty_expire_centisecs=3000`, `vm.max_map_count=262144`
- File system: `fs.inotify.max_user_watches=524288`, `fs.file-max=2097152`, `fs.aio-max-nr=1048576`
- Network: TCP buffer tuning for 300 Mbps, `net.core.rmem_max=134217728`, `net.core.wmem_max=134217728`, `tcp_rmem/wmem` with 134217728 ceiling, `tcp_window_scaling=1`, `tcp_tw_reuse=1`, `net.core.somaxconn=1024`
- Security: `kernel.kptr_restrict=2`, `kernel.dmesg_restrict=1`

### 7. `deploy/udev/60-iosched.rules` — NEW
**Purpose:** NVMe I/O scheduler udev rule (referenced in OPS-02).

```
ACTION=="add|change", KERNEL=="nvme[0-9]n[0-9]", ATTR{queue/scheduler}="none"
```

### 8. `deploy/logrotate/vod-engine` — NEW
**Purpose:** Log rotation for VOD Engine JSON logs (OPS-10).

```
/var/log/vod-engine/*.log {
    daily
    rotate 30
    maxsize 100M
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    dateext
    dateformat -%Y%m%d
    postrotate
        systemctl reload vod-engine 2>/dev/null || true
    endscript
}
```

### 9. `deploy/tmpfiles.d/vod-engine.conf` — NEW
**Purpose:** Clean up temp workspace and crash logs (OPS-11).

```
# Clean VOD work files older than 1 day
d /var/tmp/vod-engine 0750 vod-engine vod-engine 1d
# Clean FFmpeg crash logs older than 7 days
d /var/log/vod-engine/crash 0750 vod-engine vod-engine 7d
```

### 10. `deploy/prometheus/vod-engine-alerts.yml` — NEW
**Purpose:** Prometheus alerting rules for encoding server health (OPS-08).

Includes all 10 alert rules from OPS-08:
- `VOD_CPU_Overload` (load > 5.0 for 5m, warning)
- `VOD_CPU_Critical` (load > 5.5 for 2m, critical)
- `VOD_LowMemory` (avail < 768 MB for 2m, warning)
- `VOD_LowDiskSpace` (free < 5 GB on /var/tmp for 2m, critical)
- `VOD_QueueGrowing` (pending > 50 for 10m, warning)
- `VOD_DeadLetterAccumulation` (dead > 5 for 5m, critical)
- `VOD_NVMe_HighTemp` (> 70°C for 5m, warning)
- `VOD_NVMe_MediaErrors` (> 0 for 1m, critical)
- `VOD_Encoding_Failures` (rate > 0.1/s over 30m for 5m, critical)
- `VOD_Engine_Down` (up == 0 for 1m, critical)

### 11. `deploy/grafana/vod-encoding-dashboard.json` — NEW
**Purpose:** Grafana dashboard JSON model (OPS-09).

All 17 panels from OPS-09 table:
- CPU Load (1m/5m/15m) — time series
- CPU Usage % — time series
- Memory Available — gauge
- Memory Breakdown — stacked area
- Swap Usage — gauge
- Disk Usage /var/tmp — gauge
- Disk I/O Utilization — time series
- NVMe Health (% used, temp) — gauges
- Network Throughput (in/out) — time series
- Active Jobs — stat
- Pending Jobs — stat
- Dead-Letter Jobs — stat
- Queue Duration — gauge
- Encode Duration (p50/p95/p99) — heatmap/quantile
- Job Success Rate — gauge
- Temperature (NVMe + hwmon) — time series
- Resource Blocks (by resource) — time series

### 12. `deploy/fstab/vod-engine-mount-notes.md` — NEW
**Purpose:** Reference doc for filesystem mount options (OPS-03).

Contains:
- EXT4 mount options for NVMe: `defaults,noatime,nodiratime,data=ordered,nodelalloc,commit=30`
- XFS alternatives
- Queue directory separate partition recommendation

### 13. `workers/vod-engine/internal/telemetry/telemetry_test.go` — NEW
**Purpose:** Unit tests for telemetry types and computation.

- `TestNewJobTelemetry` — verifies initialization
- `TestAddSample` — verifies samples are appended
- `TestCompute` — verifies avg/peak calculations
- `TestToLogEvent` — verifies slog event structure

### 14. `workers/vod-engine/internal/metrics/metrics_test.go` — NEW
**Purpose:** Unit tests for metrics collector.

- `TestCounterIncrement` — verifies counter increments
- `TestGaugeSet` — verifies gauge set/get
- `TestHistogramObserve` — verifies bucket counts
- `TestRenderPrometheusText` — verifies output format matches OPS-16
- `TestResponseTime` — verifies < 100ms (OPS-PERF-02)

### 15. `workers/vod-engine/internal/metrics/textfile_test.go` — NEW
**Purpose:** Unit tests for textfile writer.

- `TestTextfileWrite` — verifies file written atomically
- `TestTextfilePerformance` — verifies < 50ms (OPS-PERF-04)

---

## Files to Modify (9 existing files)

### 16. `workers/vod-engine/internal/config/config.go` — MODIFY
**Changes:**
- Add new config fields with defaults from OPS-14:

```go
// Resource threshold refinements (OPS-14)
MaxCPULoadAvg      float64  // default: 4.5 (was 4.0)
MinFreeRAMMB       int64    // default: 1536 (was 1024)
MinFreeSwapMB      int64    // default: 1024 (was 512)
MinFreeDiskGB      int64    // default: 15 (was 10)
MaxWorkDirUsageGB  int64    // default: 75 (was 80)
MaxDiskIOPct       float64  // default: 75.0 (was 80.0)
MaxNetworkPct      float64  // default: 75.0 (was 70.0)

// Per-job disk quota (OPS-23)
MaxPerJobDiskGB    int64    // default: 25

// NVMe wear monitoring (OPS-22)
NVMeWearWarnPct    int      // default: 80
NVMeWearCritPct    int      // default: 95
NVMeCheckIntervalM int      // default: 5 (OPS-PERF-05)

// Download rate limiting (OPS-15)
DownloadRateLimitKbps int   // default: 25000 (already exists, update default from 0)

// FFmpeg crash log path (OPS-17)
VODCrashDir        string   // default: /var/log/vod-engine/crash

// Max stderr capture size (OPS-17)
MaxStderrCaptureBytes int   // default: 4096
```

- Update `Load()` with these new defaults
- Add `getEnvInt` overloads for the new fields

### 17. `workers/vod-engine/internal/monitor/monitor.go` — MODIFY
**Changes:**
- Add to `ResourceSnapshot`:
  - `NVMePercentageUsed float64` — from /sys or nvme smart-log
  - `NVMeMediaErrors int64`
  - `NVMeTemperatureCelsius float64`
  - `OpenFileDescriptors int` — from `/proc/self/fd` count
- Add `readNVMeHealth(snap)` method (OPS-07, OPS-22):
  - Try reading from Node Exporter's nvme collector path, or fallback to executing `nvme smart-log /dev/nvme0n1` (parsed output)
  - Only run every `NVMeCheckIntervalM` minutes (5 min default per OPS-PERF-05)
  - Track last check time to enforce interval
- Add `checkFDUsage()` method (OPS-13):
  - Read directory count of `/proc/self/fd`
  - If count > 65536 * 0.8 → `slog.Warn("High FD usage", ...)`
- Add NVMe wear warning logging (OPS-22):
  - When `percentage_used` >= 80%: log warning daily
  - When `percentage_used` >= 95%: log critical alert
- Maintain a daily-logged-warning set to avoid flooding logs

### 18. `workers/vod-engine/internal/guardian/guardian.go` — MODIFY
**Changes:**
- Add per-job disk quota check (OPS-23):
  - `CanStartJob(job *queue.SubJob) *Result` — new method that:
    - Estimates disk needed: `rawVideoSize * 4 * 2` (4 renditions × 2x safety)
    - Raw video size obtained by checking local cached file size or querying B2 Content-Length
    - If estimate > `MaxPerJobDiskGB` → return blocked with `Resource: "disk_quota"`
  - Wire this into `CanStart()` or have scheduler call it additionally
- Add `estimateDiskNeeded(rawVideoSizeBytes int64) int64` private method
- Add `getRawVideoSize(rawKey string) int64` helper (checks local cache first, then B2 HEAD request)
- Update `CanStart()` to also handle the new threshold values that were refined in config

### 19. `workers/vod-engine/internal/encoding/pipeline.go` — MODIFY
**Changes:**
- FFmpeg crash stderr capture (OPS-17):
  - Replace `cmd.Stderr = os.Stderr` with `var stderrBuf bytes.Buffer` and `cmd.Stderr = io.MultiWriter(os.Stderr, &stderrBuf)`
  - On FFmpeg failure: include `stderr` truncated to `MaxStderrCaptureBytes` (4096) in error log
  - Write full stderr to `VODCrashDir/ffmpeg_{job_id}.log` for forensic analysis
  - Ensure VODCrashDir is created at startup (add to main.go)
- Download rate limiting via `pv` (OPS-15):
  - In download section, if `DownloadRateLimitKbps > 0`:
    - Wrap B2 download command with `pv --rate-limit <KBPS>` pipe
    - Modify download to pipe through `pv` binary (must be present on system)
    - Config default: 25000 (25 MB/s ≈ 200 Mbps)
  - Import `os/exec` for pv wrapper (already imported)
- Add `startTime` and telemetry hook point in `Run()`:
  - At start of `Run()`, record start time
  - After FFmpeg starts, spawn a telemetry sampler goroutine via `telemetry.Sampler`
  - On completion/failure, compute telemetry and log `event=job.telemetry` (OPS-04, OPS-05)

### 20. `workers/vod-engine/internal/worker/pool.go` — MODIFY
**Changes:**
- Job idempotency (OPS-20):
  - Add `hasExistingJob(lectureID, quality string) bool` method:
    - Check in-memory queue via `queue.Snapshot()`
    - Check persisted jobs in `VOD_QUEUE_DIR/pending/` for matching `lecture_id + quality`
    - Return true if any exists in `pending`, `running`, or `interrupted` status
  - In `AddJob()`, before creating sub-jobs, call `hasExistingJob()` for each quality
  - If all qualities already exist → return nil (idempotent, HTTP 200)
  - If only some exist → skip existing, enqueue only missing qualities
- B2 graceful degradation (OPS-21):
  - In `handleJobFailure()`, check if error contains `ERR_B2_UNREACHABLE`
  - If B2 unreachable and retries exhausted → move to dead-letter with `ERR_B2_UNREACHABLE` code
  - Guardian MUST NOT block new jobs for B2 errors (only local resource issues)
  - Log: `slog.Warn("B2 unreachable, job moved to dead-letter", ...)`

### 21. `workers/vod-engine/internal/api/handlers/health.go` — MODIFY
**Changes:**
- Health probe differentiation (OPS-19):
  - Add support for `GET /health?probe=live|ready|startup` query parameter
  - **Liveness** (`probe=live`): responds 200 if engine is running (any status), within 1 second
  - **Readiness** (`probe=ready`): responds 200 if engine initialized (queue recovery complete, HTTP server started, status != "shutting_down"); 503 otherwise
  - **Startup** (`probe=startup`): responds 200 if engine has completed 2 full monitor cycles (10 seconds) and queue started; 503 otherwise
  - No probe param (bare `/health`): existing detailed health response (unchanged)
- Add `nvme_temp_celsius` to health response body (OPS-07)
- Add `open_file_descriptors` to health response body (OPS-13)

### 22. `workers/vod-engine/cmd/api/main.go` — MODIFY
**Changes:**
- OOM score protection (OPS-12):
  - After initialization, before starting components:
    ```go
    func setOOMScore() error {
        return os.WriteFile("/proc/self/oom_score_adj", []byte("-500"), 0644)
    }
    ```
  - Call `setOOMScore()` after config load
  - Log warning if it fails (non-fatal on systems without /proc)
- SIGHUP handler (OPS-18):
  - In signal handling section, add `syscall.SIGHUP` to the signal.Notify list
  - Create a dedicated SIGHUP channel
  - On SIGHUP: call `config.Load()` to re-read environment, log "SIGHUP received. Configuration reloaded."
  - Only update safe-to-change-at-runtime fields: log level, resource thresholds, poll intervals
  - Do NOT update: JWT_SECRET, B2_APP_KEY, B2_KEY_ID (OPS-SEC-05)
  - Ensure SIGHUP doesn't interrupt jobs (no restart)
- Metrics endpoint registration (OPS-16):
  - After mux creation, add:
    ```go
    metricsCollector := metrics.NewMetricsCollector()
    mux.HandleFunc("GET /metrics", metricsCollector.ServeHTTP)
    ```
  - Pass metricsCollector to scheduler (for job lifecycle counter updates)
  - Start textfile writer goroutine
- Pass metrics collector through to scheduler and pipeline
- Ensure VODCrashDir is created at startup alongside other dirs
- Wire telemetry sampler lifecycle

### 23. `workers/vod-engine/internal/encoding/ffmpeg.go` — MODIFY
**Changes:**
- Add `GetFFmpegPID() int` method (needed by telemetry sampler to monitor FFmpeg process)
- Expose the `cmd.Process.Pid` after `cmd.Start()` (requires modifying pipeline.go to call a hook after Start)
- Ensure `nice` and `ionice` wrappers are correctly applied even when using `pv` wrapper for download (no change needed for encoding itself)

---

## Data Models & Types

### `internal/telemetry/telemetry.go` — Types

```go
type JobTelemetry struct {
    JobID       string
    LectureID   string
    Quality     string
    Samples     []ResourceSample
    StartTime   time.Time
    EndTime     time.Time
    // Computed on completion:
    CPUAvgPct   float64
    CPUPeakPct  float64
    RAMAvgMB    float64
    RAMPeakMB   float64
    DiskReadMB  int64
    DiskWriteMB int64
}

type ResourceSample struct {
    Timestamp  time.Time
    CPUPct     float64   // From /proc/<pid>/stat (utime+stime) / elapsed
    RSSMB      int64     // From /proc/<pid>/status VmRSS
    ReadBytes  int64     // From /proc/<pid>/io read_bytes
    WriteBytes int64     // From /proc/<pid>/io write_bytes
}
```

### `internal/metrics/metrics.go` — Types

```go
type MetricType int
const (
    MetricGauge MetricType = iota
    MetricCounter
    MetricHistogram
)

type Metric struct {
    Type   MetricType
    Name   string
    Help   string
    Value  float64
    Labels map[string]string
    Buckets []float64 // for histograms
    Counts  []uint64  // bucket counts
}

type MetricsCollector struct {
    mu       sync.RWMutex
    gauges   map[string]float64
    counters map[string]uint64
    histograms map[string]*histogramData
}
```

---

## Dependencies

| Package | Change | Version | Reason |
|---------|--------|---------|--------|
| No new Go external dependencies | — | — | Metrics are hand-rolled (no prometheus/client_golang). Telemetry uses only stdlib (`os`, `io`, `time`, `log/slog`). |
| `pv` (Pipe Viewer) | OS package to install | Latest from apt/yum | Download rate limiting (OPS-15) |
| `prometheus-node-exporter` | OS package to install | Latest | Host metrics (OPS-06, OPS-07) |
| `prometheus` | OS package to install | Latest | Metrics collection & alerting (OPS-08) |
| `grafana` | OS package to install | Latest | Dashboards (OPS-09) |
| `nvme-cli` | OS package to install | Latest | NVMe smart-log reads (OPS-22) |

---

## Security Boundaries

| ID | Requirement | Implementation | Enforced In |
|----|-------------|----------------|-------------|
| OPS-SEC-01 | `/etc/vod-engine/env` permissions 0600 | Documented in deploy docs; verified by deployment script | Deploy docs |
| OPS-SEC-02 | Binary perms 0755 root:vod-engine | Documented; systemd unit runs as vod-engine user | Deploy docs |
| OPS-SEC-03 | Crash logs perms 0640 | `os.MkdirAll` with 0750, files written with 0640 | `pipeline.go` + deploy docs |
| OPS-SEC-04 | /metrics never exposes secrets | Metrics collector only exposes numeric counters/gauges; no job payloads | `metrics.go` |
| OPS-SEC-05 | SIGHUP can't change credentials | Config reload in main.go explicitly skips JWT_SECRET, B2_APP_KEY, B2_KEY_ID | `main.go` |
| OPS-SEC-06 | kernel.kptr_restrict + dmesg_restrict | Set in `99-vod-engine.conf` | sysctl config |

---

## Test Strategy

| Scenario | Test Type | File | Key Assertions |
|----------|-----------|------|----------------|
| OPS-04 (telemetry sampling) | Unit | `telemetry_test.go` | Samples are recorded, Compute() produces correct aggregates |
| OPS-05 (structured log) | Unit | `telemetry_test.go` | `ToLogEvent()` produces correct slog.Attr with event=job.telemetry |
| OPS-12 (OOM score) | Unit | New test in `monitor_test.go` or `main_test.go` | `setOOMScore()` writes correct value to /proc mock |
| OPS-13 (FD warning) | Unit | `monitor_test.go` | Warning logged when FD > 80% of limit |
| OPS-15 (download rate limit) | Unit | `pipeline_test.go` | pv wrapper command is constructed correctly when > 0 |
| OPS-16 (metrics endpoint) | Unit | `metrics_test.go` | Prometheus text format matches expected metrics |
| OPS-17 (FFmpeg stderr) | Unit | `pipeline_test.go` | Stderr captured, truncated at 4096 bytes, written to crash dir |
| OPS-18 (SIGHUP reload) | Integration | `main_test.go` | Config fields updated, JWT_SECRET unchanged |
| OPS-19 (health probes) | Unit | `health_test.go` | /health?probe=live/ready/startup return correct HTTP codes |
| OPS-20 (idempotency) | Unit | `pool_test.go` | Duplicate AddJob returns nil, skips existing qualities |
| OPS-21 (B2 degradation) | Unit | `pool_test.go` | Dead-letter with ERR_B2_UNREACHABLE; guardian doesn't block |
| OPS-22 (NVMe wear) | Unit | `monitor_test.go` | Warning at 80%, critical at 95% |
| OPS-23 (disk quota) | Unit | `guardian_test.go` | `CanStartJob` blocks when estimated > 25 GB |
| OPS-PERF-01 | Benchmark | `telemetry_test.go` | Sampling < 1% CPU overhead |
| OPS-PERF-02 | Benchmark | `metrics_test.go` | /metrics response < 100ms |
| OPS-PERF-03 | Benchmark | `monitor_test.go` | Resource reads < 100ms |
| OPS-PERF-04 | Benchmark | `metrics_test.go` | Textfile write < 50ms |
| OPS-PERF-05 | Unit | `monitor_test.go` | NVMe check runs at most once per 5 min |

### Existing tests to update:
- `guardian_test.go`: Update expected thresholds to match new OPS-14 defaults
- `config_test.go`: Add test cases for new config fields and defaults

---

## Implementation Phases

### Phase 1: Configuration & Thresholds (config.go)
1. Add new config fields with OPS-14 refined values
2. Update defaults: MaxCPULoadAvg=4.5, MinFreeRAMMB=1536, MinFreeSwapMB=1024, MinFreeDiskGB=15, etc.
3. Add MaxPerJobDiskGB, NVMe settings, VODCrashDir, MaxStderrCaptureBytes
4. Update all consumers to handle new fields

### Phase 2: Telemetry Subsystem (telemetry/)
1. Implement `JobTelemetry` types and `ResourceSample`
2. Implement `Sampler` goroutine reading /proc/<pid>/*
3. Integrate into pipeline: start sampler after FFmpeg starts, stop on completion
4. Log `event=job.telemetry` on completion with aggregates

### Phase 3: Metrics & Monitoring (metrics/ + monitor/)
1. Implement `MetricsCollector` with counter/gauge/histogram support
2. Implement Prometheus text format renderer
3. Register `/metrics` HTTP endpoint
4. Implement `TextfileWriter` goroutine (30s interval)
5. Pass collector to scheduler for job lifecycle counter updates
6. Add NVMe health reads to monitor (with 5-min throttling)
7. Add FD usage check to monitor

### Phase 4: OS Configuration Files (deploy/)
1. Create systemd unit with cgroups
2. Create sysctl tuning file
3. Create logrotate config
4. Create tmpfiles.d cleanup rules
5. Create Prometheus alerting rules YAML
6. Create Grafana dashboard JSON
7. Create udev I/O scheduler rule
8. Create fstab reference notes

### Phase 5: Pipeline Hardening (encoding/)
1. Add FFmpeg stderr capture and crash log
2. Add download rate limiting via `pv` wrapper
3. Add telemetry sampler integration

### Phase 6: Worker Hardening (worker/pool.go)
1. Add job idempotency check
2. Add B2 graceful degradation with ERR_B2_UNREACHABLE code
3. Pass metrics collector for counter updates

### Phase 7: API & Health Probes (api/handlers/)
1. Add `?probe=live|ready|startup` differentiation
2. Add NVMe temperature and FD count to health response

### Phase 8: Main Entry Point (cmd/api/main.go)
1. Add OOM score adjustment at startup
2. Add SIGHUP handler with selective config reload
3. Register `/metrics` endpoint
4. Wire textfile writer goroutine

### Phase 9: Tests
1. Write all unit tests for new packages
2. Write integration tests for SIGHUP, health probes
3. Add benchmarks for performance requirements
4. Update existing tests for new thresholds

---

## Rollback Plan

| Change | Rollback Action | Safety |
|--------|----------------|--------|
| New config fields | Revert env vars to old values; code revert removes new fields | Safe — old values still work |
| telemetry package | Remove `internal/telemetry/` directory; revert pipeline.go changes | Safe — telemetry is non-critical |
| metrics package | Remove `/metrics` route; remove textfile write goroutine | Safe — Node Exporter still works without it |
| systemd unit | Replace with old unit file; `systemctl daemon-reload` | Safe — old unit has no cgroups but still runs |
| sysctl params | Remove 99-vod-engine.conf; `sysctl --system` resets defaults | Safe — kernel defaults are conservative |
| logrotate config | Delete /etc/logrotate.d/vod-engine | Safe — logs continue without rotation |
| Prometheus alerts | Delete alerts YAML; reload Prometheus config | Safe — alerts just stop firing |
| Grafana dashboard | Delete JSON; remove from Grafana | Safe — stateless config |
| NVMe monitoring | Revert monitor.go changes | Safe — monitor continues without NVMe data |
| FD check | Revert monitor.go changes | Safe — no functional impact |
| SIGHUP handler | Remove from signal.Notify; revert main.go | Safe — engine runs without SIGHUP |
| OOM score | Remove the `os.WriteFile` call | Safe — systemd OOMScoreAdjust still protects |
| Health probes | Revert health.go to old `HandleHealth` | Safe — bare /health still works |
| Download rate limiting | Set `DOWNLOAD_RATE_LIMIT_KBPS=0` | Safe — bypasses `pv` wrapper |
| FFmpeg stderr capture | Revert pipeline.go changes | Safe — stderr goes to os.Stderr as before |
| Idempotency | Revert `hasExistingJob` in pool.go | Safe — duplicate submissions possible but not harmful |
| B2 degradation | Revert error handling in pool.go | Safe — jobs retry as before |
| Per-job disk quota | Revert guardian.go changes | Safe — guardian reverts to general disk checks |

### Rollback Script
A rollback shell script `deploy/rollback-ops-hardening.sh` will be provided that:
1. Removes new config files (systemd, sysctl, logrotate, tmpfiles.d, etc.)
2. Restores the old binary (backed up at `/usr/local/bin/vod-engine.bak`)
3. Reloads systemd: `systemctl daemon-reload && systemctl restart vod-engine`
4. Removes new sysctl: `rm /etc/sysctl.d/99-vod-engine.conf && sysctl --system`
5. Removes Prometheus alerts and reloads Prometheus
6. Removes Grafana dashboard
7. Stops and disables Node Exporter if it was newly installed

---

## Estimated Files

**Total: 24 files** (15 new + 9 modified)

| Count | Type | Description |
|-------|------|-------------|
| 2 | New | `internal/telemetry/telemetry.go`, `sampler.go` |
| 2 | New | `internal/metrics/metrics.go`, `textfile.go` |
| 3 | New | `internal/telemetry/telemetry_test.go`, `internal/metrics/metrics_test.go`, `internal/metrics/textfile_test.go` |
| 8 | New | `deploy/systemd/vod-engine.service`, `deploy/sysctl/99-vod-engine.conf`, `deploy/logrotate/vod-engine`, `deploy/tmpfiles.d/vod-engine.conf`, `deploy/prometheus/vod-engine-alerts.yml`, `deploy/grafana/vod-encoding-dashboard.json`, `deploy/udev/60-iosched.rules`, `deploy/fstab/vod-engine-mount-notes.md` |
| 1 | New | `deploy/rollback-ops-hardening.sh` |
| 9 | Modified | `internal/config/config.go`, `internal/monitor/monitor.go`, `internal/guardian/guardian.go`, `internal/encoding/pipeline.go`, `internal/encoding/ffmpeg.go`, `internal/worker/pool.go`, `internal/api/handlers/health.go`, `cmd/api/main.go`, `internal/guardian/guardian_test.go` |

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| New telemetry sampling adds CPU overhead | Sampler reads /proc once per 5-10 seconds; spec requires < 1% overhead (OPS-PERF-01) |
| `pv` wrapper may not be installed | Feature gated by `DOWNLOAD_RATE_LIMIT_KBPS > 0` default (0 = unlimited) |
| NVMe smart-log has read-disturb cost | Throttled to once per 5 minutes (OPS-PERF-05) |
| SIGHUP reload could corrupt running jobs | Only non-critical params updated; FFmpeg settings unchanged; no restart |
| systemd cgroups could cause OOM if limits too tight | MemoryMax=10G leaves 2 GB for OS on 12 GB server |
| Metrics endpoint unauthenticated | Only exposes numeric counters, never job payloads (OPS-SEC-04) |
| New deploy configs may conflict with existing setup | All configs documented in `deploy/`; rollback script provided |

**requiresHumanApproval: true** — Plan modifies kernel parameters, systemd service config with cgroups, security-related sysctl settings (kptr_restrict, dmesg_restrict), and adds OOM score protection. Estimated 24 files > 10 threshold.
