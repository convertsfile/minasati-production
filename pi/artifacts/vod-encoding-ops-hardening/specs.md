# BDD Specification — VOD Encoding Operational Hardening

## Feature: Operational Hardening of the Video Encoding Infrastructure

**Business Value:** Ensure the encoding server (6 vCPU, 12 GB RAM, 100 GB NVMe, 300 Mbps) runs reliably 24/7 for years with zero manual intervention. Every encoding job produces full resource telemetry. OS-level protections prevent resource exhaustion. Alerting catches anomalies before they cause failures.

**Risk Level:** MEDIUM — enhances existing stable infrastructure with OS hardening, monitoring tooling, and telemetry. Does not change encoding pipeline logic. Adds new configuration and OS-level components.

**Prerequisite:** The existing VOD Engine (workers/vod-engine/) is deployed and operational. All 26 scenarios from the `video-encoding-pipeline-redesign` spec are passing.

---

## Actors

| Actor | Role |
|-------|------|
| `VOD Engine (Go)` | Existing encoding daemon. Enhanced with per-job telemetry and new config exports |
| `systemd` | Linux service manager. Runs VOD Engine with cgroups resource limits |
| `Node Exporter` | Prometheus host metrics exporter. Runs on the encoding server |
| `Prometheus` | Metrics collection server (can be remote or local) |
| `Grafana` | Dashboard visualization |
| `logrotate` | Linux log rotation daemon. Manages VOD Engine logs |
| `System Administrator` | Configures thresholds, reviews dashboards, responds to alerts |

---

## Preconditions

1. The VOD Engine binary is installed at `/usr/local/bin/vod-engine`.
2. FFmpeg 6.0+ is installed at `/usr/bin/ffmpeg`.
3. `taskset`, `nice`, `ionice` utilities are available at standard paths.
4. The `vod-engine` unprivileged system user exists (UID/GID 1200).
5. Directories exist: `/var/tmp/vod-engine`, `/var/lib/vod-engine/queue`, `/var/log/vod-engine`.
6. Backblaze B2 credentials and JWT_SECRET are configured in `/etc/vod-engine/env`.

---

## Scenarios

---

### Scenario OPS-01: systemd service unit with cgroups resource limits

**Given** the encoding server has systemd v247 or later  
**When** the system administrator installs `vod-engine.service`  
**Then** the unit file MUST contain the following resource limits:

```ini
[Service]
User=vod-engine
Group=vod-engine
EnvironmentFile=/etc/vod-engine/env
ExecStart=/usr/local/bin/vod-engine
Restart=always
RestartSec=10

# CPU — reserve 1 core for OS, give 5 cores to encoding
CPUQuota=500%

# Memory — hard limit at 10 GB (leaves 2 GB for OS)
MemoryMax=10G
MemoryHigh=8G

# I/O — encoding gets best-effort I/O (same as ionice -c 2 -n 7)
IOWeight=100

# OOM — protect VOD Engine from OOM killer
OOMScoreAdjust=-500

# File descriptors
LimitNOFILE=65536

# Processes (FFmpeg + Go runtime)
LimitNPROC=32

# Nice level at service level (FFmpeg gets additional nice 15 via wrapper)
Nice=0

# Restart behavior
StartLimitBurst=3
StartLimitIntervalSec=60
```

**And** the unit MUST be enabled with `systemctl enable vod-engine`  
**And** the unit MUST be started with `systemctl start vod-engine`  

---

### Scenario OPS-02: Kernel parameters tuned for encoding server

**Given** the encoding server runs Linux kernel 5.x or later  
**When** the system administrator applies kernel tuning  
**Then** the following `sysctl` parameters MUST be set in `/etc/sysctl.d/99-vod-engine.conf`:

