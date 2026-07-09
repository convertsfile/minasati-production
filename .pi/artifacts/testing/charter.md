# Test Charter — Minassati (منصاتي)

> Locked by: `intake-scope-lock` phase (re-run)
> Date: 2026-07-09
> Project root (canonical, absolute): `C:/Users/drhab/OneDrive/Desktop/new-minasaati`

---

## 0. Project Snapshot

**Minassati (منصاتي)** is a multi-service Egyptian EdTech platform with a
monorepo layout. The "full project" the user requested covers **three
independently deployable services** plus operational infrastructure:

| # | Service            | Tech                                              | Path                |
|---|--------------------|---------------------------------------------------|---------------------|
| 1 | Backend API        | Laravel 12 · PHP 8.2+ · MySQL 8 · Sanctum JWT     | `backend/`          |
| 2 | Web Frontend       | Next.js 16 · React 19 · TypeScript (strict)       | `frontend/`         |
| 3 | VOD Engine Worker  | Go 1.25+ · FFmpeg · AWS S3 SDK · JWT              | `workers/vod-engine/`|
| 4 | Ops / Deployment   | systemd · Prometheus · Grafana · fstab · sysctl   | `deploy/`           |

Third-party integrations in scope: Twilio (SMS/OTP), InstaPay & Vodafone
Cash (manual payments + admin review), Backblaze B2 + Cloudflare CDN,
Laravel Reverb (WebSockets), Firebase (messaging, FCM), Pusher (client).

**Project root verified** via `realpath`, `ls -la`, presence of `AGENTS.md`,
`.git/`, `backend/composer.json`, `frontend/package.json`,
`workers/vod-engine/go.mod`, `.github/workflows/`.

---

## 1. Detected Tech Stack (data.techStack)

```
Laravel 12 (PHP 8.2+, MySQL 8, Sanctum 4) + Next.js 16 (React 19, TypeScript strict)
+ Go 1.25 (VOD engine, FFmpeg, AWS S3 SDK, JWT) + Twilio + Backblaze B2
+ Cloudflare CDN + InstaPay/Vodafone-Cash (manual w/ admin review) + Reverb WebSockets
+ Firebase (FCM) + Pusher + Playwright (E2E) + PHPUnit 11 (backend) + Sentry
```

Confirmed from config files in this run:
- `backend/composer.json` → `php ^8.2`, `laravel/framework ^12.0`,
  `laravel/sanctum ^4.0`, `laravel/reverb ^1.0`, `firebase/php-jwt ^7.0`,
  `kreait/laravel-firebase ^7.2`, `league/flysystem-aws-s3-v3 3.0`,
  `phpunit/phpunit ^11.5.3`, `laravel/pint ^1.24`.
- `frontend/package.json` → `next ^16.2.10`, `react 19.2.4`,
  `@playwright/test ^1.61.0`, `hls.js ^1.5.7`, `firebase ^12.15.0`,
  `pusher-js ^8.5.0`, `@sentry/node ^10.58.0`, `tailwindcss ^4`,
  `webpack-obfuscator ^3.6.1`, `javascript-obfuscator ^5.4.3`.
- `workers/vod-engine/go.mod` → `go 1.25.0`, `aws-sdk-go-v2 v1.41.7`,
  `golang-jwt/jwt/v5 v5.3.1`, `joho/godotenv v1.5.1`.

---

## 2. Dev Server Commands (data.devServerCommand)

Three services must be live for a full E2E pass; commands per service:

| Service        | Command (run from project root unless noted)                  | URL                  |
|----------------|----------------------------------------------------------------|----------------------|
| **Frontend**   | `cd frontend && npm run dev`  *(script: `next dev -p 3002`)*  | http://localhost:3002 |
| **Backend API**| `cd backend && php artisan serve --port=8000`                  | http://localhost:8000 |
| **Queue worker (backend)** | `cd backend && php artisan queue:listen --tries=1`     | n/a (background)     |
| **Reverb WS** (backend) | `cd backend && php artisan reverb:start`                | ws://127.0.0.1:8081   |
| **VOD Worker** | `cd workers/vod-engine && go run ./cmd/api`  *(entry: `cmd/api/main.go`)* | http://127.0.0.1:9000 |
| **VOD Worker (alt)** | `cd workers/vod-engine && go run ./cmd/upload`        | n/a (background)     |

The frontend `.env.local` pins `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api`
and `NEXT_PUBLIC_REVERB_*` to `127.0.0.1:8081` — that is the wiring later
phases must assume. The backend `.env` exposes `APP_URL=http://localhost:8000`,
`REVERB_HOST=127.0.0.1`, `REVERB_PORT=8081`, `SANCTUM_STATE_DURATION=525600`
(i.e. ~1 year token TTL — relevant to single-session revocation).

