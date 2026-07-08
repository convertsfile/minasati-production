# Address Review — VOD Encoding Operational Hardening

## Summary

All code review findings have been fixed and verified. Build, vet, and all 7 test packages pass cleanly.

## Fixes Applied

### C-01 (Critical): Telemetry event nested under slog.Group

**Problem:** `ToLogEvent()` returned `slog.Attr` wrapping all fields inside a `slog.Group("telemetry", ...)`, so `event=job.telemetry` appeared nested in JSON, not at the top level. This violated OPS-05 which requires top-level `event` field for log indexing.

**Fix:**
- Changed `ToLogEvent()` to return `[]slog.Attr` (slice) instead of single `slog.Attr`
- `event=job.telemetry` is now the **first element** of the slice — appears at JSON top level
- `slog.LogAttrs(ctx, slog.LevelInfo, "job.telemetry", attrs...)` uses spread operator

**Files changed:**
- `internal/telemetry/telemetry.go` — `ToLogEvent()` signature + implementation
- `internal/encoding/pipeline.go` — callers use spread `...`
- `internal/telemetry/telemetry_test.go` — updated for new signature

---

### M-01 (Major): Required telemetry fields never populated

**Problem:** `DownloadSpeedMbps`, `UploadSpeedMbps`, `TotalSizeMB`, and `SegmentsCount` on `JobTelemetry` were never written — always 0 in logs.

**Fix:** Added tracking throughout the pipeline:
- `DownloadSpeedMbps`: `dlStart`/`downloadDuration` wraps the actual download call; computed from `rawFileSize / downloadDuration`
- `UploadSpeedMbps`: `uploadStart`/`uploadDuration` wraps the B2 upload call; computed from `totalUploadBytes / uploadDuration`
- `SegmentsCount`: counted from `.ts` files in generated output
- `TotalSizeMB`: set initially from raw file, then from total uploaded size

**Files changed:**
- `internal/encoding/pipeline.go` — download/upload timing, segment counting, field population

---

### M-02 (Major): CPU sampling uses cumulative average

**Problem:** Sampler computed CPU% as cumulative `totalCpuTime / totalElapsedTime`, which dampened spikes. A brief 90% CPU spike would be diluted by earlier idle samples.

**Fix:** Changed to **per-interval delta**:
```go
cpuDelta := cpuTime - s.prevCPUTime
timeDelta := sample.Timestamp.Sub(s.prevSampleTime).Seconds()
cpuPct := cpuDelta / timeDelta * 100
```
First sample stores baseline and reports 0%.

**Files changed:**
- `internal/telemetry/sampler.go` — delta calculation logic

---

### M-03 (Major): Textfile directory may silently fail at runtime

**Problem:** If `/var/lib/node_exporter/textfile/` doesn't exist or isn't writable by the `vod-engine` user, the textfile writer would fail silently — no Prometheus metrics, no alert.

**Fix:** Added startup write-access test:
```go
testFile := filepath.Join(dir, ".write_test")
if err := os.WriteFile(testFile, []byte{}, 0644); err != nil {
    slog.Error("TEXTFILE COLLECTOR DISABLED: directory is not writable...")
    return  // writer goroutine exits early
}
```

**Files changed:**
- `internal/metrics/textfile.go` — writability check in `NewTextfileWriter()`

---

### M-04 (Major): No warning when SIGHUP rejects credential changes

**Problem:** Per OPS-SEC-05, JWT_SECRET, B2_KEY_ID, and B2_APP_KEY cannot be changed at runtime via SIGHUP. But if an operator tries, there's no feedback — the change is silently ignored.

**Fix:** Added explicit warning logs for each credential:
```go
if newCfg.JWTSecret != cfg.JWTSecret {
    slog.Warn("SIGHUP: JWT_SECRET change detected and IGNORED (OPS-SEC-05). ...")
}
if newCfg.B2KeyID != "" && newCfg.B2KeyID != cfg.B2KeyID {
    slog.Warn("SIGHUP: B2_KEY_ID change detected and IGNORED (OPS-SEC-05). ...")
}
if newCfg.B2AppKey != "" && newCfg.B2AppKey != cfg.B2AppKey {
    slog.Warn("SIGHUP: B2_APP_KEY change detected and IGNORED (OPS-SEC-05). ...")
}
```

**Supporting fix:** Added `B2KeyID` and `B2AppKey` fields to the Config struct so the SIGHUP handler can compare old vs new values.

**Files changed:**
- `cmd/api/main.go` — credential change detection + warnings
- `internal/config/config.go` — `B2KeyID`, `B2AppKey` fields + env loading

---

## Inline Bugs Discovered During Testing (Not in Original Review)

These were found while verifying the M-01 fix logic:

### Bug A: Telemetry logged before upload stats computed

**Problem:** The `slog.LogAttrs(...)` for successful jobs was called at line 157 (right after FFmpeg finished), but upload calculations (`UploadSpeedMbps`, `SegmentsCount`, `TotalSizeMB`) happened at lines 164-203 — **after** the log was already dispatched. These fields always appeared as 0 in production logs.

**Fix:** Restructured the success path:
1. FFmpeg → segment counting → upload → **populate ALL fields** → `Compute()` → `slog.LogAttrs(...)`
2. Single telemetry log at the end with all fields populated

### Bug B: DownloadStart measured after download completed

**Problem:** `downloadStart = time.Now()` was set at line 113, but `p.downloadWithRateLimit()` was called at line 98 — the download had already finished. The timer measured encryption key fetch + FFmpeg encoding time instead of actual download, corrupting `DownloadSpeedMbps`.

**Fix:** Moved the timer to wrap the actual download:
```go
dlStart := time.Now()
p.downloadWithRateLimit(...)
downloadDuration = time.Since(dlStart)
```

## Files Changed During Remediation

| # | File | Change |
|---|------|--------|
| 1 | `internal/telemetry/telemetry.go` | C-01: ToLogEvent() returns `[]slog.Attr`, event at top level |
| 2 | `internal/telemetry/sampler.go` | M-02: Delta-based CPU% calculation |
| 3 | `internal/encoding/pipeline.go` | M-01: Download/upload tracking; Bug A: log ordering; Bug B: download timer placement |
| 4 | `internal/metrics/textfile.go` | M-03: Startup directory writability check |
| 5 | `cmd/api/main.go` | M-04: SIGHUP credential change warnings |
| 6 | `internal/config/config.go` | M-04: B2KeyID, B2AppKey fields |
| 7 | `internal/telemetry/telemetry_test.go` | C-01: Updated for new ToLogEvent() signature |

## Build Verification

| Command | Result |
|---------|--------|
| `go build ./cmd/api/` | ✅ Clean |
| `go vet ./...` | ✅ Clean |
| `go test ./internal/config/` | ✅ 0.126s |
| `go test ./internal/telemetry/` | ✅ 0.122s |
| `go test ./internal/metrics/` | ✅ 0.630s |
| `go test ./internal/encoding/` | ✅ 2.676s |
| `go test ./internal/guardian/` | ✅ 3.580s |
| `go test ./internal/worker/` | ✅ 3.408s |
| `go test ./internal/api/handlers/` | ✅ 1.970s |

## Outstanding Items

None. All 1 critical, 4 major, and 2 inline bugs found during testing have been fixed and verified.
