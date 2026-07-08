# BDD Specification — Video Encoding Pipeline Redesign

## Feature: Video Encoding Pipeline — Maximum Stability Architecture

**Business Value:** Eliminate encoding-server crashes, ensure predictable resource usage, and guarantee every uploaded video becomes watchable at 480p as fast as possible. The server must run 24/7 for years without manual intervention for resource management.

**Risk Level:** HIGH — core infrastructure component. Touches FFmpeg encoding, queue system, process lifecycle, server resource limits, and backblaze B2 data flow. Failure can stop all video processing.

---

## Actors

| Actor | Role |
|-------|------|
| `Laravel Backend` | Initiates encoding jobs via API, receives webhook callbacks |
| `VOD Engine (Go)` | The encoding server daemon. Owns the queue, runs FFmpeg, monitors resources |
| `FFmpeg Process` | Child process spawned by VOD Engine for each encoding task |
| `Backblaze B2` | Remote object storage: sources raw videos, stores encrypted HLS outputs |
| `System Administrator` | Monitors logs, adjusts config thresholds, adds encoding servers |

---

## Preconditions

1. **Encoding Server Spec:** 6 vCPU, 12 GB RAM, 100 GB NVMe (or 200 GB SSD), 300 Mbps port.
2. **VOD Engine** is compiled as a single Go binary running as a `systemd` service (`vod-engine.service`).
3. **Storage:** Backblaze B2 bucket is configured with account-level application keys.
4. **Laravel Backend** is reachable at `LARAVEL_INTERNAL_URL` (default `http://127.0.0.1:8000`).
5. **FFmpeg** version 6.0+ is installed on the encoding server.
6. **Temp workspace:** `VOD_WORK_DIR` (default `/var/tmp/vod-engine`) exists with sufficient space.
7. **Queue persistence directory:** `VOD_QUEUE_DIR` (default `/var/lib/vod-engine/queue`) exists.
8. **Log directory:** `VOD_LOG_DIR` (default `/var/log/vod-engine`) exists.
9. **Concurrent job limit** defaults to `1` (process one video at a time).

---

## Scenarios

---

### Scenario 1: Enqueue a video encoding job with priority tiers

**Given** the VOD Engine is running and healthy  
**When** Laravel sends `POST /api/v1/video/process` with `{ "lecture_id": "42", "raw_key": "lectures/42/raw_video.mp4", "qualities": ["480p", "360p", "720p"] }`  
**Then** the engine responds with HTTP 200 `{"status": "accepted"}` within 1 second  
**And** the job is split into three sub-jobs in the priority queue:  
- `priority=1`: 480p rendition  
- `priority=2`: 360p rendition  
- `priority=3`: 720p rendition  
**And** all three sub-jobs share a common `lecture_id=42` and `job_group="lecture_42"`  
**And** the queue persists the job to disk at `VOD_QUEUE_DIR/pending/lecture_42/`  

---

### Scenario 2: Process all 480p renditions before higher qualities

**Given** the queue contains jobs for Video A, Video B, and Video C  
**And** each video has three sub-jobs (480p, 360p, 720p)  
**When** the scheduler selects the next job  
**Then** it selects the highest-priority sub-job with the earliest enqueue time (FIFO within priority)  
**And** the execution order MUST be: A(480p), B(480p), C(480p), A(360p), B(360p), C(360p), A(720p), B(720p), C(720p)  
**And** a 360p or 720p sub-job MUST NOT begin while any 480p sub-job remains in `pending` or `running` status for any video  

---

### Scenario 3: Resource guardian refuses a new job when CPU is overloaded

**Given** the current CPU load average (1-minute) exceeds `MAX_CPU_LOAD_AVG` (default `4.0` on a 6-core system ≈ 67%)  
**When** the scheduler attempts to dequeue the next job  
**Then** the job is NOT started  
**And** the system logs `"RESOURCE_BLOCK: CPU load avg=4.5 exceeds threshold 4.0. Waiting."`  
**And** the scheduler retries after `RESOURCE_POLL_INTERVAL` (default 10 seconds)  

