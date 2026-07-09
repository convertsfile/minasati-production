# Backend API Inventory — Minassati (منصاتي) NEW BACKEND

**Project root:** `C:/Users/drhab/OneDrive/Desktop/new-minasaati`
**Stack confirmed:** Laravel 12 (PHP 8.2+) + Sanctum 4 + Reverb 1 + `kreait/laravel-firebase` 7 + `league/flysystem-aws-s3-v3` (Backblaze B2 / S3-compatible) + Go 1.25 VOD engine (FFmpeg, HLS, AES-128, JWT)
**Source of truth (read directly, no formal OpenAPI spec exists in the repo):**
- `backend/routes/api.php` (the only API route file)
- `backend/app/Http/Controllers/**` (every controller)
- `backend/app/Http/Resources/**` (JSON shaping)
- `backend/app/Http/Requests/**` (validation)
- `workers/vod-engine/cmd/api/main.go` and `workers/vod-engine/internal/api/handlers/*.go` (Go HTTP surface, called by Laravel)
**Authoritative contract version:** 2.0 (regenerated 2026-07-09)
**Read every byte of this file with zero assumptions.** Field names, status codes, and the response envelope were all read from the source. Any line labelled "DEAD" was verified by `grep` for the method name and was not found.

---

## 0. Response Envelope (READ FIRST — applies to every JSON response)

`App\Http\Responses\ApiResponse` is the only standard envelope. Every controller routes through it (with a few known exceptions called out per-row).

**Success:**
```json
{ "success": true, "message": "<arabic string>", "data": <T | null> }
```

**Error (uniform):**
```json
{ "success": false, "message": "<arabic string>", "code": "ERR_XXX_YYY", "errors": <object|null> }
```

**Paginated (used by ~70 % of list endpoints):**
```json
{
  "success": true,
  "message": "...",
  "data": [ ...items... ],
  "meta": { "total": int, "current_page": int, "per_page": int, "last_page": int }
}
```

**Auth:** every protected route uses `auth:sanctum` bearer token unless marked `public`. The student-role group additionally has the `active_user` middleware (instantly kicks admins-blocked students, even mid-session).

**Field naming:** responses are **camelCase**, **except for three documented legacy holdovers** (see §32 item 3) — frontend must read both casings defensively.

**`isAdmin` field is for UI rendering only** — never use it on the frontend for authorization; the server is the source of truth.

**`restrict_to_internal_ips` middleware on `/api/metrics`** returns **404 (not 403)** to non-allowlisted IPs so a port scan cannot discover the endpoint. Do not 404-handle the metrics path on the frontend; treat it as missing.

---

## 1. Health, Metrics, Realtime (4 endpoints + 2 WS channels + 1 back-compat)

| # | Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|---|
| 1 | GET | `/up` | public | — | HTML 200 (Laravel default) | Legacy liveness — kept for back-compat with whatever LB points at it. Do not parse. |
| 2 | GET | `/api/health/live` | public | — | `{status:"live", service, timestamp:"<ISO8601>"}` 200 | Liveness — process up, no DB ping. |
| 3 | GET | `/api/health/ready` | public | — | `{status:"ready"\|"degraded", service, timestamp, checks:{database,cache,queue,storage}, failed, optional}` 200/503 | Readiness — pings MySQL, cache, queue, B2. B2 is **optional** (its absence in local/test → 200). Any required dep down → 503. |
| 4 | GET | `/api/metrics` | `restrict_to_internal_ips` + `throttle:60,1` | — | Prometheus text exposition `text/plain; version=0.0.4; charset=utf-8` 200 | Non-allowlisted IPs get **404** (existence hidden). Default allowlist: 127.0.0.1, 10/8, 172.16/12, 192.168/16. |
| 5 | POST | `/api/broadcasting/auth` | `auth:sanctum` | Pusher protocol (channel + socket_id) | standard Pusher auth response | Registered by `Broadcast::routes(['middleware'=>['auth:sanctum'],'prefix'=>'api'])`. |
| — | WS | `private-App.Models.User.{id}` | `auth:sanctum` | — | — | Reverb/Echo channel; auth callback: `(int)user.id === (int)id`. |
| — | WS | `private-lecture.{id}` | `auth:sanctum` | — | — | Reverb/Echo channel; auth callback: any authenticated user. Carries `VideoProcessingProgress` event with `{lectureId:int, phase:string, percent:int}`. |

---

## 2. Auth (8 endpoints — 2 DEAD)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 6 | POST | `/api/auth/register` | public + `throttle:5,1` | multipart: `full_name, email, phone (01x format), parent_phone (different from phone), password + password_confirmation, academic_year ("الاول الاعدادي"…"الثالث الثانوي" or `grade_7`…`grade_12`/`other`), student_number, school, parent_job, governorate, id_image (jpg/png/webp ≤ 5 MB)` | `{success,message,data:{tempUserId:"TMP-XXXXXXXX-TS", message}}` 201 / 403 `ERR_STUDENT_LIMIT` (plan cap reached) / 422 `ERR_FILE_UPLOAD` | — |
| 7 | POST | `/api/auth/login` | public + `throttle:login_secure` | `{email, password, device_id}` | `{success,message,data:{user:UserResource, token:"<sanctum-plaintext>"}}` 200 / 401 `ERR_BAD_CREDENTIALS` / 403 `ERR_PHONE_UNVERIFIED` / 403 `ERR_DEVICE_LIMIT_REACHED` / 403 `ERR_DEVICE_MONTHLY_LIMIT` | — |
| 8 | POST | `/api/auth/verify-otp` | public + `throttle:5,1` | `{temp_user_id, firebase_token}` | `{success,message,data:{user:UserResource, token}}` 200 / 404 `ERR_USER_NOT_FOUND` / 422 `ERR_VERIFICATION_FAILED` | — |
| 9 | POST | `/api/auth/resend-otp` | public + `throttle:3,1` | `{temp_user_id}` | `{success,message,data:null}` 200 | — |
| 10 | GET | `/api/auth/me` | `auth:sanctum` | — | `{status:"success", data:UserResource}` 200 (uses raw `response()->json`, not the standard envelope) | — |
| 11 | GET | `/api/auth/status` | `auth:sanctum` + `active_user` | — | **DEAD ROUTE** — `AuthController::status()` does not exist. Laravel will return 500. The ResubmitRequest.php form-request is unused. | — |
| 12 | POST | `/api/auth/logout` | `auth:sanctum` + `active_user` | — | `{success,message,data:null}` 200 | — |
| 13 | POST | `/api/auth/resubmit-documents` | `auth:sanctum` + `active_user` | multipart: `id_image` | **DEAD ROUTE** — `AuthController::resubmit()` does not exist. 500. | — |

> **Sanctum invariant:** every successful login wipes **all** the user's prior `personal_access_tokens` (single active session). Frontend should never store more than one token per user. The same wipe happens on: `POST /admin/users/{user}/reset-password`, `POST /admin/security/block-student/{user}`, and auto-block at 3 fatal video violations. Any 401 after a brief lull = "session ended, redirect to login" — do not retry with the stale token.

> **`active_user` middleware** is the *kill switch* — any student with `status='blocked'` gets 403 on every protected route, instantly.

---

## 3. Public Course Browse (2)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 14 | GET | `/api/courses` | public (sanctum-aware — auth optional) | optional `?academic_year=&status=` | `{success,message,data:[CourseResource]}` 200. Items: `{id, title, description, pricePoints, academicYear, validityDate, status, isPublished, isStrictOrder, thumbnailUrl, createdAt, isPurchased, lecturesCount, studentsCount, lectures?}` | — |
| 15 | GET | `/api/courses/{course}` | public | `course:int` | `{success,message,data:CourseResource}` 200 / 404 `ERR_COURSE_HIDDEN` if not `published` (for non-admins) | — |

> `isPurchased` is `false` for unauthenticated guests and computed live via `auth('sanctum')->user()`.

---