`backend/start-server.ps1` already exists for Windows convenience. The
PowerShell helper sets `upload_max_filesize=1500M`, `post_max_size=1500M`,
`memory_limit=2048M` — required for the lecture-upload path.

---

## 3. Existing Test Coverage (don't assume a blank slate)

### Backend — PHPUnit 11 (in `backend/tests/`)
- `Feature/Auth/RegistrationTest.php` — register/verify-OTP/lockout paths
- `Feature/Course/CenterCodeTest.php` — center-code redeem + admin generation
- `Feature/Course/HomeworkAndRestrictionsTest.php` — homework submit, gating
- `Feature/Course/AcademicYearFilterTest.php` — academic-year filtering
- `Feature/Exam/ExamEngineTest.php` — exam lifecycle, attempt scoring
- `Feature/Video/VideoEngineTest.php` — upload ticket + webhook ingest
- `Feature/Wallet/WalletConcurrencyTest.php` — concurrent top-up safety
- `Feature/Admin/StudentsWithViolationsN1Test.php` — N+1 query guard on
  admin students-with-violations listing
- `Feature/ComprehensiveExam/ComprehensiveExamApiContractTest.php` — contract
  tests for comprehensive-exam endpoints
- `Feature/ComprehensiveExam/ComprehensiveExamPurchaseTest.php` — purchase
  flow, throttle, and balance integrity
- `Unit/ExampleTest.php` — placeholder

CI: `.github/workflows/laravel.yml` runs `php artisan test` against MySQL 8
service container on push/PR.

### Frontend — Playwright 1.61 (in `frontend/e2e/`)
- `admin.spec.ts` — admin flows
- `security.spec.ts` — anti-piracy / blocked / waiting-room
- `student-flows.spec.ts` — student browsing, courses, lectures
- `wallet-payment.spec.ts` — wallet top-up happy path
- `playwright.config.ts` — baseURL `http://localhost:3002`, chromium only

CI: `.github/workflows/nextjs.yml` runs `npm ci`, `npm run lint`,
`npm run typecheck` (does NOT yet run `npm test` → Playwright).

### Workers — Go (in `workers/vod-engine/internal/...`)
- `internal/api/handlers/health_test.go`
- `internal/auth/jwt_test.go`
- `internal/circuitbreaker/circuitbreaker_test.go`
- `internal/config/config_test.go`
- `internal/encoding/pipeline_test.go`
- `internal/encoding/upload_test.go`
- `internal/guardian/guardian_test.go`
- `internal/guardian/predictive_test.go`
- `internal/logging/correlation_test.go`
- `internal/metrics/metrics_test.go`
- `internal/metrics/textfile_test.go`
- `internal/monitor/monitor_test.go`
- `internal/telemetry/telemetry_test.go`
- `internal/watchdog/watchdog_terminate_test.go`
- `internal/watchdog/watchdog_test.go`
- `internal/worker/pool_test.go`
- `cmd/trigger/trigger_test.go`

No CI workflow for Go yet (`.github/workflows/` only has `laravel.yml`
and `nextjs.yml`).

### Coverage gaps immediately visible
1. No Go CI workflow at all.
2. Frontend CI runs lint+typecheck but skips Playwright execution.
3. No frontend component tests (Jest/Vitest) — only E2E.
4. No static quality gate (PHPCS/Pint) enforced in CI for backend.
5. WalletService, OtpService, CourseService, PlanService, NotificationService,
   PaymentNumberService, DeviceManagerService, FileUploadService have **no
   dedicated unit tests** beyond what the feature tests exercise transitively.

### Prior-run artifacts in `.pi/artifacts/testing/`
- `static-quality-gate/report.md` (Jul 9 08:31) — historical baseline
- `functional-test/report.md` (Jul 9 09:34) — historical baseline
- `backend-api-db-test/report.md` (Jul 9 09:41) — historical baseline
Downstream phases may consult these for context but must re-run gates
fresh; cache values must not be treated as current.

---

## 4. In-Scope Routes / Endpoints / Pages (ranked by priority)

The full route surface is declared in `backend/routes/api.php` (316 lines,
~60 endpoints) and `frontend/app/**` (34 page routes). The list below
ranks by **business-critical × financial × security risk**.

### P0 — Auth & Identity (security-critical, blocks every flow)
- `POST /api/auth/register` (throttle 5/min)
- `POST /api/auth/login` (throttle `login_secure`)
- `POST /api/auth/verify-otp` (throttle 5/min, Twilio)
- `POST /api/auth/resend-otp` (throttle 3/min)
- `GET  /api/auth/me` (sanctum)
- `GET  /api/auth/status` · `POST /api/auth/logout` · `POST /api/auth/resubmit-documents`
- `POST /api/center-codes/redeem` (throttle 10/min)
- Frontend pages: `/login`, `/otp`, `/register`, `/redeem`, `/blocked`,
  `/locked`, `/waiting-room`, `/resubmit`
