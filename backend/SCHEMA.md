# Minassati Database Schema

## Overview

- **Database**: MySQL
- **ORM**: Laravel Eloquent
- **Location**: `backend/database/migrations/`
- **Models**: `backend/app/Models/`

---

## Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    users    │────▶│  courses   │────▶│  lectures   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       │           ┌───────────────────────────┘
       │           │
       ▼           ▼
┌─────────────┐  ┌─────────────┐
│  wallet_    │  │   exams     │
│  transactions│◀─┤             │
└─────────────┘  └─────────────┘
       │               │
       ▼               ▼
┌─────────────────┐  ┌─────────────┐
│ wallet_topup_   │  │ questions   │
│ requests        │  └─────────────┘
└─────────────────┘         │
       │                   ▼
       ▼            ┌─────────────┐
┌─────────────┐    │ exam_       │
│ payment_    │    │ attempts    │
│ numbers     │    └─────────────┘
└─────────────┘
```

---

## Tables

### 1. users

Main user table for both students and admins.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, auto-increment | Unique ID |
| temp_user_id | varchar(255) | nullable, unique | Temporary ID for registration |
| name | varchar(255) | nullable | First name |
| full_name | varchar(255) | NOT NULL | Full name |
| academic_year | int | NOT NULL | Student academic year (1-6) |
| student_number | varchar(255) | unique | Unique student number |
| phone | varchar(255) | NOT NULL | Student phone |
| parent_phone | varchar(255) | NOT NULL | Parent phone number |
| school | varchar(255) | NOT NULL | School name |
| parent_job | varchar(255) | nullable | Parent occupation |
| governorate | varchar(255) | NOT NULL | Egypt governorate |
| email | varchar(255) | unique | Email address |
| password | varchar(255) | NOT NULL | Bcrypt hashed |
| id_image | varchar(255) | nullable | Local file path |
| id_image_url | varchar(255) | nullable | Public URL |
| status | enum | default: 'pending' | pending/active/rejected |
| wallet_balance | int | default: 0 | Points balance |
| rejection_reason | text | nullable | Rejection explanation |
| role | enum | default: 'student' | student/admin |
| is_admin | boolean | default: false | Admin flag |
| remember_token | varchar(100) | nullable | Remember me token |
| created_at | timestamp | | |
| updated_at | timestamp | | |

**Indexes**: `student_number`, `email`, `status`

---

### 2. courses

Educational courses.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, auto-increment | Unique ID |
| title | varchar(255) | NOT NULL | Course title |
| description | text | nullable | Course description |
| price_points | int | NOT NULL | Price in points |
| validity_date | date | nullable | Expiration date |
| created_at | timestamp | | |
| updated_at | timestamp | | |

---

### 3. lectures

Video lectures belonging to courses.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, auto-increment | Unique ID |
| course_id | bigint | FK → courses.id | Parent course |
| title | varchar(255) | NOT NULL | Lecture title |
| description | text | nullable | Lecture description |
| order_index | int | NOT NULL | Order in course |
| vdocipher_video_id | varchar(255) | nullable | VdoCipher video ID |
| is_locked | boolean | default: true | Locked until exam passed |
| created_at | timestamp | | |
| updated_at | timestamp | | |

**Indexes**: `course_id`, `order_index`

---

### 4. exams

Course exams tied to lectures.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, auto-increment | Unique ID |
| lecture_id | bigint | FK → lectures.id | Associated lecture |
| form_index | tinyint | default: 1 | Exam form (1-3) |
| duration_minutes | int | default: 30 | Time limit |
| pass_score | int | default: 60 | Passing percentage |
| created_at | timestamp | | |
| updated_at | timestamp | | |

**Unique**: (lecture_id, form_index)

---

### 5. questions

Exam questions (multiple choice).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, auto-increment | Unique ID |
| exam_id | bigint | FK → exams.id | Parent exam |
| body | text | NOT NULL | Question text |
| options | json | NOT NULL | Array of 4 options |
| correct_answer | tinyint | NOT NULL | 0-3 index |
| order_index | int | default: 0 | Display order |
| created_at | timestamp | | |
| updated_at | timestamp | | |

---

### 6. exam_attempts

Student exam attempts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, auto-increment | Unique ID |
| user_id | bigint | FK → users.id | Student |
| exam_id | bigint | FK → exams.id | Exam taken |
| lecture_id | bigint | FK → lectures.id | Related lecture |
| score | int | nullable | Obtained score |
| passed | boolean | default: false | Pass/fail |
| answers | json | nullable | Student answers |
| started_at | timestamp | nullable | Start time |
| completed_at | timestamp | nullable | Completion time |
| created_at | timestamp | | |
| updated_at | timestamp | | |

**Unique**: (user_id, exam_id)

---

### 7. course_student

Enrollment pivot table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, auto-increment | Unique ID |
| course_id | bigint | FK → courses.id | Course |
| student_id | bigint | FK → users.id | Student |
| access_type | enum | default: 'purchase' | purchase/center_code |
| reference | varchar(255) | nullable | Transaction ref |
| granted_at | timestamp | nullable | Enrollment date |
| created_at | timestamp | | |
| updated_at | timestamp | | |

**Unique**: (course_id, student_id)

---

### 8. wallet_transactions

Wallet transaction history.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, auto-increment | Unique ID |
| user_id | bigint | FK → users.id | User |
| type | enum | NOT NULL | top_up/purchase/refund/withdrawal |
| amount | int | NOT NULL | Transaction amount |
| balance_before | int | NOT NULL | Balance before |
| balance_after | int | NOT NULL | Balance after |
| reference | varchar(255) | unique, nullable | External ref |
| payment_method | varchar(255) | nullable | Payment method |
| description | varchar(255) | nullable | Description |
| status | enum | default: 'pending' | pending/completed/failed/cancelled |
| metadata | json | nullable | Extra data |
| payment_number_id | bigint | FK → payment_numbers, nullable | |
| topup_request_id | bigint | FK → wallet_topup_requests, nullable | |
| created_at | timestamp | | |
| updated_at | timestamp | | |

**Indexes**: `user_id`, `type`, `status`

---

### 9. wallet_topup_requests

Manual payment verification requests.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, auto-increment | Unique ID |
| user_id | bigint | FK → users.id | User |
| payment_number_id | bigint | FK → payment_numbers.id | Payment number used |
| amount | int | NOT NULL | Requested amount |
| verified_amount | int | nullable | Admin verified amount |
| payment_method | enum | NOT NULL | instapay/vodafone_cash |
| proof_image_url | varchar(255) | NOT NULL | Screenshot proof |
| status | enum | default: 'pending' | pending/approved/declined/amount_mismatch |
| admin_notes | text | nullable | Admin comments |
| reviewed_by | bigint | FK → users.id, nullable | Admin reviewer |
| reviewed_at | timestamp | nullable | Review time |
| created_at | timestamp | | |
| updated_at | timestamp | | |

**Indexes**: (user_id, status), status

---

### 10. payment_numbers

Pool of payment numbers (InstaPay/Vodafone Cash).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, auto-increment | Unique ID |
| provider | enum | NOT NULL | instapay/vodafone_cash |
| number | varchar(20) | NOT NULL | Payment number |
| display_order | int | default: 0 | Rotation order |
| is_active | boolean | default: true | Active flag |
| created_at | timestamp | | |
| updated_at | timestamp | | |

**Indexes**: (provider, is_active, display_order)

---

### 11. center_codes

Registration codes for courses.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, auto-increment | Unique ID |
| course_id | bigint | FK → courses.id | Course |
| code | varchar(20) | unique | Unique code |
| used_by | bigint | FK → users.id, nullable | Student used by |
| used_at | timestamp | nullable | Usage time |
| created_at | timestamp | | |
| updated_at | timestamp | | |

**Indexes**: (course_id, code), used_by

---

### 12. video_encodings

FFmpeg encoding jobs for videos.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, auto-increment | Unique ID |
| lecture_id | bigint | FK → lectures.id | Source lecture |
| input_path | varchar(255) | NOT NULL | Original file path |
| output_path | varchar(255) | nullable | HLS output path |
| status | enum | default: 'pending' | pending/processing/completed/failed |
| error_message | text | nullable | Error details |
| progress | int | default: 0 | 0-100% |
| started_at | timestamp | nullable | Start time |
| completed_at | timestamp | nullable | Completion time |
| created_at | timestamp | | |
| updated_at | timestamp | | |

**Indexes**: status, lecture_id

---

### 13. student_video_encodings

Per-student watermarked video encodings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, auto-increment | Unique ID |
| user_id | bigint | FK → users.id | Student |
| lecture_id | bigint | FK → lectures.id | Lecture |
| course_id | bigint | FK → courses.id | Course |
| watermark_text | varchar(255) | NOT NULL | Phone number watermark |
| b2_video_path | varchar(255) | nullable | Backblaze B2 path |
| status | enum | default: 'pending' | pending/processing/completed/failed |
| progress | int | default: 0 | 0-100% |
| error_message | text | nullable | Error details |
| started_at | timestamp | nullable | Start time |
| completed_at | timestamp | nullable | Completion time |
| created_at | timestamp | | |
| updated_at | timestamp | | |

**Unique**: (user_id, lecture_id)

---

### 14. video_violations

Anti-piracy violation logging.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, auto-increment | Unique ID |
| user_id | bigint | FK → users.id | Student |
| lecture_id | bigint | FK → lectures.id | Lecture |
| violation_type | enum | NOT NULL | screenshot/screen_recording/devtools/tab_switch |
| user_agent | varchar(255) | nullable | Browser info |
| ip_address | varchar(45) | nullable | IP address |
| created_at | timestamp | | |
| updated_at | timestamp | | |

**Indexes**: (user_id, lecture_id), violation_type, created_at

---

### 15. otps

One-time password storage.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, auto-increment | Unique ID |
| phone | varchar(255) | NOT NULL | Phone number |
| code | varchar(10) | NOT NULL | 6-digit code |
| expires_at | timestamp | NOT NULL | Expiration time |
| used_at | timestamp | nullable | Usage time |
| created_at | timestamp | | |

**Indexes**: phone, expires_at

---

### 16. personal_access_tokens

Laravel Sanctum tokens.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, auto-increment | Unique ID |
| tokenable_type | varchar(255) | NOT NULL | Model type |
| tokenable_id | bigint | NOT NULL | Model ID |
| name | varchar(255) | NOT NULL | Token name |
| token | varchar(64) | unique | Hashed token |
| abilities | json | nullable | Permissions |
| last_used_at | timestamp | nullable | Last use |
| expires_at | timestamp | nullable | Expiration |
| created_at | timestamp | | |
| updated_at | timestamp | | |

---

## Business Logic Rules

### 1. Sequential Progression
- `Lecture[n]` is UNLOCKED if `Exam[n-1]` has `passed = true`
- Check exam_attempts table before allowing video playback

### 2. Wallet System
- 1 EGP = 1 Point (fixed conversion)
- All balance updates use database transactions
- Top-up requires admin approval with optional amount adjustment

### 3. Video Protection
- All videos get watermarked with student phone number
- Screen recording/screenshot detection via JavaScript API
- Violations logged for admin review

### 4. Session Management
- Single active session per user
- New login invalidates existing Sanctum tokens

---

## API Endpoints Overview

| Resource | Endpoint | Description |
|----------|----------|-------------|
| Auth | POST /api/auth/login | Login with credentials |
| Auth | POST /api/auth/register | Register new student |
| Auth | POST /api/auth/otp | Verify OTP |
| Auth | GET /api/auth/me | Current user |
| Courses | GET /api/courses | List courses |
| Courses | POST /api/courses/{id}/enroll | Enroll in course |
| Lectures | GET /api/lectures/{id} | Get lecture + video |
| Wallet | POST /api/wallet/topup/initiate | Start top-up |
| Wallet | POST /api/wallet/topup/submit | Submit proof |
| Admin | POST /api/admin/wallet/topups/{id}/approve | Approve top-up |
| Admin | POST /api/admin/wallet/topups/{id}/decline | Decline top-up |
| Admin | POST /api/admin/courses | Create course |
| Admin | POST /api/admin/courses/{id}/lectures | Add lecture |

---

## Models Location

All Eloquent models are in `backend/app/Models/`:

```
User.php
Course.php
Lecture.php
Exam.php
Question.php
ExamAttempt.php
WalletTransaction.php
WalletTopupRequest.php
PaymentNumber.php
CenterCode.php
VideoEncoding.php
StudentVideoEncoding.php
VideoViolation.php
Otp.php
```