---

### Scenario 4: Resource guardian refuses a new job when RAM is low

**Given** available free RAM (MemAvailable in `/proc/meminfo`) is below `MIN_FREE_RAM_MB` (default 1024 MB ≈ 8.5% of 12 GB)  
**When** the scheduler attempts to dequeue the next job  
**Then** the job is NOT started  
**And** the system logs `"RESOURCE_BLOCK: Available RAM 876MB below threshold 1024MB. Waiting."`  
**And** the scheduler retries after `RESOURCE_POLL_INTERVAL`  

---

### Scenario 5: Resource guardian refuses a new job when disk is too full

**Given** the work directory partition has less than `MIN_FREE_DISK_GB` (default 10 GB) available  
**When** the scheduler attempts to dequeue the next job  
**Then** the job is NOT started  
**And** the system logs `"RESOURCE_BLOCK: Free disk 7.2GB below threshold 10GB. Waiting."`  

---

### Scenario 6: Resource guardian blocks when disk I/O is saturated

**Given** disk I/O utilization (averaged over 60 seconds from `/proc/diskstats`) exceeds `MAX_DISK_IO_PCT` (default 80%)  
**When** the scheduler attempts to dequeue the next job  
**Then** the job is NOT started  
**And** the system logs `"RESOURCE_BLOCK: Disk I/O at 94% exceeds threshold 80%. Waiting."`  

---

### Scenario 7: Resource guardian blocks when network bandwidth is saturated

**Given** outbound network utilization (averaged over 30 seconds) exceeds `MAX_NETWORK_PCT` (default 70% of 300 Mbps ≈ 210 Mbps)  
**When** the scheduler attempts to dequeue the next job  
**Then** the job is NOT started  
**And** the system logs `"RESOURCE_BLOCK: Network outbound 245Mbps exceeds threshold 210Mbps. Waiting."`  

---

### Scenario 8: Resource guardian recovers automatically

**Given** a job was blocked due to high CPU load  
**When** the load average drops below `MAX_CPU_LOAD_AVG - RECOVERY_HYSTERESIS` (default `3.5` = 4.0 − 0.5)  
**And** the scheduler's poll interval fires  
**Then** the scheduler dequeues and starts the next pending job  
**And** the system logs `"RESOURCE_UNBLOCK: CPU load avg=3.2 within safe range. Resuming."`  

---

### Scenario 9: FFmpeg process has strict resource limits

**Given** a job has been dequeued and the engine prepares to spawn FFmpeg  
**When** the engine runs the FFmpeg command  
**Then** the FFmpeg process is started with:  
- `nice -n 15` (low CPU priority, so the OS can preempt FFmpeg if needed)  
- `ionice -c 2 -n 7` (best-effort I/O scheduling, lowest priority class 7)  
- CPU affinity pinned to `CPU_AFFINITY_MASK` (default: all cores minus 1, e.g., cores 0-4 on a 6-core system, leaving core 5 free for OS/engine)  
- FFmpeg `-threads 2` (not `0` — auto-detect can overload the system)  
- FFmpeg `-preset medium` (not `ultrafast` — stable encoding, lower bitrate spikes)  
- Input pipe capped via `pv --rate-limit DOWNLOAD_RATE_LIMIT` if download rate limiting is enabled  

---

### Scenario 10: Concurrent job limiter prevents multiple FFmpeg processes

**Given** the active job count equals `MAX_CONCURRENT_JOBS` (default 1)  
**When** another job is ready to start  
**Then** the scheduler does NOT start the new job  
**And** logs `"CONCURRENCY_BLOCK: Active jobs 1 equals MAX_CONCURRENT_JOBS 1. Waiting."`  
**And** the engine maintains a pidfile of the active FFmpeg process at `VOD_WORK_DIR/active.pid`  

---

### Scenario 11: Job failure with retry and exponential backoff