## 4. Student — My Courses, Lectures, Purchase (4 — 1 DEAD)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 16 | GET | `/api/courses/my-courses` | `auth:sanctum` + `active_user` | — | `{success,message,data:[CourseResource]}` 200 | — |
| 17 | GET | `/api/courses/lectures` | `auth:sanctum` + `active_user` | — | **DEAD ROUTE** — `StudentCourseController::getCourseLectures()` does not exist. Use `GET /api/courses/{course}` instead. | — |
| 18 | GET | `/api/lectures/{lecture}` | `auth:sanctum` + `active_user` | `lecture:int` | `{success,message,data:LectureResource}` 200. `streaming.hlsUrl` & `streaming.videoUrl` are **1-hour signed B2 URLs**, only present if `Gate::allows('view', $lecture)`. | — |
| 19 | POST | `/api/courses/{course}/purchase` | `auth:sanctum` + `active_user` + `throttle:financial_ops` | `course:int` | `{success,message,data:{courseId, newBalance}}` 201 / 400 `ERR_COURSE_PURCHASE` (insufficient balance / already owned) | — |

---

## 5. Video Playback (3 — HLS streaming core)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 20 | GET | `/api/video/playback/{lecture}` | `auth:sanctum` + `active_user` | `lecture:int` | `{success,message,data:{lectureId, status, playbackUrl:"/api/video/secure-playlist/{id}?session_id=<40-char>", watermark:"<fullName> - <phone>"}}` 200 / 403 `ERR_UNAUTHORIZED` (not enrolled) / 403 `ERR_LECTURE_LOCKED` / 403 `ERR_VIEW_LIMIT_REACHED` / 400 `ERR_VIDEO_NOT_READY` | — |
| 21 | GET | `/api/video/secure-playlist/{lecture}` | `auth:sanctum` + `active_user` | `?session_id=<40-char>&variant=<rel-path>` | **Binary `application/vnd.apple.mpegurl` M3U8** (200) — **not JSON**. Re-signs each `.ts` segment (5 min TTL) and rewrites `#EXT-X-KEY:URI=` to relative `/api/video/key/{id}?session_id=...`. | — |
| 22 | GET | `/api/video/key/{lecture}` | `auth:sanctum` + `active_user` | `?session_id=<40-char>` | **Binary `application/octet-stream`** AES-128 key (200). Detects hex vs base64; 400 on missing/invalid key, 403 on bad session. | — |

> **Playback session model:** every `getPlaybackUrl` call mints a new 40-char `session_id` stored in cache for 120 min; old sessions are invalidated. Frontend MUST rotate `session_id` between viewing sessions — concurrent playbacks of the same lecture will fail with 403 `Session Expired or Invalid`.

---

## 6. Lecture Progress + Violations (4)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 23 | GET | `/api/lectures/{lecture}/progress` | `auth:sanctum` + `active_user` | — | `{success,message,data:{watchTime:float, isCompleted:bool, viewsCount:int, maxViews:int\|null, isUnlocked:bool}}` 200 | — |
| 24 | POST | `/api/lectures/{lecture}/progress` | `auth:sanctum` + `active_user` | `{watch_time:float≥0, total_duration:float≥1, stream_id?:string}` | `{success,message,data:{isCompleted, watchTime}}` 200. Server-side zero-trust: detects >2× playback speed (403 `ERR_SPEED_HACK`); marks complete at ≥90 %; locks out other windows (409 `ERR_STREAM_CONFLICT`). | — |
| 25 | POST | `/api/lectures/{lecture}/violation` | `auth:sanctum` + `active_user` | `{violation_type:"screenshot"\|"screen_recording"\|"devtools"\|"tab_switch"}` | `{success,message,data:{fatalStrikes, shouldBlock, isWarningOnly, warningMessage?}}` 200. `tab_switch` is **not persisted**. At 3 fatal strikes the user is **hard-blocked server-side** (token destroyed → next request 401). | — |
| 26 | GET | `/api/violations/count` | `auth:sanctum` + `active_user` | — | `{success,message,data:{fatalStrikes, analyticsWarnings, isBlocked, maxStrikes}}` 200 | — |

---

## 7. Exams — Per-Lecture (4 — 1 DEAD)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 27 | GET | `/api/exams/my-results` | `auth:sanctum` + `active_user` | — | **`{data:[{id, lectureId, courseTitle, lectureTitle, formIndex, score, passed, completedAt}]}`** — uses raw `response()->json`, **NOT the standard envelope**. Be defensive. | — |
| 28 | GET | `/api/exams/attempts/{attempt}` | `auth:sanctum` + `active_user` | `attempt:int` | **DEAD ROUTE** — `StudentExamController::getAttemptDetails()` does not exist. | — |
| 29 | GET | `/api/lectures/{lecture}/exam` | `auth:sanctum` + `active_user` | — | `{success,message,data:{examId, title, instructions, durationMinutes, attemptsRemaining, questions:[{id, body, options, questionType, imageUrl, points}]}}` 200 / 403 `ERR_MAX_ATTEMPTS` / 404 `ERR_NO_EXAM`. **Correct answers STRIPPED before send** (anti-cheat). | — |
| 30 | POST | `/api/lectures/{lecture}/exam/{exam}/submit` | `auth:sanctum` + `active_user` | `{exam_id:int, answers:{question_id: selected_answer}}` | `{success,message,data:{score:int, passed:bool, passScore, showAnswers, correction?:[{question_id, student_answer, is_correct}]}}` 200 / 403 `ERR_MAX_ATTEMPTS`. Server-side grading. | — |

> Unrouted helper: `GET /api/lectures/{lecture}/history` is implemented as `ExamController::history` but is **not registered** in `routes/api.php`. Do not rely on it.

---

## 8. Comprehensive Exams — Student (4 — 1 DEAD)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 31 | GET | `/api/comprehensive-exams/available` | `auth:sanctum` + `active_user` | — | `{success,message,data:[{id, title, course_title, price_points, duration_minutes, pass_score, start_time, end_time, is_purchased}]}` 200. **Field names are snake_case** (legacy holdover). | **NEW** |
| 32 | GET | `/api/comprehensive-exams/{id}` | `auth:sanctum` + `active_user` | `id:int` | **DEAD ROUTE** — `StudentComprehensiveExamController::show()` does not exist. | **NEW** |
| 33 | POST | `/api/comprehensive-exams/{id}/purchase` | `auth:sanctum` + `active_user` | `id:int` | `{success,message,data:{comprehensive_exam_id, amount_paid, new_balance, wallet_transaction_id}}` 201 / 400 `ERR_EXAM_ALREADY_OWNED` / 402 `ERR_INSUFFICIENT_BALANCE`. **Idempotent** — duplicate request returns `{data:{already_owned:true}}` 200. | **NEW** |
| 34 | POST | `/api/comprehensive-exams/{id}/start` | `auth:sanctum` + `active_user` | `id:int` | `{success,message,data:{attempt_id, exam:{title, duration_minutes, ends_at, end_time_absolute}, questions:[{id, type, body, image_url, points, options:[{id, text, image}]}]}}` 200 / 403 `ERR_EXAM_NOT_STARTED` / 403 `ERR_EXAM_ENDED` / 403 `ERR_EXAM_MAX_ATTEMPTS`. Options carry `original_index` for round-trip. | **NEW** |
| 35 | POST | `/api/comprehensive-exams/{id}/attempts/{attemptId}/submit` | `auth:sanctum` + `active_user` | `{answers:[{question_id, answer:number[], text?:string}]}` | `{success,message,data:{status:"delayed"\|"needs_review"\|"graded", score?, is_passed?}}` 200 / 400 `ERR_ATTEMPT_ALREADY_SUBMITTED`. Late submission → `status:"late_submission"`. | **NEW** |

> The entire **comprehensive-exams** surface is brand new — the old frontend has nothing equivalent. Greenfield for porting. Also note that **availableExams, startExam, and submitExam all use snake_case** field names internally while the rest of the platform uses camelCase — see §32 item 3.