- Single-active-session enforcement (Sanctum token rotation per AGENTS.md).

### P0 — Wallet & Payments (financial-critical, must be airtight)
- `GET  /api/wallet/balance` · `GET /api/wallet/transactions`
- `POST /api/wallet/topup/initiate` (throttle `financial_ops`)
- `POST /api/wallet/topup/submit` (throttle `financial_ops`)
- `GET  /api/wallet/topup/history`
- Admin: `GET/POST /api/admin/wallet/topups*` approve/adjust/decline
- Admin: `GET /api/admin/wallet/summary|stats|transactions|subscriptions`
- Admin: `GET/POST/PATCH/DELETE /api/admin/payment-numbers` (InstaPay & VF rotation)
- Webhooks: `POST /api/webhooks/fawry`, `POST /api/webhooks/vodafone-cash`
- Frontend: `/wallet` (student), `/admin/topups`, `/admin/payment-numbers`,
  `/admin/stats/finance`
- **Race condition** safety on `WalletService` (existing concurrency test is
  the baseline — must be expanded to cover initiate+approve+decline combos).

### P0 — Video / VOD (data-integrity & cost-critical)
- `GET  /api/admin/lectures/{lecture}/upload-ticket`
- `POST /api/admin/lectures/{lecture}/start-processing`
- `POST /api/internal/webhooks/video-encoded` (JWT-protected)
- `POST /api/internal/webhooks/lectures/{lecture}/progress`
- `DELETE /api/admin/lectures/{lecture}/video` · `POST .../cancel-upload`
- Student: `GET /api/violations/count`
- Admin: security violations list, block/unblock student, delete violations
- Frontend: `SecureVideoPlayer` (HLS via `hls.js`, AES-128, watermarking,
  screenshot detection — see `frontend/components/SecureVideoPlayer.tsx`)
- VOD Worker: `cmd/api/main.go` → FFmpeg pipeline, S3 multipart, HLS
  manifest, AES key upload, watermarking, capacity guard, watchdog,
  idempotency. Additional worker entrypoints: `cmd/upload`, `cmd/trigger`,
  `cmd/test-upload`.
- **Domain rules to verify**: idempotent encoding, bounded stderr buffers,
  guardian.go resource guard, systemd cgroup limits.

### P1 — Courses / Lectures / Progress (core user flow)
- `GET  /api/courses` (public) · `GET /api/courses/{course}` (public)
- `GET  /api/courses/my-courses` · `GET /api/courses/lectures`
- `POST /api/courses/{course}/purchase` (throttle `financial_ops`)
- `GET  /api/lectures/{lecture}/progress` (LectureProgressController)
- `GET  /api/lectures/{lecture}` · `GET /api/video/playback/{lecture}`
- Admin: `apiResource courses` + `apiResource lectures` + reorder + attachments
- Frontend: `/courses`, `/courses/[id]`, `/lectures/[id]`, admin
  `/admin/courses`, `/admin/courses/[id]/lectures`, `/admin/plan`

### P1 — Exams & Homework
- `GET/POST /api/lectures/{lecture}/exam` · `POST /api/lectures/{lecture}/exam/{exam}/submit`
- `GET /api/exams/my-results` · `GET /api/exams/attempts/{attempt}`
- Comprehensive exams: `available` · `show` · `purchase` · `startExam` · `submit`
- Homework: `POST /api/lectures/{lecture}/homework/submit` (throttle 10/min) ·
  `GET .../homework/status`
- Admin: exam CRUD, question CRUD, question-image upload, reorder, unlock
  student, reset attempts, monitoring, attempt review
- Frontend: `/exams/[id]`, `/admin/courses/[id]/exams`,
  `/admin/courses/[id]/comprehensive-exams`, `/admin/homework`,
  `/admin/monitoring`

### P2 — Community & Notifications
- `GET/POST/DELETE /api/forum/*` (post throttle 5/min)
- Admin forum: list / reply / update / delete
- `GET/POST /api/notifications*` (mark read, mark-all-read)
- Frontend: `/forum`, `/admin/forum`

### P2 — Admin Analytics
- `/api/admin/student-progress` (list + show per user)
- `/api/admin/security/*`
- `/api/admin/limits` (Settings)
- `/api/settings` · admin `GET/PUT /api/admin/settings`
- Frontend: `/admin`, `/admin/students`, `/admin/pending-students`,
  `/admin/security`, `/admin/stats/courses`, `/admin/settings`