**Given** an encoding job for lecture 42 fails at step "encoding" with a non-fatal error (e.g., transient download failure)  
**When** the engine captures the error  
**Then** the engine increments `retry_count`  
**And** if `retry_count < MAX_RETRIES` (default 3):  
- the job is moved from `running` back to `pending`  
- the job's `next_retry_at` is set to `now + RETRY_BASE_DELAY * 2^retry_count` (e.g., 30s, 60s, 120s)  
- the job is persisted to `VOD_QUEUE_DIR/pending/`  
**And** if `retry_count >= MAX_RETRIES`:  
- the job is moved to `VOD_QUEUE_DIR/dead/`  
- a dead-letter webhook is sent to Laravel: `POST {laravel_url}/api/internal/webhooks/video-encoded` with `{"lecture_id": "42", "status": "dead_letter", "error": "..."}`  

---

### Scenario 12: Graceful shutdown during active encoding

**Given** an encoding job is actively running (FFmpeg is encoding)  
**When** the VOD Engine receives `SIGTERM` (systemctl stop)  
**Then** the engine sets internal state to `shutting_down = true`  
**And** the HTTP server stops accepting new requests (returns 503)  
**And** the engine waits for the active FFmpeg process with a `GRACEFUL_TIMEOUT` (default 5 minutes)  
**And** if FFmpeg finishes within the timeout:  
- the job completes normally (upload, validate, cleanup, webhook)  
**And** if FFmpeg does NOT finish within the timeout:  
- the engine sends `SIGTERM` to FFmpeg, waits 10 seconds, then sends `SIGKILL`  
- the job is saved to `VOD_QUEUE_DIR/pending/` with `status: "interrupted"` and `retry_count` preserved  
- the engine logs `"GRACEFUL_SHUTDOWN: FFmpeg PID 1234 killed after timeout. Job saved for resume."`  
**And** all in-memory queue state is flushed to disk  
**And** the engine exits with code 0  

---

### Scenario 13: Resume after reboot

**Given** the server was rebooted while jobs were in `pending` or `interrupted` state in `VOD_QUEUE_DIR/`  
**When** the VOD Engine starts and completes initialization  
**Then** the engine scans `VOD_QUEUE_DIR/pending/` for any persisted jobs  
**And** loads all found jobs into the in-memory priority queue  
**And** logs `"QUEUE_RECOVER: Loaded 3 pending jobs from disk."`  
**And** resumes normal scheduling starting from the highest-priority oldest job  

---

### Scenario 14: Orphan process detection and cleanup

**Given** the VOD Engine starts after an unclean shutdown  
**When** the engine initializes  
**Then** it reads `VOD_WORK_DIR/active.pid` if it exists  
**And** checks if a process with that PID is running and is an FFmpeg process  
**If** an orphan FFmpeg is found:  
- sends `SIGTERM`, waits 10s, then `SIGKILL`  
- logs `"ORPHAN_CLEANUP: Killed orphan FFmpeg PID 1234"`  
**And** cleans up `VOD_WORK_DIR/` by removing any stale temp files older than `ORPHAN_TEMP_TTL` (default 24 hours)  

---

### Scenario 15: Encoding level logging captures full telemetry

**Given** a video encoding job completes successfully  
**When** the job finishes  
**Then** the engine writes a structured JSON log line containing:  
```json
{
  "event": "job.completed",
  "lecture_id": "42",
  "qualities": ["480p", "360p", "720p"],
  "encoding_duration_s": 342,
  "cpu_avg_pct": 45.2,
  "cpu_peak_pct": 78.1,
  "ram_avg_mb": 2048,
  "ram_peak_mb": 3100,
  "download_speed_mbps": 85,
  "upload_speed_mbps": 42,
  "total_size_mb": 512,
  "segments_count": 85,
  "retries": 0,
  "final_status": "completed"
}
```

---

### Scenario 16: Monitoring loop runs continuously