```ini
# --- Virtual Memory ---
# Aggressive swap usage only when absolutely necessary
vm.swappiness=10
# Keep enough dentry/inode cache for large directories (HLS segments)
vm.vfs_cache_pressure=50
# Don't overcommit memory — fail allocation rather than OOM
vm.overcommit_memory=2
vm.overcommit_ratio=50
# Allow more dirty pages before writeback (good for sequential HLS writes)
vm.dirty_ratio=20
vm.dirty_background_ratio=5
# Start writeback earlier for background dirty pages
vm.dirty_expire_centisecs=3000
# Increase max map count for FFmpeg memory-mapped I/O
vm.max_map_count=262144

# --- File System ---
# Increase max watched files (used by temp file monitoring)
fs.inotify.max_user_watches=524288
# Increase file max for many HLS segments
fs.file-max=2097152
# Allow large AIO requests for concurrent I/O
fs.aio-max-nr=1048576

# --- Network ---
# Increase TCP buffer for B2 uploads (300 Mbps pipe)
net.core.rmem_max=134217728
net.core.wmem_max=134217728
net.ipv4.tcp_rmem=4096 87380 134217728
net.ipv4.tcp_wmem=4096 65536 134217728
# Enable TCP window scaling for high-throughput
net.ipv4.tcp_window_scaling=1
# Faster TCP connection reuse
net.ipv4.tcp_tw_reuse=1
# Increase backlog for API requests
net.core.somaxconn=1024

# --- Scheduler ---
# Use BFQ or Kyber I/O scheduler for NVMe (fairness + low latency)
# Set via udev rule: /etc/udev/rules.d/60-iosched.rules
# ACTION=="add|change", KERNEL=="nvme[0-9]n[0-9]", ATTR{queue/scheduler}="none"
# (NVMe uses none/mq-deadline; mq-deadline recommended for fairness)

# --- Kernel Panic ---
# Reboot 30 seconds after panic (max availability)
kernel.panic=30
kernel.panic_on_oops=1
```

**And** the parameters MUST be applied via `sysctl --system`  

---

### Scenario OPS-03: Filesystem optimized for NVMe with large HLS segment writes

**Given** `/var/tmp/vod-engine` resides on an NVMe device  
**When** the filesystem is created or tuned  
**Then** the following mount options MUST be used in `/etc/fstab`:

```
# NVMe partition for VOD work dir
UUID=<uuid>  /var/tmp  ext4  defaults,noatime,nodiratime,data=ordered,nodelalloc,commit=30  0  2
```

**And** the rationale for each option:
- `noatime,nodiratime` — eliminates access-time writes on every file read  
- `data=ordered` — ensures metadata is written before data (consistency on crash)  
- `nodelalloc` — disable delayed allocation (reduces fragmentation for HLS segment writes)  
- `commit=30` — flush journal every 30 seconds (reduces write amplification on NVMe)  

**And** for XFS (alternative), use:
```
UUID=<uuid>  /var/tmp  xfs  defaults,noatime,nodiratime,allocsize=1m,largeio  0  2
```

**And** the queue directory (`/var/lib/vod-engine/queue`) SHOULD be on a separate EXT4 partition or at minimum on the same NVMe with different mount options:
```
UUID=<uuid>  /var/lib/vod-engine  ext4  defaults,noatime 0  2
```

---

### Scenario OPS-04: Per-job resource telemetry recorded during encoding

**Given** the VOD Engine starts a new encoding job  
**When** the pipeline begins FFmpeg execution  
**Then** the engine MUST sample the FFmpeg process's resource usage every 10 seconds during encoding:

```go
// Sampling logic (new package: internal/telemetry/)
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

**And** at job completion, the engine MUST compute and log:

```json
{
  "event": "job.telemetry",
  "lecture_id": "42",
  "quality": "480p",
  "encoding_duration_s": 342.5,
  "cpu_avg_pct": 45.2,
  "cpu_peak_pct": 78.1,
  "ram_avg_mb": 2048,
  "ram_peak_mb": 3100,
  "disk_read_mb": 512,
  "disk_write_mb": 4096,
  "download_speed_mbps": 85.3,
  "upload_speed_mbps": 42.7,
  "total_size_mb": 512,
  "segments_count": 85,
  "retry_count": 0,
  "final_status": "completed"
}
```

---

### Scenario OPS-05: Job telemetry sent to structured log for downstream aggregation

**Given** a job completes (success or failure)  
**When** the engine computes the telemetry summary  
**Then** the telemetry MUST be written as a single JSON line to structured log via `slog` with key `event=job.telemetry`  
**And** the log MUST be captured by the system's log shipper (e.g., Promtail, Filebeat, or Vector) for ingestion into Loki, Elasticsearch, or similar  

---

### Scenario OPS-06: Node Exporter provides host-level metrics

**Given** the encoding server has Prometheus Node Exporter installed  
**When** Node Exporter runs as a systemd service  
**Then** it MUST expose the following custom textfile collector metrics for VOD-specific data:

```
# HELP vod_engine_active_jobs Currently active encoding jobs
# TYPE vod_engine_active_jobs gauge
vod_engine_active_jobs 0