### P3 — Operational / Health (VOD worker)
- VOD worker endpoints (`/healthz`, `/metrics`, `/readyz`, upload/process
  internal) — to be enumerated from `cmd/api/main.go` during execution.
- Worker Prometheus textfile metrics, watchdog, guardian capacity guard.

---

## 5. Explicit Scope Exclusions / "Do Not Break" Notes

- **Manual-payment business rule** (per AGENTS.md): no automatic InstaPay/VF
  confirmation. Admin must review screenshot proof. Tests must assert this
  flow exists, not bypass it.
- **Arabic-string columns** (per AGENTS.md): grade-level ("الاول الابتدائي"),
  governorate ("القاهرة") and similar user-input strings must be `varchar`,
  not `int`. Any DB-migration review must check this.
- **Wallet integrity**: every balance mutation goes through DB transactions,
  1 EGP = 1 point. Tests must assert no `User::increment` shortcut.
- **Idempotency** of video encoding AND wallet transactions.
- **Out of scope** (do not auto-test in this run):
  - Real Twilio/Cloudflare/B2/Fawry/InstaPay/VF/Pusher external calls.
    Tests must mock these.
  - Live payment-gateway webhooks; the existing webhook endpoints
    (`/webhooks/fawry`, `/webhooks/vodafone-cash`) will be tested with
    signed-payload fakes, never against real gateways.
  - Production deployment scripts in `deploy/`. The `rollback-*.sh` scripts
    are documented but **not** executed as part of this test pipeline.
  - Real Sentry, real Firebase Cloud Messaging fan-out.

---

## 6. Production-Readiness Check Targets (downstream phases will exercise)

These are the gates the rest of the pipeline (static-quality-gate, design-
ux-audit, integration-tests, e2e-execution, security-scan, code-review,
build-deploy-readiness) will each attack:

1. **Static quality** — PHPStan/Pint (backend), ESLint+tsc (frontend), `go
   vet` + `staticcheck` (worker). Lockfiles present: `composer.lock`,
   `package-lock.json` + `pnpm-lock.yaml` (mismatch — pick one),
   `go.sum`.
2. **DB & migrations** — `php artisan migrate:fresh --seed` against MySQL 8
   must succeed; `schema.sql` and the `database/database.sqlite` fallback
   must be coherent with `SCHEMA.md`.
3. **Backend integration** — full PHPUnit suite green on a real MySQL test
   database (CI uses `eduplatform_testing`).
4. **Frontend build** — `next build` succeeds (Next.js 16 with `node_modules
   /next/dist/docs/` — **breaking changes vs prior Next versions**, per
   `frontend/AGENTS.md`).
5. **Frontend E2E** — Playwright suite green against the dev stack.
6. **Worker unit + integration** — at least `go test ./...` for the
   non-FFmpeg packages (`internal/api`, `internal/auth`,
   `internal/circuitbreaker`, `internal/config`, `internal/encoding`,
   `internal/guardian`, `internal/logging`, `internal/metrics`,
   `internal/monitor`, `internal/telemetry`, `internal/watchdog`,
   `internal/worker`).
7. **Security** — Sanctum token rotation, throttle middleware, role
   middleware (`admin`, `active_user`), webhook JWT, CSP headers,
   obfuscation (`webpack-obfuscator`, `javascript-obfuscator` — verify
   enabled in `next.config.ts`), screenshot-detection on the secure
   player.
8. **Operational** — `deploy/systemd/vod-engine.service` valid;
   Prometheus scrape config; Grafana dashboard JSON valid; fstab, sysctl,
   logrotate, udev, tmpfiles.d syntactically valid.
9. **Observability** — Sentry wiring (`@sentry/node`), Reverb on 8081,
   Pusher key, Firebase FCM credentials all present (redacted/secrets
   removed from VCS).

---

## 7. Test Artifacts Location

All downstream phase artifacts (static-quality reports, design audit
screenshots, integration test logs, e2e traces, security findings, review
notes, build logs) land under:
```
<projectRoot>/.pi/artifacts/<phase>/...
```
This charter itself lives at:
```
<projectRoot>/.pi/artifacts/testing/charter.md
```

---

## 8. Final State

- Project root: **resolved, canonicalized, verified.**
- Stack: **detected and re-confirmed from composer.json / package.json / go.mod.**
- Dev servers: **catalogued with exact commands and ports.**
- Existing coverage: **surveyed; gaps named; new test files since prior
  charter noted (ComprehensiveExam, AcademicYear, Admin N+1, additional
  Go worker suites).**
- Scope: **ranked P0–P3; explicit exclusions stated.**
- Charter: **refreshed and verified at the path above.**

Status emitted: **SCOPE_LOCKED**. Downstream phases may now begin.
