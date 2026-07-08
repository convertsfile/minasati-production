# Implementation Plan — Video Encoding Pipeline Redesign

## Overview

Rewrite the VOD Engine Go worker to enforce maximum server stability. The redesign introduces a priority queue with disk persistence, a resource guardian that blocks jobs when the server is overloaded, strict FFmpeg resource limits, continuous monitoring, graceful shutdown, and dead-letter management.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Main Loop (cmd/api/main.go)                            │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │ HTTP API │  │  Scheduler  │  │  Monitor         │   │
│  │ (handlers)│  │  (worker/   │  │  (monitor/)      │   │
│  │          │  │   pool.go)  │  │  5s sampling     │   │
│  └────┬─────┘  └──────┬──────┘  └────────┬─────────┘   │
│       │               │                  │             │
│  ┌────▼─────┐  ┌──────▼──────┐           │             │
│  │  Queue   │  │  Guardian   │           │             │
│  │ (queue/) │  │ (guardian/) │           │             │
│  │ prio+FIFO│  │ cpu/ram/disk│           │             │
│  │ disk     │  │ io/net      │           │             │
│  │ persist  │  │            │           │             │
│  └──────────┘  └────────────┘           │             │
│                                         │             │
│  ┌──────────────────────────────────────▼──────────┐  │
│  │  Encoding Pipeline (encoding/)                  │  │
│  │  ffmpeg.go — command builder (nice/ionice/aff) │  │
│  │  pipeline.go — download→encode→upload→cleanup  │  │
│  │  progress.go — progress tracking & webhooks     │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │  B2 Client (b2/) — unchanged, fully functional  │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## File Changes

### New Files (8)
| File | Purpose |
|------|---------|
| `internal/config/config.go` | Typed configuration from env vars with defaults |
| `internal/queue/job.go` | Job types, priority tiers, serialization |
| `internal/queue/priority_queue.go` | Priority FIFO queue with atomic disk persistence |
| `internal/queue/persistence.go` | Read/write jobs to `VOD_QUEUE_DIR` |
| `internal/monitor/monitor.go` | 5-second resource sampling loop |
| `internal/guardian/guardian.go` | Check resources before starting jobs |
| `internal/encoding/ffmpeg.go` | FFmpeg command builder with strict resource limits |
| `internal/encoding/pipeline.go` | Download → Encode → Upload → Validate → Cleanup |

### Modified Files (3)
| File | Change |
|------|--------|
| `internal/worker/pool.go` | Complete rewrite: scheduler using queue + guardian + pipeline |
| `cmd/api/main.go` | Wire new components, graceful shutdown, health endpoint enhanced |
| `internal/api/handlers/upload.go` | Rename to `process.go`, minor updates for new types |

### Unchanged Files (7)
- `internal/b2/client.go`, `upload.go`, `download.go`, `delete.go`
- `internal/api/handlers/delete.go`
- `internal/api/middlewares/cors.go`
- `internal/auth/jwt.go`

## Implementation Phases

### Phase 1: Configuration (config.go)
- Read all 27 env vars with typed defaults
- Single `Config` struct passed to all components

### Phase 2: Queue (queue/)
- `Job` struct with: ID, LectureID, RawKey, Qualities, Priority, RetryCount, Status, etc.
- `PriorityQueue` — slice-based heap with FIFO ordering within same priority
- `Persistence` — atomic write via `.tmp` + `rename()`, read from `VOD_QUEUE_DIR/pending/`, move to `dead/`

### Phase 3: Monitor (monitor/)
- `Monitor` goroutine sampling CPU load, RAM, disk, I/O, network every 5s
- `ResourceSnapshot` struct read by guardian

### Phase 4: Guardian (guardian/)
- Check all thresholds against latest snapshot
- Return which resource is blocking (or nil = ok)
- Hysteresis for recovery

### Phase 5: FFmpeg (encoding/)
- `FFmpegCommand` builder — sets `nice`, `ionice`, CPU affinity, `-threads 2`, `-preset medium`
- `Pipeline` orchestrator: download → encode → walk → upload → validate → webhook → cleanup

### Phase 6: Worker (pool.go rewrite)
- `Scheduler` goroutine: dequeue → guardian check → run pipeline → handle result
- Single active job enforcement
- Retry with exponential backoff (30s, 60s, 120s)
- Dead-letter on max retries

### Phase 7: Main (main.go rewrite)
- Wire all components
- Graceful shutdown: SIGTERM → stop HTTP → wait for FFmpeg → persist → exit
- Orphan cleanup on startup
- Enhanced health endpoint

## Sequence: Job Lifecycle

```
1. POST /api/v1/video/process  ← Laravel
2. handler validates secret, parses body
3. handler creates Job, splits into SubJobs (480p/360p/720p)
4. handler persists SubJobs to disk atomically, pushes to in-memory queue
5. handler returns 200 {"status": "accepted"}
6. Scheduler dequeues highest-priority SubJob
7. Guardian checks resources:
   - CPU load < 4.0? RAM > 1GB? Disk > 10GB? I/O < 80%? Net < 70%?
   - If blocked → log + retry after RESOURCE_POLL_INTERVAL
8. Scheduler downloads raw video from B2
9. Scheduler runs FFmpeg with resource limits (nice 15, ionice 2/7, threads 2, preset medium)
10. On progress → send webhook to Laravel (throttled)
11. On success → upload HLS segments to B2 (multipart, concurrent)
12. Validate: count files in B2 == local count
13. Cleanup: remove temp dir, delete raw video from B2
14. Send completion webhook to Laravel
15. Process next SubJob (same group reuses input file)
16. When all SubJobs done → cleanup shared input
```

## Error Recovery

| Scenario | Behavior |
|----------|----------|
| FFmpeg crash (retryable) | Log, increment retry, exponential backoff (30s/60s/120s) |
| Max retries exceeded | Move to dead-letter queue, notify Laravel |
| SIGTERM during encoding | Wait 5 min, then kill FFmpeg, persist state, exit 0 |
| Crash mid-write | Atomic `.tmp` + rename, cleanup orphans on restart |
| Orphan FFmpeg from crash | On startup: detect via pidfile, kill, clean temp |

## Configuration Mapping (27 vars from spec)

All configuration lives in `internal/config/config.go` with env var binding and defaults.