---

## 9. Homework — Student (2)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 36 | POST | `/api/lectures/{lecture}/homework/submit` | `auth:sanctum` + `active_user` + `throttle:10,1` | multipart: `file` (pdf\|jpg\|png\|webp ≤ 20 MB) | `{success,message,data:{submissionId, status:"pending"}}` 201 / 400 `ERR_HOMEWORK_EXISTS` if already pending/approved / 404 `ERR_NO_HOMEWORK` / 500 `ERR_UPLOAD_FAILED` | — |
| 37 | GET | `/api/lectures/{lecture}/homework/status` | `auth:sanctum` + `active_user` | — | `{success,message,data:{homework:{id,title,fileUrl:"<signed B2 5 min>"}, submission?:{id,status,fileUrl:"<signed B2 5 min>",rejectionReason,score,submittedAt}}}` 200 / 200 with `data:null` if no homework | — |

---

## 10. Forum — Student (3)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 38 | GET | `/api/forum` | `auth:sanctum` + `active_user` | — | Paginated 15/page. Each: `{id, body, imageUrl:"<signed B2 5 min>", authorName, isOwn, adminReply, repliedAt, createdAt}`. **Scope: posts in the student's own `academic_year` only.** | — |
| 39 | POST | `/api/forum` | `auth:sanctum` + `active_user` + `throttle:5,1` | `{body:5..5000, image?:file (jpg/png/webp ≤ 5 MB)}` | `{success,message,data:{id, body, imageUrl}}` 201 / 500 `ERR_UPLOAD_FAILED` | — |
| 40 | DELETE | `/api/forum/{post}` | `auth:sanctum` + `active_user` | `post:int` | `{success,message,data:null}` 200 / 403 `ERR_UNAUTHORIZED` (only owner) | — |

---

## 11. Notifications — Student (3)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 41 | GET | `/api/notifications` | `auth:sanctum` + `active_user` | — | `{success,message,data:{notifications:[{id, type, title, message, isRead, createdAt}], unreadCount, pagination:{total, currentPage, lastPage}}}` 200. Paginated 20/page. | — |
| 42 | POST | `/api/notifications/{notification}/read` | `auth:sanctum` + `active_user` | `notification:int` | `{success,message,data:null}` 200 / 403 `ERR_UNAUTHORIZED` (owner only) | — |
| 43 | POST | `/api/notifications/mark-all-read` | `auth:sanctum` + `active_user` | — | `{success,message,data:null}` 200 | — |

---

## 12. Settings — Student (1)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 44 | GET | `/api/settings` | `auth:sanctum` + `active_user` | — | `{success,message,data:{whatsappNumber:"201000000000"}}` 200 | — |

> Shares the `Admin\SettingsController::get` method. The student-side surface is just the WhatsApp number today.

---

## 13. Wallet — Student (5)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 45 | GET | `/api/wallet/balance` | `auth:sanctum` + `active_user` | — | `{success,message,data:{balance:int}}` 200 | — |
| 46 | GET | `/api/wallet/transactions` | `auth:sanctum` + `active_user` | `?limit=20&offset=0` | `{success,message,data:[WalletTransactionResource]}` 200. Shape: `{id, type, amount, balanceBefore, balance_After (legacy snake_case), reference, paymentMethod, description, status, metadata, createdAt}` | — |
| 47 | GET | `/api/wallet/topup/history` | `auth:sanctum` + `active_user` | `?limit=10` | Paginated `[{id, amount, verifiedAmount, paymentMethod, status, adminNotes, createdAt, reviewedAt, student:{id,fullName,phone,parentPhone,email,walletBalance}, paymentNumber:{number,provider}, reviewer?:{id,fullName}}]` 10/page. | — |
| 48 | POST | `/api/wallet/topup/initiate` | `auth:sanctum` + `active_user` + `throttle:financial_ops` | `{provider:"instapay"\|"vodafone_cash"}` | `{success,message,data:{provider, paymentNumber:"<phone/ipn>", instructions:[string, ...]}}` 200 / 400 `ERR_NO_PAYMENT_NUMBER` | — |
| 49 | POST | `/api/wallet/topup/submit` | `auth:sanctum` + `active_user` + `throttle:financial_ops` | multipart: `provider, amount:int≥1, proof_image (jpg/png/webp ≤ 5 MB)` | `{success,message,data:{requestId, status:"pending"}}` 201 / 400 `ERR_NO_PAYMENT_NUMBER` / 500 `ERR_UPLOAD_FAILED` | — |

> Unrouted helper: `WalletTopupController::status()` is implemented but **not routed**. Use `topup/history` instead.

> **`balance_After` is intentionally snake_case** (the `WalletTransactionResource` has both `balanceBefore` AND `balance_After` — this is a real bug in the backend, kept for backward compatibility). Read both casings defensively.

---

## 14. Center Codes — Student (1)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 50 | POST | `/api/center-codes/redeem` | `auth:sanctum` + `active_user` + `throttle:10,1` | `{code:"XXXX-XXXX-XXXX"}` | `{success,message,data:{message, course:{id,title}}}` 200 / 404 `ERR_INVALID_CODE` / 400 `ERR_CODE_ALREADY_USED` / 403 `ERR_CODE_UNAUTHORIZED` (phone mismatch) / 400 `ERR_ALREADY_HAS_ACCESS` / 500 `ERR_REDEMPTION_FAILED` | — |

---

## 15. Admin — User Management (7)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 51 | GET | `/api/admin/users` | `auth:sanctum` + `admin` | `?status=&academic_year=&search=&limit=20` | Paginated `[UserResource]` (transformed). | — |
| 52 | GET | `/api/admin/users/pending` | `auth:sanctum` + `admin` | `?limit=20` | Paginated `[UserResource]` — only `status="pending"`. | — |
| 53 | POST | `/api/admin/users/{id}/approve` | `auth:sanctum` + `admin` | `id:int` | `{success,message,data:UserResource}` 200 / 404 / 400 `INVALID_STATUS`. Fires `NotificationService::notifyAccountStatus(active)`. | — |
| 54 | POST | `/api/admin/users/{id}/reject` | `auth:sanctum` + `admin` | `{reason:10..500}` | `{success,message,data:UserResource}` 200 / 404 / 400 `INVALID_STATUS`. | — |
| 55 | POST | `/api/admin/users/{user}/wallet` | `auth:sanctum` + `admin` | `{balance:int≥0}` | `{success,message,data:{walletBalance}}` 200 / 400 `ERR_STUDENT_PENDING` if status=pending. Row-locked transaction; auto-creates `WalletTransaction` (`refund` or `deduct`). | — |
| 56 | POST | `/api/admin/users/{user}/courses/{course}/toggle` | `auth:sanctum` + `admin` | `user:int, course:int` | `{success,message,data:{enrolled:bool}}` 200 / 400 `ERR_STUDENT_PENDING`. Attach uses `access_type="admin_override"`. | — |
| 57 | POST | `/api/admin/users/{user}/reset-password` | `auth:sanctum` + `admin` | `{password:≥8 letters+numbers}` | `{success,message,data:null}` 200. **Side effect: invalidates ALL the user's Sanctum tokens** (immediate global logout). | — |

---

