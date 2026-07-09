# Design Quality Audit — Frontend Migration

**Date:** 2026-07-09
**Auditor:** MiniMax Design Quality Gate
**Target:** `frontend/` (Next.js 16 + React 19)
**Render protocol:** Playwright (chromium) screenshots, desktop 1440x900 + mobile 390x844, `fullPage: true`, with scroll-and-settle to trigger IntersectionObserver fades.

---

## CRITICAL FINDINGS (page is broken in the screenshot)

### 1. Home `/` — IntersectionObserver hides everything below the hero
**Screenshot:** `01-home-desktop.png` (1440x3620, logged-out)
The hero and the in-hero stat row render, then ~2,700px of pure blank space until the footer. The features section, courses section, stats section, and CTA section all start with `opacity: 0; transform: translateY(30px)` (via `.section-animate` in `app/globals.css:338`) and only become visible when the IntersectionObserver adds `.section-visible`. Verified in DOM: at `t=0` all five sections report `opacity: "0"`; only after a manual scroll-and-settle do they reach `opacity: "1"`. A first-time visitor who lands and does not scroll sees an essentially empty page.
**Fix:** Remove the `opacity:0` baseline (or make it the animation's "from" state only, with an `animation-fill-mode: backwards` that completes on its own). The scroll trigger should be additive, not a precondition for visibility.

### 2. Forum (student) — Runtime TypeError, page is dead
**Screenshot:** `13-forum-desktop.png`
Next.js dev overlay shows: *"Runtime TypeError: Cannot read properties of undefined (reading 'length')"* at `app/forum/page.tsx:332:19`, inside `StudentForumPage`. The `posts` state is undefined when first rendered. The entire page is replaced by the error overlay.
**Fix:** Initialize `posts` to `[]` (and likewise for any other collection state) and guard with `posts?.length === 0 ? ... : posts.map(...)`.

### 3. Comprehensive Exams (student) `/comprehensive-exams/[id]` — Renders with no styling
**Screenshot:** `20-comprehensive-exams-1-desktop.png` and `20-comprehensive-exams-1-mobile.png`
The whole page is unstyled raw HTML: bordered boxes with no rounded corners, no card backgrounds, no badge color, no button styling, no card shadow, "العودة للرئيسية" link in the top-right is bare. Title is hard-coded test string "CE Frontend Updated". The page uses Tailwind utility classes (`bg-white rounded-3xl border border-gray-100 shadow-xl`, `text-3xl font-black text-gray-900`, `bg-[#f8fafc]`, `fixed inset-0 z-[100] p-4`, etc.) but Tailwind utilities are not generated: `bg-white` resolves to `background-color: rgba(0,0,0,0)` (verified in DOM), `rounded-3xl` has no effect, `text-3xl` only partially works.
**Root cause:** `app/globals.css:1-3` uses the legacy Tailwind v3 directives (`@tailwind base; @tailwind components; @tailwind utilities;`) but `postcss.config.mjs` wires the v4 plugin (`@tailwindcss/postcss`), which ignores those directives. The v4-correct `@import "tailwindcss";` is missing.
**Fix:** Replace the three `@tailwind` lines with `@import "tailwindcss";` and verify Tailwind picks up the utility classes. Also replace the "CE Frontend Updated" test fixture with real data.

### 4. Admin — Center Codes — Admin auth check uses wrong field name, page redirects to home
**Screenshot:** `40-admin-center-codes-desktop.png` (the URL the test requested is `/admin/center-codes`; the captured URL is `/`, the home page)
`app/admin/center-codes/page.tsx:75` checks `user?.is_admin` (snake_case) but the UserResource returns `isAdmin` (camelCase). The check always fails for an actual admin, so the page silently pushes the user to `/`. In the screenshot we see the home page being rendered in the admin viewport.
**Fix:** Use `user?.isAdmin || user?.is_admin || user?.role === 'admin'`.

### 5. Admin — Students — API response shape mismatch, always shows 0
**Screenshot:** `31-admin-students-desktop.png` shows "0 طلاب / 0 طالب/ة" and an empty list, while `/api/admin/users` actually returns 20 student records.
`app/admin/students/page.tsx:101-103` reads `data.data.data`, `data.data.last_page`, `data.data.total` (Laravel paginator shape), but the controller returns `{success, message, data: [...]}` (flat array). So `setStudents` receives `undefined`, and the empty state is shown.
**Fix:** Read `data.data || []`, `data.data?.length || 0` and either implement client-side pagination or fix the backend to return a paginator.

### 6. Admin home — Mobile layout collapsed to a 320px column
**Screenshot:** `30-admin-home-mobile.png` (390x2502)
On mobile the sidebar and main content are squeezed into a narrow left column (≈320px) with a huge empty right gutter. The sidebar is supposed to be a slide-in drawer on mobile (the AdminSidebar has a `mobileOpen` state) but it is being rendered inline next to the main content instead of replacing it.
**Fix:** Below the mobile breakpoint the layout should be `grid-template-columns: 1fr` (sidebar hidden by default, opened via hamburger), not the desktop `250px 1fr` two-column.

---

## MAJOR FINDINGS (clear design-bar violation, visible in the screenshot)

### M1. Login / Register / OTP — Brand panel text and primary button have critical contrast failures
**Screenshots:** `02-login-desktop.png`, `03-register-desktop.png`, `05-otp-desktop.png`
The right teal panel uses the same hue for both the background and the brand wordmark "منصتنا" plus the descriptive paragraph; the text is effectively illegible (low contrast teal-on-teal). The "تسجيل دخول" / "إنشاء حساب" / "تحقق من الكود" submit button renders as a low-saturation gray instead of the primary teal, looking like a disabled control. On the OTP page the brand name is also misspelled **"منصاتي"** instead of the real brand **"منصتنا"**.
**Fix:** Make the brand title and description white (or a very light tint) on the teal panel; render the primary submit button with the full `var(--primary)` gradient at full opacity.

### M2. Dashboard — Sidebar falls back to "م" because user data is empty at first paint
**Screenshot:** `10-dashboard-desktop.png`
The right sidebar shows the fallback avatar initial "م" (meem) and "0 الكورسات" / "معلق" account status. With more wait time the same page does load the real user data (verified via a 3 s wait debug), but the capture at 3.5 s still catches the placeholder. The page should treat the pre-data state as a real loading skeleton, not a fully-rendered shell with `---` placeholders or wrong initials.
**Fix:** While `loading` is true, keep the existing full-page spinner; only render the sidebar/table once `userData` is non-null. Add a visible skeleton row, not `'---'` text.

### M3. Admin — Pending Students table has a row but renders the wrong column count and a broken status badge
**Screenshot:** `41-admin-pending-students-desktop.png`
The data row uses "لا يوجد" / "Invalid Date" placeholders for fields the API did not supply, and the action column is showing "موافقة" with a checkmark only, no "رفض" button, so the workflow is incomplete. Also the action badge is the only thing on the row, the row's avatar shows "m" with no last-name initial.
**Fix:** Handle the `null` / missing field shape gracefully; add the "رفض" action and a confirm dialog.

---

## MINOR FINDINGS

- Comprehensive Exams page uses `dir="ltr"` inline even inside an Arabic app (e.g. phone numbers and times are LTR only, but the title block is LTR-aligned). Mixed direction in one card.
- The bottom "العودة للرئيسية" link on the comprehensive exam page is positioned absolutely with no visual treatment.
- The "CE Frontend Updated" hard-coded test fixture should be removed and replaced with a real exam title.
- The home page features "تعلم عميق" card hover transition only changes background — the icon stays static (as designed, but the hover doesn't match the rest of the platform's hover style).
- Stat-card text on `/admin` uses the same teal as the sidebar active link, blurring the focus.