# HELP vod_engine_pending_jobs Total pending jobs in queue
# TYPE vod_engine_pending_jobs gauge
vod_engine_pending_jobs 3

# HELP vod_engine_dead_letter_jobs Jobs in dead-letter queue
# TYPE vod_engine_dead_letter_jobs gauge
vod_engine_dead_letter_jobs 1

# HELP vod_engine_ffmpeg_pids Number of active FFmpeg processes
# TYPE vod_engine_ffmpeg_pids gauge
vod_engine_ffmpeg_pids 1
```

**And** the VOD Engine MUST write this to a textfile at `/var/lib/node_exporter/textfile/vod_engine.prom` every 30 seconds (using a goroutine in the monitor package)  

**And** Node Exporter MUST be configured with `--collector.textfile.directory=/var/lib/node_exporter/textfile`  

---

### Scenario OPS-07: Node Exporter NVMe health monitoring

**Given** the encoding server has an NVMe drive  
**When** Node Exporter is configured  
**Then** it MUST enable the `nvme` collector (`--collector.nvme`) to expose:

```
# HELP node_nvme_critical_warning Critical Warning for the NVMe device
# TYPE node_nvme_critical_warning gauge
node_nvme_critical_warning{device="nvme0n1"} 0

# HELP node_nvme_media_errors Media Errors for the NVMe device
# TYPE node_nvme_media_errors gauge
node_nvme_media_errors{device="nvme0n1"} 0

# HELP node_nvme_percentage_used Percentage Used for the NVMe device
# TYPE node_nvme_percentage_used gauge
node_nvme_percentage_used{device="nvme0n1"} 5

# HELP node_nvme_power_cycles Power Cycles for the NVMe device
# TYPE node_nvme_power_cycles gauge
node_nvme_power_cycles{device="nvme0n1"} 42

