# Backend / API / DB Verification Report — Minassati (منصاتي)

**Domain:** `backend-api-db-test`
**Phase:** testing-pipeline → backend-api-db-test
**Project root:** `C:/Users/drhab/OneDrive/Desktop/new-minasaati`
**Date:** 2026-07-09
**Retry count for this domain:** 0 (last remediation was `functional-test`; cap 3)
**Status this cycle:** PASS

---

## 1. Test-suite execution (re-verified)

```
$ cd backend && php artisan test
........................................                                     40 / 40 (100%)
Tests:    40 passed (164 assertions)
Duration: 29.56s
```

39 Feature + 1 Unit tests all green. Live MySQL on `127.0.0.1:3306` (`eduplatform_testing`).
The previously reported issues (CRITICAL #C1, MAJOR #M1, #M2, #M3) have all been
remediated and are now locked in by dedicated regression tests:

- `ComprehensiveExamPurchaseTest::test_purchase_writes_to_wallet_transactions_not_ghost_table`
  asserts (a) the `transactions` ghost table is absent, (b) the wallet ledger
  row is recorded in `wallet_transactions` with the correct `type='purchase'`,
  `balance_before/after`, and `status='completed'`, and (c) the user balance is
  actually debited.
- `ComprehensiveExamApiContractTest` (4 cases) asserts the unified envelope
  (`{success, message, data, code}`) on both happy and error paths including
  the `abort(403)` path inside `verifyOwnership` — proving the global
  `HttpExceptionInterface` renderable in `bootstrap/app.php` is doing its job.
- `StudentsWithViolationsN1Test` asserts the N+1 fix on
  `GET /api/admin/security/students-with-violations`: ≤ 5 queries for 5 students.
- `AcademicYearFilterTest` asserts `GET /api/courses` honours the academic-year
  filter for logged-in students.

## 2. Contract & behaviour audit (priority endpoints)

### Auth (`/api/auth/*`) — P0 — sound
- `register`: student-cap guard (`ERR_STUDENT_LIMIT` 403) intact; `DB::transaction` wraps the row insert + `temp_user_id` flush.
- `login`: `DB::transaction` wraps the prior-token purge + new token issue → single-active-session invariant holds.
- `verifyOtp`: token issued only after `otpService->verifyFirebaseToken` succeeds.
- `logout`: deletes only the current access token (correct).
- `me` — see MINOR #1.

### Wallet & Top-ups (`/api/wallet/*`, `/api/admin/wallet/*`) — P0 — sound
- `WalletService::{topUp, deduct, refund, completeTopupFromRequest, completeTopUp}` all use `DB::transaction(..., 3)` with `lockForUpdate` on the user (and on the `WalletTopupRequest` inside `completeTopupFromRequest`). Idempotency is enforced via `pending`-status re-check.
- `AdminWalletController::{approve, adjustAndApprove, decline}` use the same transaction + lock + service-layer invariants.
- `WalletConcurrencyTest::prevent_double_spending_when_purchasing_course` passes.
- `FawryController::webhook` verifies HMAC-SHA256, rejects amount tampering (`$paidAmount < $transaction->amount → 400`).
- `VodafoneCashController::webhook` verifies the shared secret before any state mutation. Both controllers have MINOR contract-drift issues (see #3).

### Video / VOD (`/api/video/*`, `/api/internal/webhooks/*`) — P0 — sound
- `VideoEngineController::handleWebhook` / `updateProgress` use `InternalJwtService::verify($bearer, '<event>', 120)` (HS256, per-event type binding, 2-min leeway).
- `startProcessing` issues a `video.process` JWT for the Go worker; `cancelUpload` (in `Admin\LectureController`) uses `Storage::disk('b2')->delete` directly as required by the VOD contract.
- `getPlaybackUrl` and `getEncryptionKey` enforce subscription + lecture-unlock + playback-session-id check; key returned as `application/octet-stream` (not JSON) per HLS spec.
- `VideoEngineTest` (8 cases) all green.

### Comprehensive exam (`/api/comprehensive-exams/*`) — P1 — sound
- The previous CRITICAL #C1 is fixed: `purchase` calls `walletService->deduct(...)` + `ComprehensiveExamPurchase::create([...])` inside a `DB::transaction(..., 3)` with `lockForUpdate` on the user. The double-spend check (`$lockedUser->wallet_balance < $price_points`) happens inside the lock. The `EXM-{id}-U{id}-{ts}` reference is stable and written to `wallet_transactions.reference` for audit.
- `submitExam` writes answers, computes the percentage, and updates the attempt all under a transaction with retry=3; late submissions are flagged `late_submission`.

### Other P1/P2
- `Student\CourseController::index` now correctly uses the filtered `$query` and passes through `CourseResource` (M3 fixed).
- `Admin\StudentProgressController::{index, show}` use `withCount` / `loadCount` / `loadSum` and eager-load `courses.lectures.{lectureProgresses, examAttempts}` to avoid N+1.
- `Admin\HomeworkController::storeOrUpdate` — see MINOR #2.

## 3. Migrations audit

All 33 migration files have a working `down()`. No irreversible migrations. `migrate:status` shows every migration in batch 1 with state "Ran" on the local MySQL 8 instance.

Arabic-string column types (per AGENTS.md §1) verified:
- `users.academic_year` = `enum('grade_7'..'grade_12','other')` ✓ (string values)
- `users.governorate` = `string` ✓
- `users.school` = `string` ✓
- `users.full_name` = `string` ✓
- `courses.academic_year` = `string` ✓ (matches the user enum on string)

## 4. Transactions audit (multi-step writes)

All financial multi-step writes are wrapped in `DB::transaction(..., 3)` with `lockForUpdate` on the user/row:
- `AuthController::register`, `login`
- `CourseService::purchaseCourse` (deduct + attach + audit log)
- `WalletService::{topUp, deduct, refund, completeTopupFromRequest, completeTopUp, completeTopUp}` + `cancelTransaction` (where applicable)
- `AdminWalletController::{approve, adjustAndApprove, decline}`
- `Student\CenterCodeController::redeem` (code lock + attach + mark used)
- `Admin\CenterCodeController::generate` (batch insert in one tx)
- `Student\ComprehensiveExamController::{purchase, submitExam}` (deduct + purchase row, or answers + attempt update)
- `Student\ExamController::submitExam` (attempt re-check + scoring + persist)

## 5. N+1 query audit

- `Admin\StudentProgressController::{index, show}` — `withCount` / `loadCount` / `loadSum` + eager-load chains.
- `Admin\StudentMonitoringController::index` — `chunk(100)` with bulk preloads.
- `AdminSecurityController::{violations, studentsWithViolations}` — both pre-load (`with(['user','lecture.course'])` for the first; single batched subquery for the second).
- `WalletService::getTransactions`, `getBalance` — no relations touched, no N+1 surface.
- `StudentsWithViolationsN1Test` locks the fix in.

No new N+1 patterns found.

## 6. Findings

### CRITICAL
None.

### MAJOR
None.

### MINOR

1. **`AuthController::me` and `Student\ExamController::myAttempts` still return the legacy envelope shape.**
   - `AuthController::me` (line 198-203) returns `{status:'success', data:{...}}` instead of `{success:true, message, data}`.
   - `Student\ExamController::myAttempts` (line 196) returns bare `{data: [...]}`, again missing `success` and `message`.
   - Both work for the current frontend (the client tolerates the legacy shape), but they break the project-wide envelope contract and will cause subtle parser bugs once the frontend tightens up its type guards.
   - **Fix:** wrap both with `ApiResponse::success(...)` (and pick a meaningful Arabic `message`).

2. **`FawryController` and `VodafoneCashController` pass integer status codes as the `code` argument to `ApiResponse::error`.**
   - Files: `backend/app/Http/Controllers/Payment/FawryController.php` (lines 33, 37, 41, 50) and `backend/app/Http/Controllers/Payment/VodafoneCashController.php` (lines 27, 36, 41, 47, 63).
   - `ApiResponse::error(string $message, string $code = 'ERR_INTERNAL', int $status = 400)` declares `string $code`; callers are passing e.g. `ApiResponse::error('Invalid signature', 401)`, so the resulting JSON has `"code": 401` (an integer) while every other error response uses a string like `"ERR_FORBIDDEN"`. PHP's loose coercion means it runs, but the type is wrong.
   - **Fix:** replace the integer literal with a
 string code (`'ERR_FAWRY_INVALID_SIGNATURE'`, `'ERR_FAWRY_MISSING_REFERENCE'`, etc.) and pass the HTTP status as the third argument.

3. **`Admin\HomeworkController::storeOrUpdate` is not wrapped in `DB::transaction`.**
   - File: `backend/app/Http/Controllers/Admin/HomeworkController.php` (lines 19-58).
   - On update, the old file is deleted from B2 *before* the new upload is attempted. If the new upload fails, the old file is gone and the row is unchanged but the title update also fails — the user re-uploads the new file and gets a different `public_id`. Because this is admin-only, non-financial, and recoverable (the admin can re-attach the file), it is MINOR not MAJOR.
   - **Fix:** wrap the delete-old + upload-new + row-update in a `DB::transaction`; on exception, schedule the B2 delete to retry (or move the delete to *after* the successful new upload + row update, using the old key from the pre-update row).

4. **`SCHEMA.md` is out of date.**
   - Lists `users.academic_year` as `int` (actual: enum string); `users.id_image_url` as `varchar(255)` (actual: `varchar(500)`); `users.id_image` description says "Local file path" (actual usage is a B2 object key). Carried over from the previous report — not a code defect, just documentation drift.
   - **Fix:** regenerate `SCHEMA.md` from `migrate:status --pretend` + `SHOW CREATE TABLE` per table.

---

## 7. Conclusion

All four prior blocking findings (CRITICAL #C1, MAJOR #M1/#M2/#M3) are fixed
and locked in by regression tests. The 40-test suite passes in ~30 s against
a real MySQL 8 instance. No new CRITICAL or MAJOR findings.

Remaining items are MINOR: two legacy envelope shapes in the Auth & Exam
controllers, the integer-as-`code` misuse in the two payment webhooks, the
un-wrapped admin-homework update path, and the stale `SCHEMA.md`. None of
these block a release, but they should be cleaned up in a follow-up.