## 16. Admin — Security / Violations (6)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 58 | GET | `/api/admin/security/violations` | `auth:sanctum` + `admin` | `?filter=all\|today\|week&page=` | Paginated 50/page. Items: `[{id, userId, fullName, phone, parentPhone, academicYear, violationType, lectureTitle, courseTitle, ipAddress, createdAt}]`. **Filters to users with ≥3 fatal strikes** (`devtools`, `screen_recording`). | — |
| 59 | GET | `/api/admin/security/students-with-violations` | `auth:sanctum` + `admin` | — | Paginated 50/page. Items: `[{id, fullName, phone, violationsCount, isBlocked, unblockCount, lastViolation}]`. | — |
| 60 | POST | `/api/admin/security/block-student/{user}` | `auth:sanctum` + `admin` | `user:int` | `{success,message,data:null}` 200. **Side effect: destroys all the user's tokens (kick from all devices).** | — |
| 61 | POST | `/api/admin/security/unblock-student/{user}` | `auth:sanctum` + `admin` | `user:int` | `{success,message,data:null}` 200. Increments `unblock_count` (raises future strike threshold: 3, 6, 9, ...). | — |
| 62 | DELETE | `/api/admin/security/violations/{id}` | `auth:sanctum` + `admin` | `id:int` | `{success,message,data:null}` 200 | — |
| 63 | DELETE | `/api/admin/security/students/{id}/violations` | `auth:sanctum` + `admin` | `id:int` | `{success,message,data:null}` 200 | — |

---

## 17. Admin — Student Progress & Monitoring (5)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 64 | GET | `/api/admin/student-progress` | `auth:sanctum` + `admin` | `?limit=20` | Paginated `[{id, fullName, phone, studentNumber, status, walletBalance, violationsCount, completedLectures, passedExams, failedExams}]` | — |
| 65 | GET | `/api/admin/student-progress/{user}` | `auth:sanctum` + `admin` | `user:int` | `{success,message,data:{student:{id,fullName,email,phone,parentPhone,academicYear,walletBalance}, courses:[{courseId,courseTitle,completedLectures,totalLectures,lectures:[{id,title,isCompleted,watchTime,lastExamScore,examPassed,attemptsCount}]}], summary:{totalViolations, totalPointsSpent}}}` | — |
| 66 | GET | `/api/admin/monitoring/students` | `auth:sanctum` + `admin` | — | `{success,message,data:[{studentId, fullName, phone, parentPhone, studentNumber, academicYear, courseId, courseTitle, subscriptionId, issues:[{type:"exam_failed"\|"accumulation", ...}]}]}` 200. **No pagination** — chunked server-side, heavy call. | **NEW** |
| 67 | POST | `/api/admin/monitoring/extend-grace` | `auth:sanctum` + `admin` | `{student_id, course_id, days:1..90}` | `{success,message,data:null}` 200 / 404 if subscription missing | **NEW** |
| 68 | GET | `/api/admin/monitoring/attempts/{attempt}` | `auth:sanctum` + `admin` | `attempt:int` | `{success,message,data:{id, studentName, examTitle, score, passed, completedAt, questions:[{id, body, options, correctAnswer, selectedAnswer}]}}` 200. Reveals correct answers (admin-only). | **NEW** |

---

## 18. Admin — Finance & Wallet (12)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 69 | GET | `/api/admin/wallet/summary` | `auth:sanctum` + `admin` | `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` (default last 30 d) | `{success,message,data:{period:{start,end}, totalTopups, topupsCount, courseSalesCount, students:{total, active}}}` 200 | — |
| 70 | GET | `/api/admin/wallet/transactions` | `auth:sanctum` + `admin` | `?limit=50` | Paginated `[{id, type, amount, balanceBefore, balanceAfter, description, status, date, reference, studentName}]` | — |
| 71 | GET | `/api/admin/wallet/student/{user}/transactions` | `auth:sanctum` + `admin` | `user:int, ?limit=20` | `{success,message,data:{transactions:[...], walletBalance, totalTopups, totalPurchases, pagination:{total, currentPage, lastPage, perPage}}}` 200 | — |
| 72 | GET | `/api/admin/wallet/course-stats` | `auth:sanctum` + `admin` | — | `{success,message,data:[{id, title, pricePoints, studentsCount}]}` 200 | — |
| 73 | GET | `/api/admin/wallet/courses/{courseId}/students` | `auth:sanctum` + `admin` | `courseId:int` | `{success,message,data:{course:{id,title}, students:[{id,fullName,phone,academicYear,subscribedAt}]}}` 200 | — |
| 74 | GET | `/api/admin/wallet/subscriptions` | `auth:sanctum` + `admin` | `?limit=50` | Paginated `[{id, studentName, courseTitle, accessType, reference, grantedAt, createdAt}]` | — |
| 75 | GET | `/api/admin/wallet/stats` | `auth:sanctum` + `admin` | — | `{success,message,data:{pending, approved, declined, amountMismatch, totalApprovedAmount}}` 200 | — |
| 76 | GET | `/api/admin/wallet/topups` | `auth:sanctum` + `admin` | `?status=pending\|all\|approved\|declined\|amount_mismatch&limit=20` | Paginated topup requests. Each item carries `proofImageUrl` as **10-min signed B2 URL**. Includes nested `student`, `paymentNumber`, `reviewer`. | — |
| 77 | GET | `/api/admin/wallet/topups/{id}` | `auth:sanctum` + `admin` | `id:int` | Single topup request with the same shape as above (404 if not found). | — |
| 78 | POST | `/api/admin/wallet/topups/{id}/approve` | `auth:sanctum` + `admin` | `{verified_amount:≥1, admin_notes?}` | `{success,message,data:{requestId, status:"approved", transactionId, amountCredited}}` 200 / 400 `ERR_ALREADY_PROCESSED` / 500 `ERR_APPROVE_FAILED`. | — |
| 79 | POST | `/api/admin/wallet/topups/{id}/adjust` | `auth:sanctum` + `admin` | `{verified_amount:≥1, admin_notes?:≤500}` | `{success,message,data:{requestId, status:"approved", originalAmount, verifiedAmount, transactionId, amountCredited}}` 200 / 400 `ERR_ALREADY_PROCESSED` / 500 `ERR_ADJUST_FAILED`. Works on `pending` or `amount_mismatch`. | — |
| 80 | POST | `/api/admin/wallet/topups/{id}/decline` | `auth:sanctum` + `admin` | `{admin_notes:required:≤500}` | `{success,message,data:{requestId, status:"declined"}}` 200 / 400 `ERR_ALREADY_PROCESSED`. Fires `notifyWalletTopup(declined)`. | — |

---

## 19. Admin — Payment Numbers (4)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 81 | GET | `/api/admin/payment-numbers` | `auth:sanctum` + `admin` | — | `{success,message,data:[{id, number, provider, displayOrder, isActive, createdAt}]}` 200. Sorted by `displayOrder`. | — |
| 82 | POST | `/api/admin/payment-numbers` | `auth:sanctum` + `admin` | `{number:unique, provider:"instapay"\|"vodafone_cash", display_order?:int, is_active?:bool}` | `{success,message,data:{id, number, provider, displayOrder, isActive}}` 201. **Invalidates `active_payment_numbers_<provider>` cache** (instantly affects student round-robin). | — |
| 83 | PATCH | `/api/admin/payment-numbers/{paymentNumber}` | `auth:sanctum` + `admin` | partial of above | `{success,message,data:null}` 200. Also clears cache (both old + new provider if changed). | — |
| 84 | DELETE | `/api/admin/payment-numbers/{paymentNumber}` | `auth:sanctum` + `admin` | `paymentNumber:int` | `{success,message,data:null}` 200 / 400 `ERR_HAS_HISTORY` (use `is_active=false` instead — referential integrity). | — |

---

## 20. Admin — Center Codes (3)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 85 | GET | `/api/admin/center-codes` | `auth:sanctum` + `admin` | `?course_id=&status=used\|unused&limit=50` | Paginated `[{id, code, courseId, courseTitle, type, studentPhone, lectureId, lectureTitle, accumulatorLectures, isUsed, usedBy?, usedAt, createdAt}]` | — |
| 86 | POST | `/api/admin/center-codes/generate` | `auth:sanctum` + `admin` | `{course_id, quantity:1..1000, type?:"course"\|"lecture"\|"accumulator", lecture_id?:required_if:type=lecture, accumulator_lectures?:required_if:type=accumulator, student_phone?}` | `{success,message,data:{codes:[{id,code,type}], count}}` 201 / 500 `CODE_GENERATION_FAILED`. Code format `XXXX-XXXX-XXXX` (ambiguous chars O/I/L/0/1 excluded). | — |
| 87 | GET | `/api/admin/center-codes/export` | `auth:sanctum` + `admin` | `?course_id=required` | `{success,message,data:[{code, course, created_at}]}` 200. Only unused codes. **Field names are snake_case here.** | — |

