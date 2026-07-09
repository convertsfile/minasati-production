# Frontend Migration Charter — Minassati (منصاتي)

**Phase:** dual-scope-lock
**Re-confirmed at:** 2026-07-09 (continuation run after prior `frontend-port` stop)
**Pipeline:** frontend-migration-pipeline

> Re-confirmation context: the user asked to "continue from the last phase we stop on wich is frontend-port". The prior `dual-scope-lock` charter is authoritative for the two roots; this run re-verifies both paths still resolve, are still distinct, and re-confirms the stack snapshots from current manifests before handing off to the next phase.

---

## 1. Roots (verified this run)

### Target — REBUILT project (the only root later phases may write to)
- **Absolute path:** `C:/Users/drhab/OneDrive/Desktop/new-minasaati`
- **Role:** Hosts the NEW backend. Contains the destination frontend stub at `./frontend` (selective replacement — see §4).
- **Verification (this run):**
  - `realpath` → `C:/Users/drhab/OneDrive/Desktop/new-minasaati` (clean).
  - `ls -la` → `.git`, `AGENTS.md`, `CHANGELOG.md`, `RELEASING.md`, `backend/`, `frontend/`, `workers/`, `deploy/`, `.pi/`, `pi/`, `compare_frontends.py`, `frontend_comparison.md`, `README.md`, `.opencode/`, `.analysis/`, `.github/`.
  - `backend/composer.json` present (Laravel 12 manifest re-read below).
  - `frontend/package.json` present (Next.js 16.2.4 manifest re-read below).
  - `workers/vod-engine/go.mod` present (Go 1.25.0).
  - `frontend/app/` route list: `admin, blocked, components, comprehensive-exams, courses, dashboard, exams, forum, globals.css, hooks, layout.tsx, lectures, locked, login, otp, page.tsx, redeem, register, resubmit, waiting-room, wallet`.

### Source — SIBLING project (READ-ONLY for the rest of the pipeline)
- **Absolute path:** `C:/Users/drhab/OneDrive/Desktop/minasaati-last-latest-minasa`
- **Role:** Holds the OLD frontend to be ported into the target.
- **Verification (this run):**
  - `realpath` → `C:/Users/drhab/OneDrive/Desktop/minasaati-last-latest-minasa` (clean).
  - `ls -la` → `AGENTS.md`, `README.md`, `backend/`, `frontend/`, `workers/`, `plan.md`, `tasks.md`, `.git/`, `.gitignore`, `.github/`, `.opencode/`, `.analysis/`, `.kiro/`, `.vscode/`.
  - `frontend/package.json` present (Next.js 16.2.4 manifest re-read below).
  - `frontend/app/` route list: `admin, blocked, components, courses, dashboard, exams, forum, globals.css, hooks, layout.tsx, lectures, locked, login, otp, page.tsx, redeem, register, resubmit, waiting-room, wallet` (no `comprehensive-exams/`).

### Identity check (this run)
- The two canonical paths are **distinct** (different parent folder names: `new-minasaati` vs `minasaati-last-latest-minasa`).
- `test "C:/Users/drhab/OneDrive/Desktop/new-minasaati" != "C:/Users/drhab/OneDrive/Desktop/minasaati-last-latest-minasa"` → `DISTINCT OK`. ✅ Not a self-port.

---

## 2. Target tech stack (detected this run)

Read fresh from manifests:

| Layer | Tech | Evidence |
|---|---|---|
| Backend core | **Laravel 12** (PHP 8.2+) | `backend/composer.json` → `"laravel/framework": "^12.0"`, `"php": "^8.2"` |
| Auth | **Laravel Sanctum 4** | `backend/composer.json` → `"laravel/sanctum": "^4.0"` |
| Realtime (server) | **Laravel Reverb 1** | `backend/composer.json` → `"laravel/reverb": "^1.0"` |
| Push / Firebase | `kreait/laravel-firebase ^7.2` + `firebase/php-jwt ^7.0` | `backend/composer.json` |
| Storage driver | `league/flysystem-aws-s3-v3 3.0` (Backblaze B2 / S3 compatible) | `backend/composer.json` |
| Queue / dev | `laravel/tinker`, `laravel/pail`, `laravel/pint`, `laravel/sail`, `phpunit/phpunit ^11.5` | `backend/composer.json` |
| VOD engine | **Go 1.25.0** (FFmpeg worker, AWS SDK v2 + JWT) | `workers/vod-engine/go.mod` → `go 1.25.0`, `aws-sdk-go-v2`, `golang-jwt/jwt/v5` |
| Frontend (current/placeholder) | **Next.js 16.2.4** (App Router) + **React 19.2.4** + **TypeScript 5** + **Tailwind 4** | `frontend/package.json` (re-read this run) |
| Frontend runtime | `@sentry/node ^10.58.0`, `hls.js ^1.5.7`, `laravel-echo ^2.3.4`, `pusher-js ^8.5.0`, `video.js ^8.10.0` | `frontend/package.json` |
| Frontend devDeps | `@playwright/test ^1.61.0`, `@tailwindcss/postcss ^4`, `eslint ^9`, `eslint-config-next 16.2.4`, `javascript-obfuscator ^5.4.3`, `playwright ^1.61.0`, `tailwindcss ^4`, `typescript ^5`, `webpack-obfuscator ^3.6.1`, `@types/{node,react,react-dom}` | `frontend/package.json` |
| Frontend scripts | `dev` on port 3002, `build`, `start`, `lint`, `typecheck`, `test` (Playwright e2e) | `frontend/package.json` |
| Infra (per AGENTS.md) | **Backblaze B2** + **Cloudflare CDN** | `AGENTS.md` (target) |
| 3rd-party (per AGENTS.md) | **Twilio (SMS)**, manual payments (**InstaPay**, **Vodafone Cash**) | `AGENTS.md` (target) |

**Target frontend mount point:** `C:/Users/drhab/OneDrive/Desktop/new-minasaati/frontend/`
This directory exists and contains a near-feature-complete Next.js 16.2.4 app. It is the destination for the ported source frontend (selective replacement, not blind overwrite — see §4).

---

## 3. Source frontend stack (detected this run)

Read fresh from `frontend/package.json` and `frontend/`:

| Layer | Tech | Evidence |
|---|---|---|
| Framework | **Next.js 16.2.4** (App Router) | `frontend/package.json` → `"next": "16.2.4"`, `frontend/next.config.ts`, `frontend/app/` |
| UI runtime | **React 19.2.4** + **ReactDOM 19.2.4** | `frontend/package.json` |
| Language | **TypeScript 5** | `frontend/package.json` devDeps |
| Styling | **Tailwind CSS 4** via `@tailwindcss/postcss ^4` | `frontend/package.json`, `frontend/postcss.config.mjs`, `frontend/tailwind.config.ts` |
| Lint | **ESLint 9** + `eslint-config-next 16.2.4` | `frontend/package.json`, `frontend/eslint.config.mjs` |
| Video | **`hls.js` 1.5.7**, **`video.js` 8.10.0** | `frontend/package.json` |
| Realtime (client) | **`laravel-echo` 2.3.4**, **`pusher-js` 8.5.0** | `frontend/package.json` |
| Observability | **`@sentry/node` 10.58.0** | `frontend/package.json` |
| Obfuscation | `javascript-obfuscator 5.4.3`, `webpack-obfuscator 3.6.1` | `frontend/package.json` devDeps |
| E2E | **Playwright 1.61.0** | `frontend/package.json` devDeps, `frontend/e2e/` |
| Source `app/` routes observed | `admin, blocked, components, courses, dashboard, exams, forum, globals.css, hooks, layout.tsx, lectures, locked, login, otp, page.tsx, redeem, register, resubmit, waiting-room, wallet` | `frontend/app/` |

**Stack label:** `Next.js 16.2.4 (App Router) + React 19.2.4 + TypeScript 5 + Tailwind 4 + Playwright + hls.js + video.js + laravel-echo + pusher-js + webpack-obfuscator`

---

## 4. Notable diffs (source → target) the porting phase must reconcile

These are observed at this re-confirmation. Downstream phases decide merge policy.

1. **Next.js pin**
   - Source: `"next": "16.2.4"` (exact)
   - Target: `"next": "16.2.4"` (exact)
   - Resolution: keep target's pin; no bump needed.