**Given** the VOD Engine is running  
**When** the monitoring goroutine fires every `MONITOR_INTERVAL` (default 5 seconds)  
**Then** it samples:  
- CPU load averages (1m, 5m, 15m) via `/proc/loadavg`  
- Memory (MemTotal, MemAvailable, SwapTotal, SwapFree) via `/proc/meminfo`  
- Disk usage of work partition via `syscall.Statfs`  
- Disk I/O utilization via `/proc/diskstats` (delta-based)  
- Network bandwidth via `/proc/net/dev` (delta-based)  
- Number of active FFmpeg PIDs  
- Temperature (if available via `sensors` or `/sys/class/thermal/`)  
**And** writes a compact metrics line to the log  
**And** updates an in-memory `ResourceSnapshot` that the scheduler reads  

---

### Scenario 17: All-480p-complete webhook notifies Laravel

**Given** the last 480p sub-job for a job group completes  
**When** the engine marks the 480p sub-job as completed  
**Then** the engine sends a webhook to Laravel:  
`POST {laravel_url}/api/internal/webhooks/lectures/{lecture_id}/progress`  
with payload `{"phase": "480p_complete", "percent": 40}`  
**And** Laravel can now update the UI to show the lecture is watchable at 480p  

---

### Scenario 18: Full completion webhook updates Laravel

**Given** all sub-jobs (480p, 360p, 720p) for a lecture complete successfully  
**When** the last sub-job finishes upload and validation  
**Then** the engine sends `POST {laravel_url}/api/internal/webhooks/video-encoded` with:  
```json
{
  "lecture_id": "42",
  "status": "completed",
  "m3u8_path": "streams/lecture_42/master.m3u8",
  "encryption_key": "aabbccdd...",
  "size_bytes": 536870912,
  "qualities": ["480p", "360p", "720p"]
}
```
**And** the engine deletes the raw video from B2: `DELETE raw_videos/lecture_42.mp4`  
**And** the engine cleans up `VOD_WORK_DIR/lecture_42/` entirely  

---

### Scenario 19: Queued job is gracefully skipped on shutdown

**Given** a job exists in the in-memory queue but has not started processing  
**When** the engine shuts down gracefully  
**Then** the engine serializes the job back to `VOD_QUEUE_DIR/pending/` with `status: "pending"`  
**And** the job's `retry_count` is NOT incremented  

---

### Scenario 20: Dead-letter queue holds permanently failed jobs

**Given** a job has exhausted all `MAX_RETRIES` attempts  
**When** the engine moves it to the dead-letter queue  
**Then** the job file is moved to `VOD_QUEUE_DIR/dead/lecture_42/`  
**And** a summary file `VOD_QUEUE_DIR/dead/lecture_42/failure_report.json` is written containing all error messages and timestamps  
**And** the engine notifies Laravel with `status: "dead_letter"`  

---

### Scenario 21: Admin can re-queue a dead-letter job via API

**Given** a job exists in `VOD_QUEUE_DIR/dead/lecture_42/`  
**When** Laravel sends `POST /api/v1/video/requeue` with `{"lecture_id": "42"}`  
**Then** the engine moves the job from `dead/` back to `pending/`  
**And** resets `retry_count = 0`  
**And** logs `"JOB_REQUEUE: lecture 42 moved from dead to pending for manual retry."`  

---

### Scenario 22: Queue persistence survives partial disk write

**Given** the engine is writing a job to disk  
**When** a crash occurs mid-write  
**Then** the job file is written atomically:  
- Engine writes to a `.tmp` file first  
- Then `rename(2)` atomically replaces the target  
**And** on restart, partially written `.tmp` files are cleaned up  

---

### Scenario 23: 360p and 720p encoding use same intermediate assets

**Given** 480p encoding for a lecture has completed  
**And** the downloaded raw video is still in `VOD_WORK_DIR/lecture_42/input.mp4`  
**When** the 360p sub-job starts  
**Then** it reuses the existing `input.mp4` (no re-download)  
**And** encodes to `VOD_WORK_DIR/lecture_42/360p/`  
**And** the 720p sub-job similarly reuses the same `input.mp4`  
**And** the full input is deleted only after all sub-jobs for the lecture are complete  

