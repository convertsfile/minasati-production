# AGENTS.md — Minassati (منصاتي)

## 🏗 Project Architecture & Stack

- **Frontend:** Next.js 16 (React 19, TypeScript, React Query).
- **Backend Core:** Laravel 12 (PHP 8.2+, MySQL, Sanctum Auth).
- **VOD Engine (Video Worker):** Go 1.22+ (Standalone background service managing FFmpeg).
- **Storage & Delivery:** Backblaze B2 + Cloudflare CDN.
- **Third-party:** Twilio (SMS), Manual Payments (InstaPay/Vodafone Cash).

---

## 🚀 Core Responsibilities

1. **Laravel (API & Logic):** User Auth, Wallets, Payment reviews, Database truth, receiving Webhooks from the Go Worker.
2. **Next.js (UI):** Client/Student interfaces, Admin dashboards.
3. **Go Worker (VOD Engine):** Handles heavy video processing (FFmpeg, HLS, AES-128 Encryption, Watermarking). Features a Priority Queue, Capacity Guard (CPU/RAM/Disk protection), and Idempotent recovery.

---

## ⚠️ Critical Domain Rules

### 1. Database & Frontend Sync (CRITICAL)
- **Data Types:** Ensure database column types exactly match the frontend input. If the frontend sends Arabic text (e.g., "الاول الابتدائي" or "القاهرة" from dropdowns), the database column MUST be `string`/`varchar`, NOT `integer`.

### 2. Video Infrastructure (Go Worker)
- **High Availability:** The Go worker must never crash the host. Rely on `guardian.go` for resource pausing and `systemd cgroups` for OS-level limits.
- **FFmpeg Executions:** Avoid open waits. Always use bounded buffers for `stderr` (e.g., `limitedWriter`) to prevent "short write" panics. Consider Watchdog patterns to prevent silent freezes.
- **Idempotency:** Video encoding and wallet transactions must be idempotent to prevent duplicate processing.

### 3. Storage (Backblaze B2)
- Use standard API patterns (Account-level keys). Bucket ID must be explicitly configured.
- VOD files (HLS/TS/Keys) are uploaded directly by the Go worker to a private B2 bucket, served securely via Cloudflare CDN with auth tokens.

### 4. Payments & Security
- **Wallet Integrity:** All balance updates must use Database Transactions. 1 EGP = 1 Point.
- **Sessions:** Single active session per student; new logins invalidate old Sanctum tokens.

---

## 💻 Code Style Guidelines (Brief)

- **PHP/Laravel:** PSR-12, `PascalCase` classes, `camelCase` methods, `snake_case` DB. Type everything (PHP 8+). Use Form Requests.
- **Go:** Idiomatic Go. Explicit error handling (`if err != nil`). Use context for timeouts. Use Mutexes for state changes.
- **TypeScript/React:** `strict: true`. Functional components. No `any` (use `unknown`). Descriptive interfaces for API boundaries.
- **Commits:** Imperative mood, max 72 chars. No secrets in source control.