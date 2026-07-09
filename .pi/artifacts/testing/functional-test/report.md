# Functional Test Report — Minassati

## Automated Suite
- **PHPUnit (Laravel Feature + Unit)**: 40 passed, 164 assertions, 24.25s.
- **Go (VOD worker internal packages)**: api/handlers, auth, circuitbreaker, config — all PASS (full run timed out at 300s but every package that completed reported `ok`).

## Happy-Paths (code-traced)
- **P0 Auth**: register draft (`AuthController::register`), verify-otp (Firebase token path), login (with single-session token purge inside `DB::transaction`), logout, me, center-code redeem (with phone-restriction branch) — all match tests and contracts.
- **P0 Wallet/Payments**: topup initiate → next payment number (round-robin via Cache::increment), submit → `WalletTopupRequest` (pending), admin approve/adjust/decline — all use `DB::transaction` + `lockForUpdate`; Fawry & Vodafone webhooks verify HMAC / shared-secret + idempotency by `reference`.
- **P0 Video/VOD**: `getUploadToken` (B2 pre-signed PUT + storage-limit guard), `startProcessing` (POSTs JWT-Bearer to Go at `http://127.0.0.1:8080/api/v1/video/process` with `qualities` payload), `handleWebhook` (verifies `Bearer` JWT, validates `event=video.encoded` + 120s iat window), `getSecurePlaylist` (rewrites segment paths to B2 pre-signed URLs), `getEncryptionKey` (raw binary AES-128 key).
- **P1 Courses/Lectures/Progress**: `LecturePolicy::view` delegates to `User::hasUnlockedLecture` (strict-order chain, exam+homework gates, accumulator bypass). `LectureProgress` is the single source of truth.
- **P1 Exams & Homework**: `Student/ExamController::getExam` returns 200 with `data.examId`/`data.questions`, or 403 `ERR_MAX_ATTEMPTS`, or 403 from `Gate::authorize` (LecturePolicy).
- **P2 Community/Notifications/Admin Analytics**: routes exist and are auth-gated; covered indirectly by the unified-error-envelope test (envelope is in place).
- **P3 VOD worker health**: `/health` endpoint tested in `internal/api/handlers/health_test.go`.

## Error-Paths
- **Auth**: bad credentials → 401 `ERR_BAD_CREDENTIALS`; unverified phone → 403 `ERR_PHONE_UNVERIFIED`; device limit → 403 `ERR_DEVICE_*`; student limit reached → 403 `ERR_STUDENT_LIMIT`.
- **Wallet**: insufficient balance → `InvalidArgumentException('الرصيد غير كافٍ')` (caught at controller → 402 `ERR_INSUFFICIENT_BALANCE` for purchase path); no payment numbers → 400 `ERR_NO_PAYMENT_NUMBER`; already processed → 400 `ERR_ALREADY_PROCESSED`.
- **Webhook**: bad Fawry HMAC → 401; bad Vodafone shared-secret → 401; missing reference → 400; amount mismatch → 400; amount tampering in Fawry → 400 + Log::critical.
- **Video**: storage limit reached → 403 `ERR_STORAGE_LIMIT` (with Arabic message); view limit reached → 403 `ERR_VIEW_LIMIT_REACHED`; lecture locked → 403 `ERR_LECTURE_LOCKED`; video not ready → 400 `ERR_VIDEO_NOT_READY`; webhook missing/bad JWT → 403 `ERR_UNAUTHORIZED`.

## Regressions
None — all 40 previously-passing tests still pass.

## Invariants Verified
- **Arabic-string columns**: `users.full_name`, `users.school`, `users.governorate`, `users.parent_job`, `courses.academic_year` (added via `2026_07_06_120841`) — all `string`/`enum`, never `integer`.
- **Wallet DB-transaction invariant**: every mutating op (`topUp`, `deduct`, `refund`, `completeTopUp`, `completeTopupFromRequest`) wraps in `DB::transaction(..., 3)` (3 retries on deadlock), uses `lockForUpdate()` on both `User` and the transaction/request row, records `balance_before`/`balance_after`, and is immutable (FK `restrictOnDelete`).
- **No ghost tables**: `transactions` table does not exist; all ledger writes go to `wallet_transactions`.

## Findings

### CRITICAL
none

### MAJOR
none

### MINOR
- `VodafoneCashController::webhook` and `FawryController::webhook` call `ApiResponse::error('Unauthorized', 401)` / `error('Invalid signature', 401)` without a `code` argument — the unified-envelope renderer in `bootstrap/app.php` only sets `code` for `HttpExceptionInterface`; webhook errors therefore lack a `code` field. Suggested fix: pass `'ERR_UNAUTHORIZED'` / `'ERR_INVALID_SIGNATURE'` as the 3rd argument.
- `AuthController::register` returns HTTP 201 for a draft/pending record. Not strictly wrong but unconventional; a 202-Accepted would better signal "awaiting phone verification". No behavioural impact on tests.

## Summary
40/40 PHP tests pass, Go worker internal tests pass on all completed packages, every P0/P1 in-scope flow traced in source matches the documented contract, and the two critical invariants (Arabic-string column types, wallet DB-transaction) are honoured.