---

## 21. Admin — Courses (5 — `latest` method exists but is DEAD)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 88 | GET | `/api/admin/courses` | `auth:sanctum` + `admin` | `?limit=20` | Paginated `[CourseResource]` (with `lecturesCount, studentsCount`). | — |
| 89 | GET | `/api/admin/courses/latest` | `auth:sanctum` + `admin` | — | **DEAD ROUTE** — `AdminCourseController::latest()` is defined but `apiResource('courses', ...)` does **not** register a `latest` URI. Use `GET /api/admin/courses?limit=6` and sort client-side, or add a route. | — |
| 90 | GET | `/api/admin/courses/{course}` | `auth:sanctum` + `admin` | `course:int` | `{success,message,data:CourseResource}` (eager-loads `lectures`). | — |
| 91 | POST | `/api/admin/courses` | `auth:sanctum` + `admin` | `{title, description?, price_points:int≥0, validity_date?:date after:today, is_strict_order?:bool, status:"draft"\|"published"\|"archived", academic_year?:in:grade_7..12,other}` | `{success,message,data:CourseResource}` 201 | — |
| 92 | PATCH | `/api/admin/courses/{course}` | `auth:sanctum` + `admin` | partial of above | `{success,message,data:CourseResource}` 200. Auto-syncs `is_published` to status. | — |
| 93 | DELETE | `/api/admin/courses/{course}` | `auth:sanctum` + `admin` | `course:int` | `{success,message,data:null}` 200 | — |

---

## 22. Admin — Lectures (12)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 94 | GET | `/api/admin/courses/{course}/lectures` | `auth:sanctum` + `admin` | `course:int` | `{success,message,data:[Lecture]}` (sorted by `order_index`); each `attachments[i].file_url` is **10-min signed B2 URL**. | — |
| 95 | POST | `/api/admin/courses/{course}/lectures` | `auth:sanctum` + `admin` | `{title, description?, order_index:int≥1 unique-per-course, max_views?:int≥1}` | `{success,message,data:Lecture}` 201. `is_locked` defaults to `true`. | — |
| 96 | POST | `/api/admin/courses/{course}/lectures/reorder` | `auth:sanctum` + `admin` | `{lecture_ids:[int,...]}` | `{success,message,data:null}` 200 | — |
| 97 | GET | `/api/admin/lectures/{lecture}` | `auth:sanctum` + `admin` | `lecture:int` | `{success,message,data:Lecture}` (eager-loads `attachments` with 10-min signed URLs). | — |
| 98 | PATCH | `/api/admin/lectures/{lecture}` | `auth:sanctum` + `admin` | partial: `{title?, description?, order_index?, is_locked?:bool, max_views?}` | `{success,message,data:Lecture}` 200 | — |
| 99 | DELETE | `/api/admin/lectures/{lecture}` | `auth:sanctum` + `admin` | `lecture:int` | `{success,message,data:null}` 200. **Triggers Go engine `DELETE /api/v1/video/{id}` (JWT) + B2 cleanup of raw + attachments + HLS prefix.** | — |
| 100 | GET | `/api/admin/lectures/{lecture}/upload-ticket` | `auth:sanctum` + `admin` | `lecture:int` | `{success,message,data:{upload_url, uploadUrl, fileKey:"lectures/{id}/raw_video_{ts}.mp4"}}` 200 / 403 `ERR_STORAGE_LIMIT` / 500 `ERR_B2_PRESIGNED`. 60-min pre-signed S3 PUT URL. | — |
| 101 | POST | `/api/admin/lectures/{lecture}/start-processing` | `auth:sanctum` + `admin` | `lecture:int` | `{success,message,data:null}` 200 / 500 `ERR_ENGINE_TRIGGER` / 500 `ERR_ENGINE_OFFLINE`. Calls Go engine `POST /api/v1/video/process` (JWT, 5 s timeout). | — |
| 102 | POST | `/api/admin/lectures/{lecture}/cancel-upload` | `auth:sanctum` + `admin` | `lecture:int` | `{success,message,data:null}` 200. Deletes `raw_key` from B2, resets lecture to `video_status=pending`. | — |
| 103 | DELETE | `/api/admin/lectures/{lecture}/video` | `auth:sanctum` + `admin` | `lecture:int` | `{success,message,data:null}` 200 / 400 `ERR_NO_VIDEO`. Same pipeline as `DELETE /lectures/{id}` minus the row delete (preserves lecture + attempts). | — |
| 104 | POST | `/api/admin/lectures/{lecture}/attachments` | `auth:sanctum` + `admin` | multipart: `file (pdf/doc/docx/ppt/pptx/jpg/png/webp ≤ 20 MB)` | `{success,message,data:LectureAttachment}` 201. Returns 10-min signed `file_url`. 500 `ERR_UPLOAD_FAILED`. | — |
| 105 | DELETE | `/api/admin/lectures/{lecture}/attachments/{attachment}` | `auth:sanctum` + `admin` | `lecture:int, attachment:int` | `{success,message,data:null}` 200 | — |

---

## 23. Admin — Exams (per-lecture) (13 — 1 DEAD)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 106 | GET | `/api/admin/lectures/{lecture}/exams` | `auth:sanctum` + `admin` | `lecture:int` | `{success,message,data:[Exam]}` (eager-loads `questions`). | — |
| 107 | POST | `/api/admin/lectures/{lecture}/exams` | `auth:sanctum` + `admin` | `{form_index:1..3, duration_minutes:1..180, pass_score:1..100, title?, instructions?, shuffle_questions?, shuffle_options?, max_attempts?:int, show_correct_answers?, show_score?, per_question_time?, random_question_count?:int}` | `{success,message,data:Exam}` 201 / 400 `ERR_EXAM_EXISTS` | — |
| 108 | GET | `/api/admin/lectures/{lecture}/exams/results` | `auth:sanctum` + `admin` | `lecture:int, ?limit=20` | Paginated `[{userId, fullName, studentNumber, phone, passed, failedCount, isLockedOut, attempts:[{id, formIndex, score, passed, completedAt}]}]` | — |
| 109 | POST | `/api/admin/lectures/{lecture}/unlock-student/{user}` | `auth:sanctum` + `admin` | `lecture:int, user:int` | `{success,message,data:LectureProgress}` 200. Sets `unlocked_at=now()`. | — |
| 110 | POST | `/api/admin/lectures/{lecture}/reset-attempts/{user}` | `auth:sanctum` + `admin` | `lecture:int, user:int` | `{success,message,data:null}` 200. **Wipes all `ExamAttempt` + resets `LectureProgress.is_completed=false, unlocked_at=null`** (re-locks). | — |
| 111 | GET | `/api/admin/exams/{exam}` | `auth:sanctum` + `admin` | `exam:int` | `{success,message,data:Exam}` (eager-loads `questions`). | — |
| 112 | PATCH | `/api/admin/exams/{exam}` | `auth:sanctum` + `admin` | `{duration_minutes?, pass_score?}` | `{success,message,data:Exam}` 200 | — |
| 113 | DELETE | `/api/admin/exams/{exam}` | `auth:sanctum` + `admin` | `exam:int` | `{success,message,data:null}` 200. Cascades to questions. | — |
| 114 | POST | `/api/admin/exams/{exam}/questions` | `auth:sanctum` + `admin` | `{body, question_type?:"mcq"\|"multi_select", options?:[string,...] min:2, correct_answer?:int, correct_answers?:[int], image_url?, option_images?, points?, time_limit_seconds?}` | `{success,message,data:Question}` 201. Auto-orders next. | — |
| 115 | POST | `/api/admin/questions/upload-image` | `auth:sanctum` + `admin` | multipart: `image (jpg/png/webp ≤ 5 MB)` | `{success,message,data:{publicId, url}}` 201 | — |
| 116 | PUT | `/api/admin/questions/{question}` | `auth:sanctum` + `admin` | partial of addQuestion | `{success,message,data:Question}` 200 | — |
| 117 | DELETE | `/api/admin/questions/{question}` | `auth:sanctum` + `admin` | `question:int` | `{success,message,data:null}` 200 | — |
| 118 | POST | `/api/admin/exams/{exam}/questions/reorder` | `auth:sanctum` + `admin` | — | **DEAD ROUTE** — `AdminExamController::reorderQuestions()` does not exist. | — |