2. **Frontend deps — target vs source**
   - Manifests are **byte-identical** at the `dependencies` / `devDependencies` level (verified by re-reading both `package.json` files in this run).
   - Resolution: no manifest-level porting concern. Sub-deps under `node_modules` must still resolve cleanly when the source tree is brought in.

3. **Route-level diffs in `app/`**
   - **Target-only:** `comprehensive-exams/`. Source has no such route.
   - **Source-only:** (none — all source routes exist in target.)
   - Resolution: keep target's `comprehensive-exams/`. Do not delete it. There is no missing route to port from source at the manifest level; deep file-level parity checks belong to the porting phase.

4. **Config / middleware**
   - Target has `next.config.ts` and `middleware.ts` (hardened with security headers, CSP, webpack obfuscation).
   - Source has its own `next.config.ts` (and possibly `middleware.ts`); verify whether source has any `middleware.ts` worth porting.
   - Resolution: keep target's hardened config as the base; merge any source-specific routes/rewrites from source's `next.config.ts` and middleware that the target lacks.

5. **E2E tests**
   - Both roots have `e2e/` + Playwright configured. Content parity must be checked at porting time.
   - Resolution: port missing test files; do not delete existing target tests.

6. **Backend / Workers**
   - Out of scope for this pipeline (frontend-only migration). Do NOT touch `backend/` or `workers/` in either root.

---

## 5. Explicit exclusions / scope guardrails

- ❌ **Do NOT** write to the source root (`minasaati-last-latest-minasa`) at any later phase. READ-ONLY.
- ❌ **Do NOT** rewrite the target's `backend/` Laravel code. This pipeline is frontend-only.
- ❌ **Do NOT** rewrite the target's `workers/vod-engine/` Go code.
- ❌ **Do NOT** delete the target's existing `frontend/` wholesale — port selectively per §4, keeping target's hardened security config, `comprehensive-exams/` route, and any other target-only app files.
- ❌ **Do NOT** commit secrets. `.env`, `.env.local`, `.env.example` are present in both — never copy real `.env` values across roots.
- ✅ **MAY** create/modify files under `C:/Users/drhab/OneDrive/Desktop/new-minasaati/frontend/**`.
- ✅ **MAY** create artifacts under `C:/Users/drhab/OneDrive/Desktop/new-minasaati/.pi/artifacts/frontend-migration/**`.

---

## 6. Handoff to next phase

The next pipeline phase is **`backend-api-discovery`** (per the pipeline definition: `if {"status":["SCOPE_LOCKED"]} -> backend-api-discovery`). It must:

1. Use `targetProjectRoot` as its working directory.
2. Treat `sourceFrontendRoot` as read-only reference.
3. Discover the new backend's API surface (Laravel routes / controllers / resources / Form Requests) so the ported frontend can be wired to it.
4. Honor the `AGENTS.md` rules: column types must match frontend inputs (no `int` for Arabic text), Sanctum single-session, wallet idempotency, 1 EGP = 1 Point, etc.

The user explicitly noted the last completed phase was `frontend-port` and asked to continue. Per the pipeline definition, after `SCOPE_LOCKED` the next phase is `backend-api-discovery`; the porting/frontend-port work resumes downstream of API discovery, so the handoff here is correct.

---

## 7. Routing metadata (machine-readable)

```json
{
  "targetProjectRoot": "C:/Users/drhab/OneDrive/Desktop/new-minasaati",
  "sourceFrontendRoot": "C:/Users/drhab/OneDrive/Desktop/minasaati-last-latest-minasa",
  "targetTechStack": "Laravel 12 (PHP 8.2+) + Sanctum 4 + Reverb 1 + Firebase + Flysystem S3 (B2) | Go 1.25 VOD engine | Next.js 16.2.4 (React 19.2.4) frontend stub",
  "sourceFrontendStack": "Next.js 16.2.4 (App Router) + React 19.2.4 + TypeScript 5 + Tailwind 4 + Playwright + hls.js + video.js + laravel-echo + pusher-js + webpack-obfuscator",
  "migrationCharterPath": "C:/Users/drhab/OneDrive/Desktop/new-minasaati/.pi/artifacts/frontend-migration/charter.md"
}
```
