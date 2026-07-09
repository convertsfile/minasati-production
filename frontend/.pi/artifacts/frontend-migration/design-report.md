# Design Quality Audit — Frontend Migration (fresh run)

**Date:** 2026-07-09
**Auditor:** Design Quality Gate
**Target:** `frontend/` (Next.js 16 + React 19)
**Render protocol:** Playwright (chromium) screenshots at desktop 1440x900 and mobile 390x844, with mock-token cookie + mocked `/api/auth/me` for admin pages, full-page capture, scroll-and-settle. 72 screenshots taken; every priority page read and graded against the enterprise design bar.

**Retry counter:** 0 (fresh cycle; prior run's findings are listed in the "Resolved" section below for traceability — but this run starts a new counter).

---

## CRITICAL FINDINGS (page visually broken in the screenshot)

### C-1. `/comprehensive-exams/[id]` (Student Comprehensive Exam details) — renders LOGIN page instead of exam details
**Screenshots:** `comp-exam-desktop.png`, `comp-exam-mobile.png`
The page at `/comprehensive-exams/1` is fully replaced by the `/login` form. Playwright trace shows the URL ends up at `/login?redirect=%2Fdashboard`. The root cause is in `lib/axios.ts` (response interceptor): on a 401 from `/api/comprehensive-exams/available`, the interceptor does `window.location.href = '/login?session_expired=true'`, removing the token and kicking the user out — and this fires *before* the page's own `catch` block can show a toast and redirect to `/courses`. There is no fallback UI, no "session expired, try again" inline message, and no in-page error state. A user who lands on a deep link loses their context entirely.

**Fix:** In `lib/axios.ts`, gate the 401-→-login redirect behind a "user was previously authenticated" check (e.g. only redirect if a `wasAuthenticated` flag is set in localStorage, or only redirect for first-party auth requests like `/api/auth/*`, not data endpoints). In `app/comprehensive-exams/[id]/page.tsx`, render an explicit error/empty state (`"تعذّر تحميل بيانات الاختبار. يرجى المحاولة مجدداً."` with a retry button) instead of redirecting.

### C-2. `/admin/courses/[id]/comprehensive-exams` (Admin Course Comprehensive Exams) — renders LOGIN page instead of admin page
**Screenshots:** `admin-course-comp-exams-desktop.png`, `admin-course-comp-exams-mobile.png`
Same root cause as C-1: the page tries to fetch exam data, gets 401, and the axios interceptor bounces the admin to `/login`. The mock `/api/auth/me` was set up to return an admin user, but the *data* endpoints are not mocked, so any 401 throws the admin out. The page button "لوحة التحكم" (Dashboard) is visible at the top, confirming the page is in admin mode when the redirect happens.

**Fix:** Same as C-1 (axios interceptor should not redirect data-endpoint 401s). Optionally mock the exam-list endpoint in the audit capture script as well, but the real fix is in the interceptor.

### C-3. `/admin/plan` — BLANK page, no content
**Screenshot:** `admin-plan-desktop.png`
The page renders nothing. Just the background color, the Next.js dev indicator ("N") at the bottom-left, and the sidebar. The main content area is completely empty. The page is meant to be a 922-line admin tool with a tabbed UI for managing plans, but the screenshot shows it failed to render at all (likely the page throws before its first useEffect or its data fetch never resolves and the early-return renders nothing).

**Fix:** Verify the page component actually returns JSX on its initial state (before data loads). Add a loading skeleton, an explicit "loading…" message, or an error boundary so the page never renders a fully-blank body.

### C-4. `/wallet` (Student Wallet) — infinite spinner, no error/empty state
**Screenshots:** `wallet-desktop.png`, `wallet-mobile.png`
Just a single small spinner centered on a vast empty background. No "wallet not loaded", no retry button, no error message. The wallet page is one of the core student surfaces.

**Fix:** Add a `try/catch` around the data fetch; on failure, render a "تعذّر تحميل المحفظة" card with a retry button instead of leaving the spinner running forever. Also surface a state-completeness message in the empty state.

### C-5. `/dashboard` (Student Dashboard) — infinite spinner
**Screenshots:** `dashboard-desktop.png`, `dashboard-mobile.png`
Same as C-4: a tiny spinner on a vast empty background. The dashboard is the first thing a logged-in student sees on the way to any of their resources.

**Fix:** Add a timeout, error boundary, and a friendly error state with retry. While the Laravel backend is unreachable in this audit, the production behavior on a transient API failure would be the same.

### C-6. `/admin/courses` (Admin Course Management) — infinite spinner
**Screenshots:** `admin-courses-desktop.png`, `admin-courses-mobile.png`
Same pattern. The page is the admin's primary way to manage courses but shows nothing but a spinner.

**Fix:** Same as C-4/C-5 — add an explicit error state and a timeout so the page never appears blank for more than a few seconds.

---

## MAJOR FINDINGS (clear design-bar violation visible in the screenshot)

### M-1. `/admin/finance` — error toast without any content underneath
**Screenshot:** `admin-finance-desktop.png`
The page header ("لوحة المالية" + subtitle) and two tabs ("ملخص", "ححسابات الطلاب") render, but the body is empty save for a large red error toast "فشل جلب ملخص المالية" pinned to the top. The visual hierarchy is dominated by the error, the actionable area is empty, and the user is given no retry path. The page looks broken because the data fetch failed.

**Fix:** Treat a fetch error as a first-class state with a dedicated card: large icon, "تعذّر تحميل البيانات المالية", and a prominent "إعادة المحاولة" button. Then the tabs become empty-state placeholders, not a void.

### M-2. `/admin/stats/finance` — title cut off, content absent
**Screenshot:** `admin-stats-finance-desktop.png`
Title is rendered as "السجل والتقرير المالي لل..." with the closing characters clipped on the right (likely a flex/overflow issue at 1440px). The page shows an error toast and three tabs but no body. Inconsistent with `admin-stats-courses` which renders its full content.

**Fix:** Allow the H1 to wrap to two lines (`flex-wrap: wrap` on the header, or `whitespace-normal` on the title). Add a proper error card as in M-1.

### M-3. `/admin/payment-numbers` — renders the user-account menu dropdown instead of the page content
**Screenshot:** `admin-payment-numbers-desktop.png`
The page area is empty (just the Next.js dev indicator) and the user-account dropdown menu is shown open in the top-right ("مدير المنصة / حسابي / نتيجة الاختبارات / تفعيل كود / الإشعارات / تسجيل الخروج"). This is the wrong content for the URL — the page should list InstaPay / Vodafone Cash payment numbers with add/remove/edit controls. The dropdown being open suggests the page did a render, threw, and the click-outside logic captured the state.

**Fix:** Verify the page component renders its own layout, not a hover-dropdown. Add a loading skeleton and error state. Re-test with the proper backend or a mocked data source.

### M-4. `/admin/students` filter chip and search input appear cut off / overlapping
**Screenshot:** `admin-students-desktop.png`
The filter row (4 chips: الكل, نشط, معلق, مرفوض, year dropdown) plus a search input. The search input placeholder "ابحث بالاسم أو الرقم أو البريد..." overlaps the dropdown's selected-value text on the right. Functional but visually crowded; the search input is on the same row as the dropdown with insufficient gap.

**Fix:** Stack the search row below the filter row at all breakpoints ≥ 1024px, or move the year dropdown next to the chips and let the search input own the full second row.

### M-5. `/admin/stats/courses` — title cut off, error toast dominates
**Screenshot:** `admin-stats-courses-desktop.png`
Title renders as "إحصائيات الكورسات وال..." — clipped on the right. The two stat cards and the empty state render correctly, but the prominent red error toast "فشل تحميل إحصائيات الكورسات" sits in the title area and visually fights with the page header.

**Fix:** Allow the title to wrap (see M-2). Move the error