---

## 24. Admin — Comprehensive Exams (7 — 1 DEAD + 1 route shadowing ambiguity)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 119 | GET | `/api/admin/courses/{course}/comprehensive-exams` | `auth:sanctum` + `admin` | `course:int` | `{success,message,data:[ComprehensiveExam]}` (with `questions_count, has_essay_questions` flags). | **NEW** |
| 120 | POST | `/api/admin/courses/{course}/comprehensive-exams` | `auth:sanctum` + `admin` | `{title, instructions?, start_time, end_time:date after:start_time, duration_minutes:int≥1, pass_score:1..100, max_attempts:int≥1, shuffle_questions?, shuffle_options?, delay_results?, accessibility?:"enrolled_only"\|"everyone", price_points?:int≥0}` | `{success,message,data:ComprehensiveExam}` 201 | **NEW** |
| 121 | PUT | `/api/admin/comprehensive-exams/{id}` | `auth:sanctum` + `admin` | same as store (all required) | `{success,message,data:ComprehensiveExam}` 200 | **NEW** |
| 122 | DELETE | `/api/admin/comprehensive-exams/{id}` | `auth:sanctum` + `admin` | `id:int` | `{success,message,data:null}` 200. Cascades to questions + attempts. | **NEW** |
| 123 | GET | `/api/admin/comprehensive-exams/{exam}/questions` | `auth:sanctum` + `admin` | `exam:int` | `{success,message,data:[ComprehensiveExamQuestion]}` 200 (sorted by id) | **NEW** |
| 124 | POST | `/api/admin/comprehensive-exams/{exam}/questions` | `auth:sanctum` + `admin` | `{question_type:"mcq"\|"multi_select"\|"essay", body, options?, correct_answers?, image_url?:url, option_images?, points:int≥1}` | `{success,message,data:ComprehensiveExamQuestion}` 201. Essay type auto-clears options. | **NEW** |
| 125 | DELETE | `/api/admin/questions/{id}` | `auth:sanctum` + `admin` (intended for comprehensive questions) | `id:int` | **DEAD ROUTE** — `ComprehensiveExamController::destroyQuestion()` does not exist. (Same `questions/{id}` URL is also registered by `apiResource('exams')->except(...)` and resolves to the regular-exam `Question` delete handler at #117 — Laravel picks the first match. Comprehensive-exam question deletion has no working endpoint.) | **NEW** |

---

## 25. Admin — Homework (3)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 126 | POST | `/api/admin/lectures/{lecture}/homework` | `auth:sanctum` + `admin` | multipart: `{title, file?:pdf/jpg/png/webp ≤ 20 MB}` (file required on create, optional on update) | `{success,message,data:{id, title, fileUrl:"<signed B2 10 min>"}}` 200/201 / 500 `ERR_UPLOAD_FAILED` | — |
| 127 | GET | `/api/admin/homework/submissions` | `auth:sanctum` + `admin` | `?limit=20` | Paginated `[{id, status, fileUrl:"<signed B2 10 min>", submittedAt, student:{...}, homework:{...}, lecture:{...}, course:{...}}]` | — |
| 128 | POST | `/api/admin/homework/submissions/{submission}/review` | `auth:sanctum` + `admin` | `{status:"approved"\|"rejected", rejection_reason?:required_if:rejected max:500, score?:0..100}` | `{success,message,data:{id, status, rejectionReason, score}}` 200 | — |

---

## 26. Admin — Forum (5)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 129 | GET | `/api/admin/forum` | `auth:sanctum` + `admin` | `?limit=20` | Paginated `[{id, studentName, studentNumber, body, imageUrl:"<signed B2 10 min>", adminReply, adminReplyAudioUrl, adminReplyImageUrl, repliedAt, createdAt}]` | — |
| 130 | POST | `/api/admin/forum/{post}/reply` | `auth:sanctum` + `admin` | multipart: `{reply?:≤2000, audio?:webm/mp3/wav/m4a/ogg ≤ 10 MB, image?:jpg/png/webp ≤ 5 MB}` (≥1 required) | `{success,message,data:{id, adminReply, adminReplyAudioUrl, adminReplyImageUrl, repliedAt}}` 200 / 422 `ERR_EMPTY_REPLY`. Fires `ForumPostReplied` notification. | — |
| 131 | PUT | `/api/admin/forum/{post}/reply` | `auth:sanctum` + `admin` | same as reply | `{success,message,data:{...}}` 200. Re-uploads replace old B2 keys. | — |
| 132 | DELETE | `/api/admin/forum/{post}/reply` | `auth:sanctum` + `admin` | `post:int` | `{success,message,data:null}` 200. Removes reply + audio + image from B2. | — |
| 133 | DELETE | `/api/admin/forum/{post}` | `auth:sanctum` + `admin` | `post:int` | `{success,message,data:null}` 200. Cascades full B2 cleanup (post image + admin reply assets). | — |

---

## 27. Admin — Settings (3)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 134 | GET | `/api/admin/settings` | `auth:sanctum` + `admin` | — | `{success,message,data:{whatsappNumber:"201000000000"}}` 200 | — |
| 135 | PUT | `/api/admin/settings` | `auth:sanctum` + `admin` | `{whatsapp_number:required max:20}` | `{success,message,data:null}` 200 | — |
| 136 | GET | `/api/admin/limits` | `auth:sanctum` + `admin` | — | `{success,message,data:{plan, planName, students:{current, max, percentage}, storage:{currentBytes, maxBytes, percentage}, warning:bool}}` 200 | — |

---

## 28. External Webhooks — Payment Gateways (2)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 137 | POST | `/api/webhooks/fawry` | public + HMAC SHA-256 over `merchantCode\|merchantRef\|amount\|status\|timestamp` + replay window ≤ 300 s + nonce dedupe | Custom Fawry headers: `fawry_signature`, `fawry_timestamp`, `fawry_event_id`. Body: `{merchantReference, amount, paymentAmount, paymentStatus, timestamp, eventId}` | `{success,message,data:null}` 200 / 401 `ERR_INVALID_SIGNATURE` / 401 `ERR_STALE_TIMESTAMP` / 400 `ERR_AMOUNT_MISMATCH` / 503 `ERR_WEBHOOK_MISCONFIGURED` | — |
| 138 | POST | `/api/webhooks/vodafone-cash` | public + HMAC SHA-256 over `merchantCode\|reference\|amount\|status\|timestamp` + replay window ≤ 300 s + nonce dedupe | Custom VC headers: `x-vodafone-signature`, `x-vodafone-timestamp`, `x-vodafone-event-id`. Body: `{reference, amount, status, timestamp, eventId}` | `{success,message,data:null}` 200 / 401 `ERR_UNAUTHORIZED` / 401 `ERR_STALE_TIMESTAMP` / 400 `ERR_AMOUNT_MISMATCH` / 503 `ERR_WEBHOOK_MISCONFIGURED` | — |

> Both webhooks refuse with 503 in non-local envs if the shared secret is empty (SEC-CRIT-02 / SEC-CRIT-03).

> All wallet-side webhook outcomes are recorded in the Prometheus `webhook_total{source,event,outcome}` counter for ops visibility.

---

## 29. Internal Microservice Webhooks — VOD Engine (2)

| # | Method | Path | Auth | Request | Response | New? |
|---|---|---|---|---|---|---|
| 139 | POST | `/api/internal/webhooks/video-encoded` | **JWT (HS256, aud="video.encoded", 120 s iat window)** via `Authorization: Bearer ...` issued by `App\Services\InternalJwtService` | `{lecture_id, status, m3u8_path?, encryption_key?, size_bytes?}` | `{success,message,data:{lectureId}}` 200 / 403 `ERR_UNAUTHORIZED` / 404 `ERR_NOT_FOUND` | — |
| 140 | POST | `/api/internal/webhooks/lectures/{lecture}/progress` | **JWT (HS256, aud="video.progress", 120 s iat window)** | `{phase?, percent:int?}` | `{success,message,data:null}` 200 / 403 `ERR_UNAUTHORIZED`. **Side effect: broadcasts `VideoProcessingProgress` Reverb event** on channel `private-lecture.{id}` for live admin UI. | — |

---

## 30. Go VOD Engine — internal API (5) — NOT exposed to frontend

These are the inbound endpoints the Laravel app calls. Documented for completeness so the porting phase can model admin video flows correctly. They are NEVER called from the browser.

| # | Method | Path | Auth (JWT aud) | Request | Response |
|---|---|---|---|---|---|
| G1 | GET | `<GO_ENGINE_URL>/health` | public | — | 200 `{status:"alive"\|"ready"\|"started"\|..., uptime_s, ...}` with full snapshot. `?probe=live\|ready\|startup` for k8s-style probes. |
| G2 | GET | `<GO_ENGINE_URL>/metrics` | public | — | Prometheus text exposition. |
| G3 | POST | `<GO_ENGINE_URL>/api/v1/video/process` | `video.process` | `{lecture_id, raw_key (must start with `raw/` or `lectures/`, no `..`), qualities:[...], teacher_id?}` | `{status:"accepted", lecture_id}` 200 / 400 / 429 (queue full) / 503 (offline) |
| G4 | DELETE | `<GO_ENGINE_URL>/api/v1/video/{lecture_id}` | `video.delete` | URL param `lecture_id:int` | 200 `{status:"success", message:"Video deletion process started"}` / 400 invalid id / 403 unauth. B2 cleanup happens in background goroutine. |
| G5 | POST | `<GO_ENGINE_URL>/api/v1/video/requeue` | `video.requeue` | `{lecture_id}` | 200 `{status:"success", lecture_id}` / 400 / 403 / 500 |

> After successful processing, the Go engine calls back to **#139** with `aud=video.encoded` JWT. During processing, it calls **#140** repeatedly with `aud=video.progress` for live progress events.

---

## Feature-Group Summary

| # | Group | Endpoints (incl. DEAD) | New group? | Notes |
|---|---|---|---|---|
| 1 | Health, Metrics, Realtime | 5 + 2 WS channels | partly NEW | `/health/live` + `/health/ready` + Prometheus `/metrics` are post-rebuild reliability additions. |
| 2 | Auth | 8 (2 DEAD) | — | Sanctum single-session; Firebase phone verify; `active_user` kill switch. |
| 3 | Public Course Browse | 2 | — | `isPurchased` returned even for guests. |
| 4 | Student — Courses & Lectures | 4 (1 DEAD) | — | Use `GET /courses/{id}` instead of dead `/courses/lectures`. |
| 5 | Video Playback | 3 | — | 1 h signed URLs for resource, 5 min for `.ts`, 2 h playback session in cache. |
| 6 | Lecture Progress + Violations | 4 | — | Speed-hack detection, multi-window lock, hard-block on 3 fatal strikes. |
| 7 | Exams (per-lecture) | 4 (1 DEAD) | — | `my-results` uses **non-standard envelope** `{data:[]}`. |
| 8 | Comprehensive Exams — Student | 4 (1 DEAD) | **NEW** | snake_case response fields. |
| 9 | Homework — Student | 2 | — | — |
| 10 | Forum — Student | 3 | — | Scoped to student's `academic_year`. |
| 11 | Notifications | 3 | — | — |
| 12 | Settings — Student | 1 | — | — |
| 13 | Wallet — Student | 5 | — | InstaPay / Vodafone Cash manual only. |
| 14 | Center Codes — Student | 1 | — | `throttle:10,1` brute-force guard. |
| 15 | Admin — User Mgmt | 7 | — | Reset password triggers global token wipe. |
| 16 | Admin — Security / Violations | 6 | — | Block student kills all their tokens. |
| 17 | Admin — Student Progress & Monitoring | 5 | **NEW** | `monitoring/*` is brand new. |
| 18 | Admin — Finance & Wallet | 12 | — | All 4 topup states handled (pending/approved/declined/amount_mismatch). |
| 19 | Admin — Payment Numbers | 4 | — | Round-robin with cache invalidation on every change. |
| 20 | Admin — Center Codes | 3 | — | `XXXX-XXXX-XXXX` ambiguity-free alphabet. |
| 21 | Admin — Courses | 6 (1 DEAD — `latest`) | — | — |
| 22 | Admin — Lectures | 12 | — | Direct Go-engine integration via JWT for process/delete. |
| 23 | Admin — Exams (per-lecture) | 13 (1 DEAD — `reorderQuestions`) | — | — |
| 24 | Admin — Comprehensive Exams | 7 (1 DEAD — `destroyQuestion`) | **NEW** | +1 routing ambiguity on `DELETE /api/admin/questions/{id}`. |
| 25 | Admin — Homework | 3 | — | — |
| 26 | Admin — Forum | 5 | — | Audio + image reply support. |
| 27 | Admin — Settings | 3 | — | — |
| 28 | External Webhooks (Payment) | 2 | — | HMAC + replay window + nonce dedupe. |
| 29 | Internal Webhooks (VOD) | 2 | — | JWT (HS256, 120 s window). |
| 30 | Go VOD Engine (inbound) | 5 | — | Documented for parity, not frontend-facing. |
| **TOTAL distinct frontend-facing endpoints** | | **140** | | **8 are DEAD routes** (controllers lack the methods) — see §32. |

---

## 31. Auth Middleware Cheat Sheet

| Middleware | Where | Effect |
|---|---|---|
| `auth:sanctum` | most protected routes | Sanctum bearer token required. 401 on miss. |
| `active_user` | all student routes | Re-checks `is_blocked`/`status`; **instant kill switch** if admin just blocked you. 403 on block. |
| `admin` | `/api/admin/*` | Requires `user.role === 'admin'`. |
| `restrict_to_internal_ips` | `/api/metrics` | CIDR allowlist (default loopback + RFC1918). Non-matching → **404** (hides existence). |
| `throttle:5,1` | register, verify-otp, store forum | Per-route rate limit. 429 on burst. |
| `throttle:3,1` | resend-otp | — |
| `throttle:10,1` | redeem code, submit homework | — |
| `throttle:login_secure` | `/api/auth/login` | Custom-tuned login throttle. |
| `throttle:financial_ops` | wallet topup + course purchase | Custom financial-ops throttle. |
| `throttle:60,1` | `/api/metrics` | Caps Prometheus scrape rate. |
| `RecordHttpMetrics` (global) | all `/api/*` | Bumps Prometheus `http_request_duration_seconds` histogram. |
| `SecurityHeadersMiddleware` (global) | all `/api/*` + web | CSP, HSTS, X-Frame-Options, etc. |
| `ForceJsonResponse` (global) | all `/api/*` | Prevents HTML 401/500 leakage — every response is JSON. |

---

## 32. Critical Findings for the Frontend Porting Phase

> These are blockers / must-knows discovered by reading the actual controller code, not assumptions.

### 32.1 — DEAD routes (8 total, will 500 from Laravel)

| # | Method + Path | Why dead | Workaround |
|---|---|---|---|
| 11 | `GET /api/auth/status` | `AuthController::status` not defined | Use `GET /api/auth/me` |
| 13 | `POST /api/auth/resubmit-documents` | `AuthController::resubmit` not defined (the `ResubmitRequest` is orphaned) | Re-register from scratch via `POST /api/auth/register` with new temp id, or add a route → controller binding |
| 17 | `GET /api/courses/lectures` | `StudentCourseController::getCourseLectures` not defined | Use `GET /api/courses/{course}` for the lecture list |
| 28 | `GET /api/exams/attempts/{attempt}` | `StudentExamController::getAttemptDetails` not defined | Use `GET /api/lectures/{lecture}/exam` + per-question local state |
| 32 | `GET /api/comprehensive-exams/{id}` | `StudentComprehensiveExamController::show` not defined | Use `GET /api/comprehensive-exams/available` + local lookup, or use `startExam` to fetch the payload |
| 89 | `GET /api/admin/courses/latest` | `AdminCourseController::latest` defined but `apiResource` doesn't bind it | `GET /api/admin/courses?limit=6` + client sort |
| 118 | `POST /api/admin/exams/{exam}/questions/reorder` | `AdminExamController::reorderQuestions` not defined | Client-side reordering with `PUT /api/admin/questions/{q}` per item |
| 125 | `DELETE /api/admin/questions/{id}` (comprehensive path) | `ComprehensiveExamController::destroyQuestion` not defined; route exists but Laravel resolves to the regular-exam handler at #117 | Add a separate route like `DELETE /api/admin/comprehensive-exams/questions/{id}` |

### 32.2 — Single-session Sanctum invariant

Every successful login invalidates **all** the user's prior `personal_access_tokens` (single active session). Frontend should treat any 401 after a brief lull as "session ended, redirect to login" — do not retry with the stale token. The same wipe happens on: `POST /admin/users/{user}/reset-password`, `POST /admin/security/block-student/{user}`, and auto-block at 3 fatal video violations.

### 32.3 — Field-naming is camelCase everywhere except 5 documented legacy holdovers

| Where | Field | Should-be | Read both casings |
|---|---|---|---|
| `WalletTransactionResource` (line 19) | `balance_After` | `balanceAfter` | yes |
| `StudentComprehensiveExamController::availableExams` | `price_points, course_title, is_purchased, duration_minutes, pass_score, start_time, end_time` | camelCase equivalents | yes |
| `StudentComprehensiveExamController::startExam` response | `attempt_id, ends_at, end_time_absolute, image_url` | camelCase equivalents | yes |
| `AdminCenterCodeController::export` | `code, course, created_at` | `createdAt` | yes |
| `AdminLectureController` attachment upload response | `file_url` (snake_case) | `fileUrl` | yes |

### 32.4 — No OpenAPI spec exists

This markdown IS the spec. Treat it as the source of truth; do not derive shape from runtime sampling alone.

### 32.5 — All B2 file URLs returned to the frontend are time-limited signed URLs

- 1 h for `LectureResource.streaming.*` (hlsUrl / videoUrl)
- 5 min for `.ts` segments in secure-playlist
- 5 min for student homework / forum images
- 10 min for admin file URLs (proofs, attachments, admin forum assets)
- 5 min for admin viewing student ID cards (`UserResource.idImageUrl`)

**Never persist these URLs in localStorage / cookies** — they expire. Re-fetch on demand.

### 32.6 — Signed ID-image URL is per-request

`UserResource::idImageUrl` is a 5-minute signed B2 URL computed fresh on every response (SEC-MAJOR-02). Even admin-facing caches must not store the URL.

### 32.7 — `/api/metrics` hides itself

Non-allowlisted IPs get **404 (not 403)** to prevent port-scan discovery. If the frontend is ever asked to display Prometheus data, it must go through a server-side proxy that lives inside the allowlist.

### 32.8 — Comprehensive Exam responses mix envelopes and field casing

See §32.3 above. Port any pre-existing code with care; a snake_case mapping layer is required for this surface.

### 32.9 — Anti-cheat + anti-sharing is server-enforced and immediate

Frontend must react to:
- `409 ERR_STREAM_CONFLICT` → close player
- `403 ERR_SPEED_HACK` → close player + warn user
- Any `403` after a successful play → likely admin-blocked → hard-logout
- `403 ERR_DEVICE_LIMIT_REACHED` / `ERR_DEVICE_MONTHLY_LIMIT` on login → show the explanatory message and refuse the token

### 32.10 — Reverb WebSocket channels the frontend should subscribe to

- `private-lecture.{id}` → event `VideoProcessingProgress` carries `{lectureId:int, phase:string, percent:int}`. Use for live admin encoding-progress UI.

### 32.11 — State-changing endpoints to never call in tight loops

Always re-fetch the canonical state after success: `approve`, `adjust`, `decline`, `unblock-student`, `block-student`, `toggle-course`, `redeem`, `purchase`, `start-processing`, `cancel-upload`, `destroy-video`, `reset-attempts`, `unlock-student`, `reset-password`, `mark-all-read`, `extend-grace`, `register`, `login`, `verify-otp`, `submit`, `completeTopupFromRequest`, `destroyQuestion` (when fixed).

### 32.12 — Wallet & points

- 1 EGP = 1 Point (per AGENTS.md).
- All balance updates use `DB::transaction` with row locks (`lockForUpdate`) — concurrent purchase + topup cannot double-spend.
- Idempotency: `POST /api/comprehensive-exams/{id}/purchase` is safe to retry (returns `{already_owned:true}` on the second call).
- Topup references: `WalletTransaction.reference` is a stable string that the webhook looks up by.

### 32.13 — Routing ambiguities to be aware of

- `DELETE /api/admin/questions/{id}` is registered twice in the route file (#117 and #125). Laravel picks the first — the regular-exam `Question` delete handler. There is no working endpoint for deleting a comprehensive-exam question.
- `apiResource('exams', AdminExamController::class)->except(['index','store'])` registers `show, update, destroy` for `/api/admin/exams/{exam}`. The same controller also handles `/api/admin/lectures/{lecture}/exams/...` paths via inline route groups. Both blocks are independent and do not collide on URL.

### 32.14 — Path-parameter types

All `{id}`, `{course}`, `{lecture}`, `{exam}`, `{user}`, `{attempt}`, `{paymentNumber}`, `{question}`, `{post}`, `{attachment}`, `{submission}` are integer IDs (route model binding with implicit numeric coercion). Only `{course}` in `GET /api/courses/{course}` has a `where('course','[0-9]+')` constraint; the others rely on Laravel's auto-404 for non-numeric values.

### 32.15 — File upload constraints (all)

| Where | Accept | Max |
|---|---|---|
| `POST /api/auth/register` `id_image` | jpg/jpeg/png/webp | 5 MB |
| `POST /api/auth/resubmit-documents` `id_image` | jpg/jpeg/png/webp | 5 MB (DEAD route) |
| `POST /api/lectures/{lecture}/homework/submit` `file` | pdf/jpg/jpeg/png/webp | 20 MB |
| `POST /api/admin/lectures/{lecture}/homework` `file` | pdf/jpg/jpeg/png/webp | 20 MB |
| `POST /api/admin/lectures/{lecture}/attachments` `file` | pdf/doc/docx/ppt/pptx/jpg/jpeg/png/webp | 20 MB |
| `POST /api/admin/questions/upload-image` `image` | jpg/jpeg/png/webp | 5 MB |
| `POST /api/admin/forum/{post}/reply` `audio` | webm/mp3/wav/m4a/ogg | 10 MB |
| `POST /api/admin/forum/{post}/reply` `image` | jpg/jpeg/png/webp | 5 MB |
| `POST /api/wallet/topup/submit` `proof_image` | jpg/jpeg/png/webp | 5 MB |
| `POST /api/forum` `image` | jpg/jpeg/png/webp | 5 MB |

---

*End of inventory. The total is **140 frontend-facing endpoints** (5 of which are health/metrics + 1 of which is the `/up` back-compat route) and **5 Go VOD engine internal endpoints**. Every line was read from source; nothing was inferred from naming conventions.*