---

### Scenario 24: Temp workspace is bounded to prevent disk saturation

**Given** the `VOD_WORK_DIR` partition reaches `MAX_WORK_DIR_USAGE_GB` (default 80 GB)  
**When** any component tries to allocate new temp space  
**Then** the new job is blocked  
**And** the system logs `"DISK_BLOCK: Work dir usage 81GB exceeds max 80GB. Waiting for cleanup."`  
**And** after the oldest completed job's workspace is cleaned up, new jobs can proceed  

---

### Scenario 25: Health endpoint exposes live resource state

**Given** the VOD Engine is running  
**When** `GET /health` is called  
**Then** the response includes:  
```json
{
  "status": "healthy",
  "uptime_seconds": 86400,
  "active_jobs": 1,
  "pending_jobs": 2,
  "dead_letter_jobs": 0,
  "resources": {
    "cpu_load_1m": 2.1,
    "ram_available_mb": 4096,
    "disk_free_gb": 45,
    "disk_io_pct": 30,
    "network_out_mbps": 80
  },
  "version": "2.0.0"
}
```

---

### Scenario 26: Scalability — second encoding server joins the fleet

**Given** encoding server 1 (6 vCPU, 12 GB) is at capacity  
**When** encoding server 2 (6 vCPU, 12 GB) starts  
**Then** server 2 connects to the same Backblaze B2 bucket  
**And** server 2 begins polling its own `VOD_QUEUE_DIR`  
**And** the Laravel backend can distribute jobs across servers by writing to their respective queue dirs or via a shared Redis-based distributed queue  
**Note:** Phase 1 uses per-server local queues. Phase 2 adds optional Redis backend for distributed scheduling without changing the worker logic.

---

## Security Requirements

| ID | Requirement | Rationale |
|----|------------|-----------|
| SEC-01 | All HTTP endpoints (process, requeue, health) must validate `X-Internal-Secret` header against `JWT_SECRET` | Prevents unauthorized job injection |
| SEC-02 | Raw video paths must be validated to start with `raw/` or `lectures/` | Path traversal prevention |
| SEC-03 | FFmpeg must not have access to the network except for local files | Running as dedicated `vod-engine` user with no network access except B2 API calls |
| SEC-04 | Encryption keys for HLS must be generated with `crypto/rand` and stored only in memory during encoding | Keys never touch disk except in temp (cleaned up) |
| SEC-05 | The `vod-engine` systemd service must run as an unprivileged user (`vod-engine`, not root) | Principle of least privilege |
| SEC-06 | All job files on disk must have `0600` permissions | Prevent other OS users from reading job metadata |
| SEC-07 | Downloaded raw videos on temp disk must have `0400` permissions and be owned by `vod-engine` user | Prevent other processes from reading them |

---

## Performance Requirements

| ID | Requirement | Measurement |
|----|------------|-------------|
| PERF-01 | HTTP API response must complete within 1 second | `POST /api/v1/video/process` returns 200 before enqueuing |
| PERF-02 | Resource check must complete within 100ms | Poll interval is 10s, each check is sub-100ms |
| PERF-03 | A 480p encoding must not use more than 30% CPU sustained over 60 seconds | Capped via `-threads 2`, `nice 15`, `-preset medium` |
| PERF-04 | A 480p encoding must not use more than 3 GB RAM peak | 12 GB total; 1 job at a time; 3 GB for FFmpeg, rest for OS and cache |
| PERF-05 | Disk writes during encoding must not exceed 50 MB/s sustained | `ionice -c 2 -n 7` limits I/O impact |
| PERF-06 | Upload concurrency capped at 3 simultaneous streams | Prevents network saturation during upload phase |

---

## Out of Scope (v2.0)

