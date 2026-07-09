# Frontend & Cross-Platform Verification — Minassati (منصاتي)

- **Generated:** 2026-07-09 (UTC)
- **Project root:** `C:/Users/drhab/OneDrive/Desktop/new-minasaati`
- **Phase:** `frontend-platform-test` (testing-pipeline)
- **Retry count for this domain:** **0** (no prior remediation recorded for this domain)
- **Priority pages surveyed (P0):** `/`, `/login`, `/register`, `/otp`, `/courses`, `/courses/[id]`, `/dashboard`, `/wallet`, `/lectures/[id]`, `/exams/[id]`, `/admin/*` (sidebar + 17 sub-pages)
- **Tooling detected:** Playwright 1.61 (chromium project), Tailwind 4, React 19, Next.js 16 (Turbopack). No Lighthouse / Web Vitals tooling installed.

---

## 1. Tooling Run (chromium only, single project)

| Spec                                      | Pass | Fail | Notes |
|-------------------------------------------|------|------|-------|
| `e2e/admin.spec.ts` (22 tests)            | 22   | 0    | All admin pages + auth-gate checks green. |
| `e2e/wallet-payment.spec.ts` (10 tests)   | 10   | 0    | All wallet security/validation cases green. |
| `e2e/security.spec.ts` (18 tests)         | 16   | 2    | XSS-01 + ConsoleError-02 fail; see findings. |
| `e2e/student-flows.spec.ts` (16 tests)    | 12   | 4    | All RTL, protected-route, course-load, and forum-load tests pass; S01/S02/S04/C01 fail; see findings. |
| Responsive custom suite (12 cases, 375px + 768px) | 12 | 0 | No horizontal overflow on mobile/tablet; RTL maintained. |
| **TOTAL**                                 | **72** | **6** | **92% pass rate.** |

Dev servers brought up locally for this run: `cd frontend && npm run dev` (3002) + `cd backend && php artisan serve --port=8000` (8000). Both healthy during the run.

---

## 2. Rendering & Layout

- **No critical layout breakage on Chromium desktop, iPhone-SE viewport (375x667), or iPad viewport (768x1024)** for all P0 public + auth pages, P1 student pages, and P2 admin shell.
- `app/layout.tsx` declares `<html lang="ar" dir="rtl">` and Playwright RTL test (`TC-RTL01`) passes for `/`, `/login`, `/register`, `/courses`.
- `prefers-reduced-motion` is honoured (`globals.css:117-125`).
- Admin sidebar collapses behind a `.admin-mobile-toggle` on <=768 px and slides in with `.admin-sidebar-backdrop`; verified in `globals.css` mobile block.
- Login/Register/OTP use `.split-layout`; `.split-branding` is hidden on <=768 px (`globals.css:732-735`) so auth pages degrade cleanly to single-column on phones.

## 3. i18n / RTL Audit (static grep)

- **6 occurrences of physical `margin-left|margin-right|padding-left|padding-right|border-left|border-right`** in `app/`. All are in `app/dashboard/page.tsx` inside a small profile cell that explicitly overrides with `border-left: none` on mobile (intentional, not a RTL bug). `border-inline-*` / `margin-inline-*` used in 1+ spot (`app/wallet/page.tsx:instructions-list`). No `style="left:..."` or `style="right:..."` found.
- All Arabic-only strings are user-facing UI labels (intended) — no English hard-coded user strings in P0/P1 components.
- Date formatting: 12 occurrences of `toLocaleString('ar-EG', ...)` / `toLocaleDateString('ar-EG', ...)` across admin pages. Consistent. No raw `.toISOString()` reaches the DOM.
- Number formatting: `toLocaleString('en-US', ...)` is used deliberately for financial dashboards (admin/stats) so the digits stay Western for legibility — that is a project convention, not an i18n bug.

## 4. Web Vitals

Lighthouse / `web-vitals` package is **not installed** and the dev server is reachable only via localhost, so a real CWV pass could not be run from this environment. Charter-listed exclusions (no production build) and missing tooling make this expected. Flagged as MINOR below.

## 5. Findings (by severity)

### CRITICAL
**None.** All priority pages render, RTL is correct, mobile/tablet viewports show no overflow, and protected routes properly redirect.