# HELP node_nvme_temperature_celsius Temperature Celsius for the NVMe device
# TYPE node_nvme_temperature_celsius gauge
node_nvme_temperature_celsius{device="nvme0n1"} 45.0
```

**And** the VOD Engine's existing monitor MUST also read NVMe temperature from `/sys/class/thermal/` or `nvme smart-log` and include it in the health endpoint as `nvme_temp_celsius`  

---

### Scenario OPS-08: Prometheus alerting rules for encoding server health

**Given** Prometheus is scraping Node Exporter and VOD Engine metrics  
**When** an alert rule triggers  
**Then** the following alert rules MUST be configured in Prometheus:

```yaml
groups:
  - name: vod_engine_alerts
    rules:
      # CPU overload — load average > 5.0 for 5 minutes
      - alert: VOD_CPU_Overload
        expr: node_load1 > 5.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Encoding server CPU overloaded (load: {{ $value }})"

      # CPU critical — load average > 5.5 for 2 minutes
      - alert: VOD_CPU_Critical
        expr: node_load1 > 5.5
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Encoding server CPU critically overloaded"

      # Low memory — available < 768 MB
      - alert: VOD_LowMemory
        expr: node_memory_MemAvailable_bytes / 1024 / 1024 < 768
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Encoding server low memory ({{ $value }} MB available)"

      # Disk space — free < 5 GB
      - alert: VOD_LowDiskSpace
        expr: node_filesystem_avail_bytes{mountpoint="/var/tmp"} / 1024 / 1024 / 1024 < 5
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Encoding server low disk space on /var/tmp"

      # Queue growing — pending > 50 for 10 minutes
      - alert: VOD_QueueGrowing
        expr: vod_engine_pending_jobs > 50
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Encoding queue growing ({{ $value }} pending)"

      # Dead-letter jobs accumulating — dead > 5
      - alert: VOD_DeadLetterAccumulation
        expr: vod_engine_dead_letter_jobs > 5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Dead-letter queue accumulating ({{ $value }} jobs). Manual intervention required."

      # NVMe temperature — > 70°C for 5 minutes
      - alert: VOD_NVMe_HighTemp
        expr: node_nvme_temperature_celsius > 70
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "NVMe temperature high ({{ $value }}°C)"

      # NVMe media errors > 0
      - alert: VOD_NVMe_MediaErrors
        expr: node_nvme_media_errors > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "NVMe media errors detected ({{ $value }} errors)"

      # Encoding job failing repeatedly — 3 failures in 30 minutes
      - alert: VOD_Encoding_Failures
        expr: rate(vod_engine_job_failures_total[30m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High encoding failure rate ({{ $value }} failures/min)"

      # VOD Engine down
      - alert: VOD_Engine_Down
        expr: up{job="vod-engine"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "VOD Engine is down"
```

---

### Scenario OPS-09: Grafana dashboard for encoding server

**Given** Grafana is configured with Prometheus data source  
**When** the system administrator imports the dashboard  
**Then** the dashboard MUST contain the following panels:

| Panel | Metric | Type |
|-------|--------|------|
| CPU Load (1m/5m/15m) | `node_load1`, `node_load5`, `node_load15` | Time series |
| CPU Usage % | `100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)` | Time series |
| Memory Available | `node_memory_MemAvailable_bytes` | Gauge |
| Memory Breakdown | `node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes` | Stacked area |
| Swap Usage | `node_memory_SwapTotal_bytes - node_memory_SwapFree_bytes` | Gauge |
| Disk Usage /var/tmp | `node_filesystem_avail_bytes{mountpoint="/var/tmp"}` | Gauge |
| Disk I/O Utilization | `rate(node_disk_io_time_seconds_total[1m])` | Time series |
| NVMe Health | `node_nvme_percentage_used`, `node_nvme_temperature_celsius` | Gauges |
| Network Throughput | `rate(node_network_transmit_bytes_total[1m]) * 8`, `rate(node_network_receive_bytes_total[1m]) * 8` | Time series |
| Active Jobs | `vod_engine_active_jobs` | Stat |
| Pending Jobs | `vod_engine_pending_jobs` | Stat |
| Dead-Letter Jobs | `vod_engine_dead_letter_jobs` | Stat |
| Queue Duration | `vod_engine_queue_oldest_age_seconds` | Gauge |
| Encode Duration (p50/p95/p99) | `vod_engine_encoding_duration_seconds` | Heatmap / Quantile |
| Job Success Rate | `rate(vod_engine_job_successes_total[1h]) / (rate(vod_engine_job_failures_total[1h]) + rate(vod_engine_job_successes_total[1h])) * 100` | Gauge |
| Temperature | `node_nvme_temperature_celsius`, `node_hwmon_temp_celsius` | Time series |

---

### Scenario OPS-10: Log rotation for VOD Engine and FFmpeg logs

**Given** VOD Engine writes logs to `/var/log/vod-engine/`  
**When** logrotate runs daily  
**Then** the following logrotate configuration MUST be in `/etc/logrotate.d/vod-engine`:

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

**And** rationale for each option:
- `rotate 30` — keep 30 days of logs (≈3 GB total at 100 MB/day)  
- `maxsize 100M` — rotate sooner if a single file exceeds 100 MB  
- `copytruncate` — safest for Go services with file handles (no need for SIGHUP)  
- `delaycompress` — keep yesterday's log uncompressed for troubleshooting  
- `dateformat -%Y%m%d` — clear naming for audit trail  

**And** JSON log format MUST be used (already configured via `slog.NewJSONHandler`) for machine readability  

---

### Scenario OPS-11: Log retention and archival policy

**Given** VOD Engine generates job telemetry and system logs  
**When** logs exceed the local retention period  
**Then** the following retention policy MUST apply:

| Log Type | Retention | Location | Action |
|----------|-----------|----------|--------|
| VOD Engine JSON logs | 30 days | `/var/log/vod-engine/` | Logrotate + compress |
| FFmpeg crash logs (FFREPORT) | 7 days | `/var/crash/` | tmpfiles.d cleanup |
| Job telemetry (event=job.telemetry) | 90 days | Aggregated via log shipper | External retention |
| Dead-letter failure reports | Indefinite | `VOD_QUEUE_DIR/dead/` | Manual cleanup |
| Monitoring metrics | 30 days (Prometheus TSDB) | `/var/lib/prometheus/` | Prometheus retention config |

**And** orphaned temp files older than 24 hours MUST be cleaned up by the VOD Engine's existing `OrphanCleanup()` method on startup  

**And** the following `tmpfiles.d` rule MUST be in `/etc/tmpfiles.d/vod-engine.conf`:

```
# Clean VOD work files older than 1 day
d /var/tmp/vod-engine 0750 vod-engine vod-engine 1d
```

---

### Scenario OPS-12: OOM protection for VOD Engine

**Given** the encoding server has 12 GB RAM total  
**When** the VOD Engine starts  
**Then** the engine MUST set its own OOM score adjustment to `-500` (protected from OOM killer):

```go
// In main.go, after initialization:
func setOOMScore() error {
    return os.WriteFile("/proc/self/oom_score_adj", []byte("-500"), 0644)
}
```

**And** FFmpeg child processes MUST inherit this OOM score (since they run as child processes with the same score by default)  
**And** the systemd unit MUST also set `OOMScoreAdjust=-500` as a belt-and-suspenders approach  

---

### Scenario OPS-13: File descriptor limits enforced at OS and service level

**Given** the encoding server processes HLS segments (potentially hundreds per encoding job)  
**When** the VOD Engine runs  
**Then** the following file descriptor limits MUST be in place:

| Level | Limit | Rationale |
|-------|-------|-----------|
| systemd unit | `LimitNOFILE=65536` | HLS segments + B2 connections + file watchers |
| systemd unit | `LimitNPROC=32` | Main process + FFmpeg + a few threads |
| Kernel | `fs.file-max=2097152` | System-wide limit for all processes |
| VOD Engine (Go runtime) | Default (Go's `os.NewFile` handles internally) | No explicit limit needed unless exceeded |

**And** the VOD Engine MUST log a warning if open file descriptors exceed 80% of the limit:

```go
// In monitor.go or a dedicated health check
func checkFDUsage() {
    // Read /proc/self/fd count
    // If count > LimitNOFILE * 0.8 → log warning
}
```

---

### Scenario OPS-14: Concrete resource thresholds for the encoding server

**Given** the encoding server has 6 vCPU, 12 GB RAM, 100 GB NVMe, 300 Mbps  
**When** the resource guardian checks thresholds  
**Then** the following concrete threshold values MUST be configured:

| Resource | Threshold | Rationale |
|----------|-----------|-----------|
| **CPU Load Average (1m)** | `MAX_CPU_LOAD_AVG = 4.5` | 6 vCPU × 0.75 = 4.5. Leaves 1.5 load headroom for OS & spikes |
| **CPU Load Recovery** | `RECOVERY_HYSTERESIS = 0.5` | Must drop to 4.0 before unblocking (prevents flapping) |
| **Available RAM** | `MIN_FREE_RAM_MB = 1536` | 12 GB × 12.5% = 1.5 GB reserved for OS, cache, monitoring agents |
| **Free Swap** | `MIN_FREE_SWAP_MB = 1024` | 4 GB swap (assumed); keep 1 GB free to avoid OOM under pressure |
| **Free Disk** | `MIN_FREE_DISK_GB = 15` | 100 GB NVMe; 15 GB ensures room for OS, logs, and partial segment writes |
| **Work Dir Usage** | `MAX_WORK_DIR_USAGE_GB = 75` | 100 GB NVMe - 15 GB reserve = 85 GB for encoding; 75 GB leaves 10 GB buffer for unfinished jobs |
| **Disk I/O** | `MAX_DISK_IO_PCT = 75` | NVMe can burst to 100%; sustained 75% max prevents latency spikes for OS writes |
| **Network Out** | `MAX_NETWORK_PCT = 75` | 300 Mbps × 75% = 225 Mbps max. Leaves 75 Mbps for SSH, monitoring, B2 API calls |
| **FFmpeg Threads** | `FFMPEG_THREADS = 2` | 6 vCPU; 2 threads per FFmpeg instance. Even with 1 instance, limits CPU pressure |
| **FFmpeg Preset** | `FFMPEG_PRESET = medium` | Balances encoding speed vs bitrate efficiency. `ultrafast` produces large files; `slow` is too CPU-heavy |
| **FFmpeg Nice** | `FFMPEG_NICE = 15` | Lowest priority. OS scheduler always preempts FFmpeg for system processes |
| **FFmpeg Ionice Class** | `FFMPEG_IONICE_CLASS = 2` | Best-effort I/O. Class 1 (realtime) could starve OS disk writes |
| **FFmpeg Ionice Level** | `FFMPEG_IONICE_LEVEL = 7` | Lowest priority in best-effort class. OS disk I/O always goes first |
| **CPU Affinity** | `CPU_AFFINITY_MASK = "0-4"` | Reserve core 5 (out of 0-5) for OS/Go runtime. Prevents FFmpeg from starving vital processes |
| **Max Retries** | `MAX_RETRIES = 3` | 3 attempts is standard. More would delay other jobs excessively |
| **Retry Base Delay** | `RETRY_BASE_DELAY_S = 30` | 30s → 60s → 120s. Gives network issues time to resolve |
| **Upload Concurrency** | `UPLOAD_CONCURRENCY = 3` | 3 parallel uploads. Balances throughput vs. connection overhead |
| **HLS Segment Duration** | `HLS_SEGMENT_DURATION_S = 6` | Standard for adaptive bitrate. Short enough for quick start; long enough for efficient encoding |
| **HLS Keyframe Interval** | `HLS_KEYFRAME_INTERVAL = 48` | Keyframe every 48 frames (at 24fps = 2 seconds). Must be ≤ segment duration for clean cuts |
| **Graceful Timeout** | `GRACEFUL_TIMEOUT_S = 300` | 5 minutes max wait. Most encodes finish or can be checkpointed within 5 min |
| **Poll Interval** | `RESOURCE_POLL_INTERVAL_S = 10` | 10 seconds between queue check attempts. Fast enough for responsiveness; slow enough to avoid busy-looping |
| **Monitor Interval** | `MONITOR_INTERVAL_S = 5` | 5-second sampling. Granular enough for alerting; light enough for /proc reads |

---

### Scenario OPS-15: Download rate limiting via pv wrapper

**Given** the VOD Engine downloads a raw video from Backblaze B2  
**When** `DOWNLOAD_RATE_LIMIT_KBPS` is set to a value greater than 0 (default: 0 = unlimited)  
**Then** the download command MUST be wrapped with `pv --rate-limit` to cap download speed:

```go
// In pipeline.go, when downloading:
if cfg.DownloadRateLimitKbps > 0 {
    // Instead of direct B2 download, pipe through pv:
    // b2 download → pv --rate-limit <KBPS> → file
    // This prevents download from saturating the 300 Mbps port
}
```

**And** the recommended value is `DOWNLOAD_RATE_LIMIT_KBPS = 25000` (25 MB/s ≈ 200 Mbps, leaving 100 Mbps for B2 API calls and monitoring)  

---

### Scenario OPS-16: VOD Engine exposes Prometheus metrics endpoint

**Given** the VOD Engine is running  
**When** Prometheus scrapes `GET /metrics`  
**Then** the engine MUST expose a `/metrics` HTTP endpoint with the following metrics:

```
# HELP vod_engine_active_jobs Currently active encoding jobs
# TYPE vod_engine_active_jobs gauge
vod_engine_active_jobs 0

# HELP vod_engine_pending_jobs Total pending jobs
# TYPE vod_engine_pending_jobs gauge
vod_engine_pending_jobs 3

# HELP vod_engine_dead_letter_jobs Total dead-letter jobs
# TYPE vod_engine_dead_letter_jobs gauge
vod_engine_dead_letter_jobs 1

# HELP vod_engine_jobs_processed_total Total jobs processed
# TYPE vod_engine_jobs_processed_total counter
vod_engine_jobs_processed_total{status="success"} 142
vod_engine_jobs_processed_total{status="failed"} 5
vod_engine_jobs_processed_total{status="dead_letter"} 2

# HELP vod_engine_encoding_duration_seconds Encoding duration histogram
# TYPE vod_engine_encoding_duration_seconds histogram
vod_engine_encoding_duration_seconds_bucket{quality="480p",le="60"} 10
vod_engine_encoding_duration_seconds_bucket{quality="480p",le="300"} 85
vod_engine_encoding_duration_seconds_bucket{quality="480p",le="600"} 120
vod_engine_encoding_duration_seconds_bucket{quality="480p",le="+Inf"} 142

# HELP vod_engine_queue_oldest_age_seconds Age of oldest pending job
# TYPE vod_engine_queue_oldest_age_seconds gauge
vod_engine_queue_oldest_age_seconds 540

# HELP vod_engine_resource_blocked_total Times resource guardian blocked a job
# TYPE vod_engine_resource_blocked_total counter
vod_engine_resource_blocked_total{resource="cpu"} 3
vod_engine_resource_blocked_total{resource="ram"} 1
vod_engine_resource_blocked_total{resource="disk"} 0
vod_engine_resource_blocked_total{resource="disk_io"} 0
vod_engine_resource_blocked_total{resource="network"} 0

# HELP vod_engine_ffmpeg_exit_code FFmpeg exit codes
# TYPE vod_engine_ffmpeg_exit_code gauge
vod_engine_ffmpeg_exit_code{lecture_id="42",quality="480p"} 0
```

**And** these MUST be implemented using a lightweight Go Prometheus client (`prometheus/client_golang`) or a hand-rolled `expfmt` text encoder  
**And** the `/metrics` endpoint MUST NOT require authentication (for Prometheus scraping)  

---

### Scenario OPS-17: FFmpeg crash stderr captured and logged

**Given** FFmpeg crashes or exits with non-zero exit code  
**When** the pipeline captures the error  
**Then** the engine MUST capture FFmpeg's stderr output and include it in the error log:

```go
// In pipeline.go:
var stderrBuf bytes.Buffer
cmd.Stderr = &stderrBuf

// On failure:
slog.Error("FFmpeg failed",
    "lecture_id", job.LectureID,
    "exit_code", cmd.ProcessState.ExitCode(),
    "stderr", stderrBuf.String(),
    "error", err,
)
```

**And** the stderr output MUST NOT exceed 4096 bytes in the log entry (truncate if larger)  
**And** the full stderr MUST be written to `VOD_LOG_DIR/crash/ffmpeg_{job_id}.log` for forensic analysis  

---

### Scenario OPS-18: Signal handling extended for SIGHUP (log reload)

**Given** the VOD Engine is running  
**When** it receives `SIGHUP`  
**Then** the engine MUST re-read its configuration from environment variables (via `config.Load()`)  
**And** log the event: `"SIGHUP received. Configuration reloaded."`  
**And** continue running without restarting (no job interruption)  

**Note:** Only safe-to-change-at-runtime parameters are updated: log level, resource thresholds, poll intervals. FFmpeg-related settings (threads, preset) require service restart.

---

### Scenario OPS-19: Readiness and liveness probes for container/health-check

**Given** the VOD Engine health endpoint at `GET /health`  
**When** a health checker queries  
**Then** the following probe differentiation MUST apply:

| Probe | Endpoint | Success Criteria |
|-------|----------|------------------|
| **Liveness** | `GET /health?probe=live` | Engine is running (responds within 1 second, any status) |
| **Readiness** | `GET /health?probe=ready` | Engine is initialized (queue recovery complete, HTTP server started, status != "shutting_down") |
| **Startup** | `GET /health?probe=startup` | Engine has completed 2 full monitor cycles (10 seconds), queue started |

**And** the responses should use appropriate HTTP status codes:
- 200 OK = healthy/ready
- 503 Service Unavailable = not ready or shutting down

---

### Scenario OPS-20: Prevent duplicate job submission via idempotency key

**Given** Laravel may retry the `POST /api/v1/video/process` request due to network issues  
**When** the VOD Engine receives a duplicate request with the same `lecture_id` and `raw_key`  
**Then** the engine MUST check if a pending or running job for `(lecture_id, quality)` already exists  
**And** if a job for that quality already exists in `pending`, `running`, or `dead` status, skip creation and return HTTP 200 (idempotent)  
**And** if no job exists for a quality, create only the missing sub-jobs  

```go
// In AddJob(), before creating sub-jobs:
func (s *Scheduler) hasExistingJob(lectureID, quality string) bool {
    // Check in-memory queue
    // Check persisted jobs in VOD_QUEUE_DIR/pending/
    // Return true if any job exists with matching lecture_id + quality
    // in pending, running, or interrupted status
}
```

---

### Scenario OPS-21: Graceful degradation when B2 is unreachable

**Given** Backblaze B2 is temporarily unreachable  
**When** the encoding pipeline attempts a download or upload  
**Then** after 3 retries with exponential backoff, the job MUST be moved to the dead-letter queue  
**And** a specific error code `ERR_B2_UNREACHABLE` MUST be included in the failure report  
**And** the retry delay MUST use the existing `RETRY_BASE_DELAY_S` (30s → 60s → 120s)  
**And** the guardian MUST NOT block new jobs for B2 unavailability (only local resource issues block)  

---

### Scenario OPS-22: NVMe wear-level monitoring with warning

**Given** the NVMe drive has a limited write endurance (e.g., 365 TBW for a typical 100 GB NVMe)  
**When** the NVMe Percentage Used metric exceeds 80%  
**Then** a warning MUST be logged daily: `"NVME_WEAR: Device nvme0n1 at 82% endurance used. Replace planned."`  
**And** at 95%, a critical alert MUST fire: `"NVME_WEAR_CRITICAL: Device nvme0n1 at 96% endurance used. Immediate replacement required."`  

**And** the monitor SHOULD track `Percentage Used` by reading:
```bash
nvme smart-log /dev/nvme0n1 | grep "percentage_used"
```
Or via the Node Exporter NVMe collector metric `node_nvme_percentage_used`.

---

### Scenario OPS-23: Temp workspace partitioned to prevent any single job from consuming all space

**Given** `MAX_WORK_DIR_USAGE_GB` is set to 75 GB  
**When** a single encoding job consumes more than `MAX_PER_JOB_DIR_GB = 25` GB of temp space  
**Then** the job MUST be cancelled and moved to the dead-letter queue  
**And** the failure reason MUST include `"ERR_DISK_QUOTA_EXCEEDED: job exceeded 25 GB temp space"`  

**And** this per-job limit MUST be checked by the guardian before starting a job (estimate based on raw video size × 3 qualities × 1.5 overhead factor):

```go
// In guardian.go:
func (g *Guardian) estimateDiskNeeded(rawVideoSizeBytes int64) int64 {
    // Raw video + 480p output + 360p output + 720p output + overhead
    estimatedBytes := rawVideoSizeBytes * 4 * 2 // 4x for renditions, 2x safety
    return estimatedBytes
}

func (g *Guardian) CanStartJob(job *SubJob) *Result {
    rawSize := g.getRawVideoSize(job.RawKey)
    estimated := estimateDiskNeeded(rawSize)
    if estimated > MAX_PER_JOB_DISK_BYTES {
        return {Blocked: true, Resource: "disk_quota", ...}
    }
    // Then check normal thresholds...
}
```

---

## Security Requirements

| ID | Requirement | Rationale |
|----|------------|-----------|
| OPS-SEC-01 | `/etc/vod-engine/env` must have permissions `0600` owned by `vod-engine` | Prevents other users from reading JWT_SECRET and B2 credentials |
| OPS-SEC-02 | VOD Engine binary at `/usr/local/bin/vod-engine` must have permissions `0755` owned by `root:vod-engine` | Only `root` can modify; `vod-engine` group can execute |
| OPS-SEC-03 | FFmpeg crash logs in `/var/log/vod-engine/crash/` must have permissions `0640` owned by `vod-engine:vod-engine` | Crash logs may contain video metadata |
| OPS-SEC-04 | The `/metrics` endpoint must expose ONLY metrics, never internal state (keys, job payloads) | Prometheus scrape is unauthenticated; data must be safe |
| OPS-SEC-05 | `SIGHUP` config reload must NOT change `JWT_SECRET` or `B2_APP_KEY` at runtime | Credential rotation requires full restart |
| OPS-SEC-06 | Kernel `kernel.kptr_restrict=2` and `kernel.dmesg_restrict=1` must be set | Prevent non-root users from reading kernel pointers or dmesg |

---

## Performance Requirements

| ID | Requirement | Measurement |
|----|------------|-------------|
| OPS-PERF-01 | Per-job telemetry sampling must NOT add more than 1% CPU overhead | Measured via `/proc/self/stat` before/after sampling |
| OPS-PERF-02 | Prometheus `/metrics` endpoint must respond within 100ms | Production scrape interval is 15s; latency must be < 10% of interval |
| OPS-PERF-03 | Monitor goroutine must complete all resource reads within 100ms | If any read blocks (>100ms), log a warning and skip that metric |
| OPS-PERF-04 | Textfile collector write must complete within 50ms | Written in a separate goroutine, never blocking the scheduler |
| OPS-PERF-05 | NVMe health check must not run more frequently than once per 5 minutes | nvme smart-log has a read-disturb cost; 5-min interval is safe |

---

## Out of Scope

- **GPU encoding (NVENC/NVDEC)** — CPU-only libx264  
- **Real-time encoding** — All VOD (Video on Demand)  
- **Multi-region failover** — Single encoding server; manual addition of new servers  
- **CDN configuration** — Handled separately via Laravel/Cloudflare  
- **Client-side watermarking** — Already handled by Laravel frontend  
- **Prometheus/Grafana HA** — Single instance monitoring stack  
- **Automatic capacity planning** — Thresholds are static; reviewed manually quarterly  

---

## Glossary

| Term | Definition |
|------|------------|
| `cgroups` | Linux Control Groups — resource limits for systemd services |
| `OOM score` | Out-Of-Memory killer priority (-1000 = never killed, 1000 = always killed first) |
| `textfile collector` | Node Exporter feature that reads `.prom` files from a directory |
| `tmpfiles.d` | systemd component for temporary file lifecycle management |
| `NVMe Percentage Used` | SSD wear indicator (0-100%). At 100%, the drive may fail |
| `PV` | Pipe Viewer — Unix tool for monitoring/limiting pipe throughput |
