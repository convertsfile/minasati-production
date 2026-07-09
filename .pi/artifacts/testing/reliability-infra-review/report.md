# Reliability / Infrastructure Review — Minassati — 2026-07-09 (retry)

**Active domain:** `reliability-infra-review` (prior retries: 1 → 2)
**Verification:** 81/81 PHP tests pass (303 assertions, ~41s); `go vet` + `go build` exit 0; `npx tsc --noEmit` exit 0; 6/6 shell scripts pass `bash -n`; all 4 YAML files parse cleanly.

## Lifecycle

1. **Locate** — all 24 files from the prior remediation are present.
2. **Deployment safety** — deploy/rollback pair is symmetric for Laravel, frontend, VOD engine.
3. **Validate config** — `php -l`, `go vet`, `go build`, `tsc`, YAML parse, `bash -n` all clean.
4. **Observability** — live probe against `php artisan serve` :8765:
   - `/up` 200 (back-compat).
   - `/api/health/live` 200 + hardening headers.
   - `/api/health/ready` 200 with per-dep status; B2 marked `optional:true`, did not cause 503.
   - `/api/metrics` 200, valid Prometheus text exposition format.
5. **Chaos** — `HealthCheckTest::ready_endpoint_returns_503_when_database_is_unreachable` (port 3399) is the authoritative proof; passes.
6. **Secrets** — `backend/storage/app/firebase/firebase_credentials.json` has a real-looking `BEGIN PRIVATE KEY`, but is gitignored (`backend/storage/app/.gitignore` line 1 `*`). No secrets in VCS. The denylist entry `Makeen_Enterprise_VOD_Secret_Key_2026_!@#` is the only tracked mention.

## CRITICAL

_None._

## MAJOR

### 1. `MetricsController` documents an IP allowlist it does not enforce
- **Component:** `backend/app/Http/Controllers/MetricsController.php` (docstring lines 15-23); `backend/routes/api.php` (`Route::get('/metrics', MetricsController::class)`).
- **Evidence:** Class docstring promises "IP allowlist: requests from non-allowlisted IPs get 404 … Configure `METRICS_ALLOWED_IPS` in .env … Defaults: 127.0.0.1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16." No allowlist code exists, no middleware on the route, and `METRICS_ALLOWED_IPS` is referenced nowhere else. Live probe: `curl -H "X-Forwarded-For: 8.8.8.8" http://127.0.0.1:8765/api/metrics` returns 200 in 0.63s. Any internet attacker can (a) trigger 3 COUNT queries per scrape (DoS), (b) read internal rates (webhook outcomes, queue depth), (c) pollute `http_requests_total`. The prior cycle claimed "restricted by reverse proxy" — true in production but the code does not enforce it, and the docstring actively misleads.
- **Fix:** Add a `RestrictToInternalIps` middleware reading `METRICS_ALLOWED_IPS` (default above) and returning 404 (not 403) for non-allowlisted IPs. Mount it on the route. Add a test asserting 127.0.0.1=200, 8.8.8.8=404, 10.1.2.3=200.

## MINOR

### 1. `backend/.env.example` does not document `FIREBASE_CREDENTIALS`
- **Component:** `backend/.env.example`; `backend/.env` has `FIREBASE_CREDENTIALS=storage/app/firebase/firebase_credentials.json`.
- **Evidence:** A fresh checkout has no way to know the variable name, default path, or how to obtain the service-account JSON. The key file is gitignored (security is fine) — purely a docs gap.
- **Fix:** Add a `# Firebase` section to `.env.example` with the variable, default path, a "Firebase console → Project Settings → Service accounts → Generate new private key" note, and a "rotate every 90 days" reminder.

### 2. `/api/metrics` is an unauthenticated, unthrottled DB round-trip
- **Component:** `backend/app/Services/Metrics/ApplicationMetrics.php::snapshotGauges()`.
- **Evidence:** Each scrape runs 3 DB queries. Combined with MAJOR #1, a 1Hz scripted poll pins Laravel to those queries forever.
- **Fix:** Auto-resolved by MAJOR #1. Optionally also add `->middleware('throttle:60,1')` on the route.

## Counts

- criticalFindings: 0 · majorFindings: 1 · minorFindings: 2 · retryCount: 1 (cap 3, not yet reached)