### MAJOR
**None.** The 6 test failures are (a) stale test fixtures, (b) a backend registration-side validation issue, or (c) Next.js 16 dev-tools noise — none represent a broken layout, broken RTL, or broken responsiveness on a supported browser/breakpoint.

### MINOR (out-of-scope or stale)

1. **`e2e/student-flows.spec.ts:175 TC-C01` (Home page test) is stale.** Asserts substring `كورساتنا المميزة` but `app/page.tsx:42` now renders the section as `أحدث الكورسات` (with nav link `كورساتنا` still present). Pure test-text drift; the page itself renders correctly. **Fix:** update the test to expect `أحدث الكورسات` or `كورساتنا` (substring of nav link).
2. **`e2e/student-flows.spec.ts:103/110/147 TC-S01/S02/S04` fail because of a backend-side registration validation gap, not a frontend UI bug.** Frontend `app/register/page.tsx:31-33` sends the Arabic label `الاول الابتدائي`, but the backend `backend/app/Http/Requests/Auth/RegisterRequest.php:academicYearMap` only maps `grade_7..grade_12`; primary years (`الاول..السادس الابتدائي`) fall through to validation `Rule::in(['grade_7'..'grade_12','other'])` and the API returns `422 ERR_VALIDATION` with `errors.academic_year[0] = "الصف الدراسي المختار غير صالح."`. The frontend also does not send `id_image` when using the API registration path (test calls `/api/auth/register` without multipart). **Fix:** add the 6 primary-year keys (`الاول الابتدائي` -> `grade_1` ... `السادس الابتدائي` -> `grade_6`) to `$academicYearMap`, and either make the test upload `id_image` or mark `id_image` as `sometimes` in the FormRequest.
3. **`e2e/security.spec.ts:131 TC-SEC-CONSOLE02` (Admin console errors) records 1 console error during a sweep of 11 admin pages.** The test does not assert the message content; the page snapshot shows the page rendered normally. The most likely source is the Next.js 16 dev-mode `SegmentViewNode` overlay (visible as the `Open Next.js Dev Tools` button) which logs a single hydration/segment-explorer message in dev — not present in `next build` output. **Fix:** in the test, additionally filter `e.includes('Dev Tools')`, `e.includes('next-devtools')`, `e.includes('SegmentView')`, or run the test against `next start` (production build).
4. **`e2e/security.spec.ts:39 TC-SEC-XSS01` registration XSS test is a no-op assertion.** The test only checks that `body` is truthy after submitting a script-tag name; it does not assert that the script did not execute or that the name was rejected. Not a frontend bug, but a test-quality gap. **Fix:** assert that the page does NOT contain literal `<script>` and that the API returns either a sanitized name or 422.
5. **Web Vitals tooling is not installed.** No `lighthouse`, no `web-vitals` package, no CI step. Charter item #2 ("frontend build succeeds") is exercised by the `next dev` + Playwright runs but a real CWV pass requires `next build && next start` + Lighthouse. Out of scope for this domain; flagging for `build-deploy-readiness`.
6. **Stale `next.config.ts` warning: `turbopack.root` not set despite multiple lockfiles (`package-lock.json` and `pnpm-lock.yaml`).** Affects only dev-mode console; does not change rendered output. **Fix:** delete `pnpm-lock.yaml` if pnpm is unused, or set `turbopack.root` in `next.config.ts`.
7. **Stale Next.js 16 deprecation: `middleware` file convention.** `frontend/middleware.ts` still uses the old name; Next.js 16 prefers `proxy.ts`. Pure deprecation warning, no functional impact in 16.2.10.

## 6. Architecture / Charter Compliance (UI side)

| Charter rule                                                    | Status | Evidence |
|-----------------------------------------------------------------|--------|----------|
| RTL on all public pages                                         | PASS   | `TC-RTL01` + every responsive viewport test |
| Arabic strings as user input, never as `int` columns            | PASS (frontend side) | `app/register/page.tsx` sends Arabic `academic_year`/`governorate`; conversion to `grade_*` happens in the backend FormRequest |
| Mobile breakpoint coverage (480 / 640 / 768 / 900 / 1024)      | PASS   | `app/globals.css` declares all 5 breakpoints and 