- **Live streaming / WebRTC** — VOD-only
- **AI-based encoding (per-scene VMAF optimization)** — Standard CRF/AAC only
- **Multi-tenant queue isolation** — All jobs share the same queue
- **Web dashboard** — All monitoring via logs + health endpoint + Laravel admin
- **Automatic scaling of encoding servers** — Manual add/remove only
- **GPU/NVENC encoding** — CPU-only (libx264)
- **CDN purging** — Handled separately by Laravel
- **Thumbnail generation** — Future enhancement
- **Transcription / subtitles** — Future enhancement
- **AR/VR or 4K/8K content** — Max 720p

---

## Glossary

| Term | Definition |
|------|------------|
| `sub-job` | A single rendition encoding (e.g., 480p only). A `video job` is composed of 1+ sub-jobs |
| `job group` | A set of sub-jobs sharing the same `lecture_id`. They share the downloaded input file |
| `priority tier` | Rendition priority: 1=480p, 2=360p, 3=720p |
| `resource guardian` | The component that checks system resources before starting a job |
| `dead-letter queue` | Directory for jobs that failed permanently after exhausting retries |
| `active pidfile` | Lock file at `VOD_WORK_DIR/active.pid` containing the current FFmpeg PID |

---

## Configuration Reference (All Environment Variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_CONCURRENT_JOBS` | `1` | Maximum encoding jobs running simultaneously |
| `MAX_CPU_LOAD_AVG` | `4.0` | Max 1-minute load average before blocking jobs (6-core, ~67%) |
| `RECOVERY_HYSTERESIS` | `0.5` | Load must drop below threshold minus this value to unblock |
| `MIN_FREE_RAM_MB` | `1024` | Minimum available RAM (MB) before blocking jobs |
| `MIN_FREE_SWAP_MB` | `512` | Minimum free swap (MB) before blocking |
| `MIN_FREE_DISK_GB` | `10` | Minimum free work-dir disk (GB) before blocking |
| `MAX_DISK_IO_PCT` | `80` | Max disk I/O utilization % before blocking |
| `MAX_NETWORK_PCT` | `70` | Max outbound network utilization % before blocking |
| `MAX_WORK_DIR_USAGE_GB` | `80` | Max work directory usage (GB) before blocking |
| `CPU_AFFINITY_MASK` | `0-4` | CPU cores for FFmpeg pinning (leave 1 core free) |
| `FFMPEG_THREADS` | `2` | FFmpeg `-threads` value |
| `FFMPEG_PRESET` | `medium` | FFmpeg preset (medium over ultrafast for stability) |
| `FFMPEG_NICE` | `15` | Nice level for FFmpeg process |
| `FFMPEG_IONICE_CLASS` | `2` | Ionice class (2=best-effort) |
| `FFMPEG_IONICE_LEVEL` | `7` | Ionice priority level (7=lowest) |
| `MAX_RETRIES` | `3` | Maximum retry attempts before dead-letter |
| `RETRY_BASE_DELAY_S` | `30` | Base delay for exponential backoff (doubles each retry) |
| `GRACEFUL_TIMEOUT_S` | `300` | Max wait for FFmpeg to finish during shutdown |
| `RESOURCE_POLL_INTERVAL_S` | `10` | How often the scheduler retries when blocked |
| `MONITOR_INTERVAL_S` | `5` | How often the monitoring loop samples resources |
| `DOWNLOAD_RATE_LIMIT_KBPS` | `0` | Download rate limit (0 = unlimited) |
| `UPLOAD_CONCURRENCY` | `3` | Concurrent upload streams during upload phase |
| `HLS_SEGMENT_DURATION_S` | `6` | HLS segment duration in seconds |
| `HLS_KEYFRAME_INTERVAL` | `48` | Keyframe interval (must be 2× segment duration for HLS) |
| `VOD_WORK_DIR` | `/var/tmp/vod-engine` | Temp workspace for downloads and encoding |
| `VOD_QUEUE_DIR` | `/var/lib/vod-engine/queue` | Persistent queue storage |
| `VOD_LOG_DIR` | `/var/log/vod-engine` | Log output directory |
