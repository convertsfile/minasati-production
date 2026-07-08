# Post-Review Remediation — Video Encoding Pipeline Redesign

## Summary

All critical and high-priority findings from the code review have been addressed.

## Fixes Applied

### Critical
| Finding | Fix | File |
|---------|-----|------|
| SEC-02: No raw key prefix validation | Added `strings.HasPrefix` check against `raw/` and `lectures/` | `internal/api/handlers/process.go` |
| Delete handler context may be cancelled | Changed from `r.Context()` to `context.Background()` | `internal/api/handlers/process.go` |

### High
| Finding | Fix | File |
|---------|-----|------|
| `CountPending()` double-counting dead jobs | Split into `CountPending()` and `CountDead()` | `internal/queue/persistence.go`, `internal/worker/pool.go` |

### Medium
| Finding | Fix | File |
|---------|-----|------|
| No queue size limit | Added `MAX_QUEUE_SIZE` (default 1000) with HTTP 429 rejection | `internal/config/config.go`, `internal/worker/pool.go`, `internal/api/handlers/process.go`, `.env` |

## Files Changed During Remediation

1. `internal/api/handlers/process.go` — Added SEC-02 validation, fixed context, added 429 error handling
2. `internal/queue/persistence.go` — Split `CountPending()`/`CountDead()`
3. `internal/worker/pool.go` — Added queue capacity check, fixed stats reporting
4. `internal/config/config.go` — Added `MaxQueueSize`
5. `.env` — Added `MAX_QUEUE_SIZE=1000`

## Build Verification

- `go build ./cmd/api/` — ✅ Clean
- `go vet ./...` — ✅ Clean

## Outstanding Recommendations (Deferred)

These were identified in the review but marked as acceptable for initial deployment:

| Recommendation | Rationale |
|----------------|-----------|
| Encryption key fetch from Laravel | Existing behavior (keys generated locally since v1); matches spec's `crypto/rand` requirement |
| Readiness/liveness probes | Health endpoint already returns status; can be enhanced when Kubernetes deployment is configured |
| Process memory tracking | `/proc/self/status` data available in monitor; can be added to health endpoint in next iteration |
| FFmpeg binary path validation | Wrapper chain failure is detectable via command start error; adding pre-flight check is low priority |
