# Frontend Comparison Report

## Files only in Current Frontend (new-minasaati)
- `.env.local`
- `lib`
- `middleware.ts`
- `next-env.d.ts`
- `services`
- `store`
- `tsconfig.tsbuildinfo`
- `types`
- `app\admin\courses\[id]\comprehensive-exams`
- `app\components\providers`
- `app\exams\[id]`

## Files only in Other Frontend (minasaati-last-latest-minasa)
- `app\admin\exams`
- `app\admin\finance`
- `app\exams\[lectureId]`
- `test-results\student-flows-Student-Regi-1defe-ccount-goes-to-waiting-room-chromium`
- `test-results\student-flows-Student-Regi-1defe-ccount-goes-to-waiting-room-chromium-retry1`
- `test-results\student-flows-Student-Regi-28d1c-new-student-with-valid-data-chromium`
- `test-results\student-flows-Student-Regi-28d1c-new-student-with-valid-data-chromium-retry1`
- `test-results\student-flows-Student-Regi-d0612-duplicate-email-shows-error-chromium`
- `test-results\student-flows-Student-Regi-d0612-duplicate-email-shows-error-chromium-retry1`

## Modified Files (Content Differences)
### `next.config.ts`
```diff
--- Current: next.config.ts
+++ Other: next.config.ts
@@ -1,89 +1,16 @@
 import "./instrument.mjs";
 import type { NextConfig } from "next";
-
-// 🚀 SEC-MAJOR-01: baseline hardening headers for every response.
-// - HSTS is HTTPS-only (the `(.*)` matcher would not gate by scheme, so we
-//   include the header unconditionally — non-prod local dev simply ignores
-//   it because no browser on http://localhost enforces HSTS).
-// - CSP uses nonce-free directives because the platform is fully
-//   server-rendered with React 19 (no inline scripts after build). If a
-//   future feature needs inline scripts, switch to a nonce-based CSP.
-const securityHeaders = [
-  {
-    key: "X-Content-Type-Options",
-    value: "nosniff",
-  },
-  {
-    key: "X-Frame-Options",
-    value: "DENY",
-  },
-  {
-    key: "Referrer-Policy",
-    value: "strict-origin-when-cross-origin",
-  },
-  {
-    key: "Permissions-Policy",
-    value: "camera=(), microphone=(), geolocation=(), payment=()",
-  },
-  {
-    key: "Cross-Origin-Opener-Policy",
-    value: "same-origin",
-  },
-  {
-    key: "Cross-Origin-Resource-Policy",
-    value: "same-origin",
-  },
-  {
-    key: "Strict-Transport-Security",
-    value: "max-age=63072000; includeSubDomains; preload",
-  },
-  {
-    // Content-Security-Policy
-    // - default-src 'self'                 → no third-party loads by default
-    // - script-src 'self' 'unsafe-inline'  → Next.js inserts inline hydration
-    //                                       scripts at build time; this is
-    //                                       the standard Next.js 16 baseline
-    // - style-src 'self' 'unsafe-inline'   → styled-jsx and CSS-in-JS
-    // - img-src 'self' data: https:        → allow remote CDN images (B2/Cloudflare)
-    // - media-src 'self' https:            → HLS video segments
-    // - connect-src 'self' https: wss:     → API + Reverb WebSocket
-    // - frame-ancestors 'none'             → mirrors X-Frame-Options
-    // - base-uri 'self'                    → block <base> hijacks
-    // - form-action 'self'                 → block form submission to attacker
-    key: "Content-Security-Policy",
-    value: [
-      "default-src 'self'",
-      "script-src 'self' 'unsafe-inline'",
-      "style-src 'self' 'unsafe-inline'",
-      "img-src 'self' data: https:",
-      "media-src 'self' https:",
-      "font-src 'self' data:",
-      "connect-src 'self' https: wss:",
-      "frame-ancestors 'none'",
-      "base-uri 'self'",
-      "form-action 'self'",
-    ].join("; "),
-  },
-];
 
 const nextConfig: NextConfig = {
   reactStrictMode: true,
   transpilePackages: [],
   turbopack: {},
-  async headers() {
-    return [
-      {
-        source: "/(.*)",
-        headers: securityHeaders,
-      },
-    ];
-  },
   webpack: (config, { dev, isServer }) => {
     // 🚀 تطبيق التشفير (Obfuscation) في وضع الإنتاج ولجهة العميل فقط
     if (!dev && !isServer) {
       // eslint-disable-next-line @typescript-eslint/no-require-imports
       const WebpackObfuscator = require('webpack-obfuscator');
-
+      
       config.plugins.push(
         new WebpackObfuscator({
           controlFlowFlattening: true,
```

- `package-lock.json` (Config/Lock file - Skipped Diffs)
### `package.json`
```diff
--- Current: package.json
+++ Other: package.json
@@ -13,22 +13,17 @@
   },
   "dependencies": {
     "@sentry/node": "^10.58.0",
-    "axios": "^1.18.1",
-    "firebase": "^12.15.0",
     "hls.js": "^1.5.7",
-    "js-cookie": "^3.0.8",
     "laravel-echo": "^2.3.4",
-    "next": "^16.2.10",
+    "next": "16.2.4",
     "pusher-js": "^8.5.0",
     "react": "19.2.4",
     "react-dom": "19.2.4",
-    "video.js": "^8.10.0",
-    "zustand": "^5.0.14"
+    "video.js": "^8.10.0"
   },
   "devDependencies": {
     "@playwright/test": "^1.61.0",
     "@tailwindcss/postcss": "^4",
-    "@types/js-cookie": "^3.0.6",
     "@types/node": "^20",
     "@types/react": "^19",
     "@types/react-dom": "^19",
```

- `pnpm-lock.yaml` (Config/Lock file - Skipped Diffs)
### `app\layout.tsx`
```diff
--- Current: app\layout.tsx
+++ Other: app\layout.tsx
@@ -1,8 +1,7 @@
-// frontend/app/layout.tsx
 import './globals.css';
 import type { Metadata } from 'next';
 import { ThemeProvider } from './components/ThemeProvider';
-import AuthProvider from './components/providers/AuthProvider';
+import BlockedUserCheck from './components/BlockedUserCheck';
 
 export const metadata: Metadata = {
   title: 'منصتنا | Minassati',
@@ -20,16 +19,20 @@
   return (
     <html lang="ar" dir="rtl" suppressHydrationWarning>
       <head>
-        {/* ... (نفس إعدادات الخطوط الممتازة الخاصة بك) ... */}
+        <link rel="preconnect" href="https://fonts.googleapis.com" />
+        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
+        <link 
+          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" 
+          rel="stylesheet" 
+        />
       </head>
       <body className="antialiased" suppressHydrationWarning>
         <ThemeProvider>
-          {/* 🚀 AuthProvider يقوم بتهيئة Zustand وجلب بيانات الطالب لمرة واحدة فقط */}
-          <AuthProvider>
+          <BlockedUserCheck>
             {children}
-          </AuthProvider>
+          </BlockedUserCheck>
         </ThemeProvider>
       </body>
     </html>
   );
-}+}
```

### `app\page.tsx`
```diff
--- Current: app\page.tsx
+++ Other: app\page.tsx
@@ -2,9 +2,8 @@
 
 import { useEffect, useState } from 'react';
 import Link from 'next/link';
+import { useRouter } from 'next/navigation';
 import Navbar from './components/Navbar';
-import api from '@/lib/axios';
-import { useAuthStore } from '@/store/useAuthStore';
 import {
   BookIcon,
   VideoIcon,
@@ -18,9 +17,19 @@
   CheckIcon,
   ClockIcon,
   ShieldIcon,
+  ChevronLeftIcon,
 } from './components/Icons';
 
-// 🚀 يُفضل نقل هذه الـ Interfaces إلى ملف types/models.ts لاحقاً
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+
+interface User {
+  id: number;
+  full_name: string;
+  status: string;
+  wallet_balance: number;
+  isAdmin: boolean;
+}
+
 interface Course {
   id: number;
   title: string;
@@ -65,16 +74,16 @@
 ];
 
 export default function Home() {
-  // 🚀 استدعاء بيانات الطالب وحالة التحميل من المحرك المركزي مباشرة (بدون Fetch يدوي)
-  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
-  
+  const router = useRouter();
+  const [user, setUser] = useState<User | null>(null);
+  const [loading, setLoading] = useState(true);
   const [courses, setCourses] = useState<Course[]>([]);
   const [coursesLoading, setCoursesLoading] = useState(true);
 
   useEffect(() => {
+    checkAuth();
     fetchLatestCourses();
-
-    // 🚀 Scroll-triggered animations
+    // Scroll-triggered animations
     const observer = new IntersectionObserver(
       (entries) => {
         entries.forEach((entry) => {
@@ -86,52 +95,90 @@
       },
       { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
     );
-
+    // Observe all sections after render
     setTimeout(() => {
       document.querySelectorAll('.features-section, .courses-section, .stats-section, .cta-section, .footer').forEach((el) => {
         el.classList.add('section-animate');
         observer.observe(el);
       });
     }, 100);
-
     return () => observer.disconnect();
+  // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);
+
+  const getToken = () => {
+    let token = document.cookie
+      .split('; ')
+      .find(row => row.startsWith('token='))
+      ?.split('=')[1];
+    if (!token) {
+      token = localStorage.getItem('token') || '';
+    }
+    return token;
+  };
+
+  const checkAuth = async () => {
+    try {
+      let token = document.cookie
+        .split('; ')
+        .find(row => row.startsWith('token='))
+        ?.split('=')[1];
+      if (!token) {
+        token = localStorage.getItem('token') || '';
+      }
+      if (token) {
+        const expiryDate = new Date();
+        expiryDate.setDate(expiryDate.getDate() + 30);
+        document.cookie = `token=${token}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax`;
+      }
+      if (!token) {
+        setLoading(false);
+        return;
+      }
+      const response = await fetch(`${API_URL}/api/auth/me`, {
+        headers: { 
+          Authorization: `Bearer ${token}`,
+          'Accept': 'application/json'
+        },
+      });
+      if (response.ok) {
+        const data = await response.json();
+        setUser(data.data);
+        if (data.data.status === 'pending') {
+          router.push('/waiting-room');
+          return;
+        }
+        if (data.data.status === 'rejected') {
+          router.push('/resubmit');
+          return;
+        }
+      } else {
+        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
+        localStorage.removeItem('token');
+      }
+    } catch (error) {
+      console.error('Auth check failed:', error);
+      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
+      localStorage.removeItem('token');
+    } finally {
+      setLoading(false);
+    }
+  };
 
   const fetchLatestCourses = async () => {
     try {
-      const response = await api.get('/courses');
-      const rawCourses = response.data?.data || response.data || [];
-      
-      // المرحلة الأولى: تجهيز الكورسات بدون عدد المحاضرات
-      let mappedCourses = rawCourses.map((c: any) => ({
-        id: c.id,
-        title: c.title,
-        description: c.description,
-        pricePoints: c.price_points ?? c.pricePoints ?? 0,
-        validityDate: c.validity_date ?? c.validityDate ?? null,
-        lecturesCount: 0, // قيمة مبدئية سيتم تحديثها فوراً
-        createdAt: c.created_at ?? c.createdAt ?? '',
-      }));
-
-      // 🚀 المرحلة الثانية (الدالة المطلوبة): المرور على الكورسات المعروضة فقط لجلب عدد محاضراتها
-      mappedCourses = await Promise.all(
-        mappedCourses.map(async (course: Course) => {
-          try {
-            // نطلب تفاصيل الكورس التي تحتوي على المحاضرات
-            const detailRes = await api.get(`/courses/${course.id}`);
-            const detailData = detailRes.data?.data || detailRes.data;
-            
-            // قراءة العدد من الحقل أو من طول مصفوفة المحاضرات
-            const count = detailData?.lectures_count ?? detailData?.lecturesCount ?? (detailData?.lectures?.length || 0);
-            return { ...course, lecturesCount: count };
-          } catch (err) {
-            console.error(`Failed to fetch lectures count for course ${course.id}`);
-            return course; // في حال الفشل نتركه 0 ولا نوقف الصفحة
-          }
-        })
-      );
-      
-      setCourses(mappedCourses);
+      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
+      const response = await fetch(`${API_URL}/api/courses`, {
+        method: 'GET',
+        headers: {
+          'Accept': 'application/json',
+          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
+        },
+      });
+      if (response.ok) {
+        const data = await response.json();
+        setCourses(data.data || []);
+      }
     } catch (error) {
       console.error('Error fetching courses:', error);
     } finally {
@@ -139,8 +186,27 @@
     }
   };
 
-  // 🚀 نعتمد على authLoading القادم من Zustand لمنع وميض الشاشة
-  if (authLoading) {
+  const handleLogout = async () => {
+    try {
+      const token = document.cookie
+        .split('; ')
+        .find(row => row.startsWith('token='))
+        ?.split('=')[1];
+      if (token) {
+        await fetch(`${API_URL}/api/auth/logout`, {
+          method: 'POST',
+          headers: { Authorization: `Bearer ${token}` },
+        });
+      }
+    } catch {
+      // Ignore logout errors
+    } finally {
+      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
+      setUser(null);
+    }
+  };
+
+  if (loading) {
     return (
       <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
         <div className="spinner spinner-lg"></div>
@@ -153,150 +219,1195 @@
       <Navbar />
 
       <style jsx>{`
-        /* ... (احتفظنا بكافة أكواد الـ CSS والتأثيرات الحركية الخاصة بك كما هي دون المساس بجمال التصميم) ... */
-        .hero-section { position: relative; overflow: hidden; padding: 2rem 5% 4rem; min-height: 90vh; display: flex; align-items: center; }
-        .hero-blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.3; pointer-events: none; animation: blob 15s ease-in-out infinite; }
-        [data-theme="dark"] .hero-blob { opacity: 0.15; }
-        .hero-blob-1 { width: 500px; height: 500px; background: linear-gradient(135deg, var(--primary), transparent); top: -15%; left: -10%; }
-        .hero-blob-2 { width: 400px; height: 400px; background: linear-gradient(135deg, var(--accent), transparent); bottom: -10%; right: -8%; animation-delay: -5s; }
-        .hero-blob-3 { width: 300px; height: 300px; background: linear-gradient(135deg, var(--secondary), transparent); top: 20%; right: 35%; animation-delay: -10s; opacity: 0.2; }
-        .hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center; max-width: 1200px; margin: 0 auto; width: 100%; position: relative; z-index: 2; }
-        .hero-content { position: relative; }
-        .hero-badge { display: inline-flex; align-items: center; gap: 0.5rem; background: var(--hero-badge-bg); padding: 0.5rem 1.25rem; border-radius: 9999px; font-size: 0.8125rem; font-weight: 600; color: var(--primary); margin-bottom: 1.5rem; border: 1px solid var(--hero-badge-border); }
-        .hero-badge-dot { width: 8px; height: 8px; background: var(--accent); border-radius: 50%; animation: pulseGlow 2s ease-in-out infinite; }
-        .hero-title { font-size: clamp(2.75rem, 5vw, 4rem); font-weight: 800; line-height: 1.12; margin-bottom: 1.25rem; letter-spacing: -0.02em; color: var(--text-primary); }
-        .hero-title-gradient { background: linear-gradient(135deg, #0B4F6C 0%, #1BBDD4 50%, #0B7A8A 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
-        .hero-subtitle { font-size: 1.125rem; line-height: 1.8; color: var(--text-secondary); margin-bottom: 2rem; max-width: 480px; }
-        .hero-actions { display: flex; gap: 1rem; flex-wrap: wrap; }
-        .hero-stats-row { display: flex; gap: 2rem; margin-top: 2.5rem; padding-top: 2rem; border-top: 1px solid var(--border-light); }
-        .hero-stat { display: flex; align-items: center; gap: 0.75rem; }
-        .hero-stat-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
-        .hero-stat-value { font-weight: 800; font-size: 1.125rem; color: var(--text-primary); line-height: 1.3; }
-        .hero-stat-label { font-size: 0.8125rem; color: var(--text-muted); }
-        .hero-visual { position: relative; display: flex; justify-content: center; align-items: center; min-height: 500px; }
-        .hero-visual-bg { position: absolute; width: 520px; height: 520px; border-radius: 50%; background: radial-gradient(circle at 30% 40%, rgba(11, 122, 138, 0.06) 0%, rgba(27, 189, 212, 0.03) 40%, transparent 70%); animation: blob 12s ease-in-out infinite; }
-        [data-theme="dark"] .hero-visual-bg { background: radial-gradient(circle at 30% 40%, rgba(27, 189, 212, 0.04) 0%, rgba(27, 189, 212, 0.02) 40%, transparent 70%); }
-        .hero-visual-bg-2 { position: absolute; width: 400px; height: 400px; border-radius: 50%; top: 10%; right: 10%; background: radial-gradient(circle at 70% 60%, rgba(11, 79, 108, 0.04) 0%, transparent 60%); animation: blob 15s ease-in-out infinite reverse; }
-        [data-theme="dark"] .hero-visual-bg-2 { background: radial-gradient(circle at 70% 60%, rgba(27, 189, 212, 0.03) 0%, transparent 60%); }
-        .hero-card-main { position: relative; width: 360px; background: var(--glass-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 24px; border: 1px solid var(--glass-border); box-shadow: 0 20px 60px rgba(11, 79, 108, 0.1); overflow: hidden; z-index: 2; transition: transform 0.4s var(--ease-out), box-shadow 0.4s var(--ease-out); }
-        [data-theme="dark"] .hero-card-main { box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); }
-        .hero-card-main:hover { transform: translateY(-6px); box-shadow: 0 24px 80px rgba(11, 79, 108, 0.18); }
-        .hero-card-header { height: 110px; background: linear-gradient(135deg, var(--primary), var(--secondary)); position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; }
-        .hero-card-header::before { content: ''; position: absolute; inset: 0; background-image: radial-gradient(circle at 20px 20px, rgba(255,255,255,0.06) 1px, transparent 1px); background-size: 30px 30px; }
-        .hero-card-header-content { text-align: center; position: relative; z-index: 1; }
-        .hero-card-header-icon { width: 48px; height: 48px; margin: 0 auto 0.5rem; background: rgba(255,255,255,0.15); border-radius: 14px; display: flex; align-items: center; justify-content: center; color: white; }
-        .hero-card-header-title { color: white; font-weight: 700; font-size: 1rem; }
-        .hero-card-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
-        .hero-card-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.75rem; border-radius: 12px; background: var(--soft-bg); border: 1px solid var(--border-light); transition: all 0.25s var(--ease-out); }
-        .hero-card-row:hover { background: var(--soft-bg-hover); transform: translateX(-3px); }
-        .hero-card-row-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
-        .hero-card-row-text { flex: 1; }
-        .hero-card-row-title { font-weight: 600; font-size: 0.875rem; color: var(--text-primary); }
-        .hero-card-row-desc { font-size: 0.75rem; color: var(--text-muted); }
-        .hero-badge-float { position: absolute; background: var(--glass-bg); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); border-radius: 14px; border: 1px solid var(--glass-border); padding: 0.65rem 1.1rem; display: flex; align-items: center; gap: 0.65rem; box-shadow: 0 8px 32px rgba(11, 79, 108, 0.08); z-index: 3; transition: all 0.3s var(--ease-out); }
-        [data-theme="dark"] .hero-badge-float { box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); }
-        .hero-badge-float:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 12px 40px rgba(11, 79, 108, 0.15); }
-        .hero-badge-float-1 { top: 5%; left: -50px; animation: floatSlow 4s ease-in-out infinite; }
-        .hero-badge-float-2 { bottom: 18%; left: -70px; animation: floatSlow 4.5s ease-in-out infinite -1.5s; }
-        .hero-badge-float-3 { top: 25%; right: -50px; animation: floatSlow 5s ease-in-out infinite -3s; }
-        .hero-badge-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
-        .hero-badge-value { font-weight: 700; font-size: 0.875rem; color: var(--text-primary); line-height: 1.3; }
-        .hero-badge-label { font-size: 0.7rem; color: var(--text-muted); }
-        .features-section { padding: 5rem 5%; max-width: 1200px; margin: 0 auto; width: 100%; }
-        .section-header { text-align: center; margin-bottom: 4rem; }
-        .section-label { display: inline-flex; align-items: center; gap: 0.5rem; background: var(--muted-bg); padding: 0.375rem 1rem; border-radius: 9999px; font-size: 0.8125rem; font-weight: 600; color: var(--primary); margin-bottom: 1rem; border: 1px solid var(--glass-border); }
-        .section-title { font-size: 2.25rem; font-weight: 800; color: var(--text-primary); margin-bottom: 1rem; letter-spacing: -0.01em; }
-        .section-subtitle { color: var(--text-secondary); font-size: 1.0625rem; max-width: 560px; margin: 0 auto; line-height: 1.8; }
-        .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
-        .feature-card { background: var(--surface); border-radius: 18px; border: 1px solid var(--border); padding: 2rem; position: relative; overflow: hidden; transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); cursor: default; }
-        .feature-card::before { content: ''; position: absolute; top: 0; inset-inline-start: 0; width: 100%; height: 3px; background: var(--gradient-primary); opacity: 0; transform: scaleX(0.3); transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
-        .feature-card:hover { transform: translateY(-6px); box-shadow: var(--card-hover-shadow); border-color: rgba(11, 122, 138, 0.2); }
-        .feature-card:hover::before { opacity: 1; transform: scaleX(1); }
-        .feature-icon { width: 52px; height: 52px; border-radius: 14px; background: var(--muted-bg); display: flex; align-items: center; justify-content: center; color: var(--primary); margin-bottom: 1.25rem; transition: all 0.35s var(--ease-out); }
-        .feature-card:hover .feature-icon { background: var(--gradient-primary); color: white; transform: scale(1.05); }
-        .feature-title { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.625rem; }
-        .feature-desc { font-size: 0.9375rem; color: var(--text-secondary); line-height: 1.7; }
-        .courses-section { padding: 5rem 5%; max-width: 1200px; margin: 0 auto; width: 100%; }
-        .courses-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
-        .course-card { background: var(--surface); border-radius: 18px; border: 1px solid var(--border); overflow: hidden; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
-        .course-card:hover { transform: translateY(-6px); box-shadow: 0 16px 48px rgba(11, 79, 108, 0.12); border-color: rgba(27, 189, 212, 0.2); }
-        [data-theme="dark"] .course-card:hover { box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
-        .course-cover { height: 180px; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; }
-        .course-cover::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, var(--soft-bg) 0%, var(--muted-bg) 100%); z-index: 1; }
-        .course-cover-pattern { position: absolute; inset: 0; opacity: 0.06; background-image: radial-gradient(circle at 20% 50%, var(--primary) 1px, transparent 1px), radial-gradient(circle at 80% 50%, var(--secondary) 1px, transparent 1px); background-size: 40px 40px; transition: transform 0.5s ease; }
-        .course-card:hover .course-cover-pattern { transform: scale(1.1); }
-        .course-cover-icon { position: relative; z-index: 2; color: var(--primary); opacity: 0.6; transition: all 0.4s ease; }
-        .course-card:hover .course-cover-icon { transform: scale(0.9); opacity: 0.8; }
-        .course-price-badge { position: absolute; top: 1rem; inset-inline-end: 1rem; z-index: 3; }
-        .course-body { padding: 1.5rem; }
-        .course-title { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem; line-height: 1.4; }
-        .course-desc { font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
-        .course-meta { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; font-size: 0.8125rem; color: var(--text-muted); }
-        .course-meta-item { display: flex; align-items: center; gap: 0.375rem; }
-        .stats-section { max-width: 1200px; margin: 0 auto; padding: 0 5%; width: 100%; }
-        .stats-container { background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); border-radius: 24px; padding: 4rem; position: relative; overflow: hidden; }
-        .stats-container::before { content: ''; position: absolute; inset: 0; opacity: 0.06; background-image: radial-gradient(circle at 20px 20px, rgba(255,255,255,0.1) 1px, transparent 1px); background-size: 32px 32px; }
-        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; position: relative; z-index: 1; }
-        .stat-item { text-align: center; padding: 1rem; }
-        .stat-icon { width: 48px; height: 48px; margin: 0 auto 1rem; border-radius: 14px; background: rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: center; color: var(--accent); }
-        .stat-value { font-family: var(--font-display); font-size: 3rem; font-weight: 800; color: white; display: block; margin-bottom: 0.25rem; letter-spacing: -0.02em; }
-        .stat-label { color: rgba(255, 255, 255, 0.6); font-size: 1rem; font-weight: 500; }
-        .cta-section { max-width: 1200px; margin: 0 auto; padding: 5rem 5%; width: 100%; }
-        .cta-card { background: var(--surface); border-radius: 24px; border: 1px solid var(--border); padding: 4rem 2rem; text-align: center; position: relative; overflow: hidden; box-shadow: var(--shadow-lg); }
-        .cta-card::before { content: ''; position: absolute; top: 0; inset-inline-start: 0; width: 100%; height: 4px; background: var(--gradient-primary); }
-        .cta-title { font-size: 2.25rem; font-weight: 800; color: var(--text-primary); margin-bottom: 1rem; }
-        .cta-subtitle { color: var(--text-secondary); font-size: 1.125rem; max-width: 500px; margin: 0 auto 2.5rem; line-height: 1.8; }
-        .cta-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
-        .footer { border-top: 1px solid var(--border-light); background: var(--surface); padding: 3rem 5% 2rem; }
-        .footer-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 3rem; }
-        .footer-brand { display: flex; flex-direction: column; gap: 1rem; }
-        .footer-logo { display: flex; align-items: center; gap: 0.75rem; font-family: var(--font-display); font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
-        .footer-logo-icon { width: 36px; height: 36px; background: var(--gradient-primary); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 1rem; }
-        .footer-desc { font-size: 0.875rem; color: var(--text-secondary); line-height: 1.7; max-width: 300px; }
-        .footer-heading { font-size: 0.875rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.05em; }
-        .footer-links { list-style: none; display: flex; flex-direction: column; gap: 0.75rem; }
-        .footer-link { font-size: 0.875rem; color: var(--text-secondary); text-decoration: none; transition: color 0.2s; }
-        .footer-link:hover { color: var(--primary); }
-        .footer-bottom { max-width: 1200px; margin: 2rem auto 0; padding-top: 1.5rem; border-top: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; font-size: 0.8125rem; color: var(--text-muted); }
-        
+        /* ===== HERO ===== */
+        .hero-section {
+          position: relative;
+          overflow: hidden;
+          padding: 2rem 5% 4rem;
+          min-height: 90vh;
+          display: flex;
+          align-items: center;
+        }
+
+        /* Hero Blob Backgrounds (from reference) */
+        .hero-blob {
+          position: absolute;
+          border-radius: 50%;
+          filter: blur(80px);
+          opacity: 0.3;
+          pointer-events: none;
+          animation: blob 15s ease-in-out infinite;
+        }
+
+        [data-theme="dark"] .hero-blob {
+          opacity: 0.15;
+        }
+
+        .hero-blob-1 {
+          width: 500px;
+          height: 500px;
+          background: linear-gradient(135deg, var(--primary), transparent);
+          top: -15%;
+          left: -10%;
+        }
+
+        .hero-blob-2 {
+          width: 400px;
+          height: 400px;
+          background: linear-gradient(135deg, var(--accent), transparent);
+          bottom: -10%;
+          right: -8%;
+          animation-delay: -5s;
+        }
+
+        .hero-blob-3 {
+          width: 300px;
+          height: 300px;
+          background: linear-gradient(135deg, var(--secondary), transparent);
+          top: 20%;
+          right: 35%;
+          animation-delay: -10s;
+          opacity: 0.2;
+        }
+
+        .hero-grid {
+          display: grid;
+          grid-template-columns: 1fr 1fr;
+          gap: 3rem;
+          align-items: center;
+          max-width: 1200px;
+          margin: 0 auto;
+          width: 100%;
+          position: relative;
+          z-index: 2;
+        }
+
+        .hero-content {
+          position: relative;
+        }
+
+        .hero-badge {
+          display: inline-flex;
+          align-items: center;
+          gap: 0.5rem;
+          background: var(--hero-badge-bg);
+          padding: 0.5rem 1.25rem;
+          border-radius: 9999px;
+          font-size: 0.8125rem;
+          font-weight: 600;
+          color: var(--primary);
+          margin-bottom: 1.5rem;
+          border: 1px solid var(--hero-badge-border);
+        }
+
+        .hero-badge-dot {
+          width: 8px;
+          height: 8px;
+          background: var(--accent);
+          border-radius: 50%;
+          animation: pulseGlow 2s ease-in-out infinite;
+        }
+
+        .hero-title {
+          font-size: clamp(2.75rem, 5vw, 4rem);
+          font-weight: 800;
+          line-height: 1.12;
+          margin-bottom: 1.25rem;
+          letter-spacing: -0.02em;
+          color: var(--text-primary);
+        }
+
+        .hero-title-gradient {
+          background: linear-gradient(135deg, #0B4F6C 0%, #1BBDD4 50%, #0B7A8A 100%);
+          -webkit-background-clip: text;
+          -webkit-text-fill-color: transparent;
+          background-clip: text;
+        }
+
+        .hero-subtitle {
+          font-size: 1.125rem;
+          line-height: 1.8;
+          color: var(--text-secondary);
+          margin-bottom: 2rem;
+          max-width: 480px;
+        }
+
+        .hero-actions {
+          display: flex;
+          gap: 1rem;
+          flex-wrap: wrap;
+        }
+
+        .hero-stats-row {
+          display: flex;
+          gap: 2rem;
+          margin-top: 2.5rem;
+          padding-top: 2rem;
+          border-top: 1px solid var(--border-light);
+        }
+
+        .hero-stat {
+          display: flex;
+          align-items: center;
+          gap: 0.75rem;
+        }
+
+        .hero-stat-icon {
+          width: 42px;
+          height: 42px;
+          border-radius: 12px;
+          display: flex;
+          align-items: center;
+          justify-content: center;
+          flex-shrink: 0;
+        }
+
+        .hero-stat-value {
+          font-weight: 800;
+          font-size: 1.125rem;
+          color: var(--text-primary);
+          line-height: 1.3;
+        }
+
+        .hero-stat-label {
+          font-size: 0.8125rem;
+          color: var(--text-muted);
+        }
+
+        /* Hero Visual */
+        .hero-visual {
+          position: relative;
+          display: flex;
+          justify-content: center;
+          align-items: center;
+          min-height: 500px;
+        }
+
+        .hero-visual-bg {
+          position: absolute;
+          width: 520px;
+          height: 520px;
+          border-radius: 50%;
+          background: radial-gradient(circle at 30% 40%, rgba(11, 122, 138, 0.06) 0%, rgba(27, 189, 212, 0.03) 40%, transparent 70%);
+          animation: blob 12s ease-in-out infinite;
+        }
+
+        [data-theme="dark"] .hero-visual-bg {
+          background: radial-gradient(circle at 30% 40%, rgba(27, 189, 212, 0.04) 0%, rgba(27, 189, 212, 0.02) 40%, transparent 70%);
+        }
+
+        .hero-visual-bg-2 {
+          position: absolute;
+          width: 400px;
+          height: 400px;
+          border-radius: 50%;
+          top: 10%;
+          right: 10%;
+          background: radial-gradient(circle at 70% 60%, rgba(11, 79, 108, 0.04) 0%, transparent 60%);
+          animation: blob 15s ease-in-out infinite reverse;
+        }
+
+        [data-theme="dark"] .hero-visual-bg-2 {
+          background: radial-gradient(circle at 70% 60%, rgba(27, 189, 212, 0.03) 0%, transparent 60%);
+        }
+
+        .hero-card-main {
+          position: relative;
+          width: 360px;
+          background: var(--glass-bg);
+          backdrop-filter: blur(20px);
+          -webkit-backdrop-filter: blur(20px);
+          border-radius: 24px;
+          border: 1px solid var(--glass-border);
+          box-shadow: 0 20px 60px rgba(11, 79, 108, 0.1);
+          overflow: hidden;
+          z-index: 2;
+          transition: transform 0.4s var(--ease-out), box-shadow 0.4s var(--ease-out);
+        }
+
+        [data-theme="dark"] .hero-card-main {
+          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
+        }
+
+        .hero-card-main:hover {
+          transform: translateY(-6px);
+          box-shadow: 0 24px 80px rgba(11, 79, 108, 0.18);
+        }
+
+        .hero-card-header {
+          height: 110px;
+          background: linear-gradient(135deg, var(--primary), var(--secondary));
+          position: relative;
+          overflow: hidden;
+          display: flex;
+          align-items: center;
+          justify-content: center;
+        }
+
+        .hero-card-header::before {
+          content: '';
+          position: absolute;
+          inset: 0;
+          background-image: radial-gradient(circle at 20px 20px, rgba(255,255,255,0.06) 1px, transparent 1px);
+          background-size: 30px 30px;
+        }
+
+        .hero-card-header-content {
+          text-align: center;
+          position: relative;
+          z-index: 1;
+        }
+
+        .hero-card-header-icon {
+          width: 48px;
+          height: 48px;
+          margin: 0 auto 0.5rem;
+          background: rgba(255,255,255,0.15);
+          border-radius: 14px;
+          display: flex;
+          align-items: center;
+          justify-content: center;
+          color: white;
+        }
+
+        .hero-card-header-title {
+          color: white;
+          font-weight: 700;
+          font-size: 1rem;
+        }
+
+        .hero-card-body {
+          padding: 1.25rem;
+          display: flex;
+          flex-direction: column;
+          gap: 0.75rem;
+        }
+
+        .hero-card-row {
+          display: flex;
+          align-items: center;
+          gap: 0.75rem;
+          padding: 0.65rem 0.75rem;
+          border-radius: 12px;
+          background: var(--soft-bg);
+          border: 1px solid var(--border-light);
+          transition: all 0.25s var(--ease-out);
+        }
+
+        .hero-card-row:hover {
+          background: var(--soft-bg-hover);
+          transform: translateX(-3px);
+        }
+
+        .hero-card-row-icon {
+          width: 36px;
+          height: 36px;
+          border-radius: 10px;
+          display: flex;
+          align-items: center;
+          justify-content: center;
+          flex-shrink: 0;
+        }
+
+        .hero-card-row-text {
+          flex: 1;
+        }
+
+        .hero-card-row-title {
+          font-weight: 600;
+          font-size: 0.875rem;
+          color: var(--text-primary);
+        }
+
+        .hero-card-row-desc {
+          font-size: 0.75rem;
+          color: var(--text-muted);
+        }
+
+        /* Floating badges around the card */
+        .hero-badge-float {
+          position: absolute;
+          background: var(--glass-bg);
+          backdrop-filter: blur(15px);
+          -webkit-backdrop-filter: blur(15px);
+          border-radius: 14px;
+          border: 1px solid var(--glass-border);
+          padding: 0.65rem 1.1rem;
+          display: flex;
+          align-items: center;
+          gap: 0.65rem;
+          box-shadow: 0 8px 32px rgba(11, 79, 108, 0.08);
+          z-index: 3;
+          transition: all 0.3s var(--ease-out);
+        }
+
+        [data-theme="dark"] .hero-badge-float {
+          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
+        }
+
+        .hero-badge-float:hover {
+          transform: translateY(-4px) scale(1.02);
+          box-shadow: 0 12px 40px rgba(11, 79, 108, 0.15);
+        }
+
+        .hero-badge-float-1 {
+          top: 5%;
+          left: -50px;
+          animation: floatSlow 4s ease-in-out infinite;
+        }
+
+        .hero-badge-float-2 {
+          bottom: 18%;
+          left: -70px;
+          animation: floatSlow 4.5s ease-in-out infinite -1.5s;
+        }
+
+        .hero-badge-float-3 {
+          top: 25%;
+          right: -50px;
+          animation: floatSlow 5s ease-in-out infinite -3s;
+        }
+
+        .hero-badge-icon {
+          width: 34px;
+          height: 34px;
+          border-radius: 10px;
+          display: flex;
+          align-items: center;
+          justify-content: center;
+          flex-shrink: 0;
+        }
+
+        .hero-badge-value {
+          font-weight: 700;
+          font-size: 0.875rem;
+          color: var(--text-primary);
+          line-height: 1.3;
+        }
+
+        .hero-badge-label {
+          font-size: 0.7rem;
+          color: var(--text-muted);
+        }
+
+        /* ===== FEATURES ===== */
+        .features-section {
+          padding: 5rem 5%;
+          max-width: 1200px;
+          margin: 0 auto;
+          width: 100%;
+        }
+
+        .section-header {
+          text-align: center;
+          margin-bottom: 4rem;
+        }
+
+        .section-label {
+          display: inline-flex;
+          align-items: center;
+          gap: 0.5rem;
+          background: var(--muted-bg);
+          padding: 0.375rem 1rem;
+          border-radius: 9999px;
+          font-size: 0.8125rem;
+          font-weight: 600;
+          color: var(--primary);
+          margin-bottom: 1rem;
+          border: 1px solid var(--glass-border);
+        }
+
+        .section-title {
+          font-size: 2.25rem;
+          font-weight: 800;
+          color: var(--text-primary);
+          margin-bottom: 1rem;
+          letter-spacing: -0.01em;
+        }
+
+        .section-subtitle {
+          color: var(--text-secondary);
+          font-size: 1.0625rem;
+          max-width: 560px;
+          margin: 0 auto;
+          line-height: 1.8;
+        }
+
+        .features-grid {
+          display: grid;
+          grid-template-columns: repeat(3, 1fr);
+          gap: 1.5rem;
+        }
+
+        .feature-card {
+          background: var(--surface);
+          border-radius: 18px;
+          border: 1px solid var(--border);
+          padding: 2rem;
+          position: relative;
+          overflow: hidden;
+          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
+          cursor: default;
+        }
+
+        .feature-card::before {
+          content: '';
+          position: absolute;
+          top: 0;
+          inset-inline-start: 0;
+          width: 100%;
+          height: 3px;
+          background: var(--gradient-primary);
+          opacity: 0;
+          transform: scaleX(0.3);
+          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
+        }
+
+        .feature-card:hover {
+          transform: translateY(-6px);
+          box-shadow: var(--card-hover-shadow);
+          border-color: rgba(11, 122, 138, 0.2);
+        }
+
+        .feature-card:hover::before {
+          opacity: 1;
+          transform: scaleX(1);
+        }
+
+        .feature-icon {
+          width: 52px;
+          height: 52px;
+          border-radius: 14px;
+          background: var(--muted-bg);
+          display: flex;
+          align-items: center;
+          justify-content: center;
+          color: var(--primary);
+          margin-bottom: 1.25rem;
+          transition: all 0.35s var(--ease-out);
+        }
+
+        .feature-card:hover .feature-icon {
+          background: var(--gradient-primary);
+          color: white;
+          transform: scale(1.05);
+        }
+
+        .feature-title {
+          font-size: 1.125rem;
+          font-weight: 700;
+          color: var(--text-primary);
+          margin-bottom: 0.625rem;
+        }
+
+        .feature-desc {
+          font-size: 0.9375rem;
+          color: var(--text-secondary);
+          line-height: 1.7;
+        }
+
+        /* ===== COURSES ===== */
+        .courses-section {
+          padding: 5rem 5%;
+          max-width: 1200px;
+          margin: 0 auto;
+          width: 100%;
+        }
+
+        .courses-grid {
+          display: grid;
+          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
+          gap: 1.5rem;
+        }
+
+        .course-card {
+          background: var(--surface);
+          border-radius: 18px;
+          border: 1px solid var(--border);
+          overflow: hidden;
+          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
+        }
+
+        .course-card:hover {
+          transform: translateY(-6px);
+          box-shadow: 0 16px 48px rgba(11, 79, 108, 0.12);
+          border-color: rgba(27, 189, 212, 0.2);
+        }
+
+        [data-theme="dark"] .course-card:hover {
+          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
+        }
+
+        .course-cover {
+          height: 180px;
+          position: relative;
+          display: flex;
+          align-items: center;
+          justify-content: center;
+          overflow: hidden;
+        }
+
+        .course-cover::before {
+          content: '';
+          position: absolute;
+          inset: 0;
+          background: linear-gradient(135deg, var(--soft-bg) 0%, var(--muted-bg) 100%);
+          z-index: 1;
+        }
+
+        .course-cover-pattern {
+          position: absolute;
+          inset: 0;
+          opacity: 0.06;
+          background-image: 
+            radial-gradient(circle at 20% 50%, var(--primary) 1px, transparent 1px),
+            radial-gradient(circle at 80% 50%, var(--secondary) 1px, transparent 1px);
+          background-size: 40px 40px;
+          transition: transform 0.5s ease;
+        }
+
+        .course-card:hover .course-cover-pattern {
+          transform: scale(1.1);
+        }
+
+        .course-cover-icon {
+          position: relative;
+          z-index: 2;
+          color: var(--primary);
+          opacity: 0.6;
+          transition: all 0.4s ease;
+        }
+
+        .course-card:hover .course-cover-icon {
+          transform: scale(0.9);
+          opacity: 0.8;
+        }
+
+        .course-price-badge {
+          position: absolute;
+          top: 1rem;
+          inset-inline-end: 1rem;
+          z-index: 3;
+        }
+
+        .course-body {
+          padding: 1.5rem;
+        }
+
+        .course-title {
+          font-size: 1.125rem;
+          font-weight: 700;
+          color: var(--text-primary);
+          margin-bottom: 0.5rem;
+          line-height: 1.4;
+        }
+
+        .course-desc {
+          font-size: 0.875rem;
+          color: var(--text-secondary);
+          line-height: 1.6;
+          margin-bottom: 1rem;
+          display: -webkit-box;
+          -webkit-line-clamp: 2;
+          -webkit-box-orient: vertical;
+          overflow: hidden;
+        }
+
+        .course-meta {
+          display: flex;
+          align-items: center;
+          justify-content: space-between;
+          margin-bottom: 1.25rem;
+          font-size: 0.8125rem;
+          color: var(--text-muted);
+        }
+
+        .course-meta-item {
+          display: flex;
+          align-items: center;
+          gap: 0.375rem;
+        }
+
+
+
+        /* ===== STATS ===== */
+        .stats-section {
+          max-width: 1200px;
+          margin: 0 auto;
+          padding: 0 5%;
+          width: 100%;
+        }
+
+        .stats-container {
+          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
+          border-radius: 24px;
+          padding: 4rem;
+          position: relative;
+          overflow: hidden;
+        }
+
+        .stats-container::before {
+          content: '';
+          position: absolute;
+          inset: 0;
+          opacity: 0.06;
+          background-image: radial-gradient(circle at 20px 20px, rgba(255,255,255,0.1) 1px, transparent 1px);
+          background-size: 32px 32px;
+        }
+
+        .stats-grid {
+          display: grid;
+          grid-template-columns: repeat(3, 1fr);
+          gap: 2rem;
+          position: relative;
+          z-index: 1;
+        }
+
+        .stat-item {
+          text-align: center;
+          padding: 1rem;
+        }
+
+        .stat-icon {
+          width: 48px;
+          height: 48px;
+          margin: 0 auto 1rem;
+          border-radius: 14px;
+          background: rgba(255, 255, 255, 0.08);
+          display: flex;
+          align-items: center;
+          justify-content: center;
+          color: var(--accent);
+        }
+
+        .stat-value {
+          font-family: var(--font-display);
+          font-size: 3rem;
+          font-weight: 800;
+          color: white;
+          display: block;
+          margin-bottom: 0.25rem;
+          letter-spacing: -0.02em;
+        }
+
+        .stat-label {
+          color: rgba(255, 255, 255, 0.6);
+          font-size: 1rem;
+          font-weight: 500;
+        }
+
+        /* ===== CTA ===== */
+        .cta-section {
+          max-width: 1200px;
+          margin: 0 auto;
+          padding: 5rem 5%;
+          width: 100%;
+        }
+
+        .cta-card {
+          background: var(--surface);
+          border-radius: 24px;
+          border: 1px solid var(--border);
+          padding: 4rem 2rem;
+          text-align: center;
+          position: relative;
+          overflow: hidden;
+          box-shadow: var(--shadow-lg);
+        }
+
+        .cta-card::before {
+          content: '';
+          position: absolute;
+          top: 0;
+          inset-inline-start: 0;
+          width: 100%;
+          height: 4px;
+          background: var(--gradient-primary);
+        }
+
+        .cta-title {
+          font-size: 2.25rem;
+          font-weight: 800;
+          color: var(--text-primary);
+          margin-bottom: 1rem;
+        }
+
+        .cta-subtitle {
+          color: var(--text-secondary);
+          font-size: 1.125rem;
+          max-width: 500px;
+          margin: 0 auto 2.5rem;
+          line-height: 1.8;
+        }
+
+        .cta-actions {
+          display: flex;
+          gap: 1rem;
+          justify-content: center;
+          flex-wrap: wrap;
+        }
+
+        /* ===== FOOTER ===== */
+        .footer {
+          border-top: 1px solid var(--border-light);
+          background: var(--surface);
+          padding: 3rem 5% 2rem;
+        }
+
+        .footer-inner {
+          max-width: 1200px;
+          margin: 0 auto;
+          display: grid;
+          grid-template-columns: 2fr 1fr 1fr;
+          gap: 3rem;
+        }
+
+        .footer-brand {
+          display: flex;
+          flex-direction: column;
+          gap: 1rem;
+        }
+
+        .footer-logo {
+          display: flex;
+          align-items: center;
+          gap: 0.75rem;
+          font-family: var(--font-display);
+          font-size: 1.25rem;
+          font-weight: 700;
+          color: var(--text-primary);
+        }
+
+        .footer-logo-icon {
+          width: 36px;
+          height: 36px;
+          background: var(--gradient-primary);
+          border-radius: 10px;
+          display: flex;
+          align-items: center;
+          justify-content: center;
+          color: white;
+          font-weight: 800;
+          font-size: 1rem;
+        }
+
+        .footer-desc {
+          font-size: 0.875rem;
+          color: var(--text-secondary);
+          line-height: 1.7;
+          max-width: 300px;
+        }
+
+        .footer-heading {
+          font-size: 0.875rem;
+          font-weight: 700;
+          color: var(--text-primary);
+          margin-bottom: 1rem;
+          text-transform: uppercase;
+          letter-spacing: 0.05em;
+        }
+
+        .footer-links {
+          list-style: none;
+          display: flex;
+          flex-direction: column;
+          gap: 0.75rem;
+        }
+
+        .footer-link {
+          font-size: 0.875rem;
+          color: var(--text-secondary);
+          text-decoration: none;
+          transition: color 0.2s;
+        }
+
+        .footer-link:hover {
+          color: var(--primary);
+        }
+
+        .footer-bottom {
+          max-width: 1200px;
+          margin: 2rem auto 0;
+          padding-top: 1.5rem;
+          border-top: 1px solid var(--border-light);
+          display: flex;
+          justify-content: space-between;
+          align-items: center;
+          flex-wrap: wrap;
+          gap: 1rem;
+          font-size: 0.8125rem;
+          color: var(--text-muted);
+        }
+
         /* ===== RESPONSIVE ===== */
-        @media (max-width: 1024px) { .hero-grid { gap: 2rem; } .features-grid { grid-template-columns: repeat(2, 1fr); } .footer-inner { grid-template-columns: 1fr 1fr; } .hero-badge-float-1, .hero-badge-float-3 { display: none; } .hero-badge-float-2 { bottom: 10%; left: -30px; } .courses-grid { grid-template-columns: repeat(2, 1fr); } }
-        @media (max-width: 768px) { .hero-section { padding: 2rem 5% 3rem; min-height: auto; } .hero-grid { grid-template-columns: 1fr; gap: 1.5rem; } .hero-visual { display: none; } .hero-title { font-size: 2rem; text-align: center; } .hero-subtitle { font-size: 1rem; text-align: center; margin-left: auto; margin-right: auto; } .hero-badge { margin-left: auto; margin-right: auto; } .hero-actions { justify-content: center; } .hero-stats-row { justify-content: center; flex-wrap: wrap; gap: 1.5rem; } .features-grid { grid-template-columns: 1fr; } .stats-container { padding: 2rem 1.5rem; border-radius: 18px; margin: 0 0.5rem; } .stats-grid { grid-template-columns: 1fr; gap: 1.5rem; } .stat-value { font-size: 2.25rem; } .cta-card { padding: 2.5rem 1.5rem; } .cta-title { font-size: 1.75rem; } .cta-subtitle { font-size: 1rem; } .footer-inner { grid-template-columns: 1fr; gap: 2rem; text-align: center; } .footer-desc { margin: 0 auto; } .footer-bottom { flex-direction: column; text-align: center; } .courses-grid { grid-template-columns: 1fr; } .section-title { font-size: 1.75rem; } .section-header { margin-bottom: 2.5rem; } .hero-stats-mini { justify-content: center; flex-wrap: wrap; } .course-card { max-width: 100%; } }
-        @media (max-width: 480px) { .hero-section { padding: 1.5rem 4% 2.5rem; } .hero-title { font-size: 1.75rem; } .hero-actions { flex-direction: column; align-items: stretch; } .hero-actions .btn { width: 100%; text-align: center; } .section-padding { padding: 3rem 4%; } .features-section { padding: 3rem 4%; } .courses-section { padding: 3rem 4%; } .cta-section { padding: 3rem 4%; } .cta-card { padding: 2rem 1.25rem; } .cta-actions { flex-direction: column; align-items: stretch; } .cta-actions .btn { width: 100%; text-align: center; } .feature-card { padding: 1.5rem; } .course-body { padding: 1.25rem; } .stats-container { padding: 1.5rem 1rem; } .stat-value { font-size: 1.75rem; } .section-title { font-size: 1.5rem; } .hero-stat { flex-direction: column; text-align: center; } .footer { padding: 2rem 4% 1.5rem; } }
-        
+        @media (max-width: 1024px) {
+          .hero-grid {
+            gap: 2rem;
+          }
+
+          .features-grid {
+            grid-template-columns: repeat(2, 1fr);
+          }
+
+          .footer-inner {
+            grid-template-columns: 1fr 1fr;
+          }
+
+          .hero-badge-float-1,
+          .hero-badge-float-3 {
+            display: none;
+          }
+
+          .hero-badge-float-2 {
+            bottom: 10%;
+            left: -30px;
+          }
+
+          .courses-grid {
+            grid-template-columns: repeat(2, 1fr);
+          }
+        }
+
+        @media (max-width: 768px) {
+          .hero-section {
+            padding: 2rem 5% 3rem;
+            min-height: auto;
+          }
+
+          .hero-grid {
+            grid-template-columns: 1fr;
+            gap: 1.5rem;
+          }
+
+          .hero-visual {
+            display: none;
+          }
+
+          .hero-title {
+            font-size: 2rem;
+            text-align: center;
+          }
+
+          .hero-subtitle {
+            font-size: 1rem;
+            text-align: center;
+            margin-left: auto;
+            margin-right: auto;
+          }
+
+          .hero-badge {
+            margin-left: auto;
+            margin-right: auto;
+          }
+
+          .hero-actions {
+            justify-content: center;
+          }
+
+          .hero-stats-row {
+            justify-content: center;
+            flex-wrap: wrap;
+            gap: 1.5rem;
+          }
+
+          .features-grid {
+            grid-template-columns: 1fr;
+          }
+
+          .stats-container {
+            padding: 2rem 1.5rem;
+            border-radius: 18px;
+            margin: 0 0.5rem;
+          }
+
+          .stats-grid {
+            grid-template-columns: 1fr;
+            gap: 1.5rem;
+          }
+
+          .stat-value {
+            font-size: 2.25rem;
+          }
+
+          .cta-card {
+            padding: 2.5rem 1.5rem;
+          }
+
+          .cta-title {
+            font-size: 1.75rem;
+          }
+
+          .cta-subtitle {
+            font-size: 1rem;
+          }
+
+          .footer-inner {
+            grid-template-columns: 1fr;
+            gap: 2rem;
+            text-align: center;
+          }
+
+          .footer-desc {
+            margin: 0 auto;
+          }
+
+          .footer-bottom {
+            flex-direction: column;
+            text-align: center;
+          }
+
+          .courses-grid {
+            grid-template-columns: 1fr;
+          }
+
+          .section-title {
+            font-size: 1.75rem;
+          }
+
+          .section-header {
+            margin-bottom: 2.5rem;
+          }
+
+          .hero-stats-mini {
+            justify-content: center;
+            flex-wrap: wrap;
+          }
+
+          .course-card {
+            max-width: 100%;
+          }
+        }
+
+        @media (max-width: 480px) {
+          .hero-section {
+            padding: 1.5rem 4% 2.5rem;
+          }
+
+          .hero-title {
+            font-size: 1.75rem;
+          }
+
+          .hero-actions {
+            flex-direction: column;
+            align-items: stretch;
+          }
+
+          .hero-actions .btn {
+            width: 100%;
+            text-align: center;
+          }
+
+          .section-padding {
+            padding: 3rem 4%;
+          }
+
+          .features-section {
+            padding: 3rem 4%;
+          }
+
+          .courses-section {
+            padding: 3rem 4%;
+          }
+
+          .cta-section {
+            padding: 3rem 4%;
+          }
+
+          .cta-card {
+            padding: 2rem 1.25rem;
+          }
+
+          .cta-actions {
+            flex-direction: column;
+            align-items: stretch;
+          }
+
+          .cta-actions .btn {
+            width: 100%;
+            text-align: center;
+          }
+
+          .feature-card {
+            padding: 1.5rem;
+          }
+
+          .course-body {
+            padding: 1.25rem;
+          }
+
+          .stats-container {
+            padding: 1.5rem 1rem;
+          }
+
+          .stat-value {
+            font-size: 1.75rem;
+          }
+
+          .section-title {
+            font-size: 1.5rem;
+          }
+
+          .hero-stat {
+            flex-direction: column;
+            text-align: center;
+          }
+
+          .footer {
+            padding: 2rem 4% 1.5rem;
+          }
+        }
+
         /* ===== DARK MODE ===== */
-        [data-theme="dark"] .hero-badge { background: rgba(27, 189, 212, 0.1); border-color: rgba(27, 189, 212, 0.15); color: var(--accent); }
-        [data-theme="dark"] .hero-card-main { background: rgba(13, 48, 64, 0.85); border-color: rgba(27, 189, 212, 0.12); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); }
-        [data-theme="dark"] .hero-card-main:hover { box-shadow: 0 24px 80px rgba(0, 0, 0, 0.4); }
-        [data-theme="dark"] .hero-card-row { background: rgba(27, 189, 212, 0.04); border-color: rgba(27, 189, 212, 0.08); }
-        [data-theme="dark"] .hero-card-row:hover { background: rgba(27, 189, 212, 0.08); }
-        [data-theme="dark"] .hero-badge-float { background: rgba(13, 48, 64, 0.85); border-color: rgba(27, 189, 212, 0.1); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); }
-        [data-theme="dark"] .hero-badge-float:hover { box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4); }
-        [data-theme="dark"] .feature-card { background: var(--surface); border-color: rgba(27, 189, 212, 0.08); }
-        [data-theme="dark"] .feature-card:hover { border-color: rgba(27, 189, 212, 0.2); }
-        [data-theme="dark"] .section-label { background: rgba(27, 189, 212, 0.1); color: var(--accent); border-color: rgba(27, 189, 212, 0.15); }
-        [data-theme="dark"] .course-card { background: var(--surface); border-color: rgba(27, 189, 212, 0.08); }
-        [data-theme="dark"] .course-card:hover { border-color: rgba(27, 189, 212, 0.15); }
-        [data-theme="dark"] .course-cover { background: rgba(27, 189, 212, 0.06) !important; }
-        [data-theme="dark"] .stats-container { background: linear-gradient(135deg, rgba(13, 48, 64, 0.95) 0%, rgba(27, 189, 212, 0.15) 100%); }
-        [data-theme="dark"] .cta-card { background: var(--surface); border-color: rgba(27, 189, 212, 0.1); box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3); }
-        [data-theme="dark"] .cta-card::before { background: linear-gradient(90deg, var(--accent), var(--primary)); }
-        [data-theme="dark"] .footer { background: var(--surface); border-top-color: rgba(27, 189, 212, 0.08); }
-        [data-theme="dark"] .hero-visual-bg { background: radial-gradient(circle at 30% 40%, rgba(27, 189, 212, 0.06) 0%, rgba(11, 122, 138, 0.03) 40%, transparent 70%); }
-        [data-theme="dark"] .hero-visual-bg-2 { background: radial-gradient(circle at 70% 60%, rgba(27, 189, 212, 0.04) 0%, transparent 60%); }
-        [data-theme="dark"] .footer-logo { color: var(--accent); }
-        [data-theme="dark"] .footer-link:hover { color: var(--accent); }
-        [data-theme="dark"] .hero-blob-1 { background: linear-gradient(135deg, rgba(27, 189, 212, 0.15), transparent); }
-        [data-theme="dark"] .hero-blob-2 { background: linear-gradient(135deg, rgba(11, 79, 108, 0.2), transparent); }
-        [data-theme="dark"] .hero-blob-3 { background: linear-gradient(135deg, rgba(27, 189, 212, 0.1), transparent); }
+        [data-theme="dark"] .hero-badge {
+          background: rgba(27, 189, 212, 0.1);
+          border-color: rgba(27, 189, 212, 0.15);
+          color: var(--accent);
+        }
+
+        [data-theme="dark"] .hero-card-main {
+          background: rgba(13, 48, 64, 0.85);
+          border-color: rgba(27, 189, 212, 0.12);
+          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
+        }
+
+        [data-theme="dark"] .hero-card-main:hover {
+          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.4);
+        }
+
+        [data-theme="dark"] .hero-card-row {
+          background: rgba(27, 189, 212, 0.04);
+          border-color: rgba(27, 189, 212, 0.08);
+        }
+
+        [data-theme="dark"] .hero-card-row:hover {
+          background: rgba(27, 189, 212, 0.08);
+        }
+
+        [data-theme="dark"] .hero-badge-float {
+          background: rgba(13, 48, 64, 0.85);
+          border-color: rgba(27, 189, 212, 0.1);
+          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
+        }
+
+        [data-theme="dark"] .hero-badge-float:hover {
+          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
+        }
+
+        [data-theme="dark"] .feature-card {
+          background: var(--surface);
+          border-color: rgba(27, 189, 212, 0.08);
+        }
+
+        [data-theme="dark"] .feature-card:hover {
+          border-color: rgba(27, 189, 212, 0.2);
+        }
+
+        [data-theme="dark"] .section-label {
+          background: rgba(27, 189, 212, 0.1);
+          color: var(--accent);
+          border-color: rgba(27, 189, 212, 0.15);
+        }
+
+        [data-theme="dark"] .course-card {
+          background: var(--surface);
+          border-color: rgba(27, 189, 212, 0.08);
+        }
+
+        [data-theme="dark"] .course-card:hover {
+          border-color: rgba(27, 189, 212, 0.15);
+        }
+
+        [data-theme="dark"] .course-cover {
+          background: rgba(27, 189, 212, 0.06) !important;
+        }
+
+
+
+        [data-theme="dark"] .stats-container {
+          background: linear-gradient(135deg, rgba(13, 48, 64, 0.95) 0%, rgba(27, 189, 212, 0.15) 100%);
+        }
+
+        [data-theme="dark"] .cta-card {
+          background: var(--surface);
+          border-color: rgba(27, 189, 212, 0.1);
+          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
+        }
+
+        [data-theme="dark"] .cta-card::before {
+          background: linear-gradient(90deg, var(--accent), var(--primary));
+        }
+
+        [data-theme="dark"] .footer {
+          background: var(--surface);
+          border-top-color: rgba(27, 189, 212, 0.08);
+        }
+
+        [data-theme="dark"] .hero-visual-bg {
+          background: radial-gradient(circle at 30% 40%, rgba(27, 189, 212, 0.06) 0%, rgba(11, 122, 138, 0.03) 40%, transparent 70%);
+        }
+
+        [data-theme="dark"] .hero-visual-bg-2 {
+          background: radial-gradient(circle at 70% 60%, rgba(27, 189, 212, 0.04) 0%, transparent 60%);
+        }
+
+        [data-theme="dark"] .footer-logo {
+          color: var(--accent);
+        }
+
+        [data-theme="dark"] .footer-link:hover {
+          color: var(--accent);
+        }
+
+        [data-theme="dark"] .hero-blob-1 {
+          background: linear-gradient(135deg, rgba(27, 189, 212, 0.15), transparent);
+        }
+
+        [data-theme="dark"] .hero-blob-2 {
+          background: linear-gradient(135deg, rgba(11, 79, 108, 0.2), transparent);
+        }
+
+        [data-theme="dark"] .hero-blob-3 {
+          background: linear-gradient(135deg, rgba(27, 189, 212, 0.1), transparent);
+        }
 
         /* ===== UNIFIED SMOOTH ANIMATION (One Entry) ===== */
-        .hero-section .hero-content, .hero-section .hero-visual, .features-section .section-header, .features-section .features-grid .feature-card, .courses-section .section-header, .courses-section .courses-grid .course-card, .stats-section .stats-container, .cta-section .cta-card, .footer { opacity: 0; animation: fadeInUp 0.7s var(--ease-out) forwards; }
-        .hero-section .hero-content { animation-delay: 0.1s; } .hero-section .hero-visual { animation-delay: 0.25s; } .features-section .section-header { animation-delay: 0s; } .features-section .features-grid .feature-card:nth-child(1) { animation-delay: 0.05s; } .features-section .features-grid .feature-card:nth-child(2) { animation-delay: 0.1s; } .features-section .features-grid .feature-card:nth-child(3) { animation-delay: 0.15s; } .features-section .features-grid .feature-card:nth-child(4) { animation-delay: 0.2s; } .features-section .features-grid .feature-card:nth-child(5) { animation-delay: 0.25s; } .features-section .features-grid .feature-card:nth-child(6) { animation-delay: 0.3s; } .courses-section .section-header { animation-delay: 0s; } .courses-section .courses-grid .course-card:nth-child(1) { animation-delay: 0.05s; } .courses-section .courses-grid .course-card:nth-child(2) { animation-delay: 0.12s; } .courses-section .courses-grid .course-card:nth-child(3) { animation-delay: 0.19s; } .courses-section .courses-grid .course-card:nth-child(4) { animation-delay: 0.26s; } .courses-section .courses-grid .course-card:nth-child(5) { animation-delay: 0.33s; } .courses-section .courses-grid .course-card:nth-child(6) { animation-delay: 0.4s; } .stats-section .stats-container { animation-delay: 0.15s; } .cta-section .cta-card { animation-delay: 0.1s; } .footer { animation-delay: 0s; }
+        .hero-section .hero-content,
+        .hero-section .hero-visual,
+        .features-section .section-header,
+        .features-section .features-grid .feature-card,
+        .courses-section .section-header,
+        .courses-section .courses-grid .course-card,
+        .stats-section .stats-container,
+        .cta-section .cta-card,
+        .footer {
+          opacity: 0;
+          animation: fadeInUp 0.7s var(--ease-out) forwards;
+        }
+
+        .hero-section .hero-content { animation-delay: 0.1s; }
+        .hero-section .hero-visual { animation-delay: 0.25s; }
+        .features-section .section-header { animation-delay: 0s; }
+        .features-section .features-grid .feature-card:nth-child(1) { animation-delay: 0.05s; }
+        .features-section .features-grid .feature-card:nth-child(2) { animation-delay: 0.1s; }
+        .features-section .features-grid .feature-card:nth-child(3) { animation-delay: 0.15s; }
+        .features-section .features-grid .feature-card:nth-child(4) { animation-delay: 0.2s; }
+        .features-section .features-grid .feature-card:nth-child(5) { animation-delay: 0.25s; }
+        .features-section .features-grid .feature-card:nth-child(6) { animation-delay: 0.3s; }
+        .courses-section .section-header { animation-delay: 0s; }
+        .courses-section .courses-grid .course-card:nth-child(1) { animation-delay: 0.05s; }
+        .courses-section .courses-grid .course-card:nth-child(2) { animation-delay: 0.12s; }
+        .courses-section .courses-grid .course-card:nth-child(3) { animation-delay: 0.19s; }
+        .courses-section .courses-grid .course-card:nth-child(4) { animation-delay: 0.26s; }
+        .courses-section .courses-grid .course-card:nth-child(5) { animation-delay: 0.33s; }
+        .courses-section .courses-grid .course-card:nth-child(6) { animation-delay: 0.4s; }
+        .stats-section .stats-container { animation-delay: 0.15s; }
+        .cta-section .cta-card { animation-delay: 0.1s; }
+        .footer { animation-delay: 0s; }
       `}</style>
 
       {/* ===== HERO SECTION ===== */}
       <section className="hero-section">
+        {/* Hero Blob Backgrounds (from reference design) */}
         <div className="hero-blob hero-blob-1"></div>
         <div className="hero-blob hero-blob-2"></div>
         <div className="hero-blob hero-blob-3"></div>
@@ -317,8 +1428,7 @@
               عالي الجودة لتحقيق أقصى استفادة من رحلتك التعليمية.
             </p>
             <div className="hero-actions animate-fade-in-up">
-              {/* 🚀 الاعتماد على حالة Zustand بدلاً من local state */}
-              {isAuthenticated ? (
+              {user ? (
                 <>
                   <Link href="/courses" className="btn btn-primary btn-lg btn-cta">
                     <BookIcon size={18} />
@@ -368,6 +1478,7 @@
             <div className="hero-visual-bg"></div>
             <div className="hero-visual-bg-2"></div>
 
+            {/* Floating badges */}
             <div className="hero-badge-float hero-badge-float-2">
               <div className="hero-badge-icon" style={{ background: 'var(--muted-bg)', color: 'var(--accent)' }}>
                 <MonitorIcon size={18} />
@@ -388,6 +1499,7 @@
               </div>
             </div>
 
+            {/* Main card mockup */}
             <div className="hero-card-main">
               <div className="hero-card-header">
                 <div className="hero-card-header-content">
@@ -474,16 +1586,16 @@
         </div>
 
         {coursesLoading ? (
-          <div className="flex justify-center my-8">
+          <div className="loading-state">
             <div className="spinner spinner-lg"></div>
           </div>
         ) : courses.length === 0 ? (
-          <div className="text-center py-12 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
-            <div className="flex justify-center text-[var(--text-muted)] mb-4">
-              <BookIcon size={48} />
+          <div className="empty-state">
+            <div className="empty-state-icon">
+              <BookIcon size={32} />
             </div>
-            <h3 className="text-xl font-bold mb-2">لا توجد كورسات متاحة حالياً</h3>
-            <p className="text-[var(--text-secondary)]">سيتم إضافة كورسات جديدة قريباً، تابعنا!</p>
+            <h3>لا توجد كورسات متاحة حالياً</h3>
+            <p>سيتم إضافة كورسات جديدة قريباً، تابعنا!</p>
           </div>
         ) : (
           <div className="courses-grid">
@@ -513,7 +1625,7 @@
                       {course.validityDate ? new Date(course.validityDate).toLocaleDateString('ar-EG') : 'مستمر'}
                     </span>
                   </div>
-                  <Link href={`/courses/${course.id}`} className="btn btn-outline btn-lg btn-outline-cta btn-block text-center w-full justify-center">
+                  <Link href={`/courses/${course.id}`} className="btn btn-outline btn-lg btn-outline-cta btn-block">
                     عرض التفاصيل
                   </Link>
                 </div>
@@ -570,7 +1682,7 @@
             مع أفضل المحاضرات والكورسات المتاحة.
           </p>
           <div className="cta-actions">
-            {isAuthenticated ? (
+            {user ? (
               <>
                 <Link href="/courses" className="btn btn-primary btn-lg btn-cta">
                   <BookIcon size={18} />
@@ -634,4 +1746,4 @@
       </footer>
     </div>
   );
-}+}
```

### `app\admin\page.tsx`
```diff
--- Current: app\admin\page.tsx
+++ Other: app\admin\page.tsx
@@ -1,12 +1,9 @@
 'use client';
 
 import { useRouter } from 'next/navigation';
-import { useEffect, useState, useCallback, ReactNode } from 'react';
+import { useEffect, useState, ReactNode } from 'react';
 import AdminSidebar from '../components/AdminSidebar';
 import StatCard from '../components/StatCard';
-import { useAuthGuard } from '../hooks/useAuthGuard'; // 🚀 حارس البوابة المركزي
-import { useAuthStore } from '@/store/useAuthStore'; // 🚀 العقل المدبر
-import api from '@/lib/axios'; // 🚀 عميل الشبكة المركزي
 import {
   UsersIcon,
   WalletIcon,
@@ -24,6 +21,12 @@
   CheckCircleIcon,
 } from '../components/Icons';
 
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+
+const getToken = () => {
+  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
+};
+
 interface Stats {
   pendingStudents: number;
   pendingTopups: number;
@@ -55,79 +58,152 @@
 
 export default function AdminDashboard() {
   const router = useRouter();
-  
-  // 🚀 السطر السحري: يحمي الصفحة، يطرد الطلاب، ويجلب بيانات الأدمن!
-  const { isChecking } = useAuthGuard(['admin']); 
-  const { logout } = useAuthStore(); // دالة تسجيل الخروج الجاهزة
-
-  const [stats, setStats] = useState<Stats>({ pendingStudents: 0, pendingTopups: 0, totalViolations: 0 });
+  const [loading, setLoading] = useState(true);
+  const [authorized, setAuthorized] = useState(false);
+  const [stats, setStats] = useState<Stats>({
+    pendingStudents: 0,
+    pendingTopups: 0,
+    totalViolations: 0,
+  });
   const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
   const [limitsInfo, setLimitsInfo] = useState<LimitInfo | null>(null);
 
-  const fetchDashboardData = useCallback(async () => {
+  useEffect(() => {
+    checkAdminAuth();
+    // eslint-disable-next-line react-hooks/exhaustive-deps
+  }, []);
+
+  const checkAdminAuth = async () => {
     try {
-      // 🚀 الأداء الخارق: جلب 4 مسارات في نفس اللحظة بالتوازي (Parallel Requests)
-      const [pendingRes, topupsRes, violationsRes, limitsRes] = await Promise.allSettled([
-        api.get('/admin/users/pending?limit=1'), // نرسل limit=1 لأننا نريد العدد (Total) فقط لتقليل الحمل
-        api.get('/admin/wallet/topups?status=pending&limit=1'),
-        api.get('/admin/security/violations?limit=1'),
-        api.get('/admin/limits')
-      ]);
-
-      // دالة مساعدة ذكية لاستخراج العدد سواء كان في الـ meta (Pagination) أو مجرد array length
-      // eslint-disable-next-line @typescript-eslint/no-explicit-any
-      const getCount = (res: any) => res?.value?.meta?.total || res?.value?.data?.length || 0;
-
-      const pendingCount = pendingRes.status === 'fulfilled' ? getCount(pendingRes) : 0;
-      const topupsCount = topupsRes.status === 'fulfilled' ? getCount(topupsRes) : 0;
-      const violationsCount = violationsRes.status === 'fulfilled' ? getCount(violationsRes) : 0;
-
-      setStats((prev) => ({
-        ...prev,
-        pendingStudents: pendingCount,
-        pendingTopups: topupsCount,
-        totalViolations: violationsCount,
-      }));
-
-      // بناء سجل النشاطات ديناميكياً
-      const newActivity: RecentActivity[] = [];
-      if (pendingCount > 0) {
-        newActivity.push({ type: 'warning', message: `${pendingCount} طلب تسجيل جديد في الانتظار`, time: 'الآن' });
-      }
-      if (topupsCount > 0) {
-        newActivity.push({ type: 'info', message: `${topupsCount} طلب شحن في انتظار المراجعة`, time: 'الآن' });
-      }
-      setRecentActivity(newActivity);
-
-      if (limitsRes.status === 'fulfilled' && limitsRes.value?.data) {
-        setLimitsInfo(limitsRes.value.data);
-      }
-
+      const token = getToken();
+
+      if (!token) {
+        router.push('/login');
+        return;
+      }
+
+      const response = await fetch(`${API_URL}/api/auth/me`, {
+        headers: { 
+            Authorization: `Bearer ${token}`,
+            Accept: 'application/json'
+        },
+      });
+
+      if (response.ok) {
+        const data = await response.json();
+        const user = data.data?.user || data.data || data; 
+
+        const isAdmin = 
+          user?.is_admin === true || 
+          user?.is_admin === 1 || 
+          user?.isAdmin === true || 
+          user?.role === 'admin' ||
+          user?.email === 'admin@eduplatform.com';
+        
+        if (!isAdmin) {
+          router.push('/');
+          return;
+        }
+        
+        setAuthorized(true);
+        fetchStats(token);
+      } else {
+        router.push('/login');
+      }
+    } catch {
+      router.push('/login');
+    } finally {
+      setLoading(false);
+    }
+  };
+
+  const fetchStats = async (authToken: string) => {
+    try {
+      const pendingResponse = await fetch(`${API_URL}/api/admin/users/pending`, {
+        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
+      });
+      if (pendingResponse.ok) {
+        const data = await pendingResponse.json();
+        const pendingCount = data.data?.length || 0;
+        setStats(prev => ({ ...prev, pendingStudents: pendingCount }));
+        
+        if (pendingCount > 0) {
+          setRecentActivity(prev => [{
+            type: 'warning',
+            message: `${pendingCount} طلب تسجيل جديد في الانتظار`,
+            time: 'الآن'
+          }, ...prev].slice(0, 5));
+        }
+      }
+
+      const topupsResponse = await fetch(`${API_URL}/api/admin/wallet/topups?status=pending`, {
+        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
+      });
+      if (topupsResponse.ok) {
+        const data = await topupsResponse.json();
+        const topupsCount = data.data?.length || 0;
+        setStats(prev => ({ ...prev, pendingTopups: topupsCount }));
+        
+        if (topupsCount > 0) {
+          setRecentActivity(prev => [{
+            type: 'info',
+            message: `${topupsCount} طلب شحن في انتظار المراجعة`,
+            time: 'الآن'
+          }, ...prev].slice(0, 5));
+        }
+      }
+
+      const violationsResponse = await fetch(`${API_URL}/api/admin/security/violations`, {
+        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
+      });
+      if (violationsResponse.ok) {
+        const data = await violationsResponse.json();
+        const violationsCount = data.data?.length || 0;
+        setStats(prev => ({ ...prev, totalViolations: violationsCount }));
+      }
+
+      const limitsResponse = await fetch(`${API_URL}/api/admin/limits`, {
+        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
+      });
+      if (limitsResponse.ok) {
+        const data = await limitsResponse.json();
+        if (data.success && data.data) {
+          setLimitsInfo(data.data);
+        }
+      }
     } catch (error) {
-      console.error('Failed to fetch dashboard stats:', error);
+      console.error('Failed to fetch stats:', error);
     }
-  }, []);
-
-  useEffect(() => {
-    // لا نجلب الإحصائيات إلا إذا تم التأكد من هوية الأدمن
-    if (!isChecking) {
-      // eslint-disable-next-line react-hooks/set-state-in-effect
-      fetchDashboardData();
+  };
+
+  const handleLogout = async () => {
+    try {
+      const token = getToken();
+      if (token) {
+        await fetch(`${API_URL}/api/auth/logout`, {
+          method: 'POST',
+          headers: { Authorization: `Bearer ${token}` },
+        });
+      }
+    } catch {
+      // Ignore logout errors
+    } finally {
+      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
+      localStorage.removeItem('token');
+      router.push('/login');
     }
-  }, [isChecking, fetchDashboardData]);
-
-  const handleLogout = async () => {
-    await logout(); // 🚀 ينظف الكوكيز والـ API في الخلفية
-    router.push('/login');
   };
 
-  // 🚀 شاشة التحميل (تظهر للحظة أثناء تأكد الـ Guard من الصلاحيات)
-  if (isChecking) {
+  if (loading) {
     return (
       <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
         <div className="spinner spinner-lg"></div>
       </div>
     );
+  }
+
+  if (!authorized) {
+    return null;
   }
 
   const quickActions: QuickAction[] = [
@@ -220,7 +296,7 @@
           <div className="page-header">
             <div>
               <h1 className="page-title">لوحة التحكم</h1>
-              <p className="page-subtitle">مرحباً بك في غرفة عمليات المنصة</p>
+              <p className="page-subtitle">مرحباً بك في منصاتك التعليمية</p>
             </div>
             <div className="flex gap-3">
               <button
@@ -411,4 +487,4 @@
       </main>
     </div>
   );
-}+}
```

### `app\admin\center-codes\page.tsx`
```diff
--- Current: app\admin\center-codes\page.tsx
+++ Other: app\admin\center-codes\page.tsx
@@ -1,14 +1,18 @@
 'use client';
 
-import { useEffect, useState, useCallback } from 'react';
+import { useEffect, useState } from 'react';
 import { useRouter } from 'next/navigation';
 import AdminSidebar from '../../components/AdminSidebar';
-import { useAuthGuard } from '../../hooks/useAuthGuard'; // 🚀 حارس البوابة المركزي
-import api from '@/lib/axios'; // 🚀 العميل الشبكي المحمي
-import { 
-  KeyIcon, PlusIcon, UploadIcon, SearchIcon, 
-  CheckCircleIcon, AlertCircleIcon, PhoneIcon 
-} from '../../components/Icons';
+import { KeyIcon, PlusIcon, UploadIcon, SearchIcon, CheckCircleIcon, AlertCircleIcon, FileTextIcon, XIcon, PhoneIcon } from '../../components/Icons';
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+
+const getToken = () => {
+  return document.cookie
+    .split('; ')
+    .find(row => row.startsWith('token='))
+    ?.split('=')[1] || localStorage.getItem('token');
+};
 
 interface Course {
   id: number;
@@ -37,10 +41,6 @@
 
 export default function AdminCenterCodesPage() {
   const router = useRouter();
-
-  // 🚀 درع الحماية: يمنع المتطفلين ويعرض شاشة تحميل ريثما يتأكد من الصلاحيات
-  const { isChecking } = useAuthGuard(['admin']);
-
   const [courses, setCourses] = useState<Course[]>([]);
   const [codes, setCodes] = useState<CenterCode[]>([]);
   const [loading, setLoading] = useState(true);
@@ -62,33 +62,57 @@
   const [totalPages, setTotalPages] = useState(1);
   const [totalCount, setTotalCount] = useState(0);
 
-  // نظام التنبيهات الموحد الأنيق
   const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
-  const showToast = useCallback((message: string, type: 'success' | 'error') => {
+  const showToast = (message: string, type: 'success' | 'error') => {
     setToast({ visible: true, message, type });
-    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
+    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
+  };
+
+  useEffect(() => {
+    checkAuth();
+    fetchCourses();
+  // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);
 
-  // 🚀 جلب الكورسات بمجرد التأكد من الصلاحيات
   useEffect(() => {
-    if (!isChecking) {
-      fetchCourses();
-    }
-  }, [isChecking]);
-
-  // 🚀 مراقبة الفلاتر وجلب الأكواد
-  useEffect(() => {
-    if (!isChecking) {
-      fetchCodes(currentPage);
-    }
-  }, [filterCourse, filterStatus, currentPage, isChecking]);
+    fetchCodes(currentPage);
+  // eslint-disable-next-line react-hooks/exhaustive-deps
+  }, [filterCourse, filterStatus, currentPage]);
+
+  const checkAuth = async () => {
+    const token = getToken();
+    if (!token) {
+      router.push('/login');
+      return;
+    }
+
+    try {
+      const response = await fetch(`${API_URL}/api/auth/me`, {
+        headers: { Authorization: `Bearer ${token}` },
+      });
+      if (response.ok) {
+        const data = await response.json();
+        if (!data.data.is_admin) router.push('/');
+      } else {
+        router.push('/login');
+      }
+    } catch {
+      router.push('/login');
+    }
+  };
 
   const fetchCourses = async () => {
     try {
-      const response = await api.get('/admin/courses');
-      setCourses(response.data?.data || response.data || []);
-    } catch (error: any) {
-      showToast(error?.message || 'فشل تحميل قائمة الكورسات', 'error');
+      const token = getToken();
+      const response = await fetch(`${API_URL}/api/admin/courses`, {
+        headers: { Authorization: `Bearer ${token}` },
+      });
+      if (response.ok) {
+        const data = await response.json();
+        setCourses(data.data || []);
+      }
+    } catch (error) {
+      console.error('Failed to fetch courses:', error);
     }
   };
 
@@ -99,16 +123,21 @@
     }
     setFetchingLectures(true);
     try {
-      const response = await api.get(`/admin/courses/${courseId}/lectures`);
-      setCourseLectures(response.data?.data || response.data || []);
-    } catch (error: any) {
-      showToast(error?.message || 'فشل تحميل المحاضرات', 'error');
+      const token = getToken();
+      const response = await fetch(`${API_URL}/api/admin/courses/${courseId}/lectures`, {
+        headers: { Authorization: `Bearer ${token}` },
+      });
+      if (response.ok) {
+        const data = await response.json();
+        setCourseLectures(data.data || []);
+      }
+    } catch (error) {
+      console.error('Failed to fetch lectures:', error);
     } finally {
       setFetchingLectures(false);
     }
   };
 
-  // 🚀 التفاعل الذكي مع تغيير نوع الكود والكورس المختار
   useEffect(() => {
     if (selectedCourse && (codeType === 'lecture' || codeType === 'accumulator')) {
       fetchLectures(selectedCourse);
@@ -122,46 +151,27 @@
   const fetchCodes = async (page = 1) => {
     setLoading(true);
     try {
-      const response = await api.get('/admin/center-codes', {
-        params: {
-          course_id: filterCourse || undefined,
-          status: filterStatus || undefined,
-          page
+      const token = getToken();
+      const params = new URLSearchParams();
+      if (filterCourse) params.append('course_id', filterCourse);
+      if (filterStatus) params.append('status', filterStatus);
+      params.append('page', page.toString());
+
+      const response = await fetch(`${API_URL}/api/admin/center-codes?${params}`, {
+        headers: { Authorization: `Bearer ${token}` },
+      });
+
+      if (response.ok) {
+        const data = await response.json();
+        setCodes(data.data || []);
+        if (data.meta) {
+          setTotalPages(data.meta.lastPage || 1);
+          setTotalCount(data.meta.total || 0);
+          setCurrentPage(data.meta.currentPage || 1);
         }
-      });
-      
-      const data = response.data;
-      
-      // 🚀 توحيد الحقول لتناسب الواجهة وتأمين الـ Pagination
-      const mappedCodes = (data?.data || data || []).map((c: any) => ({
-        id: c.id,
-        code: c.code,
-        courseId: c.course_id || c.courseId,
-        courseTitle: c.course_title || c.courseTitle || c.course?.title || '',
-        type: c.type || 'course',
-        studentPhone: c.student_phone || c.studentPhone || null,
-        lectureId: c.lecture_id || c.lectureId || null,
-        lectureTitle: c.lecture_title || c.lectureTitle || null,
-        accumulatorLectures: c.accumulator_lectures || c.accumulatorLectures || null,
-        isUsed: c.is_used ?? c.isUsed ?? false,
-        usedBy: c.used_by || c.usedBy ? {
-          id: c.used_by?.id || c.usedBy?.id,
-          fullName: c.used_by?.full_name || c.usedBy?.fullName || c.used_by?.name || 'غير معروف',
-          phone: c.used_by?.phone || c.usedBy?.phone || '',
-        } : null,
-        usedAt: c.used_at || c.usedAt || null,
-        createdAt: c.created_at || c.createdAt || new Date().toISOString(),
-      }));
-
-      setCodes(mappedCodes);
-      
-      // تأمين قراءة بيانات الصفحات
-      const meta = data?.meta || data;
-      setTotalPages(meta?.last_page || meta?.lastPage || 1);
-      setTotalCount(meta?.total || mappedCodes.length || 0);
-      setCurrentPage(meta?.current_page || meta?.currentPage || 1);
-    } catch (error: any) {
-      showToast(error?.message || 'فشل تحميل الأكواد', 'error');
+      }
+    } catch (error) {
+      console.error('Failed to fetch codes:', error);
     } finally {
       setLoading(false);
     }
@@ -169,48 +179,40 @@
 
   const handleGenerate = async (e: React.FormEvent) => {
     e.preventDefault();
-
-    // 🚀 حماية (Front-end Validation) لمنع أخطاء الـ API
-    if (codeType === 'lecture' && !selectedLectureId) {
-      showToast('يجب اختيار المحاضرة أولاً لإنشاء هذا النوع من الأكواد', 'error');
-      return;
-    }
-    if (codeType === 'accumulator') {
-      if (!studentPhone || studentPhone.length < 10) {
-        showToast('يجب إدخال رقم هاتف صحيح للطالب لهذا الكود التراكمي', 'error');
-        return;
-      }
-      if (selectedAccumulatorLectures.length === 0) {
-        showToast('يجب تحديد محاضرة واحدة على الأقل لإعفاء الطالب منها', 'error');
-        return;
-      }
-    }
-
     setGenerating(true);
     setGeneratedCodes([]);
 
     try {
-      const payload = {
-        course_id: parseInt(selectedCourse),
-        quantity: parseInt(quantity),
-        type: codeType,
-        student_phone: codeType === 'accumulator' ? studentPhone : null,
-        lecture_id: codeType === 'lecture' && selectedLectureId ? parseInt(selectedLectureId) : null,
-        accumulator_lectures: codeType === 'accumulator' ? selectedAccumulatorLectures : null,
-      };
-
-      const response = await api.post('/admin/center-codes/generate', payload);
-      
-      const newCodesData = response.data?.codes || response.data?.data?.codes || [];
-      const newCodes = newCodesData.map((c: any) => c.code || c);
-      
-      setGeneratedCodes(newCodes);
-      setStudentPhone('');
-      fetchCodes(1); // إعادة جلب الصفحة الأولى لتحديث الجدول
-      showToast(`تم إنشاء ${newCodes.length} كود بنجاح!`, 'success');
-      
-    } catch (error: any) {
-      showToast(error?.message || error?.error || 'فشل إنشاء الأكواد، يرجى المحاولة لاحقاً', 'error');
+      const token = getToken();
+      const response = await fetch(`${API_URL}/api/admin/center-codes/generate`, {
+        method: 'POST',
+        headers: {
+          'Authorization': `Bearer ${token}`,
+          'Content-Type': 'application/json',
+          'Accept': 'application/json'
+        },
+        body: JSON.stringify({
+          course_id: parseInt(selectedCourse),
+          quantity: parseInt(quantity),
+          type: codeType,
+          student_phone: codeType === 'accumulator' ? studentPhone : null,
+          lecture_id: codeType === 'lecture' && selectedLectureId ? parseInt(selectedLectureId) : null,
+          accumulator_lectures: codeType === 'accumulator' ? selectedAccumulatorLectures : null,
+        }),
+      });
+
+      if (response.ok) {
+        const data = await response.json();
+        const newCodes = data.data.codes.map((c: { code: string }) => c.code);
+        setGeneratedCodes(newCodes);
+        setStudentPhone('');
+        fetchCodes(1);
+        showToast(`تم إنشاء ${newCodes.length} كود بنجاح!`, 'success');
+      } else {
+        showToast('فشل إنشاء الأكواد، تأكد من البيانات', 'error');
+      }
+    } catch (error) {
+      showToast('حدث خطأ في الاتصال بالخادم', 'error');
     } finally {
       setGenerating(false);
     }
@@ -223,43 +225,36 @@
     }
 
     try {
-      // 🚀 تصدير احترافي عبر Axios
-      const response = await api.get('/admin/center-codes/export', {
-        params: { course_id: filterCourse }
+      const token = getToken();
+      const response = await fetch(`${API_URL}/api/admin/center-codes/export?course_id=${filterCourse}`, {
+        headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/json' },
       });
 
-      const exportData = response.data?.data || response.data || [];
-
-      if (exportData.length === 0) {
-        showToast('لا توجد أكواد غير مستخدمة لهذا الكورس', 'error');
-        return;
+      if (response.ok) {
+        const data = await response.json();
+        const exportData = data.data;
+
+        if (exportData.length === 0) {
+          showToast('لا توجد أكواد غير مستخدمة لهذا الكورس', 'error');
+          return;
+        }
+
+        const csvContent = exportData
+          .map((code: any) => `${code.code},${code.course},${code.created_at}`)
+          .join('\n');
+
+        const blob = new Blob([`الكود,الكورس,تاريخ الإنشاء\n${csvContent}`], { type: 'text/csv;charset=utf-8;' });
+        const url = window.URL.createObjectURL(blob);
+        const a = document.createElement('a');
+        a.href = url;
+        a.download = `center-codes-course-${filterCourse}-${new Date().toISOString().split('T')[0]}.csv`;
+        a.click();
+        showToast('تم التصدير بنجاح', 'success');
+      } else {
+        showToast('فشل التصدير من الخادم', 'error');
       }
-
-      // 🚀 تأمين ملف الـ CSV من الكسر بسبب الفواصل (Commas)
-      const csvContent = exportData
-        .map((code: any) => {
-          const rawTitle = code.course || code.course_title || code.courseTitle || 'N/A';
-          const safeTitle = rawTitle.replace(/,/g, ' - '); // إزالة الفواصل لحماية الأعمدة
-          const codeString = code.code || '';
-          const dateString = code.created_at || code.createdAt || '';
-          return `${codeString},${safeTitle},${dateString}`;
-        })
-        .join('\n');
-
-      // معالجة اللغة العربية (BOM) لكي يفتح الإكسيل الملف بشكل صحيح
-      const BOM = '\uFEFF';
-      const blob = new Blob([BOM + `الكود,الكورس,تاريخ الإنشاء\n${csvContent}`], { type: 'text/csv;charset=utf-8;' });
-      
-      const url = window.URL.createObjectURL(blob);
-      const a = document.createElement('a');
-      a.href = url;
-      a.download = `أكواد-مراكز-كورس-${filterCourse}-${new Date().toISOString().split('T')[0]}.csv`;
-      a.click();
-      window.URL.revokeObjectURL(url);
-      
-      showToast('تم التصدير بنجاح', 'success');
-    } catch (error: any) {
-      showToast(error?.message || 'حدث خطأ أثناء التصدير', 'error');
+    } catch (error) {
+      showToast('حدث خطأ أثناء التصدير', 'error');
     }
   };
 
@@ -270,21 +265,19 @@
 
   const getStatusBadge = (isUsed: boolean) => {
     return (
-      <span className={isUsed ? 'badge badge-error font-bold px-3 py-1' : 'badge badge-success font-bold px-3 py-1'}>
-        {isUsed ? 'مستخدم' : 'متاح للبيع'}
+      <span className={isUsed ? 'badge badge-error' : 'badge badge-success'}>
+        {isUsed ? 'مستخدم' : 'متاح'}
       </span>
     );
   };
 
-  // 🚀 شاشة التحميل الأولية لمنع وميض الواجهة
-  if (isChecking || (loading && codes.length === 0 && !filterCourse)) {
+  if (loading && codes.length === 0) {
     return (
       <div className="admin-layout">
         <AdminSidebar />
-        <div className="admin-content flex items-center justify-center min-h-[60vh]">
-          <div className="loading-state flex flex-col items-center">
-            <div className="spinner spinner-lg mb-4 text-primary" />
-            <p className="text-muted font-bold text-lg">جاري تجهيز أكواد المراكز...</p>
+        <div className="admin-content">
+          <div className="loading-state">
+            <div className="spinner spinner-lg" />
           </div>
         </div>
       </div>
@@ -295,51 +288,42 @@
     <div className="admin-layout relative">
       <AdminSidebar />
 
-      {/* 🚀 نظام التنبيهات الموحد العائم */}
-      <div 
-        className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300" 
-        style={{ 
-          opacity: toast.visible ? 1 : 0, 
-          transform: toast.visible ? 'translate(-50%, 0)' : 'translate(-50%, -20px)', 
-          pointerEvents: toast.visible ? 'auto' : 'none' 
-        }}
-      >
-        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl text-sm font-bold ${toast.type === 'success' ? 'bg-green-600 text-white shadow-green-600/30' : 'bg-red-600 text-white shadow-red-600/30'}`}>
+      <div className="toast-container" style={{ opacity: toast.visible ? 1 : 0, pointerEvents: toast.visible ? 'auto' : 'none' }}>
+        <div className={`toast-content ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
           {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
-          <span>{toast.message}</span>
+          {toast.message}
         </div>
       </div>
 
       <main className="admin-content">
-        <div className="page-header mb-8">
+        <div className="page-header">
           <div>
-            <h1 className="page-title text-3xl font-black text-gray-900 flex items-center gap-3">
-              <KeyIcon size={32} className="text-primary" />
+            <h1 className="page-title">
+              <KeyIcon size={28} />
               إدارة أكواد المراكز
             </h1>
-            <p className="page-subtitle text-base mt-2">قم بتوليد وتصدير أكواد مسبقة الدفع لتباع في السناتر والمكتبات (إجمالي: <span className="font-bold text-primary">{totalCount}</span> كود)</p>
+            <p className="page-subtitle">إجمالي الأكواد: {totalCount} كود</p>
           </div>
         </div>
 
-        {/* 🚀 قسم توليد الأكواد */}
-        <div className="card mb-8 shadow-sm border border-gray-200 bg-white rounded-2xl p-6">
-          <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-gray-800 pb-4">
-            <PlusIcon size={22} className="text-success" />
+        <div className="card mb-6">
+          <h2 className="card-title flex items-center gap-2 mb-5">
+            <PlusIcon size={20} />
             إنشاء أكواد جديدة
           </h2>
 
-          <form onSubmit={handleGenerate} className="flex flex-col gap-6">
-            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-end">
-              <div className="form-group mb-0">
-                <label className="form-label font-bold text-gray-700 mb-2 block">الكورس المرتبط بالكود</label>
+          <form onSubmit={handleGenerate} className="flex flex-col gap-4">
+            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
+              <div className="form-group">
+                <label className="form-label">الكورس</label>
                 <select
                   value={selectedCourse}
                   onChange={(e) => setSelectedCourse(e.target.value)}
-                  className="input-field bg-gray-50 focus:bg-white font-bold w-full rounded-xl py-3 border-gray-200"
+                  className="input-field"
                   required
                   dir="rtl"
                 >
-                  <option value="">اختر كورس...</option>
+                  <option value="">اختر كورس</option>
                   {courses.map(course => (
                     <option key={course.id} value={course.id}>
                       {course.title}
@@ -348,60 +332,58 @@
                 </select>
               </div>
 
-              <div className="form-group mb-0">
-                <label className="form-label font-bold text-gray-700 mb-2 block">نوع الصلاحية (الكود)</label>
+              <div className="form-group">
+                <label className="form-label">نوع الكود</label>
                 <select
                   value={codeType}
                   onChange={(e) => setCodeType(e.target.value as any)}
-                  className="input-field bg-gray-50 focus:bg-white font-bold w-full rounded-xl py-3 border-gray-200"
+                  className="input-field"
                   required
                   dir="rtl"
                 >
-                  <option value="course">كورس كامل (يفتح الكورس)</option>
-                  <option value="lecture">محاضرة معينة (يفتح محاضرة واحدة)</option>
-                  <option value="accumulator">كود تراكمي (إعفاء من واجب/امتحان)</option>
+                  <option value="course">كورس كامل</option>
+                  <option value="lecture">محاضرة معينة (فتح محاضرة واحدة)</option>
+                  <option value="accumulator">كود تراكمي (امتحان وواجب اختياري)</option>
                 </select>
               </div>
 
-              <div className="form-group mb-0">
-                <label className="form-label font-bold text-gray-700 mb-2 block">الكمية (عدد الأكواد)</label>
+              <div className="form-group">
+                <label className="form-label">العدد</label>
                 <input
                   type="number"
                   value={quantity}
-                  // 🚀 حماية ضد الأرقام السالبة والكسور
-                  onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ''))}
+                  onChange={(e) => setQuantity(e.target.value)}
                   min="1"
                   max="1000"
-                  className="input-field bg-gray-50 focus:bg-white font-bold w-full rounded-xl py-3 border-gray-200 text-center"
+                  className="input-field"
                   required
-                  dir="ltr"
+                  dir="rtl"
                 />
               </div>
 
               <button
                 type="submit"
-                disabled={generating || !selectedCourse}
-                className="btn btn-primary h-[50px] text-base font-bold shadow-lg shadow-blue-200 rounded-xl"
+                disabled={generating}
+                className="btn btn-primary h-[42px]"
               >
-                {generating ? <span className="spinner spinner-light w-5 h-5 border-2 mx-auto" /> : 'إنشاء الأكواد 🚀'}
+                {generating ? 'جاري الإنشاء...' : 'إنشاء'}
               </button>
             </div>
 
-            {/* الحقول الإضافية (تظهر بـ Animation حسب الاختيار) */}
             {codeType === 'lecture' && selectedCourse && (
-              <div className="form-group animate-fade-in max-w-lg bg-blue-50/50 p-5 rounded-xl border border-blue-100">
-                <label className="form-label font-bold text-blue-900 block mb-3">حدد المحاضرة التي سيفتحها هذا الكود:</label>
+              <div className="form-group animate-fade-in max-w-lg">
+                <label className="form-label">اختر المحاضرة المراد فتحها</label>
                 {fetchingLectures ? (
-                  <p className="text-muted text-sm font-bold flex items-center gap-2"><span className="spinner spinner-primary w-4 h-4 border-2" /> جاري التحميل...</p>
+                  <p className="text-muted text-xs">جاري تحميل المحاضرات...</p>
                 ) : (
                   <select
                     value={selectedLectureId}
                     onChange={(e) => setSelectedLectureId(e.target.value)}
-                    className="input-field bg-white w-full rounded-lg font-medium border-blue-200"
+                    className="input-field"
                     required
                     dir="rtl"
                   >
-                    <option value="">اختر محاضرة...</option>
+                    <option value="">اختر محاضرة</option>
                     {courseLectures.map(lecture => (
                       <option key={lecture.id} value={lecture.id}>
                         {lecture.title}
@@ -413,36 +395,33 @@
             )}
 
             {codeType === 'accumulator' && selectedCourse && (
-              <div className="flex flex-col gap-5 animate-fade-in bg-orange-50/50 p-6 rounded-xl border border-orange-100">
+              <div className="flex flex-col gap-4 animate-fade-in">
                 <div className="form-group max-w-lg">
-                  <label className="form-label font-bold text-orange-900 block mb-2">رقم هاتف الطالب المخصص له الكود</label>
+                  <label className="form-label">رقم هاتف الطالب أو ولي الأمر (مطلوب للكود التراكمي)</label>
                   <input
                     type="text"
-                    placeholder="مثال: 01012345678"
+                    placeholder="مثال: 01067473845"
                     value={studentPhone}
-                    // 🚀 تأمين الإدخال ليقبل الأرقام فقط
-                    onChange={(e) => setStudentPhone(e.target.value.replace(/[^0-9]/g, ''))}
-                    className="input-field bg-white font-mono text-lg tracking-widest w-full rounded-lg border-orange-200"
+                    onChange={(e) => setStudentPhone(e.target.value)}
+                    className="input-field"
                     required
-                    dir="ltr"
+                    dir="rtl"
                   />
-                  <small className="text-orange-700 text-xs mt-2 flex items-center gap-1 font-bold">
-                    <AlertCircleIcon size={14} /> للحماية: لن يتمكن من استخدام هذا الكود التراكمي سوى الطالب صاحب هذا الرقم.
-                  </small>
+                  <small className="text-muted text-xs mt-1 block">لن يتمكن من استخدام هذا الكود سوى الطالب صاحب الرقم المدخل أو ولي أمره.</small>
                 </div>
 
-                <div className="form-group border-t border-orange-200/50 pt-4">
-                  <label className="form-label font-bold mb-4 block text-orange-900">حدد المحاضرات التي تريد إعفاء الطالب من شرطها:</label>
+                <div className="form-group">
+                  <label className="form-label font-bold mb-2 block">حدد المحاضرات التي تريد جعل واجبها وامتحانها اختيارياً (تراكمي):</label>
                   {fetchingLectures ? (
-                    <p className="text-muted text-sm font-bold flex items-center gap-2"><span className="spinner spinner-primary w-4 h-4" /> جاري التحميل...</p>
+                    <p className="text-muted text-xs">جاري تحميل المحاضرات...</p>
                   ) : courseLectures.length === 0 ? (
-                    <p className="text-sm font-bold text-red-600 bg-red-50 p-3 rounded-lg inline-block">لا يوجد محاضرات في هذا الكورس بعد.</p>
+                    <p className="text-xs" style={{ color: 'var(--error)' }}>لا يوجد محاضرات في هذا الكورس بعد.</p>
                   ) : (
-                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-white/80 rounded-xl border border-orange-200 max-h-64 overflow-y-auto shadow-inner">
+                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg border max-h-60 overflow-y-auto">
                       {courseLectures.map(lecture => {
                         const isChecked = selectedAccumulatorLectures.includes(lecture.id);
                         return (
-                          <label key={lecture.id} className={`flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all border ${isChecked ? 'bg-orange-100 border-orange-300 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
+                          <label key={lecture.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer transition-colors border">
                             <input
                               type="checkbox"
                               checked={isChecked}
@@ -453,9 +432,9 @@
                                   setSelectedAccumulatorLectures(prev => prev.filter(id => id !== lecture.id));
                                 }
                               }}
-                              className="mt-0.5 w-5 h-5 text-orange-500 rounded border-gray-300 focus:ring-orange-500 cursor-pointer"
+                              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                             />
-                            <span className={`text-sm font-bold leading-tight ${isChecked ? 'text-orange-900' : 'text-gray-700'}`}>{lecture.title}</span>
+                            <span className="text-sm font-medium">{lecture.title}</span>
                           </label>
                         );
                       })}
@@ -466,29 +445,17 @@
             )}
           </form>
 
-          {/* 🚀 عرض الأكواد التي تم توليدها للتو */}
           {generatedCodes.length > 0 && (
-            <div className="mt-8 p-6 rounded-2xl animate-scale-up shadow-sm" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
-              <div className="flex flex-wrap justify-between items-center gap-4 mb-5 pb-4 border-b border-green-200">
-                <p className="font-bold flex items-center gap-2 text-green-800 text-lg">
-                  <CheckCircleIcon size={24} />
-                  نجاح! تم إنشاء {generatedCodes.length} كود جديد.
-                </p>
-                <button 
-                  onClick={() => {
-                    navigator.clipboard.writeText(generatedCodes.join('\n'));
-                    showToast('تم نسخ جميع الأكواد بنجاح', 'success');
-                  }} 
-                  className="btn bg-white text-green-700 border border-green-300 hover:bg-green-50 font-bold shadow-sm rounded-xl px-6"
-                >
-                  نسخ الكل 📋
-                </button>
-              </div>
-              <div className="max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-2">
+            <div className="mt-6 p-4 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)' }}>
+              <p className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--success)' }}>
+                <CheckCircleIcon size={18} />
+                تم إنشاء {generatedCodes.length} كود بنجاح:
+              </p>
+              <div className="max-h-48 overflow-y-auto flex flex-col gap-2">
                 {generatedCodes.map((code, index) => (
-                  <div key={index} className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-green-100 hover:border-green-300 transition-colors group">
-                    <code className="font-mono text-base font-bold text-gray-800 tracking-widest select-all">{code}</code>
-                    <button onClick={() => copyToClipboard(code)} className="text-xs font-bold text-primary hover:text-blue-700 px-3 py-1.5 bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">نسخ</button>
+                  <div key={index} className="flex justify-between items-center p-2 bg-white rounded shadow-sm">
+                    <code className="font-mono text-sm">{code}</code>
+                    <button onClick={() => copyToClipboard(code)} className="btn btn-sm btn-outline">نسخ</button>
                   </div>
                 ))}
               </div>
@@ -496,18 +463,17 @@
           )}
         </div>
 
-        {/* 🚀 قسم الفلاتر والجدول */}
-        <div className="card mb-6 shadow-sm border border-gray-200 bg-white rounded-2xl p-5">
+        <div className="card mb-6">
           <div className="flex gap-4 items-end flex-wrap">
             <div className="flex-1 min-w-[200px]">
-              <label className="form-label text-sm font-bold text-gray-700 mb-2 block">تصفية حسب الكورس</label>
+              <label className="form-label text-sm">تصفية حسب الكورس</label>
               <select
                 value={filterCourse}
                 onChange={(e) => { setFilterCourse(e.target.value); setCurrentPage(1); }}
-                className="input-field bg-gray-50 focus:bg-white font-bold w-full rounded-xl"
+                className="input-field"
                 dir="rtl"
               >
-                <option value="">جميع الكورسات (عرض الكل)</option>
+                <option value="">جميع الكورسات</option>
                 {courses.map(course => (
                   <option key={course.id} value={course.id}>
                     {course.title}
@@ -517,129 +483,120 @@
             </div>
 
             <div className="flex-1 min-w-[200px]">
-              <label className="form-label text-sm font-bold text-gray-700 mb-2 block">تصفية حسب حالة الاستخدام</label>
+              <label className="form-label text-sm">تصفية حسب الحالة</label>
               <select
                 value={filterStatus}
                 onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
-                className="input-field bg-gray-50 focus:bg-white font-bold w-full rounded-xl"
+                className="input-field"
                 dir="rtl"
               >
-                <option value="">الكل (مستخدم وغير مستخدم)</option>
-                <option value="unused">غير مستخدم فقط (متاح للبيع)</option>
-                <option value="used">مستخدم فقط (تم تفعيله)</option>
+                <option value="">الكل</option>
+                <option value="unused">غير مستخدم</option>
+                <option value="used">مستخدم</option>
               </select>
             </div>
 
             <button
               onClick={handleExportCSV}
-              className="btn btn-success flex items-center gap-2 h-[46px] px-6 rounded-xl font-bold shadow-md shadow-green-200"
+              className="btn btn-success flex items-center gap-2"
             >
-              <UploadIcon size={18} />
-              تصدير المتاح كـ CSV
+              <UploadIcon size={16} />
+              تصدير غير المستخدم كـ CSV
             </button>
           </div>
         </div>
 
-        {loading ? (
-          <div className="card p-16 flex flex-col items-center justify-center border border-gray-200 bg-white rounded-2xl">
-            <div className="spinner spinner-primary spinner-lg mb-4" />
-            <span className="font-bold text-muted">جاري سحب الأكواد...</span>
-          </div>
-        ) : codes.length === 0 ? (
-          <div className="empty-state bg-white rounded-2xl py-20 shadow-sm">
-            <div className="empty-state-icon bg-gray-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner">
-              <KeyIcon size={48} className="text-gray-400" />
-            </div>
-            <h3 className="text-2xl font-black text-gray-800">لا توجد أكواد مطابقة</h3>
-            <p className="text-muted mt-2 font-medium">قم بإنشاء أكواد جديدة أو تغيير خيارات التصفية بالأعلى لتظهر النتائج.</p>
+        {codes.length === 0 ? (
+          <div className="empty-state">
+            <div className="empty-state-icon"><KeyIcon size={48} /></div>
+            <h3 className="text-xl font-bold">لا توجد أكواد</h3>
+            <p>لم يتم العثور على أي أكواد تطابق بحثك</p>
           </div>
         ) : (
           <>
-            <div className="table-container border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
-              <div className="overflow-x-auto w-full">
-                <table className="table w-full m-0 min-w-[1000px]">
-                  <thead className="bg-gray-50 border-b border-gray-200">
-                    <tr>
-                      <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">الكود</th>
-                      <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">الكورس المرتبط</th>
-                      <th className="font-bold text-gray-700 py-5 px-5 text-center whitespace-nowrap">نوع الصلاحية</th>
-                      <th className="font-bold text-gray-700 py-5 px-5 text-center whitespace-nowrap">الحالة</th>
-                      <th className="font-bold text-gray-700 py-5 px-5 text-center whitespace-nowrap">مخصص لهاتف</th>
-                      <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">المستخدم (الطالب)</th>
-                      <th className="font-bold text-gray-700 py-5 px-5 text-center whitespace-nowrap">تاريخ الإنشاء</th>
+            <div className="table-container mb-4">
+              <table className="table">
+                <thead>
+                  <tr>
+                    <th>الكود</th>
+                    <th>الكورس</th>
+                    <th>النوع</th>
+                    <th>الحالة</th>
+                    <th>مخصص لهاتف</th>
+                    <th>استخدم بواسطة</th>
+                    <th>تاريخ الإنشاء</th>
+                  </tr>
+                </thead>
+                <tbody>
+                  {codes.map(code => (
+                    <tr key={code.id}>
+                      <td>
+                        <code className="font-mono text-sm">{code.code}</code>
+                      </td>
+                      <td className="text-muted">{code.courseTitle}</td>
+                      <td>
+                        {code.type === 'course' ? (
+                          <span className="badge" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>كورس كامل</span>
+                        ) : code.type === 'lecture' ? (
+                          <span className="badge animate-fade-in" style={{ backgroundColor: '#0B4F6C', color: '#fff' }}>
+                            محاضرة: {code.lectureTitle || `محاضرة #${code.lectureId}`}
+                          </span>
+                        ) : (
+                          <span className="badge animate-fade-in" style={{ backgroundColor: '#f97316', color: '#fff' }}>
+                            تراكمي ({code.accumulatorLectures ? code.accumulatorLectures.length : 0} م)
+                          </span>
+                        )}
+                      </td>
+                      <td>{getStatusBadge(code.isUsed)}</td>
+                      <td>
+                        {code.studentPhone ? (
+                          <span className="font-mono text-sm font-bold flex items-center gap-1" style={{ color: 'var(--success)' }}>
+                            <PhoneIcon size={14} />
+                            {code.studentPhone}
+                          </span>
+                        ) : (
+                          <span className="text-muted">عام</span>
+                        )}
+                      </td>
+                      <td>
+                        {code.usedBy ? (
+                          <div>
+                            <div className="font-semibold">{code.usedBy.fullName}</div>
+                            <div className="text-xs text-muted">
+                              {code.usedBy.phone}
+                            </div>
+                          </div>
+                        ) : (
+                          <span className="text-muted">-</span>
+                        )}
+                      </td>
+                      <td>
+                        <span className="text-sm text-muted">
+                          {new Date(code.createdAt).toLocaleDateString('ar-EG')}
+                        </span>
+                      </td>
                     </tr>
-                  </thead>
-                  <tbody className="divide-y divide-gray-100">
-                    {codes.map(code => (
-                      <tr key={code.id} className="hover:bg-gray-50/50 transition-colors">
-                        <td className="py-4 px-5">
-                          <code className="font-mono text-base font-bold text-primary tracking-widest bg-blue-50 px-3 py-1.5 rounded-lg select-all border border-blue-100 inline-block">{code.code}</code>
-                        </td>
-                        <td className="py-4 px-5 font-bold text-gray-800 text-sm">{code.courseTitle || '—'}</td>
-                        <td className="py-4 px-5 text-center">
-                          {code.type === 'course' ? (
-                            <span className="badge font-bold px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>كورس كامل</span>
-                          ) : code.type === 'lecture' ? (
-                            <span className="badge animate-fade-in font-bold px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: '#0B4F6C', color: '#fff' }}>
-                              محاضرة: {code.lectureTitle || `#${code.lectureId}`}
-                            </span>
-                          ) : (
-                            <span className="badge animate-fade-in font-bold px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: '#f97316', color: '#fff' }}>
-                              تراكمي ({code.accumulatorLectures ? code.accumulatorLectures.length : 0} م)
-                            </span>
-                          )}
-                        </td>
-                        <td className="py-4 px-5 text-center">{getStatusBadge(code.isUsed)}</td>
-                        <td className="py-4 px-5 text-center">
-                          {code.studentPhone ? (
-                            <span className="font-mono text-xs font-bold flex items-center justify-center gap-1.5 text-orange-700 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100 inline-flex">
-                              <PhoneIcon size={14} />
-                              {code.studentPhone}
-                            </span>
-                          ) : (
-                            <span className="text-gray-500 text-xs font-bold bg-gray-100 px-3 py-1.5 rounded-full">عام للجميع</span>
-                          )}
-                        </td>
-                        <td className="py-4 px-5">
-                          {code.usedBy ? (
-                            <div>
-                              <div className="font-bold text-sm text-gray-900">{code.usedBy.fullName}</div>
-                              <div className="text-xs text-muted font-mono mt-1 font-bold" dir="ltr">
-                                {code.usedBy.phone}
-                              </div>
-                            </div>
-                          ) : (
-                            <span className="text-gray-400 font-bold">—</span>
-                          )}
-                        </td>
-                        <td className="py-4 px-5 text-center">
-                          <span className="text-xs text-gray-500 font-bold bg-gray-50 px-2 py-1 rounded">
-                            {new Date(code.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
-                          </span>
-                        </td>
-                      </tr>
-                    ))}
-                  </tbody>
-                </table>
-              </div>
+                  ))}
+                </tbody>
+              </table>
             </div>
 
             {totalPages > 1 && (
-              <div className="flex justify-center items-center gap-4 mt-8 bg-white p-3 rounded-full shadow-sm border border-gray-200 inline-flex mx-auto">
+              <div className="flex justify-center gap-2 mt-6">
                 <button
                   onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                   disabled={currentPage === 1}
-                  className="btn btn-outline rounded-full px-6 py-2 disabled:opacity-50 font-bold hover:bg-gray-50 border-none"
+                  className="btn btn-outline"
                 >
                   السابق
                 </button>
-                <span className="font-black text-primary px-4 bg-blue-50 py-2 rounded-xl text-sm">
-                  الصفحة {currentPage} من {totalPages}
+                <span className="flex items-center px-4 font-bold text-primary">
+                  {currentPage} من {totalPages}
                 </span>
                 <button
                   onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                   disabled={currentPage === totalPages}
-                  className="btn btn-outline rounded-full px-6 py-2 disabled:opacity-50 font-bold hover:bg-gray-50 border-none"
+                  className="btn btn-outline"
                 >
                   التالي
                 </button>
@@ -651,10 +608,8 @@
 
       <style jsx>{`
         .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
-        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
         @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
-        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
       `}</style>
     </div>
   );
-}+}
```

### `app\admin\courses\page.tsx`
```diff
--- Current: app\admin\courses\page.tsx
+++ Other: app\admin\courses\page.tsx
@@ -1,164 +1,156 @@
 'use client';
 
-import { useState, useEffect, useCallback } from 'react';
+import { useState, useEffect } from 'react';
 import { useRouter } from 'next/navigation';
 import AdminSidebar from '@/app/components/AdminSidebar';
-import { useAuthGuard } from '../../hooks/useAuthGuard'; 
-import api from '@/lib/axios'; 
 import {
-  PlusIcon, XIcon, EditIcon, TrashIcon, BookIcon, 
-  FileTextIcon, AlertTriangleIcon, SparklesIcon,
-  CheckCircleIcon, AlertCircleIcon, ShieldIcon
+  PlusIcon, XIcon, EditIcon, TrashIcon, BookIcon, FileTextIcon,
+  AlertTriangleIcon, CheckIcon, ClockIcon, SparklesIcon,
 } from '@/app/components/Icons';
 
-// قاموس الترجمة
-const ACADEMIC_YEARS = [
-  { value: 'grade_1', label: 'الأول الابتدائي' },
-  { value: 'grade_2', label: 'الثاني الابتدائي' },
-  { value: 'grade_3', label: 'الثالث الابتدائي' },
-  { value: 'grade_4', label: 'الرابع الابتدائي' },
-  { value: 'grade_5', label: 'الخامس الابتدائي' },
-  { value: 'grade_6', label: 'السادس الابتدائي' },
-  { value: 'grade_7', label: 'الأول الإعدادي' },
-  { value: 'grade_8', label: 'الثاني الإعدادي' },
-  { value: 'grade_9', label: 'الثالث الإعدادي' },
-  { value: 'grade_10', label: 'الأول الثانوي' },
-  { value: 'grade_11', label: 'الثاني الثانوي' },
-  { value: 'grade_12', label: 'الثالث الثانوي' },
-  { value: 'other', label: 'أخرى / عام' }
-];
-
-function getAcademicYearLabel(val: string) {
-  const found = ACADEMIC_YEARS.find(y => y.value === val);
-  return found ? found.label : val;
-}
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
 
 interface Course {
   id: number;
   title: string;
   description: string | null;
-  pricePoints: number;
-  validityDate: string | null;
-  academicYear: string | null;
-  isStrictOrder: boolean;
-  status: string; // 🚀 تمت إضافة الحالة
-  createdAt: string;
-  lecturesCount?: number;
+  price_points: number;
+  validity_date: string | null;
+  academic_year: string | null;
+  is_strict_order: boolean | number;
+  created_at: string;
+  lectures_count?: number;
 }
 
 export default function AdminCoursesPage() {
   const router = useRouter();
-  const { isChecking } = useAuthGuard(['admin']);
-
   const [courses, setCourses] = useState<Course[]>([]);
-  const [loading, setLoading] = useState(true);
+  const [isLoading, setIsLoading] = useState(true);
   const [showForm, setShowForm] = useState(false);
   const [editingCourse, setEditingCourse] = useState<Course | null>(null);
-  
-  // 🚀 تمت إضافة status للنموذج
   const [formData, setFormData] = useState({
-    title: '', description: '', price_points: '', validity_date: '', academic_year: '', is_strict_order: true, status: 'published'
+    title: '',
+    description: '',
+    price_points: '',
+    validity_date: '',
+    academic_year: '',
+    is_strict_order: true,
   });
 
   const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
+
   const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; message: string; onConfirm: () => void } | null>(null);
 
-  const showToast = useCallback((message: string, type: 'success' | 'error') => {
+  const showToast = (message: string, type: 'success' | 'error') => {
     setToast({ visible: true, message, type });
-    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
+    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
+  };
+
+  const getToken = () => {
+    return document.cookie
+      .split('; ')
+      .find(row => row.startsWith('token='))
+      ?.substring(6) || localStorage.getItem('token');
+  };
+
+  useEffect(() => {
+    fetchCourses();
+  // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);
 
-  useEffect(() => {
-    if (confirmDialog) document.body.style.overflow = 'hidden';
-    else document.body.style.overflow = '';
-    return () => { document.body.style.overflow = ''; };
-  }, [confirmDialog]);
-
-  useEffect(() => {
-    if (!isChecking) fetchCourses();
-  // eslint-disable-next-line react-hooks/exhaustive-deps
-  }, [isChecking]);
-
   const fetchCourses = async () => {
-    setLoading(true);
+    setIsLoading(true);
     try {
-      const response = await api.get('/admin/courses');
-      const data = response.data?.data || response.data || [];
-      
-      const mappedCourses: Course[] = data.map((c: any) => ({
-        id: c.id,
-        title: c.title || 'كورس بدون عنوان',
-        description: c.description,
-        pricePoints: Number(c.price_points ?? c.pricePoints ?? 0),
-        validityDate: c.validity_date ?? c.validityDate ?? null,
-        academicYear: c.academic_year ?? c.academicYear ?? null,
-        isStrictOrder: !!(c.is_strict_order ?? c.isStrictOrder ?? true),
-        status: c.status || 'draft', // 🚀 سحب الحالة
-        createdAt: c.created_at ?? c.createdAt ?? new Date().toISOString(),
-        lecturesCount: Number(c.lectures_count ?? c.lecturesCount ?? 0),
-      }));
-      setCourses(mappedCourses);
-    } catch (e: any) {
-      showToast(e?.message || 'فشل جلب قائمة الكورسات', 'error');
+      const token = getToken();
+      const res = await fetch(`${API_URL}/api/admin/courses`, {
+        headers: {
+          'Authorization': `Bearer ${token}`,
+          'Accept': 'application/json',
+        },
+      });
+
+      if (res.status === 401 || res.status === 403) {
+        router.push('/login');
+        return;
+      }
+
+      const data = await res.json();
+      setCourses(data.data || []);
+    } catch (err) {
+      showToast('فشل جلب الكورسات من الخادم', 'error');
     } finally {
-      setLoading(false);
+      setIsLoading(false);
     }
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
-    if (!formData.title.trim() || !formData.price_points) {
-      showToast('يرجى تعبئة العنوان والسعر', 'error');
-      return;
+    setIsLoading(true);
+
+    try {
+      const token = getToken();
+      const url = editingCourse
+        ? `${API_URL}/api/admin/courses/${editingCourse.id}`
+        : `${API_URL}/api/admin/courses`;
+
+      const res = await fetch(url, {
+        method: editingCourse ? 'PUT' : 'POST',
+        headers: {
+          'Authorization': `Bearer ${token}`,
+          'Accept': 'application/json',
+          'Content-Type': 'application/json',
+        },
+        body: JSON.stringify({
+          ...formData,
+          price_points: parseInt(formData.price_points),
+          is_strict_order: formData.is_strict_order,
+          academic_year: formData.academic_year || null,
+        }),
+      });
+
+      if (res.ok) {
+        showToast(editingCourse ? 'تم تحديث الكورس بنجاح' : 'تم إضافة الكورس بنجاح', 'success');
+        setShowForm(false);
+        setEditingCourse(null);
+        setFormData({ title: '', description: '', price_points: '', validity_date: '', academic_year: '', is_strict_order: true });
+        fetchCourses();
+      } else {
+        const errorData = await res.json();
+        showToast(errorData.message || 'حدث خطأ أثناء الحفظ. تأكد من البيانات', 'error');
+      }
+    } catch (err) {
+      showToast('خطأ في الاتصال بالخادم', 'error');
+    } finally {
+      setIsLoading(false);
     }
-
-    setLoading(true);
-    try {
-      const payload = {
-        title: formData.title.trim(),
-        description: formData.description.trim() || null,
-        price_points: parseInt(formData.price_points) || 0,
-        validity_date: formData.validity_date || null,
-        academic_year: formData.academic_year || null,
-        is_strict_order: formData.is_strict_order,
-        status: formData.status, // 🚀 إرسال الحالة للباك إند
-      };
-
-      if (editingCourse) {
-        await api.put(`/admin/courses/${editingCourse.id}`, payload);
-        showToast('تم تحديث بيانات الكورس بنجاح', 'success');
-      } else {
-        await api.post('/admin/courses', payload);
-        showToast('تمت إضافة الكورس الجديد بنجاح', 'success');
-      }
-
-      setShowForm(false);
-      setEditingCourse(null);
-      setFormData({ title: '', description: '', price_points: '', validity_date: '', academic_year: '', is_strict_order: true, status: 'published' });
-      fetchCourses();
-    } catch (e: any) {
-      const errorMsg = e.response?.data?.message || e?.message || 'فشل حفظ الكورس، تحقق من البيانات';
-      showToast(errorMsg, 'error');
-    } finally {
-      setLoading(false);
-    }
-  };
-
-  const handleDelete = (course: Course) => {
+  };
+
+  const handleDelete = (id: number) => {
     setConfirmDialog({
       visible: true,
-      message: `هل أنت متأكد من حذف الكورس "${course.title}"؟ سيتم حذف جميع المحاضرات والاختبارات المرتبطة به نهائياً.`,
+      message: 'هل أنت متأكد من حذف هذا الكورس؟ سيتم حذف جميع المحاضرات والاختبارات المرتبطة به للأبد.',
       onConfirm: async () => {
         setConfirmDialog(null);
-        setLoading(true);
+        setIsLoading(true);
         try {
-          await api.delete(`/admin/courses/${course.id}`);
-          showToast('تم حذف الكورس بنجاح', 'success');
-          fetchCourses();
-        } catch (e: any) {
-          showToast(e?.message || 'فشل حذف الكورس', 'error');
+          const token = getToken();
+          const res = await fetch(`${API_URL}/api/admin/courses/${id}`, {
+            method: 'DELETE',
+            headers: {
+              'Authorization': `Bearer ${token}`,
+              'Accept': 'application/json',
+            },
+          });
+          if (res.ok) {
+            showToast('تم حذف الكورس بنجاح', 'success');
+            fetchCourses();
+          } else {
+            showToast('فشل حذف الكورس. قد يكون مرتبطاً ببيانات أخرى', 'error');
+          }
+        } catch (err) {
+          showToast('خطأ في الاتصال بالخادم', 'error');
         } finally {
-          setLoading(false);
+          setIsLoading(false);
         }
       }
     });
@@ -166,241 +158,213 @@
 
   const handleEdit = (course: Course) => {
     setEditingCourse(course);
+    const formattedDate = course.validity_date ? course.validity_date.split('T')[0] : '';
+
     setFormData({
       title: course.title,
       description: course.description || '',
-      price_points: course.pricePoints.toString(),
-      validity_date: course.validityDate ? course.validityDate.split('T')[0] : '',
-      academic_year: course.academicYear || '',
-      is_strict_order: course.isStrictOrder,
-      status: course.status, // 🚀 تعبئة الحالة عند التعديل
+      price_points: course.price_points.toString(),
+      validity_date: formattedDate,
+      academic_year: course.academic_year || '',
+      is_strict_order: course.is_strict_order === undefined ? true : !!course.is_strict_order,
     });
     setShowForm(true);
     window.scrollTo({ top: 0, behavior: 'smooth' });
   };
 
-  if (isChecking) {
-    return (
-      <div className="admin-layout relative">
-        <AdminSidebar />
-        <main className="admin-content flex items-center justify-center min-h-[60vh]">
-          <div className="loading-state text-center flex flex-col items-center">
-             <div className="spinner spinner-primary spinner-lg mb-4 mx-auto" />
-             <p className="font-bold text-muted text-lg">جاري التحقق وتجهيز الكورسات...</p>
-          </div>
-        </main>
-      </div>
-    );
-  }
-
   return (
-    <div className="admin-layout relative">
+    <div className="admin-layout">
       <AdminSidebar />
 
-      <div 
-        className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300" 
-        style={{ opacity: toast.visible ? 1 : 0, transform: toast.visible ? 'translate(-50%, 0)' : 'translate(-50%, -20px)', pointerEvents: toast.visible ? 'auto' : 'none' }}
-      >
-        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl text-sm font-bold ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
-          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
-          <span>{toast.message}</span>
-        </div>
-      </div>
-
-      {confirmDialog && (
-        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setConfirmDialog(null)}>
-          <div className="card shadow-2xl max-w-sm w-full text-center p-8 animate-scale-up bg-white rounded-2xl border border-gray-100" onClick={e => e.stopPropagation()}>
-            <div className="flex justify-center mb-5 text-error">
-              <AlertTriangleIcon size={56} />
-            </div>
-            <h3 className="text-2xl font-black text-gray-900 mb-4">تأكيد الحذف</h3>
-            <p className="text-gray-600 mb-8 leading-relaxed font-medium">{confirmDialog.message}</p>
-            <div className="flex gap-4 justify-center">
-              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline flex-1 py-3 font-bold rounded-xl border-gray-200 hover:bg-gray-50">إلغاء</button>
-              <button onClick={confirmDialog.onConfirm} className="btn btn-danger flex-1 py-3 font-bold shadow-lg shadow-red-200 rounded-xl text-white">نعم، احذف</button>
-            </div>
+      {toast.visible && (
+        <div className="toast-container">
+          <div className={`toast-content ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
+            {toast.message}
           </div>
         </div>
       )}
 
+      {confirmDialog && (
+        <div className="modal-overlay">
+          <div className="modal max-w-sm w-11/12 text-center p-8">
+            <div className="flex justify-center mb-4" style={{ opacity: 0.9 }}>
+              <AlertTriangleIcon size={48} />
+            </div>
+            <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--error)' }}>تأكيد الحذف</h3>
+            <p className="text-muted mb-6" style={{ lineHeight: '1.6' }}>{confirmDialog.message}</p>
+            <div className="flex gap-4 justify-center">
+              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline flex-1">إلغاء</button>
+              <button onClick={confirmDialog.onConfirm} className="btn btn-danger flex-1">نعم، احذف</button>
+            </div>
+          </div>
+        </div>
+      )}
+
       <main className="admin-content">
-        <div className="page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
+        <div className="page-header">
           <div>
-            <h1 className="page-title text-3xl font-black text-gray-900 flex items-center gap-3">
-              <BookIcon size={32} className="text-primary" /> إدارة الكورسات
-            </h1>
-            <p className="page-subtitle mt-2 text-base">تحكم كامل في كورسات المنصة، الأسعار، والترتيب التعليمي.</p>
+            <h1 className="page-title">إدارة الكورسات</h1>
+            <p className="page-subtitle text-muted">قم بإضافة وتعديل الكورسات التعليمية المتاحة للطلاب</p>
           </div>
           <button
-            onClick={() => { setShowForm(!showForm); setEditingCourse(null); setFormData({ title: '', description: '', price_points: '', validity_date: '', academic_year: '', is_strict_order: true, status: 'published' }); }}
-            className={`btn ${showForm ? 'btn-outline border-error text-error hover:bg-red-50' : 'btn-primary shadow-lg shadow-blue-200'} font-bold transition-all rounded-xl px-6 py-3`}
+            onClick={() => { setShowForm(!showForm); setEditingCourse(null); setFormData({ title: '', description: '', price_points: '', validity_date: '', academic_year: '', is_strict_order: true }); }}
+            className="btn btn-primary"
           >
-            {showForm ? <><XIcon size={18} /> إلغاء إضافة كورس</> : <><PlusIcon size={18} /> إضافة كورس جديد</>}
+            {showForm ? <><XIcon size={16} /> إلغاء</> : <><PlusIcon size={20} /> إضافة كورس جديد</>}
           </button>
         </div>
 
         {showForm && (
-          <div className="card mb-8 animate-fade-in shadow-sm border border-blue-100 p-8 bg-gradient-to-b from-blue-50/50 to-white rounded-2xl">
-            <h3 className="text-xl font-black mb-6 text-primary flex items-center gap-2 border-b border-primary/10 pb-4">
-              {editingCourse ? <><EditIcon size={22} /> تعديل بيانات الكورس</> : <><SparklesIcon size={22} className="text-success" /> إعداد كورس جديد</>}
-            </h3>
-            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
-              <div className="form-group col-span-full mb-0">
-                <label className="form-label font-bold text-gray-700 mb-2 block">عنوان الكورس (إجباري)</label>
-                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input-field w-full font-black text-lg bg-white border-gray-200 focus:border-primary shadow-sm rounded-xl py-3" required dir="rtl" placeholder="مثال: كورس الفيزياء - الباب الأول" />
+          <div className="card animate-fade-in mb-6">
+            <div className="border-b border-white/10 pb-4 mb-5">
+              <h3 className="text-xl font-bold" style={{ color: 'var(--primary)' }}>
+                {editingCourse ? <><EditIcon size={20} /> تعديل الكورس</> : <><SparklesIcon size={20} /> إضافة كورس جديد</>}
+              </h3>
+            </div>
+            <form onSubmit={handleSubmit}>
+              <div className="form-group">
+                <label className="form-label">عنوان الكورس</label>
+                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input-field w-full" required dir="rtl" placeholder="مثال: كورس التأسيس الشامل" />
               </div>
-              
-              <div className="form-group col-span-full mb-0">
-                <label className="form-label font-bold text-gray-700 mb-2 block">الوصف التفصيلي (اختياري)</label>
-                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field w-full bg-white border-gray-200 focus:border-primary shadow-sm rounded-xl p-4 text-sm" rows={3} dir="rtl" style={{ resize: 'none' }} placeholder="اكتب وصفاً مختصراً يظهر للطلاب عن محتوى الكورس..." />
+              <div className="form-group">
+                <label className="form-label">الوصف التفصيلي</label>
+                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field w-full custom-scrollbar" rows={4} dir="rtl" placeholder="اكتب نبذة عن محتوى الكورس وما سيتعلمه الطالب..." />
               </div>
-
-              <div className="form-group mb-0">
-                <label className="form-label font-bold text-gray-700 mb-2 block">السعر (بالنقاط/الجنيه)</label>
-                <input type="text" value={formData.price_points} onChange={(e) => setFormData({ ...formData, price_points: e.target.value.replace(/[^0-9]/g, '') })} className="input-field w-full font-black text-success text-xl bg-white border-green-200 focus:border-green-500 shadow-sm rounded-xl py-3 text-center" required dir="ltr" placeholder="0" />
+              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
+                <div className="form-group">
+                  <label className="form-label" style={{ color: 'var(--success)' }}>السعر (بالنقاط)</label>
+                  <input type="number" value={formData.price_points} onChange={(e) => setFormData({ ...formData, price_points: e.target.value })} className="input-field w-full text-xl font-bold" style={{ color: 'var(--success)' }} required min="0" placeholder="0" />
+                </div>
+                <div className="form-group">
+                  <label className="form-label" style={{ color: 'var(--warning)' }}>تاريخ انتهاء الصلاحية (اختياري)</label>
+                  <input type="date" value={formData.validity_date} onChange={(e) => setFormData({ ...formData, validity_date: e.target.value })} className="input-field w-full" style={{ color: 'var(--warning)' }} />
+                  <small className="text-muted text-xs mt-1 block">إذا تركته فارغاً، سيكون الكورس متاحاً للأبد للمشتركين.</small>
+                </div>
+                <div className="form-group">
+                  <label className="form-label">السنة الدراسية (اختياري)</label>
+                  <select
+                    value={formData.academic_year}
+                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
+                    className="input-field w-full"
+                    dir="rtl"
+                  >
+                    <option value="">كل السنوات الدراسية (عام)</option>
+                    {['الاول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي', 'الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي', 'الاول الاعدادي', 'الثاني الاعدادي', 'الثالث الاعدادي', 'الاول الثانوي', 'الثاني الثانوية', 'الثالث الثانوي'].map(year => (
+                      <option key={year} value={year}>{year}</option>
+                    ))}
+                  </select>
+                </div>
+                <div className="form-group flex flex-col justify-end pb-2">
+                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-black/10 rounded-lg hover:bg-black/20 transition-all border border-white/5">
+                    <input
+                      type="checkbox"
+                      checked={formData.is_strict_order}
+                      onChange={(e) => setFormData({ ...formData, is_strict_order: e.target.checked })}
+                      className="w-5 h-5 rounded border-white/10 bg-black/40"
+                      style={{ color: 'var(--primary)' }}
+                    />
+                    <div>
+                      <span className="font-bold text-sm block" style={{ color: 'var(--text-primary)' }}>إلزامية الترتيب المتتالي للمحاضرات</span>
+                      <small className="text-muted text-xs block">يمنع الطالب من فتح المحاضرة التالية إلا بعد إنهاء السابقة</small>
+                    </div>
+                  </label>
+                </div>
               </div>
-
-              <div className="form-group mb-0">
-                <label className="form-label font-bold text-gray-700 mb-2 block">السنة الدراسية المستهدفة</label>
-                <select value={formData.academic_year} onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })} className="input-field w-full font-bold bg-white border-gray-200 focus:border-primary shadow-sm rounded-xl py-3" dir="rtl">
-                  <option value="">عام لجميع السنوات</option>
-                  {ACADEMIC_YEARS.map(year => (
-                    <option key={year.value} value={year.value}>{year.label}</option>
-                  ))}
-                </select>
-              </div>
-
-              {/* 🚀 حقل اختيار حالة الكورس الجديد */}
-              <div className="form-group mb-0">
-                <label className="form-label font-bold text-gray-700 mb-2 block">حالة الكورس (الظهور للطلاب)</label>
-                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input-field w-full font-bold bg-white border-gray-200 focus:border-primary shadow-sm rounded-xl py-3" dir="rtl">
-                  <option value="published">🟢 منشور ومتاح للطلاب</option>
-                  <option value="draft">🔒 مسودة (مخفي قيد التجهيز)</option>
-                </select>
-              </div>
-
-              <div className="form-group mb-0">
-                <label className="form-label font-bold text-gray-700 mb-2 block">تاريخ انتهاء الصلاحية (اختياري)</label>
-                <input type="date" value={formData.validity_date} onChange={(e) => setFormData({ ...formData, validity_date: e.target.value })} className="input-field w-full font-bold bg-white border-gray-200 focus:border-primary shadow-sm rounded-xl py-3 text-center" />
-              </div>
-
-              <div className="form-group col-span-full flex items-center pt-4 mb-0">
-                <label className="flex items-center gap-4 cursor-pointer p-4 bg-white hover:bg-gray-50 rounded-xl transition-all border border-gray-200 w-full shadow-sm">
-                  <input type="checkbox" checked={formData.is_strict_order} onChange={(e) => setFormData({ ...formData, is_strict_order: e.target.checked })} className="w-6 h-6 rounded accent-primary cursor-pointer border-gray-300" />
-                  <div>
-                    <span className="font-black text-gray-900 block text-base mb-1">إلزامية الترتيب المتتالي</span>
-                    <span className="text-xs text-gray-500 font-bold leading-tight">يمنع الطالب من فتح المحاضرة التالية إلا بعد اجتياز المحاضرة السابقة بنجاح.</span>
-                  </div>
-                </label>
-              </div>
-
-              <div className="col-span-full pt-6 border-t border-gray-100 mt-2">
-                <button type="submit" disabled={loading} className="btn btn-primary px-10 py-3.5 font-black text-base shadow-lg shadow-blue-200 rounded-xl w-full md:w-auto">
-                  {loading ? <span className="spinner spinner-light w-5 h-5 border-2 mx-auto block" /> : (editingCourse ? 'حفظ التعديلات ✔️' : 'إصدار الكورس 🚀')}
+              <div className="flex gap-3 pt-4 border-t border-white/10 mt-6">
+                <button type="submit" disabled={isLoading} className="btn btn-primary px-8">
+                  {isLoading ? 'جاري الحفظ...' : <><CheckIcon size={20} /> حفظ الكورس</>}
                 </button>
               </div>
             </form>
           </div>
         )}
 
-        {loading && courses.length === 0 ? (
-          <div className="card p-16 flex justify-center items-center flex-col bg-white rounded-2xl shadow-sm border border-gray-100">
-            <div className="spinner spinner-primary spinner-lg mb-4" />
-            <p className="font-bold text-gray-500">جاري سحب بيانات الكورسات...</p>
+        {isLoading && courses.length === 0 ? (
+          <div className="loading-state">
+            <div className="spinner spinner-lg"></div>
           </div>
         ) : courses.length === 0 ? (
-          <div className="empty-state bg-white border border-gray-100 rounded-2xl py-20 shadow-sm text-center">
-            <div className="empty-state-icon bg-gray-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner">
-              <BookIcon size={48} className="text-gray-400" />
-            </div>
-            <h3 className="text-2xl font-black text-gray-800">لا توجد كورسات بعد</h3>
-            <p className="text-muted mt-2 font-medium mb-8 max-w-sm mx-auto">ابدأ بإنشاء الكورس الأول ليتمكن الطلاب من الاشتراك وبدء التعلم.</p>
-            <button onClick={() => { setShowForm(true); setEditingCourse(null); }} className="btn btn-primary px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200">
-              <PlusIcon size={20} className="ml-2 inline" /> أضف الكورس الأول الآن
-            </button>
+          <div className="empty-state">
+            <BookIcon size={48} style={{ opacity: 0.5 }} />
+            <h3 className="text-xl font-bold mb-2">لا توجد كورسات مسجلة بعد</h3>
+            <p className="text-muted mb-6">قم بإنشاء الكورس الأول للبدء في رفع المحاضرات وبناء المنصة.</p>
+            <button onClick={() => setShowForm(true)} className="btn btn-primary"><PlusIcon size={20} /> أضف الكورس الأول</button>
           </div>
         ) : (
-          <div className="table-container border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
-            <div className="overflow-x-auto w-full">
-              <table className="table w-full m-0 min-w-[1000px]">
-                <thead className="bg-gray-50 border-b border-gray-200">
-                  <tr>
-                    <th className="font-bold text-gray-700 py-5 px-6 text-right whitespace-nowrap">عنوان الكورس</th>
-                    <th className="font-bold text-gray-700 py-5 px-6 text-center whitespace-nowrap">الحالة</th>
-                    <th className="font-bold text-gray-700 py-5 px-6 text-center whitespace-nowrap">السعر (ج.م)</th>
-                    <th className="font-bold text-gray-700 py-5 px-6 text-center whitespace-nowrap">المحاضرات</th>
-                    <th className="font-bold text-gray-700 py-5 px-6 text-center whitespace-nowrap min-w-[300px]">إجراءات الإدارة</th>
-                  </tr>
-                </thead>
-                <tbody className="divide-y divide-gray-100">
-                  {courses.map((course) => (
-                    <tr key={course.id} className="hover:bg-gray-50/80 transition-colors">
-                      <td className="py-4 px-6">
-                        <div className="font-black text-primary text-base flex items-center gap-2">
-                          <BookIcon size={18} className="text-gray-400" /> {course.title}
-                        </div>
-                        <div className="flex gap-2 mt-2 flex-wrap">
-                          {course.academicYear ? (
-                            <span className="badge font-bold text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded">
-                              {getAcademicYearLabel(course.academicYear)}
-                            </span>
-                          ) : (
-                            <span className="badge font-bold text-[10px] bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded">
-                              عام للجميع
+          <div className="table-container">
+            <table className="table">
+              <thead>
+                <tr>
+                  <th>عنوان الكورس والتفاصيل</th>
+                  <th className="text-center">السعر</th>
+                  <th className="text-center">تاريخ الانتهاء</th>
+                  <th className="text-center">المحاضرات</th>
+                  <th className="text-center">الإجراءات</th>
+                </tr>
+              </thead>
+              <tbody>
+                {courses.map((course) => (
+                  <tr key={course.id}>
+                    <td>
+                      <div>
+                        <div className="flex items-center gap-2 flex-wrap mb-1">
+                          <h4 className="font-bold text-lg" style={{ color: 'var(--primary)' }}>{course.title}</h4>
+                          {course.academic_year && (
+                            <span className="badge" style={{ backgroundColor: 'rgba(27, 189, 212, 0.1)', color: '#1BBDD4', border: '1px solid rgba(27, 189, 212, 0.2)' }}>
+                              {course.academic_year}
                             </span>
                           )}
-                          {!course.isStrictOrder && (
-                            <span className="badge font-bold text-[10px] bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded">
-                              ترتيب حر
+                          {!course.is_strict_order && (
+                            <span className="badge" style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', color: '#fb923c', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
+                              ترتيب حر (مراكمين)
                             </span>
                           )}
                         </div>
-                      </td>
-                      {/* 🚀 عرض حالة الكورس في الجدول */}
-                      <td className="py-4 px-6 text-center">
-                        <span className={`badge font-bold text-xs px-3 py-1.5 rounded-lg border shadow-sm ${course.status === 'published' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
-                          {course.status === 'published' ? '🟢 منشور' : '🔒 مسودة'}
+                        {course.description && (
+                          <p className="text-sm text-muted mt-1 line-clamp-1">{course.description}</p>
+                        )}
+                      </div>
+                    </td>
+                    <td className="text-center">
+                      <span className="badge badge-success px-3 py-1 text-sm font-bold">{course.price_points} EGP</span>
+                    </td>
+                    <td className="text-center">
+                      {course.validity_date ? (
+                        <span className="text-sm" style={{ color: 'var(--warning)' }}>
+                          <ClockIcon size={14} /> {new Date(course.validity_date).toLocaleDateString('ar-EG')}
                         </span>
-                      </td>
-                      <td className="py-4 px-6 text-center">
-                        <span className="font-black text-success text-lg bg-green-50 px-3 py-1 rounded-lg border border-green-100 shadow-sm">
-                          {course.pricePoints}
-                        </span>
-                      </td>
-                      <td className="py-4 px-6 text-center">
-                        <span className="font-black text-gray-800 text-lg">{course.lecturesCount || 0}</span>
-                      </td>
-                      <td className="py-4 px-6">
-                        <div className="flex justify-center items-center gap-2">
-                          <button onClick={() => router.push(`/admin/courses/${course.id}/lectures`)} className="btn btn-sm btn-primary font-bold shadow-sm rounded-lg px-3 hover:-translate-y-0.5 transition-transform" title="إدارة المحاضرات">
-                            <BookIcon size={14} /> المحاضرات
-                          </button>
-                          <button onClick={() => router.push(`/admin/courses/${course.id}/comprehensive-exams`)} className="btn btn-sm btn-secondary font-bold shadow-sm rounded-lg px-3 bg-purple-600 hover:bg-purple-700 hover:-translate-y-0.5 transition-transform text-white" title="الاختبارات الشاملة">
-                            <ShieldIcon size={14} /> الامتحانات
-                          </button>
-                          <button onClick={() => handleEdit(course)} className="btn btn-sm btn-outline border-gray-300 hover:bg-gray-100 font-bold rounded-lg px-2" title="تعديل الكورس">
-                            <EditIcon size={16} />
-                          </button>
-                          <button onClick={() => handleDelete(course)} className="btn btn-sm btn-outline border-red-100 text-error hover:bg-red-50 font-bold rounded-lg px-2" title="حذف الكورس نهائياً">
-                            <TrashIcon size={16} />
-                          </button>
-                        </div>
-                      </td>
-                    </tr>
-                  ))}
-                </tbody>
-              </table>
-            </div>
+                      ) : (
+                        <span className="text-muted opacity-50">—</span>
+                      )}
+                    </td>
+                    <td className="text-center">
+                      <span className="badge" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
+                        {course.lectures_count || 0}
+                      </span>
+                    </td>
+                    <td>
+                      <div className="flex justify-center items-center gap-2">
+                        <button onClick={() => router.push(`/admin/courses/${course.id}/lectures`)} className="btn btn-sm btn-primary shrink-0" title="إدارة المحاضرات">
+                          <BookIcon size={16} /> المحاضرات
+                        </button>
+                        <button onClick={() => router.push(`/admin/courses/${course.id}/exams`)} className="btn btn-sm btn-secondary shrink-0" title="إدارة الاختبارات">
+                          <FileTextIcon size={16} /> الاختبارات
+                        </button>
+                        <button onClick={() => handleEdit(course)} className="btn btn-sm btn-outline px-3" title="تعديل">
+                          <EditIcon size={16} />
+                        </button>
+                        <button onClick={() => handleDelete(course.id)} className="btn btn-sm btn-danger px-3" title="حذف الكورس">
+                          <TrashIcon size={16} />
+                        </button>
+                      </div>
+                    </td>
+                  </tr>
+                ))}
+              </tbody>
+            </table>
           </div>
         )}
       </main>
-
-      <style jsx>{`
-        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
-        .animate-scale-up { animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
-        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
-        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
-      `}</style>
     </div>
   );
-}+}
```

### `app\admin\courses\[id]\exams\page.tsx`
```diff
--- Current: app\admin\courses\[id]\exams\page.tsx
+++ Other: app\admin\courses\[id]\exams\page.tsx
@@ -1,15 +1,22 @@
 'use client';
 
-import { useEffect, useState, useCallback } from 'react';
-import { useParams, useRouter, useSearchParams } from 'next/navigation';
+import { useEffect, useState } from 'react';
+import { useParams, useRouter } from 'next/navigation';
 import AdminSidebar from '@/app/components/AdminSidebar';
-import { useAuthGuard } from '../../../../hooks/useAuthGuard'; // 🚀 الدرع المركزي
-import api from '@/lib/axios'; // 🚀 العميل الشبكي الذكي
 import {
   FileTextIcon, XIcon, ClockIcon, AwardIcon, RefreshIcon,
   PlusIcon, TrashIcon, SparklesIcon, ImageIcon, CheckIcon,
-  CheckCircleIcon, AlertTriangleIcon, BookIcon, UploadIcon
+  CheckCircleIcon, AlertTriangleIcon
 } from '@/app/components/Icons';
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
+
+const getToken = () => {
+  return document.cookie
+    .split('; ')
+    .find(row => row.startsWith('token='))
+    ?.split('=')[1] || localStorage.getItem('token');
+};
 
 interface Exam {
   id: number;
@@ -51,11 +58,7 @@
 export default function AdminExamsPage() {
   const router = useRouter();
   const params = useParams();
-  const searchParams = useSearchParams();
   const courseId = params.id;
-
-  // 🚀 درع الحماية الذكي
-  const { isChecking } = useAuthGuard(['admin']);
 
   const [exams, setExams] = useState<Exam[]>([]);
   const [loading, setLoading] = useState(true);
@@ -65,29 +68,26 @@
   const [lectures, setLectures] = useState<Lecture[]>([]);
   const [selectedLectureId, setSelectedLectureId] = useState<string>('');
 
-  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; message: string; onConfirm: () => void } | null>(null);
-  
-  // 🚀 نظام التنبيهات الموحد الأنيق
   const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
-  const showToast = useCallback((message: string, type: 'success' | 'error') => {
+  const showToast = (message: string, type: 'success' | 'error') => {
     setToast({ visible: true, message, type });
     setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
-  }, []);
+  };
 
   const [newExam, setNewExam] = useState({
     lecture_id: '',
-    form_index: '1',
-    duration_minutes: '30',
-    pass_score: '60',
+    form_index: 1 as number | string,
+    duration_minutes: 30 as number | string,
+    pass_score: 60 as number | string,
     title: '',
     instructions: '',
     shuffle_questions: true,
     shuffle_options: true,
-    max_attempts: '1',
+    max_attempts: 1 as number | string,
     show_correct_answers: true,
     show_score: true,
     per_question_time: false,
-    random_question_count: '' as string,
+    random_question_count: null as number | string | null,
   });
 
   const [newQuestion, setNewQuestion] = useState({
@@ -98,47 +98,47 @@
     correct_answers: [0],
     image_url: '',
     option_images: ['', '', '', ''],
-    points: '1',
+    points: 1 as number | string,
     time_limit_seconds: null as number | null,
   });
 
   const [uploadingImage, setUploadingImage] = useState(false);
 
-  // تجميد التمرير للنوافذ المنبثقة
   useEffect(() => {
-    if (showQuestionForm || confirmDialog) document.body.style.overflow = 'hidden';
-    else document.body.style.overflow = '';
-    return () => { document.body.style.overflow = ''; };
-  }, [showQuestionForm, confirmDialog]);
+    fetchLectures();
+  // eslint-disable-next-line react-hooks/exhaustive-deps
+  }, [courseId]);
 
   useEffect(() => {
-    if (!isChecking) fetchLectures();
+    if (selectedLectureId) {
+      fetchExams();
+    }
   // eslint-disable-next-line react-hooks/exhaustive-deps
-  }, [courseId, isChecking]);
-
-  useEffect(() => {
-    if (selectedLectureId && !isChecking) {
-      fetchExams();
-    }
-  // eslint-disable-next-line react-hooks/exhaustive-deps
-  }, [selectedLectureId, isChecking]);
+  }, [selectedLectureId]);
 
   const fetchLectures = async () => {
     try {
-      const response = await api.get(`/admin/courses/${courseId}/lectures`);
-      const data = response.data?.data || response.data || [];
-      const validLectures = Array.isArray(data) ? data : [];
-      setLectures(validLectures);
-      
-      const passedLectureId = searchParams.get('lecture_id');
-      
-      if (passedLectureId && validLectures.find((l: any) => String(l.id) === passedLectureId)) {
-        setSelectedLectureId(passedLectureId);
-      } else if (validLectures.length > 0) {
-        setSelectedLectureId(String(validLectures[0].id));
+      const token = getToken();
+      const res = await fetch(`${API_URL}/api/admin/courses/${courseId}/lectures`, {
+        headers: { Authorization: `Bearer ${token}` },
+      });
+      if (res.ok) {
+        const data = await res.json();
+        setLectures(data.data);
+        
+        if (typeof window !== 'undefined') {
+          const urlParams = new URLSearchParams(window.location.search);
+          const passedLectureId = urlParams.get('lecture_id');
+          
+          if (passedLectureId && data.data.find((l: any) => String(l.id) === passedLectureId)) {
+            setSelectedLectureId(passedLectureId);
+          } else if (data.data.length > 0) {
+            setSelectedLectureId(String(data.data[0].id));
+          }
+        }
       }
-    } catch (err: any) {
-      showToast(err?.message || 'فشل تحميل قائمة المحاضرات', 'error');
+    } catch (err) {
+      console.error('Failed to fetch lectures:', err);
     }
   };
 
@@ -146,11 +146,16 @@
     if (!selectedLectureId) return;
     setLoading(true);
     try {
-      const response = await api.get(`/admin/lectures/${selectedLectureId}/exams`);
-      const data = response.data?.data || response.data || [];
-      setExams(Array.isArray(data) ? data : []);
-    } catch (err: any) {
-      showToast(err?.message || 'فشل تحميل نماذج الاختبارات', 'error');
+      const token = getToken();
+      const res = await fetch(`${API_URL}/api/admin/lectures/${selectedLectureId}/exams`, {
+        headers: { Authorization: `Bearer ${token}` },
+      });
+      if (res.ok) {
+        const data = await res.json();
+        setExams(data.data || []);
+      }
+    } catch (err) {
+      console.error('Failed to fetch exams:', err);
     } finally {
       setLoading(false);
     }
@@ -159,43 +164,51 @@
   const handleCreateExam = async (e: React.FormEvent) => {
     e.preventDefault();
     try {
-      const payload = {
-        ...newExam,
-        form_index: parseInt(newExam.form_index) || 1,
-        duration_minutes: parseInt(newExam.duration_minutes) || 30,
-        pass_score: parseInt(newExam.pass_score) || 60,
-        max_attempts: parseInt(newExam.max_attempts) || 1,
-        random_question_count: newExam.random_question_count ? parseInt(newExam.random_question_count) : null,
-      };
-
-      await api.post(`/admin/lectures/${selectedLectureId}/exams`, payload);
-
-      showToast('تم إنشاء نموذج الاختبار بنجاح!', 'success');
-      setShowCreateForm(false);
-      fetchExams();
-    } catch (err: any) {
-      showToast(err?.message || err?.error || 'فشل إنشاء الاختبار، راجع البيانات المدخلة', 'error');
-    }
-  };
-
-  const handleDeleteExam = (examId: number) => {
-    setConfirmDialog({
-      visible: true,
-      message: 'هل أنت متأكد من حذف هذا الاختبار؟ سيتم تدمير جميع أسئلته ولن يمكن التراجع.',
-      onConfirm: async () => {
-        setConfirmDialog(null);
-        try {
-          await api.delete(`/admin/exams/${examId}`);
-          showToast('تم حذف الاختبار بنجاح', 'success');
-          fetchExams();
-        } catch (err: any) {
-          showToast(err?.message || 'فشل حذف الاختبار', 'error');
-        }
+      const token = getToken();
+      const res = await fetch(`${API_URL}/api/admin/lectures/${selectedLectureId}/exams`, {
+        method: 'POST',
+        headers: {
+          Authorization: `Bearer ${token}`,
+          'Content-Type': 'application/json',
+          'Accept': 'application/json'
+        },
+        body: JSON.stringify(newExam),
+      });
+
+      if (res.ok) {
+        showToast('تم إنشاء الاختبار بنجاح!', 'success');
+        setShowCreateForm(false);
+        fetchExams();
+      } else {
+        const data = await res.json();
+        let errMsg = data.message || 'فشل إنشاء الاختبار';
+        if (data.errors) {
+          errMsg = Object.values(data.errors).flat().join(' \u2022 ');
+        }
+        showToast(errMsg, 'error');
       }
-    });
-  };
-
-  // رفع الصور ذكياً
+    } catch (err) {
+      showToast('خطأ في الاتصال بالخادم', 'error');
+    }
+  };
+
+  const handleDeleteExam = async (examId: number) => {
+    if (!confirm('هل أنت متأكد من حذف هذا الاختبار؟ سيتم حذف جميع أسئلته.')) return;
+    try {
+      const token = getToken();
+      const res = await fetch(`${API_URL}/api/admin/exams/${examId}`, {
+        method: 'DELETE',
+        headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/json' },
+      });
+      if (res.ok) {
+        showToast('تم حذف الاختبار بنجاح', 'success');
+        fetchExams();
+      }
+    } catch (err) {
+      showToast('فشل الحذف', 'error');
+    }
+  };
+
   const handleQuestionImageUpload = async (file: File, index: number | null) => {
     if (!file.type.startsWith('image/')) {
       showToast('يجب اختيار ملف صورة فقط', 'error');
@@ -204,27 +217,37 @@
 
     setUploadingImage(true);
     try {
+      const token = getToken();
       const formData = new FormData();
       formData.append('image', file);
 
-      const response = await api.post('/admin/questions/upload-image', formData, {
-        headers: { 'Content-Type': 'multipart/form-data' }
+      const res = await fetch(`${API_URL}/api/admin/questions/upload-image`, {
+        method: 'POST',
+        headers: {
+          Authorization: `Bearer ${token}`,
+          Accept: 'application/json'
+        },
+        body: formData,
       });
-      
-      const url = response.data?.data?.url || response.data?.url;
-      
-      if (index === null) {
-        setNewQuestion(prev => ({ ...prev, image_url: url }));
+
+      if (res.ok) {
+        const data = await res.json();
+        const url = data.data.url;
+        if (index === null) {
+          setNewQuestion(prev => ({ ...prev, image_url: url }));
+        } else {
+          setNewQuestion(prev => {
+            const currentImages = prev.option_images ? [...prev.option_images] : ['', '', '', ''];
+            currentImages[index] = url;
+            return { ...prev, option_images: currentImages };
+          });
+        }
+        showToast('تم رفع الصورة بنجاح!', 'success');
       } else {
-        setNewQuestion(prev => {
-          const currentImages = prev.option_images ? [...prev.option_images] : ['', '', '', ''];
-          currentImages[index] = url;
-          return { ...prev, option_images: currentImages };
-        });
+        showToast('فشل رفع الصورة', 'error');
       }
-      showToast('تم رفع الصورة بنجاح!', 'success');
-    } catch (err: any) {
-      showToast(err?.message || 'فشل رفع الصورة', 'error');
+    } catch (err) {
+      showToast('خطأ في الاتصال بالخادم', 'error');
     } finally {
       setUploadingImage(false);
     }
@@ -232,21 +255,14 @@
 
   const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
-    if (file) {
-      handleQuestionImageUpload(file, null);
-      e.target.value = ''; // تفريغ الحقل
-    }
+    if (file) handleQuestionImageUpload(file, null);
   };
 
   const handleOptionImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
     const file = e.target.files?.[0];
-    if (file) {
-      handleQuestionImageUpload(file, index);
-      e.target.value = ''; // تفريغ الحقل
-    }
-  };
-
-  // معالج اللصق (Paste) الذكي للصور
+    if (file) handleQuestionImageUpload(file, index);
+  };
+
   const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>, index: number | null) => {
     const items = e.clipboardData?.items;
     if (!items) return;
@@ -258,40 +274,51 @@
         if (file) {
           setUploadingImage(true);
           try {
+            const token = getToken();
             const formData = new FormData();
             formData.append('image', file);
 
-            const response = await api.post('/admin/questions/upload-image', formData, {
-              headers: { 'Content-Type': 'multipart/form-data' }
+            const res = await fetch(`${API_URL}/api/admin/questions/upload-image`, {
+              method: 'POST',
+              headers: {
+                Authorization: `Bearer ${token}`,
+                Accept: 'application/json'
+              },
+              body: formData,
             });
-            const url = response.data?.data?.url || response.data?.url;
-            
-            if (index === null) {
-              setNewQuestion(prev => ({ 
-                ...prev, 
-                image_url: url,
-                body: prev.body + `\n![صورة مرفقة](${url})`
-              }));
+
+            if (res.ok) {
+              const data = await res.json();
+              const url = data.data.url;
+              if (index === null) {
+                setNewQuestion(prev => ({ 
+                  ...prev, 
+                  image_url: url,
+                  body: prev.body + `\n![صورة](${url})`
+                }));
+              } else {
+                setNewQuestion(prev => {
+                  const currentImages = prev.option_images ? [...prev.option_images] : ['', '', '', ''];
+                  currentImages[index] = url;
+                  
+                  const currentOptions = [...prev.options];
+                  if (!currentOptions[index]) {
+                    currentOptions[index] = `صورة الخيار`;
+                  }
+                  
+                  return { 
+                    ...prev, 
+                    option_images: currentImages,
+                    options: currentOptions
+                  };
+                });
+              }
+              showToast('تم رفع ولصق الصورة بنجاح!', 'success');
             } else {
-              setNewQuestion(prev => {
-                const currentImages = prev.option_images ? [...prev.option_images] : ['', '', '', ''];
-                currentImages[index] = url;
-                
-                const currentOptions = [...prev.options];
-                if (!currentOptions[index]) {
-                  currentOptions[index] = `صورة مرفقة كخيار`;
-                }
-                
-                return { 
-                  ...prev, 
-                  option_images: currentImages,
-                  options: currentOptions
-                };
-              });
+              showToast('فشل رفع الصورة الملصقة', 'error');
             }
-            showToast('تم رفع ولصق الصورة بنجاح!', 'success');
-          } catch (err: any) {
-            showToast(err?.message || 'خطأ في رفع الصورة الملصقة', 'error');
+          } catch (err) {
+            showToast('خطأ في الاتصال بالخادم عند لصق الصورة', 'error');
           } finally {
             setUploadingImage(false);
           }
@@ -305,357 +332,105 @@
     e.preventDefault();
     if (!selectedExam) return;
 
-    // 🚀 حماية إرسال السؤال (Validation)
-    if (!newQuestion.body.trim() && !newQuestion.image_url) {
-      showToast('يرجى كتابة نص السؤال أو إرفاق صورة له على الأقل', 'error');
-      return;
-    }
-
     try {
-      const payload = {
-        ...newQuestion,
-        points: parseInt(newQuestion.points) || 1,
-      };
-
-      await api.post(`/admin/exams/${selectedExam.id}/questions`, payload);
-
-      showToast('تم إضافة السؤال بنجاح!', 'success');
-      setShowQuestionForm(false);
-      
-      // تفريغ النموذج بأمان
-      setNewQuestion({
-        body: '',
-        question_type: 'mcq',
-        options: ['', '', '', ''],
-        correct_answer: 0,
-        correct_answers: [0],
-        image_url: '',
-        option_images: ['', '', '', ''],
-        points: '1',
-        time_limit_seconds: null,
+      const token = getToken();
+      const res = await fetch(`${API_URL}/api/admin/exams/${selectedExam.id}/questions`, {
+        method: 'POST',
+        headers: {
+          Authorization: `Bearer ${token}`,
+          'Content-Type': 'application/json',
+          'Accept': 'application/json'
+        },
+        body: JSON.stringify(newQuestion),
       });
-      fetchExams();
-    } catch (err: any) {
-      showToast(err?.message || err?.error || 'فشل إضافة السؤال', 'error');
-    }
-  };
-
-  const handleDeleteQuestion = (questionId: number) => {
-    setConfirmDialog({
-      visible: true,
-      message: 'هل أنت متأكد من حذف هذا السؤال من نموذج الاختبار؟',
-      onConfirm: async () => {
-        setConfirmDialog(null);
-        try {
-          await api.delete(`/admin/questions/${questionId}`);
-          showToast('تم حذف السؤال بنجاح', 'success');
-          fetchExams();
-        } catch (err: any) {
-          showToast(err?.message || 'فشل الحذف', 'error');
-        }
+
+      if (res.ok) {
+        showToast('تم إضافة السؤال بنجاح!', 'success');
+        setShowQuestionForm(false);
+        setNewQuestion({
+          body: '',
+          question_type: 'mcq',
+          options: ['', '', '', ''],
+          correct_answer: 0,
+          correct_answers: [0],
+          image_url: '',
+          option_images: ['', '', '', ''],
+          points: 1,
+          time_limit_seconds: null,
+        });
+        fetchExams();
+      } else {
+        const data = await res.json();
+        let errMsg = data.message || 'فشل إضافة السؤال';
+        if (data.errors) {
+          errMsg = Object.values(data.errors).flat().join(' \u2022 ');
+        }
+        showToast(errMsg, 'error');
       }
-    });
+    } catch (err) {
+      showToast('خطأ في الاتصال', 'error');
+    }
+  };
+
+  const handleDeleteQuestion = async (questionId: number) => {
+    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
+    try {
+      const token = getToken();
+      const res = await fetch(`${API_URL}/api/admin/questions/${questionId}`, {
+        method: 'DELETE',
+        headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/json' },
+      });
+      if (res.ok) {
+        showToast('تم حذف السؤال بنجاح', 'success');
+        fetchExams();
+      }
+    } catch (err) {
+      showToast('فشل الحذف', 'error');
+    }
   };
 
   const questionTypes = [
-    { value: 'mcq', label: 'اختيار إجابة واحدة (MCQ)' },
-    { value: 'multi_select', label: 'تحديد إجابات متعددة (Multi Select)' },
+    { value: 'mcq', label: 'اختيار من متعدد (MCQ)' },
+    { value: 'multi_select', label: 'متعدد الاختيارات' },
   ];
 
   const getQuestionTypeLabel = (type: string) => {
     return questionTypes.find(t => t.value === type)?.label || type;
   };
-
-  if (isChecking) {
-    return (
-      <div className="admin-layout">
-        <AdminSidebar />
-        <main className="admin-content flex items-center justify-center min-h-[60vh]">
-          <div className="loading-state text-center flex flex-col items-center">
-             <div className="spinner spinner-primary spinner-lg mb-4 mx-auto" />
-             <p className="font-bold text-muted text-lg">جاري تجهيز محرر الاختبارات...</p>
-          </div>
-        </main>
-      </div>
-    );
-  }
 
   return (
     <div className="admin-layout relative">
       <AdminSidebar />
       
-      {/* 🚀 نظام التنبيهات الموحد العائم - تم وضعه في الجذر ليعلو كل شيء */}
-      <div 
-        className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300" 
-        style={{ 
-          opacity: toast.visible ? 1 : 0, 
-          transform: toast.visible ? 'translate(-50%, 0)' : 'translate(-50%, -20px)', 
-          pointerEvents: toast.visible ? 'auto' : 'none' 
-        }}
-      >
-        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl text-sm font-bold ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
-          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertTriangleIcon size={20} />}
-          <span>{toast.message}</span>
+      <div className={`toast-container ${toast.visible ? 'show' : ''}`}>
+        <div className={`toast-content ${toast.type}`}>
+          {toast.type === 'success' ? <CheckCircleIcon size={18} /> : <XIcon size={18} />}
+          {toast.message}
         </div>
       </div>
 
-      {/* 🚀 نافذة التأكيد - تم وضعها في الجذر */}
-      {confirmDialog && (
-        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setConfirmDialog(null)}>
-          <div className="card shadow-2xl max-w-sm w-full text-center p-8 animate-scale-up bg-white rounded-2xl border border-gray-100" onClick={e => e.stopPropagation()}>
-            <div className="flex justify-center mb-4 text-error">
-              <AlertTriangleIcon size={56} />
-            </div>
-            <h3 className="text-2xl font-black text-gray-900 mb-4">تأكيد الإجراء</h3>
-            <p className="text-gray-600 mb-8 leading-relaxed font-medium">{confirmDialog.message}</p>
-            <div className="flex gap-4 justify-center">
-              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline flex-1 py-3 font-bold rounded-xl hover:bg-gray-50 border-gray-200">إلغاء</button>
-              <button onClick={confirmDialog.onConfirm} className="btn btn-danger flex-1 py-3 font-bold shadow-lg shadow-red-200 rounded-xl text-white">نعم، متأكد</button>
-            </div>
+      <main className="admin-content">
+        <div className="page-header">
+          <div>
+            <button onClick={() => router.push(`/admin/courses/${courseId}/lectures`)} className="back-link">
+              &larr; العودة للمحاضرات
+            </button>
+            <h1 className="page-title">إدارة الاختبارات</h1>
+            <p className="page-subtitle text-muted">قم بإنشاء وتعديل اختبارات المحاضرات</p>
           </div>
-        </div>
-      )}
-
-      {/* 🚀 نافذة إضافة سؤال - تم نقلها خارج الـ <main> لتحل مشكلة الظهور في الأسفل */}
-      {showQuestionForm && selectedExam && (
-        <div className="fixed inset-0 flex items-center justify-center z-[200] p-4 sm:p-6 animate-fade-in" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)' }} onClick={() => setShowQuestionForm(false)}>
-          <form 
-            onSubmit={handleAddQuestion} 
-            className="bg-white w-full max-w-4xl flex flex-col shadow-2xl rounded-2xl overflow-hidden relative animate-scale-up h-full max-h-[95vh] md:max-h-[90vh]"
-            onClick={e => e.stopPropagation()}
-          >
-            {/* 1. Header */}
-            <div className="shrink-0 bg-white border-b border-gray-100 px-6 sm:px-8 py-5 flex justify-between items-center z-10 shadow-sm">
-              <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
-                <div className="w-10 h-10 bg-primary/10 text-primary flex items-center justify-center rounded-full shadow-inner"><SparklesIcon size={20} /></div>
-                إضافة سؤال لنموذج #{selectedExam.form_index}
-              </h3>
-              <button type="button" onClick={() => { setShowQuestionForm(false); setSelectedExam(null); }} className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-full text-gray-400 hover:text-error hover:border-red-200 hover:bg-red-50 flex justify-center items-center transition-colors shadow-sm"><XIcon size={18} /></button>
-            </div>
-
-            {/* 2. Body (Scrollable) */}
-            <div className="flex-1 overflow-y-auto min-h-0 p-6 sm:p-8 custom-scrollbar space-y-8 bg-gray-50/50" dir="rtl">
-              
-              <div className="form-group bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
-                <label className="form-label font-black text-lg mb-3 block text-gray-800">نوع السؤال</label>
-                <select value={newQuestion.question_type} onChange={(e) => setNewQuestion(prev => ({ ...prev, question_type: e.target.value }))} className="input-field w-full text-lg p-4 bg-gray-50 font-bold border-gray-200 shadow-inner text-primary rounded-xl focus:bg-white transition-colors">
-                  {questionTypes.map(type => (
-                    <option key={type.value} value={type.value}>{type.label}</option>
-                  ))}
-                </select>
-              </div>
-
-              <div className="form-group">
-                <label className="form-label font-black text-lg mb-3 block text-gray-900">نص السؤال (إمكانية اللصق المباشر)</label>
-                <textarea 
-                  value={newQuestion.body} 
-                  onChange={(e) => setNewQuestion(prev => ({ ...prev, body: e.target.value }))} 
-                  onPaste={(e) => handlePaste(e, null)} 
-                  className="input-field w-full p-5 text-lg bg-white border-gray-200 focus:border-primary shadow-sm font-medium text-gray-900 leading-relaxed rounded-2xl" 
-                  rows={4} 
-                  placeholder="اكتب صيغة السؤال هنا، أو اضغط (Ctrl+V / Cmd+V) للصق صورة من الحافظة مباشرة وسيتم رفعها وإرفاقها تلقائياً..." 
-                />
-              </div>
-
-              <div className="form-group bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
-                <label className="form-label font-black text-lg mb-4 block text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3"><ImageIcon size={20} className="text-primary" /> صورة توضيحية للسؤال (اختياري)</label>
-                <div className="flex items-center gap-4 flex-wrap">
-                  <input
-                    type="file"
-                    id="question-image-upload"
-                    className="hidden"
-                    accept="image/*"
-                    onChange={handleImageUpload}
-                    disabled={uploadingImage}
-                  />
-                  <label
-                    htmlFor="question-image-upload"
-                    className="btn btn-outline bg-gray-50 cursor-pointer font-bold text-sm flex items-center gap-2 shadow-sm border-gray-200 hover:border-primary hover:bg-blue-50 hover:text-primary transition-all rounded-xl"
-                    style={{ padding: '0.75rem 1.5rem' }}
-                  >
-                    {uploadingImage ? <><span className="spinner spinner-primary w-4 h-4 border-2" /> جاري الرفع...</> : <><UploadIcon size={16} /> رفع صورة يدوياً</>}
-                  </label>
-
-                  {newQuestion.image_url && (
-                    <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-green-200 shadow-sm animate-scale-up">
-                      {/* eslint-disable-next-line @next/next/no-img-element */}
-                      <img src={newQuestion.image_url} alt="Question" className="w-16 h-16 object-cover rounded-lg border border-gray-200 shadow-sm" />
-                      <button
-                        type="button"
-                        onClick={() => setNewQuestion(prev => ({ ...prev, image_url: '' }))}
-                        className="btn btn-danger btn-xs font-bold text-xs px-3 py-1.5 rounded-lg"
-                      >
-                        حذف الصورة
-                      </button>
-                    </div>
-                  )}
-                </div>
-              </div>
-
-              {(newQuestion.question_type === 'mcq' || newQuestion.question_type === 'multi_select') && (
-                <div className="form-group bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
-                  <label className="form-label font-black mb-2 block text-xl border-b border-gray-100 pb-4 text-gray-900 flex items-center gap-2">
-                     <FileTextIcon size={24} className="text-primary"/> خيارات الإجابة المتاحة
-                  </label>
-                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
-                    {newQuestion.options.map((opt, i) => {
-                      const optImg = newQuestion.option_images?.[i] || '';
-                      return (
-                        <div key={i} className="flex flex-col bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 focus-within:border-primary focus-within:shadow-md transition-all">
-                          <div className="flex items-center gap-3">
-                            <span className="font-black text-primary bg-blue-100 w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-inner text-base">
-                              {String.fromCharCode(65 + i)}
-                            </span>
-                            <input 
-                              type="text" 
-                              value={opt} 
-                              onChange={(e) => { 
-                                const newOpts = [...newQuestion.options]; 
-                                newOpts[i] = e.target.value; 
-                                setNewQuestion(prev => ({ ...prev, options: newOpts })); 
-                              }} 
-                              onPaste={(e) => handlePaste(e, i)}
-                              className="input-field flex-1 p-3 bg-white border-gray-200 font-medium text-gray-900 shadow-sm rounded-lg" 
-                              placeholder={`اكتب الخيار ${String.fromCharCode(65 + i)} (أو الصق صورة)`} 
-                              required={!optImg} 
-                            />
-                            <input
-                              type="file"
-                              id={`option-image-upload-${i}`}
-                              className="hidden"
-                              accept="image/*"
-                              onChange={(e) => handleOptionImageUpload(e, i)}
-                              disabled={uploadingImage}
-                            />
-                            <label
-                              htmlFor={`option-image-upload-${i}`}
-                              className="btn btn-outline p-3 bg-white hover:bg-gray-100 cursor-pointer rounded-lg border border-gray-200 shrink-0 shadow-sm transition-colors"
-                              title="إرفاق صورة لهذا الخيار"
-                            >
-                              <ImageIcon size={18} className="text-gray-500" />
-                            </label>
-                          </div>
-                          
-                          {optImg && (
-                            <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-green-200 shadow-sm animate-scale-up">
-                              {/* eslint-disable-next-line @next/next/no-img-element */}
-                              <img src={optImg} alt={`Option ${String.fromCharCode(65 + i)}`} className="w-12 h-12 object-cover rounded-lg border border-gray-100" />
-                              <button
-                                type="button"
-                                onClick={() => setNewQuestion(prev => {
-                                  const currentImages = prev.option_images ? [...prev.option_images] : ['', '', '', ''];
-                                  currentImages[i] = '';
-                                  return { ...prev, option_images: currentImages };
-                                })}
-                                className="btn btn-danger btn-xs font-bold text-xs px-3 py-1.5 rounded-lg"
-                              >
-                                حذف
-                              </button>
-                            </div>
-                          )}
-                        </div>
-                      );
-                    })}
-                  </div>
-                </div>
-              )}
-
-              {newQuestion.question_type === 'mcq' && (
-                <div className="form-group bg-green-50/50 p-6 rounded-2xl border border-green-200 shadow-sm">
-                  <label className="form-label font-black text-xl mb-4 block flex items-center gap-2 text-green-800 border-b border-green-200/50 pb-3">
-                    <CheckCircleIcon size={24} /> تحديد الإجابة الصحيحة
-                  </label>
-                  <select 
-                     value={newQuestion.correct_answer} 
-                     onChange={(e) => setNewQuestion(prev => ({ ...prev, correct_answer: parseInt(e.target.value) }))} 
-                     className="input-field w-full p-4 font-black text-lg bg-white border-green-300 text-green-800 shadow-sm rounded-xl focus:border-green-500"
-                  >
-                    {newQuestion.options.map((opt, i) => (
-                      <option key={i} value={i}>الخيار {String.fromCharCode(65 + i)}: {opt || `(صورة)`}</option>
-                    ))}
-                  </select>
-                </div>
-              )}
-
-              {newQuestion.question_type === 'multi_select' && (
-                <div className="form-group bg-green-50/50 p-6 rounded-2xl border border-green-200 shadow-sm space-y-4">
-                  <label className="form-label font-black text-xl mb-2 block flex items-center gap-2 text-green-800 border-b border-green-200/50 pb-3">
-                     <CheckCircleIcon size={24} /> تحديد الإجابات الصحيحة (حدد أكثر من خيار)
-                  </label>
-                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
-                    {newQuestion.options.map((opt, i) => (
-                      <label key={i} className="flex items-center gap-4 cursor-pointer bg-white p-4 rounded-xl border border-green-200 hover:border-green-400 transition-all shadow-sm hover:shadow-md">
-                        <input 
-                           type="checkbox" 
-                           className="w-6 h-6 rounded accent-success cursor-pointer border-gray-300" 
-                           checked={newQuestion.correct_answers?.includes(i)} 
-                           onChange={(e) => { 
-                             const current = newQuestion.correct_answers || []; 
-                             const newAnswers = e.target.checked ? [...current, i] : current.filter(a => a !== i); 
-                             setNewQuestion(prev => ({ ...prev, correct_answers: newAnswers })); 
-                           }} 
-                        />
-                        <span className="font-black text-gray-900 text-lg">{String.fromCharCode(65 + i)}: <span className="font-medium text-gray-600 text-base">{opt || `(صورة)`}</span></span>
-                      </label>
-                    ))}
-                  </div>
-                </div>
-              )}
-
-              <div className="form-group bg-blue-50/50 p-6 rounded-2xl border border-blue-100 inline-block shadow-sm w-full sm:w-auto">
-                <label className="form-label font-black text-lg mb-3 block text-primary flex items-center gap-2 justify-center sm:justify-start"><AwardIcon size={20}/> درجة السؤال (نقاط)</label>
-                <input type="text" value={newQuestion.points} onChange={(e) => setNewQuestion(prev => ({ ...prev, points: e.target.value.replace(/[^0-9]/g, '') }))} className="input-field w-full sm:w-32 p-3 text-center text-2xl font-black bg-white border-blue-200 text-primary shadow-inner rounded-xl mx-auto block" required dir="ltr" />
-              </div>
-
-            </div>
-
-            {/* 3. Footer */}
-            <div className="shrink-0 bg-white border-t border-gray-100 px-6 sm:px-8 py-5 flex flex-col sm:flex-row justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
-              <button type="button" onClick={() => { setShowQuestionForm(false); setSelectedExam(null); }} className="btn btn-outline px-10 py-3.5 font-bold border-gray-200 bg-gray-50 hover:bg-gray-100 rounded-xl w-full sm:w-auto transition-colors">إلغاء النافذة</button>
-              <button type="submit" className="btn btn-primary px-12 py-3.5 font-black shadow-lg shadow-blue-200 text-lg flex items-center justify-center gap-2 rounded-xl w-full sm:w-auto hover:-translate-y-0.5 transition-transform">
-                 <CheckIcon size={20} /> حفظ وإضافة السؤال للبنك
-              </button>
-            </div>
-
-          </form>
-        </div>
-      )}
-
-      {/* 🚀 محتوى الصفحة الرئيسي */}
-      <main className="admin-content">
-        <div className="mb-6 flex">
-          <button 
-            onClick={() => router.push(`/admin/courses/${courseId}/lectures`)} 
-            className="btn btn-outline bg-white text-gray-600 hover:text-primary hover:bg-blue-50 border-gray-200 shadow-sm rounded-xl px-5 py-2.5 text-sm font-bold flex items-center gap-2 transition-all w-fit"
-          >
-            <span className="text-xl leading-none">&rarr;</span> العودة للمحاضرات
+          <button onClick={() => setShowCreateForm(true)} className="btn btn-primary">
+            <PlusIcon size={18} /> إضافة اختبار
           </button>
         </div>
 
-        <div className="page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
-          <div>
-            <h1 className="page-title text-3xl font-black text-gray-900 flex items-center gap-3">
-              <FileTextIcon size={32} className="text-primary" />
-              بنك الأسئلة والاختبارات
-            </h1>
-            <p className="page-subtitle text-base mt-2">قم ببناء نماذج الاختبارات، تحديد الدرجات، وإضافة الأسئلة المدعمة بالصور.</p>
-          </div>
-          <button onClick={() => setShowCreateForm(!showCreateForm)} className={`btn ${showCreateForm ? 'btn-outline border-error text-error hover:bg-red-50' : 'btn-primary shadow-lg shadow-blue-200'} font-bold rounded-xl px-6 py-3 transition-all`}>
-            {showCreateForm ? <><XIcon size={18} /> إلغاء الإنشاء</> : <><PlusIcon size={18} /> إضافة نموذج اختبار جديد</>}
-          </button>
-        </div>
-
-        <div className="card mb-8 flex flex-col md:flex-row items-start md:items-center gap-4 p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
-          <label className="form-label mb-0 whitespace-nowrap font-bold text-gray-700 flex items-center gap-2">
-             <BookIcon size={20} className="text-primary" /> استعراض اختبارات المحاضرة:
-          </label>
+        <div className="card mb-6 flex flex-col md:flex-row items-start md:items-center gap-4 p-5 bg-[#1f293a]/30 border border-white/5">
+          <label className="form-label mb-0 whitespace-nowrap text-muted">حدد المحاضرة:</label>
           <select
             value={selectedLectureId}
             onChange={(e) => setSelectedLectureId(e.target.value)}
-            className="input-field flex-1 text-lg font-black bg-gray-50 border-gray-200 shadow-inner rounded-xl py-3 focus:bg-white focus:border-primary transition-colors"
-            style={{ maxWidth: 500 }}
+            className="input-field flex-1 text-lg font-medium bg-[#1a1b26]/50 border-white/10"
+            style={{ maxWidth: 400 }}
           >
-            {lectures.length === 0 ? <option value="">لا توجد محاضرات في هذا الكورس</option> : null}
             {lectures.map(lecture => (
               <option key={lecture.id} value={lecture.id}>{lecture.title}</option>
             ))}
@@ -663,140 +438,298 @@
         </div>
 
         {showCreateForm && (
-          <div className="card mb-8 border border-blue-200 shadow-xl rounded-2xl animate-fade-in bg-gradient-to-b from-blue-50/50 to-white p-6 md:p-8">
-            <div className="border-b border-gray-100 pb-5 mb-6 flex justify-between items-center">
-              <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
-                <div className="w-10 h-10 bg-blue-50 text-primary flex items-center justify-center rounded-full shadow-inner"><SparklesIcon size={20} /></div>
-                تكوين نموذج اختبار جديد
-              </h3>
-              <button type="button" onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-error bg-gray-50 border border-gray-200 hover:border-red-200 hover:bg-red-50 w-10 h-10 rounded-full flex justify-center items-center transition-colors shadow-sm">
-                <XIcon size={20} />
-              </button>
+          <div className="card mb-6 border border-primary/20 shadow-xl animate-fade-in">
+            <div className="border-b border-white/10 pb-4 mb-5 flex justify-between items-center">
+              <h3 className="text-xl font-bold text-primary flex items-center gap-2"><FileTextIcon size={22} /> إنشاء اختبار جديد لهذه المحاضرة</h3>
+              <button type="button" onClick={() => setShowCreateForm(false)} className="text-muted hover:text-error text-3xl"><XIcon size={24} /></button>
             </div>
-            
-            <form onSubmit={handleCreateExam} className="space-y-8">
-              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
-                <div className="form-group mb-0">
-                  <label className="form-label font-bold text-gray-700 block mb-2">رقم النموذج (مثال: 1)</label>
-                  <input type="text" value={newExam.form_index} onChange={(e) => setNewExam(prev => ({ ...prev, form_index: e.target.value.replace(/[^0-9]/g, '') }))} className="input-field w-full text-center text-xl font-black bg-gray-50 focus:bg-white rounded-xl py-3 border-gray-200" required dir="ltr" />
-                </div>
-                <div className="form-group mb-0">
-                  <label className="form-label font-bold text-gray-700 block mb-2">مدة الاختبار (بالدقائق)</label>
-                  <input type="text" value={newExam.duration_minutes} onChange={(e) => setNewExam(prev => ({ ...prev, duration_minutes: e.target.value.replace(/[^0-9]/g, '') }))} className="input-field w-full text-center text-xl font-black bg-gray-50 focus:bg-white rounded-xl py-3 border-gray-200" required dir="ltr" />
-                </div>
-                <div className="form-group mb-0">
-                  <label className="form-label font-bold text-gray-700 block mb-2">درجة النجاح المطلوبة (%)</label>
-                  <input type="text" value={newExam.pass_score} onChange={(e) => setNewExam(prev => ({ ...prev, pass_score: e.target.value.replace(/[^0-9]/g, '') }))} className="input-field w-full text-center text-xl font-black bg-green-50 text-success border-green-200 focus:border-green-500 rounded-xl py-3" required dir="ltr" />
-                </div>
-                <div className="form-group mb-0">
-                  <label className="form-label font-bold text-gray-700 block mb-2">الحد الأقصى للمحاولات</label>
-                  <input type="text" value={newExam.max_attempts} onChange={(e) => setNewExam(prev => ({ ...prev, max_attempts: e.target.value.replace(/[^0-9]/g, '') }))} className="input-field w-full text-center text-xl font-black bg-gray-50 text-primary focus:bg-white border-gray-200 rounded-xl py-3" required dir="ltr" />
+            <form onSubmit={handleCreateExam} className="space-y-6">
+              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 p-4 rounded-xl bg-black/20 border border-white/5">
+                <div className="form-group">
+                  <label className="form-label text-muted">رقم النموذج (1-3)</label>
+                  <input type="number" min="1" max="3" value={newExam.form_index} onChange={(e) => setNewExam(prev => ({ ...prev, form_index: e.target.value === '' ? '' : parseInt(e.target.value) }))} className="input-field w-full text-center text-xl font-bold" required />
+                </div>
+                <div className="form-group">
+                  <label className="form-label text-muted">الوقت (دقائق)</label>
+                  <input type="number" min="1" max="180" value={newExam.duration_minutes} onChange={(e) => setNewExam(prev => ({ ...prev, duration_minutes: e.target.value === '' ? '' : parseInt(e.target.value) }))} className="input-field w-full text-center text-xl font-bold" required />
+                </div>
+                <div className="form-group">
+                  <label className="form-label text-muted">درجة النجاح (%)</label>
+                  <input type="number" min="1" max="100" value={newExam.pass_score} onChange={(e) => setNewExam(prev => ({ ...prev, pass_score: e.target.value === '' ? '' : parseInt(e.target.value) }))} className="input-field w-full text-center text-xl font-bold" required />
+                </div>
+                <div className="form-group">
+                  <label className="form-label text-muted">عدد المحاولات</label>
+                  <input type="number" min="1" value={newExam.max_attempts} onChange={(e) => setNewExam(prev => ({ ...prev, max_attempts: e.target.value === '' ? '' : parseInt(e.target.value) }))} className="input-field w-full text-center text-xl font-bold" />
                 </div>
               </div>
               
               <div className="form-group">
-                <label className="form-label font-bold text-gray-700 text-lg block mb-2">عنوان وصفي للاختبار (اختياري)</label>
-                <input type="text" value={newExam.title} onChange={(e) => setNewExam(prev => ({ ...prev, title: e.target.value }))} className="input-field w-full p-4 text-lg font-bold bg-white shadow-sm border-gray-200 rounded-xl" placeholder="مثال: اختبار شامل على الباب الأول" dir="rtl" />
+                <label className="form-label text-muted">عنوان الاختبار (اختياري)</label>
+                <input type="text" value={newExam.title} onChange={(e) => setNewExam(prev => ({ ...prev, title: e.target.value }))} className="input-field w-full p-4 bg-black/20" placeholder="مثال: اختبار نهاية الفصل الأول" />
               </div>
 
-              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 rounded-2xl bg-blue-50/50 border border-blue-100 shadow-inner">
-                {[ 
-                  { label: 'خلط الأسئلة عشوائياً', checked: newExam.shuffle_questions, key: 'shuffle_questions' }, 
-                  { label: 'خلط الخيارات عشوائياً', checked: newExam.shuffle_options, key: 'shuffle_options' }, 
-                  { label: 'السماح برؤية الإجابات بعد الانتهاء', checked: newExam.show_correct_answers, key: 'show_correct_answers' }, 
-                  { label: 'السماح برؤية النتيجة المئوية', checked: newExam.show_score, key: 'show_score' }, 
-                ].map(item => (
-                  <label key={item.key} className="flex items-center gap-3 cursor-pointer text-sm p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-primary/30 transition-colors">
-                    <input type="checkbox" checked={item.checked} onChange={(e) => setNewExam(prev => ({ ...prev, [item.key]: e.target.checked }))} className="w-5 h-5 accent-primary rounded cursor-pointer border-gray-300" />
-                    <span className="font-bold text-gray-800">{item.label}</span>
+              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-xl bg-[#1f293a]/30 border border-white/5">
+                {[ { label: 'خلط الأسئلة', checked: newExam.shuffle_questions, key: 'shuffle_questions' }, { label: 'خلط الخيارات', checked: newExam.shuffle_options, key: 'shuffle_options' }, { label: 'عرض الإجابات', checked: newExam.show_correct_answers, key: 'show_correct_answers' }, { label: 'عرض النتيجة', checked: newExam.show_score, key: 'show_score' }, ].map(item => (
+                  <label key={item.key} className="flex items-center gap-3 cursor-pointer text-sm p-3 rounded-lg hover:bg-white/5 transition-colors">
+                    <input type="checkbox" checked={item.checked} onChange={(e) => setNewExam(prev => ({ ...prev, [item.key]: e.target.checked }))} className="accent-primary w-5 h-5" />
+                    <span className="text-gray-300">{item.label}</span>
                   </label>
                 ))}
               </div>
 
-              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100">
-                <button type="button" onClick={() => setShowCreateForm(false)} className="btn btn-outline px-10 py-3.5 font-bold border-gray-200 hover:bg-gray-50 bg-white rounded-xl">إلغاء التكوين</button>
-                <button type="submit" className="btn btn-primary px-12 py-3.5 font-black shadow-lg shadow-blue-200 rounded-xl">حفظ وإنشاء النموذج</button>
+              <div className="flex justify-end gap-3 pt-3">
+                <button type="button" onClick={() => setShowCreateForm(false)} className="btn btn-outline px-10">إلغاء</button>
+                <button type="submit" className="btn btn-primary px-12 font-bold shadow-lg shadow-primary/30">حفظ وإنشاء</button>
               </div>
             </form>
           </div>
         )}
 
         {loading ? (
-          <div className="card p-16 flex flex-col justify-center items-center shadow-sm border border-gray-100 rounded-2xl bg-white">
-            <div className="spinner spinner-primary spinner-lg mb-4"></div>
-            <p className="font-bold text-gray-500">جاري سحب بنك الأسئلة من السيرفر...</p>
+          <div className="loading-state">
+            <div className="spinner spinner-lg"></div>
+            <p className="mt-4 font-bold">جاري تحميل الاختبارات...</p>
           </div>
         ) : exams.length === 0 ? (
-          <div className="empty-state bg-white border border-gray-100 rounded-2xl py-20 shadow-sm text-center">
-            <div className="empty-state-icon bg-gray-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner">
-              <FileTextIcon size={48} className="text-gray-400" />
+          <div className="empty-state">
+            <div className="empty-state-icon">
+              <FileTextIcon size={36} />
             </div>
-            <h3 className="text-2xl font-black text-gray-800">لا توجد اختبارات مسجلة</h3>
-            <p className="text-gray-500 font-medium text-lg mt-2 mb-8 max-w-sm mx-auto">لم يتم إنشاء أي نموذج اختبار لهذه المحاضرة بعد. يمكنك إضافة نموذج جديد الآن.</p>
-            <button onClick={() => setShowCreateForm(true)} className="btn btn-primary btn-lg shadow-lg shadow-blue-200 font-bold px-8 rounded-xl"><PlusIcon size={20} className="ml-2 inline" /> أضف النموذج الأول للمحاضرة</button>
+            <h3>لا توجد اختبارات مسجلة</h3>
+            <p>لم يتم إنشاء أي نموذج اختبار لهذه المحاضرة بعد. ابدأ الآن بإنشاء النموذج الأول.</p>
+            <button onClick={() => setShowCreateForm(true)} className="btn btn-primary btn-lg"><PlusIcon size={18} /> أضف الاختبار الأول</button>
           </div>
         ) : (
-          <div className="space-y-8">
+          <div className="space-y-6">
             {exams.map(exam => (
-              <div key={exam.id} className="card bg-white border border-gray-200 shadow-sm rounded-2xl p-0 relative overflow-hidden transition-all hover:shadow-md group">
-                
-                {/* رأس نموذج الاختبار */}
-                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 pb-5 gap-4 bg-gray-50 p-6">
+              <div key={exam.id} className="card relative overflow-hidden transition-transform duration-300 hover:-translate-y-1">
+                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-white/10 pb-5 gap-4 bg-black/10 p-5 rounded-t-xl -m-6 mb-6">
                   <div>
-                    <h3 className="text-2xl font-black text-primary mb-3 flex items-center gap-3">
-                      <span className="bg-gradient-to-br from-primary to-blue-500 text-white w-10 h-10 flex items-center justify-center rounded-xl shadow-inner text-lg">#{exam.form_index}</span>
-                      <span>نموذج الاختبار</span>
-                      {exam.title && <span className="text-gray-600 text-sm font-bold truncate max-w-[250px] bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">{exam.title}</span>}
+                    <h3 className="text-xl font-bold text-primary mb-3 flex items-center gap-3">
+                      <span>نموذج الاختبار #{exam.form_index}</span>
+                      {exam.title && <span className="text-muted text-sm font-normal truncate max-w-[200px]">| {exam.title}</span>}
                     </h3>
-                    <div className="flex gap-2.5 flex-wrap text-xs font-black mt-4">
-                      <span className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 flex items-center gap-1.5 shadow-sm"><ClockIcon size={14} className="text-primary"/> {exam.duration_minutes} دقيقة</span>
-                      <span className="px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 flex items-center gap-1.5 shadow-sm"><AwardIcon size={14} /> نجاح: {exam.pass_score}%</span>
-                      <span className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center gap-1.5 shadow-sm"><RefreshIcon size={14} /> محاولات: {exam.max_attempts}</span>
+                    <div className="flex gap-2 flex-wrap text-xs font-bold">
+                      <span className="p-2 rounded-lg bg-gray-700 text-white flex items-center gap-1.5"><ClockIcon size={14} /> {exam.duration_minutes} دقيقة</span>
+                      <span className="p-2 rounded-lg bg-success/10 text-success flex items-center gap-1.5"><AwardIcon size={14} /> نجاح: {exam.pass_score}%</span>
+                      <span className="p-2 rounded-lg bg-primary/10 text-primary flex items-center gap-1.5"><RefreshIcon size={14} /> محاولات: {exam.max_attempts}</span>
                     </div>
                   </div>
                   <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
-                    <button onClick={() => { setSelectedExam(exam); setShowQuestionForm(true); }} className="btn btn-primary px-6 py-3 font-bold rounded-xl shadow-md shadow-blue-200 flex items-center gap-2 w-full md:w-auto justify-center transition-transform hover:-translate-y-0.5"><PlusIcon size={18} /> أضف سؤال للنموذج</button>
-                    <button onClick={() => handleDeleteExam(exam.id)} className="btn btn-outline border-red-200 text-error bg-white hover:bg-red-50 hover:border-red-300 px-4 py-3 font-bold rounded-xl flex items-center justify-center w-full md:w-auto transition-colors" title="حذف النموذج بالكامل"><TrashIcon size={18} /></button>
+                    <button onClick={() => { setSelectedExam(exam); setShowQuestionForm(true); }} className="btn btn-primary px-6 py-2 font-bold rounded-lg flex items-center gap-1.5" style={{ minWidth: 'fit-content' }}><PlusIcon size={16} /> إضافة سؤال</button>
+                    <button onClick={() => handleDeleteExam(exam.id)} className="btn btn-danger px-6 py-2 font-bold rounded-lg flex items-center gap-1.5" style={{ backgroundColor: '#ef4444', color: 'white', minWidth: 'fit-content' }}><TrashIcon size={16} /> حذف النموذج</button>
                   </div>
                 </div>
 
-                {/* قائمة الأسئلة المدرجة */}
-                <div className="p-6">
-                  <h4 className="font-black mb-5 text-gray-600 flex items-center gap-2 border-b border-gray-100 pb-3">
-                    <FileTextIcon size={18} className="text-primary" />
-                    الأسئلة المدرجة حالياً ({exam.questions?.length || 0})
-                  </h4>
-                  
-                  {(!exam.questions || exam.questions.length === 0) ? (
-                    <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
-                      <p className="font-bold text-gray-400">لا توجد أي أسئلة مضافة في هذا النموذج حتى الآن.</p>
-                    </div>
-                  ) : (
-                    <div className="space-y-4">
+                {exam.questions && exam.questions.length > 0 && (
+                  <div>
+                    <h4 className="font-bold mb-4 text-sm text-muted">الأسئلة المدرجة في هذا النموذج ({exam.questions.length}):</h4>
+                    <div className="space-y-3">
                       {exam.questions.map((question, index) => (
-                        <div key={question.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-primary/30 hover:shadow-md transition-all gap-4 group/question">
-                          <div className="flex items-start gap-4 flex-1 w-full">
-                            <span className="font-black text-primary bg-blue-50 w-10 h-10 flex items-center justify-center rounded-xl shrink-0 text-lg border border-blue-100 shadow-sm">
+                        <div key={question.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-[#1a1b26]/30 rounded-lg border border-white/5 hover:border-primary/20 transition-colors gap-3">
+                          <div className="flex items-start gap-3 flex-1 w-full">
+                            <span className="font-bold text-background bg-primary/90 w-8 h-8 flex items-center justify-center rounded-full shrink-0 text-sm shadow-md">
                               {index + 1}
                             </span>
                             <div className="flex-1 w-0">
-                              <span className="font-bold block mb-3 break-words text-gray-900 text-lg leading-relaxed">{question.body}</span>
-                              <div className="flex gap-2 text-[11px] font-bold">
-                                <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-md border border-gray-200">{getQuestionTypeLabel(question.question_type)}</span>
-                                <span className="bg-green-50 text-green-700 px-3 py-1.5 rounded-md border border-green-200 flex items-center gap-1.5"><AwardIcon size={14} /> {question.points} نقاط</span>
+                              <span className="font-medium block mb-2 break-words text-gray-100">{question.body}</span>
+                              <div className="flex gap-2 text-xs">
+                                <span className="badge badge-secondary p-1 px-2 opacity-70">{getQuestionTypeLabel(question.question_type)}</span>
+                                <span className="badge badge-success p-1 px-2 opacity-70"><AwardIcon size={12} /> {question.points} نقاط</span>
                               </div>
                             </div>
                           </div>
-                          <button onClick={() => handleDeleteQuestion(question.id)} className="text-gray-400 hover:text-white bg-gray-50 hover:bg-red-500 w-10 h-10 rounded-lg flex items-center justify-center transition-colors shrink-0 shadow-sm border border-gray-200 hover:border-red-600" title="حذف السؤال"><TrashIcon size={18} /></button>
+                          <button onClick={() => handleDeleteQuestion(question.id)} className="text-error hover:bg-error/10 p-2.5 rounded-full transition-colors shrink-0" title="حذف السؤال"><TrashIcon size={18} /></button>
                         </div>
                       ))}
                     </div>
-                  )}
-                </div>
+                  </div>
+                )}
               </div>
             ))}
           </div>
         )}
+
+        {/* Add Question Modal */}
+        {showQuestionForm && selectedExam && (
+          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
+            
+            <form 
+              onSubmit={handleAddQuestion} 
+              className="bg-[#1a1b26] w-full max-w-4xl flex flex-col shadow-2xl border border-white/10 rounded-2xl overflow-hidden relative"
+              style={{ maxHeight: '90vh' }}
+            >
+              
+              {/* 1. Header */}
+              <div className="shrink-0 bg-black/40 border-b border-white/10 px-6 sm:px-8 py-5 flex justify-between items-center">
+                <h3 className="text-xl font-bold text-primary flex items-center gap-2">
+                  <SparklesIcon size={22} /> إضافة سؤال للنموذج #{selectedExam.form_index}
+                </h3>
+                <button type="button" onClick={() => { setShowQuestionForm(false); setSelectedExam(null); }} className="text-muted hover:text-error text-3xl leading-none transition-colors"><XIcon size={24} /></button>
+              </div>
+
+              {/* 2. Body (Scrollable) */}
+              <div className="flex-1 overflow-y-auto min-h-0 p-6 sm:p-8 custom-scrollbar space-y-7" dir="rtl">
+                
+                <div className="form-group bg-[#1f293a]/30 p-5 rounded-xl border border-white/5">
+                  <label className="form-label font-bold text-lg mb-3 block">نوع السؤال</label>
+                  <select value={newQuestion.question_type} onChange={(e) => setNewQuestion(prev => ({ ...prev, question_type: e.target.value }))} className="input-field w-full text-lg p-3 bg-black/20 border-white/10" style={{ color: 'white' }}>
+                    {questionTypes.map(type => (
+                      <option key={type.value} value={type.value} className="bg-gray-900 text-white">{type.label}</option>
+                    ))}
+                  </select>
+                </div>
+
+                <div className="form-group">
+                  <label className="form-label font-bold text-lg mb-2 block">عنوان / نص السؤال</label>
+                  <textarea value={newQuestion.body} onChange={(e) => setNewQuestion(prev => ({ ...prev, body: e.target.value }))} onPaste={(e) => handlePaste(e, null)} className="input-field w-full p-4 text-lg bg-black/20 border-white/10" rows={3} required placeholder="اكتب سؤالك بوضوح هنا... (أو الصق صورة هنا مباشرة)" style={{ color: 'white' }} />
+                </div>
+
+                <div className="form-group bg-[#1f293a]/30 p-5 rounded-xl border border-white/5">
+                  <label className="form-label font-bold text-lg mb-3 block">صورة السؤال (اختياري)</label>
+                  <div className="flex items-center gap-4 flex-wrap">
+                    <input
+                      type="file"
+                      id="question-image-upload"
+                      style={{ display: 'none' }}
+                      accept="image/*"
+                      onChange={handleImageUpload}
+                      disabled={uploadingImage}
+                    />
+                    <label
+                      htmlFor="question-image-upload"
+                      className="btn btn-outline cursor-pointer font-bold text-sm flex items-center gap-2"
+                      style={{ padding: '0.5rem 1.25rem' }}
+                    >
+                      {uploadingImage ? <><ClockIcon size={16} /> جاري رفع الصورة...</> : <><ImageIcon size={16} /> رفع صورة السؤال</>}
+                    </label>
+
+                    {newQuestion.image_url && (
+                      <div className="flex items-center gap-3 bg-black/40 p-2 rounded-lg border border-[#10b981]/30">
+                        {/* eslint-disable-next-line @next/next/no-img-element */}
+                        <img src={newQuestion.image_url} alt="Question" className="w-16 h-16 object-cover rounded-lg border" />
+                        <button
+                          type="button"
+                          onClick={() => setNewQuestion(prev => ({ ...prev, image_url: '' }))}
+                          className="btn btn-danger btn-xs font-bold text-xs"
+                          style={{ padding: '0.25rem 0.5rem' }}
+                        >
+                          إزالة الصورة
+                        </button>
+                      </div>
+                    )}
+                  </div>
+                </div>
+
+                {(newQuestion.question_type === 'mcq' || newQuestion.question_type === 'multi_select') && (
+                  <div className="form-group bg-black/20 p-6 rounded-xl border border-white/10 space-y-4">
+                    <label className="form-label font-bold mb-5 block text-lg border-b border-white/10 pb-3 text-white">الخيارات المتاحة للطلاب</label>
+                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
+                      {newQuestion.options.map((opt, i) => {
+                        const optImg = newQuestion.option_images?.[i] || '';
+                        return (
+                          <div key={i} className="flex flex-col bg-black/30 p-3 rounded-lg border border-white/5 space-y-2">
+                            <div className="flex items-center gap-3">
+                              <span className="font-bold text-white bg-primary/70 w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-lg text-sm">
+                                {String.fromCharCode(65 + i)}
+                              </span>
+                              <input 
+                                type="text" 
+                                value={opt} 
+                                onChange={(e) => { 
+                                  const newOpts = [...newQuestion.options]; 
+                                  newOpts[i] = e.target.value; 
+                                  setNewQuestion(prev => ({ ...prev, options: newOpts })); 
+                                }} 
+                                onPaste={(e) => handlePaste(e, i)}
+                                className="input-field flex-1 p-3 bg-black/30 border-white/10" 
+                                placeholder={`اكتب الخيار ${String.fromCharCode(65 + i)} (أو الصق صورة هنا)`} 
+                                required 
+                                style={{ color: 'white' }} 
+                              />
+                              <input
+                                type="file"
+                                id={`option-image-upload-${i}`}
+                                style={{ display: 'none' }}
+                                accept="image/*"
+                                onChange={(e) => handleOptionImageUpload(e, i)}
+                                disabled={uploadingImage}
+                              />
+                              <label
+                                htmlFor={`option-image-upload-${i}`}
+                                className="btn btn-outline p-2 hover:bg-white/5 cursor-pointer rounded-lg border border-white/10 shrink-0"
+                                title="رفع صورة لهذا الخيار"
+                              >
+                                <ImageIcon size={18} />
+                              </label>
+                            </div>
+                            
+                            {optImg && (
+                              <div className="flex items-center gap-3 bg-black/40 p-2 rounded-lg border border-[#10b981]/20">
+                                {/* eslint-disable-next-line @next/next/no-img-element */}
+                                <img src={optImg} alt={`Option ${String.fromCharCode(65 + i)}`} className="w-12 h-12 object-cover rounded-lg border border-white/10" />
+                                <button
+                                  type="button"
+                                  onClick={() => setNewQuestion(prev => {
+                                    const currentImages = prev.option_images ? [...prev.option_images] : ['', '', '', ''];
+                                    currentImages[i] = '';
+                                    return { ...prev, option_images: currentImages };
+                                  })}
+                                  className="btn btn-danger btn-xs font-bold text-xs"
+                                  style={{ padding: '0.15rem 0.4rem', backgroundColor: '#ef4444' }}
+                                >
+                                  إزالة الصورة
+                                </button>
+                              </div>
+                            )}
+                          </div>
+                        );
+                      })}
+                    </div>
+                  </div>
+                )}
+
+                {newQuestion.question_type === 'mcq' && (
+                  <div className="form-group bg-success/10 p-5 rounded-xl border border-[#10b981]/30">
+                    <label className="form-label font-bold text-lg mb-3 block flex items-center gap-2" style={{ color: '#10b981' }}><CheckCircleIcon size={20} /> حدد الإجابة الصحيحة</label>
+                    <select value={newQuestion.correct_answer} onChange={(e) => setNewQuestion(prev => ({ ...prev, correct_answer: parseInt(e.target.value) }))} className="input-field w-full p-3 font-bold bg-black/40 border-[#10b981]/30" style={{ color: '#10b981' }}>
+                      {newQuestion.options.map((opt, i) => (
+                        <option key={i} value={i} className="bg-gray-900 text-white">الخيار {String.fromCharCode(65 + i)}: {opt || `(فارغ)`}</option>
+                      ))}
+                    </select>
+                  </div>
+                )}
+
+                {newQuestion.question_type === 'multi_select' && (
+                  <div className="form-group bg-success/10 p-6 rounded-xl border border-[#10b981]/30 space-y-3">
+                    <label className="form-label font-bold text-lg mb-3 block flex items-center gap-2" style={{ color: '#10b981' }}><CheckCircleIcon size={20} /> الإجابات الصحيحة (حدد أكثر من خيار)</label>
+                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
+                      {newQuestion.options.map((opt, i) => (
+                        <label key={i} className="flex items-center gap-3 cursor-pointer bg-black/40 p-3.5 rounded-lg border border-[#10b981]/30 hover:border-[#10b981]/50 transition-colors">
+                          <input type="checkbox" className="w-5 h-5 rounded" style={{ accentColor: '#10b981' }} checked={newQuestion.correct_answers?.includes(i)} onChange={(e) => { const current = newQuestion.correct_answers || []; const newAnswers = e.target.checked ? [...current, i] : current.filter(a => a !== i); setNewQuestion(prev => ({ ...prev, correct_answers: newAnswers })); }} />
+                          <span className="font-bold text-white text-lg">{String.fromCharCode(65 + i)}: <span className="font-normal text-gray-300">{opt || `(فارغ)`}</span></span>
+                        </label>
+                      ))}
+                    </div>
+                  </div>
+                )}
+
+                <div className="form-group bg-[#1f293a]/30 p-5 rounded-xl border border-white/5 inline-block">
+                  <label className="form-label font-bold text-lg mb-2 block text-white">النقاط (درجة هذا السؤال)</label>
+                  <input type="number" min="1" value={newQuestion.points} onChange={(e) => setNewQuestion(prev => ({ ...prev, points: e.target.value === '' ? '' : parseInt(e.target.value) }))} className="input-field w-32 p-3 text-center text-xl font-bold bg-black/30 border-white/10" style={{ color: 'white' }} />
+                </div>
+
+              </div>
+
+              {/* 3. Footer */}
+              <div className="shrink-0 bg-black/60 border-t border-white/10 px-6 sm:px-8 py-5 flex justify-end gap-3">
+                <button type="button" onClick={() => { setShowQuestionForm(false); setSelectedExam(null); }} className="btn btn-outline px-10 py-2.5 font-bold" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>إلغاء</button>
+                <button type="submit" className="btn btn-primary px-12 py-2.5 font-bold shadow-lg text-lg flex items-center gap-2"><CheckIcon size={20} /> حفظ السؤال</button>
+              </div>
+
+            </form>
+          </div>
+        )}
       </main>
 
       <style jsx global>{`
@@ -804,21 +737,20 @@
           width: 8px;
         }
         .custom-scrollbar::-webkit-scrollbar-track {
-          background: #f8fafc;
-          border-radius: 8px;
+          background: rgba(0, 0, 0, 0.2);
+          border-radius: 4px;
         }
         .custom-scrollbar::-webkit-scrollbar-thumb {
-          background: #cbd5e1;
-          border-radius: 8px;
+          background: rgba(255, 255, 255, 0.08);
+          border-radius: 4px;
         }
         .custom-scrollbar::-webkit-scrollbar-thumb:hover {
-          background: #94a3b8;
-        }
-        .animate-fade-in { animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
-        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
-        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
-        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
+          background: rgba(255, 255, 255, 0.15);
+        }
+        .bg-3xl {
+            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
+        }
       `}</style>
     </div>
   );
-}+}
```

### `app\admin\courses\[id]\lectures\page.tsx`
```diff
--- Current: app\admin\courses\[id]\lectures\page.tsx
+++ Other: app\admin\courses\[id]\lectures\page.tsx
@@ -1,28 +1,35 @@
 'use client';
 
-import { useState, useEffect, useRef, useCallback } from 'react';
+import { useState, useEffect, useRef } from 'react';
 import { useRouter, useParams } from 'next/navigation';
 import AdminSidebar from '@/app/components/AdminSidebar';
-import { useAuthGuard } from '../../../../hooks/useAuthGuard'; // 🚀 الدرع المركزي
-import api from '@/lib/axios'; // 🚀 العميل الشبكي الذكي
 import {
   UploadIcon, ShieldIcon, TrashIcon, FileTextIcon,
-  EditIcon, CheckCircleIcon, AlertTriangleIcon, 
-  XIcon, BookIcon, SparklesIcon, CheckIcon
+  EditIcon, ClockIcon, AlertTriangleIcon, CheckCircleIcon
 } from '@/app/components/Icons';
 import Echo from 'laravel-echo';
 import Pusher from 'pusher-js';
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+
+// دالة مساعدة لتوحيد جلب التوكن
+const getToken = () => {
+  return document.cookie
+    .split('; ')
+    .find(row => row.startsWith('token='))
+    ?.split('=')[1] || localStorage.getItem('token');
+};
 
 interface Lecture {
   id: number;
   title: string;
   description: string | null;
-  orderIndex: number;
-  isLocked: boolean;
-  m3u8Path: string | null;
-  videoStatus: string;
-  videoDuration: number | null;
-  attachments?: { id: number; fileName: string; filePath: string; }[];
+  order_index: number;
+  is_locked: boolean;
+  m3u8_path: string | null;
+  video_status: string;
+  video_duration: number | null;
+  attachments?: { id: number; file_name: string; file_path: string; }[];
 }
 
 interface Course {
@@ -30,6 +37,12 @@
   title: string;
 }
 
+interface Toast {
+  visible: boolean;
+  message: string;
+  type: 'success' | 'error' | 'info';
+}
+
 interface GoProgress {
   phase: string;
   percent: number;
@@ -39,9 +52,6 @@
   const router = useRouter();
   const params = useParams();
   const courseId = params.id;
-
-  // 🚀 درع الحماية الذكي
-  const { isChecking } = useAuthGuard(['admin']);
 
   const [course, setCourse] = useState<Course | null>(null);
   const [lectures, setLectures] = useState<Lecture[]>([]);
@@ -49,16 +59,13 @@
   const [showForm, setShowForm] = useState(false);
   const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
   
-  // States الرفع المباشر
   const [uploadingVideo, setUploadingVideo] = useState<number | null>(null);
   const [uploadProgress, setUploadProgress] = useState(0); 
   const xhrRef = useRef<XMLHttpRequest | null>(null);
   
-  // State خادم التشفير (Go Encoder)
   const [goProcessingState, setGoProcessingState] = useState<Record<number, GoProgress>>({});
   
-  // نظام النوافذ والإشعارات الموحد
-  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({ visible: false, message: '', type: 'info' });
+  const [toast, setToast] = useState<Toast>({ visible: false, message: '', type: 'info' });
   const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; message: string; onConfirm: () => void } | null>(null);
 
   const [formData, setFormData] = useState({
@@ -67,33 +74,17 @@
     order_index: '',
   });
 
-  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
-    setToast({ visible: true, message, type });
-    setTimeout(() => setToast({ visible: false, message: '', type: 'info' }), 4000);
-  }, []);
-
-  // تجميد الشاشة للمودال
-  useEffect(() => {
-    if (confirmDialog) document.body.style.overflow = 'hidden';
-    else document.body.style.overflow = '';
-    return () => { document.body.style.overflow = ''; };
-  }, [confirmDialog]);
+
 
   // -----------------------------------------------------------------
-  // 🚀 المستشعر الحي (Real-time WebSockets) لمعرفة حالة خادم التشفير
+  // 2. المستشعر الحي (Real-time WebSockets) لمعرفة حالة Go
   // -----------------------------------------------------------------
   useEffect(() => {
-    if (isChecking) return;
-
-    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
+    const token = getToken();
     if (!token) return;
 
+    // 🚀 Singleton Pattern: منع تكاثر الاتصالات عند تغيير الـ state
     if (!(window as any).echoInstance) {
-      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
-      const authEndpoint = baseURL.endsWith('/api') 
-        ? `${baseURL}/broadcasting/auth` 
-        : `${baseURL}/api/broadcasting/auth`;
-
       (window as any).Pusher = Pusher;
       (window as any).echoInstance = new Echo({
         broadcaster: 'reverb',
@@ -103,28 +94,27 @@
         wssPort: parseInt(process.env.NEXT_PUBLIC_REVERB_PORT || '8081', 10),
         forceTLS: false,
         enabledTransports: ['ws', 'wss'],
-        authEndpoint: authEndpoint,
+        authEndpoint: `${API_URL}/api/broadcasting/auth`,
         auth: {
-          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
+          headers: {
+            Authorization: `Bearer ${token}`,
+            Accept: 'application/json',
+          }
         }
       });
     }
-  }, [isChecking]);
-
-  useEffect(() => {
-    if (isChecking) return;
-    
+
     const echo = (window as any).echoInstance;
-    if (!echo) return;
-
     const activeChannels: string[] = [];
 
     lectures.forEach(lec => {
-      if (['pending', 'processing', 'uploading'].includes(lec.videoStatus)) {
+      if (['pending', 'processing', 'uploading'].includes(lec.video_status)) {
         const channelName = `lecture.${lec.id}`;
         
         echo.private(channelName)
           .listen('.progress.updated', (e: any) => {
+            console.log("⚡ نبضة جديدة:", e);
+            
             setGoProcessingState(prev => ({ 
               ...prev, 
               [lec.id]: { phase: e.phase, percent: e.percent } 
@@ -135,81 +125,65 @@
             }
           })
           .error((err: any) => {
-             console.error("WebSocket Auth Error for Channel:", channelName, err);
+             console.error("خطأ في قناة الاستماع المشفرة:", err);
           });
 
+        // 🚀 إصلاح الخطأ القاتل: إضافة اسم القناة بدون بادئة (private-)
         activeChannels.push(channelName);
       }
     });
 
     return () => {
+      // 🚀 إصلاح الخطأ القاتل: الخروج من القناة باستخدام اسمها الحقيقي
       activeChannels.forEach(ch => echo.leave(ch));
     };
   // eslint-disable-next-line react-hooks/exhaustive-deps
-  }, [lectures, isChecking]);
-
+  }, [lectures]);
+
+
+  useEffect(() => {
+    fetchData();
+  // eslint-disable-next-line react-hooks/exhaustive-deps
+  }, [courseId]);
 
   // -----------------------------------------------------------------
-  // 🚀 المستشعر الصامت (Fallback Poller)
+  // 3. المستشعر الصامت (Silent Background Poller) - Bulletproof Fallback
   // -----------------------------------------------------------------
   useEffect(() => {
-    if (isChecking) return;
-
-    const hasProcessing = lectures.some(l => l.videoStatus === 'processing' || l.videoStatus === 'uploading');
+    const hasProcessing = lectures.some(l => l.video_status === 'processing' || l.video_status === 'uploading');
     if (!hasProcessing) return;
 
     const poller = setInterval(() => {
-      fetchData(false);
-    }, 15000);
+      fetchData(false); // Silent fetch, won't trigger full loading overlay
+    }, 10000);
 
     return () => clearInterval(poller);
   // eslint-disable-next-line react-hooks/exhaustive-deps
-  }, [lectures, isChecking]);
-
-
-  // جلب البيانات الأساسية
-  useEffect(() => {
-    if (!isChecking && courseId) {
-      fetchData();
-    }
-  // eslint-disable-next-line react-hooks/exhaustive-deps
-  }, [courseId, isChecking]);
-
-  const fetchData = async (showLoadingUI = true) => {
-    if (showLoadingUI) setIsLoading(true);
+  }, [lectures]);
+
+  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
+    setToast({ visible: true, message, type });
+    setTimeout(() => setToast({ visible: false, message: '', type: 'info' }), 4000);
+  };
+
+  const fetchData = async (showLoading = true) => {
+    if (showLoading) setIsLoading(true);
     try {
-      const [courseRes, lecturesRes] = await Promise.allSettled([
-        api.get(`/admin/courses/${courseId}`),
-        api.get(`/admin/courses/${courseId}/lectures`),
+      const token = getToken();
+      const [courseRes, lecturesRes] = await Promise.all([
+        fetch(`${API_URL}/api/admin/courses/${courseId}`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }),
+        fetch(`${API_URL}/api/admin/courses/${courseId}/lectures`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }),
       ]);
 
-      if (courseRes.status === 'fulfilled') {
-        setCourse(courseRes.value.data?.data || courseRes.value.data);
-      }
-
-      if (lecturesRes.status === 'fulfilled') {
-        const rawLectures = lecturesRes.value.data?.data || lecturesRes.value.data || [];
-        const validLectures = Array.isArray(rawLectures) ? rawLectures : [];
-
-        const mappedLectures: Lecture[] = validLectures.map((l: any) => ({
-          id: l.id,
-          title: l.title || 'محاضرة بدون عنوان',
-          description: l.description,
-          orderIndex: Number(l.order_index ?? l.orderIndex ?? 0),
-          isLocked: l.is_locked ?? l.isLocked ?? false,
-          m3u8Path: l.m3u8_path ?? l.m3u8Path ?? null,
-          videoStatus: l.video_status ?? l.videoStatus ?? 'pending',
-          videoDuration: l.video_duration ?? l.videoDuration ?? null,
-          attachments: (Array.isArray(l.attachments) ? l.attachments : []).map((att: any) => ({
-            id: att.id,
-            fileName: att.file_name ?? att.fileName ?? 'ملف مرفق',
-            filePath: att.file_path ?? att.filePath,
-          })),
-        }));
-        setLectures(mappedLectures);
-      }
-    } catch (err: any) {
-      if (showLoadingUI) showToast(err?.message || 'فشل جلب بيانات المحاضرات', 'error');
+      if (courseRes.status === 401 || courseRes.status === 403) return router.push('/login');
+
+      const courseData = await courseRes.json();
+      const lecturesData = await lecturesRes.json();
+
+      setCourse(courseData.data);
+      setLectures(lecturesData.data || []);
+    } catch (err) {
+      if (showLoading) showToast('فشل جلب البيانات', 'error');
     } finally {
       setIsLoading(false);
     }
@@ -218,64 +192,59 @@
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
 
-    const parsedOrderIndex = parseInt(formData.order_index) || 1;
+    const parsedOrderIndex = parseInt(formData.order_index);
     const isDuplicateIndex = lectures.some(lecture => 
-      lecture.orderIndex === parsedOrderIndex && lecture.id !== editingLecture?.id
+      lecture.order_index === parsedOrderIndex && lecture.id !== editingLecture?.id
     );
 
     if (isDuplicateIndex) {
-      showToast('رقم الترتيب هذا مستخدم بالفعل لمحاضرة أخرى في نفس الكورس', 'error');
+      showToast('رقم الترتيب هذا مستخدم بالفعل لمحاضرة أخرى', 'error');
       return;
     }
 
     setIsLoading(true);
     try {
-      const payload = {
-        title: formData.title.trim(),
-        description: formData.description.trim(),
-        order_index: parsedOrderIndex,
-      };
-
-      if (editingLecture) {
-        await api.put(`/admin/lectures/${editingLecture.id}`, payload);
-        showToast('تم تعديل بيانات المحاضرة بنجاح', 'success');
+      const token = getToken();
+      const url = editingLecture ? `${API_URL}/api/admin/lectures/${editingLecture.id}` : `${API_URL}/api/admin/courses/${courseId}/lectures`;
+      const res = await fetch(url, {
+        method: editingLecture ? 'PUT' : 'POST',
+        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
+        body: JSON.stringify({ ...formData, order_index: parsedOrderIndex }),
+      });
+      if (res.ok) {
+        setShowForm(false); setEditingLecture(null); setFormData({ title: '', description: '', order_index: '' });
+        fetchData(); showToast(editingLecture ? 'تم التعديل' : 'تمت الإضافة', 'success');
       } else {
-        await api.post(`/admin/courses/${courseId}/lectures`, payload);
-        showToast('تم إضافة المحاضرة بنجاح', 'success');
-      }
-
-      setShowForm(false); 
-      setEditingLecture(null); 
-      setFormData({ title: '', description: '', order_index: '' });
-      fetchData(); 
-    } catch (err: any) { 
-      showToast(err?.message || err?.error || 'تأكد من صحة البيانات المدخلة', 'error'); 
-    } finally { 
-      setIsLoading(false); 
-    }
-  };
-
-  // -----------------------------------------------------------------
-  // 🚀 رفع الفيديو إلى السحابة المباشرة
-  // -----------------------------------------------------------------
+          showToast('تأكد من صحة البيانات المدخلة', 'error');
+      }
+    } catch (err) { showToast('فشل حفظ المحاضرة', 'error'); } finally { setIsLoading(false); }
+  };
+
   const handleVideoUpload = async (lectureId: number, file: File) => {
     if (uploadingVideo !== null) return;
     setUploadingVideo(lectureId);
     setUploadProgress(0);
 
     try {
-      showToast('جاري استخراج تذكرة السحابة المباشرة لتخطي السيرفر...', 'info');
-
-      const ticketRes = await api.get(`/admin/lectures/${lectureId}/upload-ticket`);
-      const presignedUrl = ticketRes.data?.data?.upload_url || ticketRes.data?.upload_url; 
+      const token = getToken();
+      showToast('جاري استخراج تذكرة السحابة المباشرة...', 'info');
+
+      const ticketRes = await fetch(`${API_URL}/api/admin/lectures/${lectureId}/upload-ticket`, {
+        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
+      });
       
-      if (!presignedUrl) throw new Error('فشلت خوادم التخزين في إصدار رابط صالح للرفع');
+      if (!ticketRes.ok) throw new Error('فشل الحصول على تصريح السحابة');
+      
+      const ticketData = await ticketRes.json();
+      const presignedUrl = ticketData.data?.upload_url || ticketData.upload_url; 
+      
+      if (!presignedUrl) throw new Error('لم يتم العثور على رابط الرفع الصالح');
 
       await new Promise((resolve, reject) => {
         const xhr = new XMLHttpRequest();
         xhrRef.current = xhr;
         xhr.open('PUT', presignedUrl, true);
-        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
+        xhr.setRequestHeader('Content-Type', 'video/mp4');
 
         xhr.upload.onprogress = (event) => {
           if (event.lengthComputable) {
@@ -287,11 +256,11 @@
           if (xhr.status >= 200 && xhr.status < 300) {
             resolve(xhr.responseText);
           } else {
-            reject(new Error(`رفضت السحابة استقبال الملف (كود الخطأ: ${xhr.status})`));
+            reject(new Error(`رفضت السحابة الملف (${xhr.status})`));
           }
         };
 
-        xhr.onerror = () => reject(new Error('فشل الاتصال بسيرفرات التخزين السحابية (انقطاع بالشبكة)'));
+        xhr.onerror = () => reject(new Error('فشل الاتصال بسيرفرات السحابة'));
         xhr.send(file);
       }).finally(() => {
         xhrRef.current = null;
@@ -301,18 +270,21 @@
         ...prev, 
         [lectureId]: { phase: 'starting', percent: 2 } 
       }));
-      setLectures(prev => prev.map(l => l.id === lectureId ? { ...l, videoStatus: 'processing' } : l));
-
-      showToast('✅ تم النقل للسحابة بنجاح! جاري إيقاظ خادم التشفير العسكري...', 'success');
-
-      await api.post(`/admin/lectures/${lectureId}/start-processing`);
+      setLectures(prev => prev.map(l => l.id === lectureId ? { ...l, video_status: 'processing' } : l));
+
+      showToast('تم الرفع للسحابة بنجاح! جاري إيقاظ خادم التشفير...', 'success');
+
+      await fetch(`${API_URL}/api/admin/lectures/${lectureId}/start-processing`, {
+        method: 'POST',
+        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
+      });
 
     } catch (err: any) {
       console.error('Upload Error:', err);
-      showToast(err.message || 'حدث خطأ فادح أثناء الرفع', 'error');
+      showToast(err.message || 'حدث خطأ أثناء رفع الفيديو', 'error');
+    } finally {
       setUploadingVideo(null);
       setUploadProgress(0);
-      fetchData(false);
     }
   };
 
@@ -326,87 +298,89 @@
     setUploadProgress(0);
 
     try {
-      await api.post(`/admin/lectures/${lectureId}/cancel-upload`);
-      showToast('تم إجهاض عملية الرفع وتنظيف المخلفات من السيرفر', 'success');
-      fetchData(false);
-    } catch (err: any) {
-      showToast('حدث خطأ أثناء تنظيف الملفات الملغاة', 'error');
-      fetchData(false);
+      const token = getToken();
+      const res = await fetch(`${API_URL}/api/admin/lectures/${lectureId}/cancel-upload`, {
+        method: 'POST',
+        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
+      });
+      if (res.ok) {
+        showToast('تم إلغاء الرفع وتنظيف الملفات', 'success');
+        fetchData(false);
+      } else {
+        showToast('فشل تنظيف ملفات الرفع الملغاة من السيرفر', 'error');
+      }
+    } catch (err) {
+      showToast('خطأ في الاتصال بالسيرفر لإلغاء الرفع', 'error');
     }
   };
 
   const handleDeleteVideo = (lectureId: number) => {
     setConfirmDialog({
-      visible: true, 
-      message: '🚨 سيتم تدمير هذا الفيديو والأجزاء المشفرة الخاصة به للأبد من خوادم السحابة. هل تستمر؟',
+      visible: true, message: 'سيتم تدمير هذا الفيديو للأبد. هل تستمر؟',
       onConfirm: async () => {
         setConfirmDialog(null);
         try {
-          await api.delete(`/admin/lectures/${lectureId}/video`);
-          showToast('تم تدمير الفيديو ومسحه من قاعدة البيانات', 'success'); 
-          fetchData(false); 
-        } catch (err: any) { 
-          showToast(err?.message || 'فشل الاتصال بخادم الحذف', 'error'); 
-        }
+          const token = getToken();
+          const res = await fetch(`${API_URL}/api/admin/lectures/${lectureId}/video`, {
+            method: 'DELETE', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
+          });
+          if (res.ok) { showToast('تم تدمير الفيديو', 'success'); fetchData(false); }
+        } catch (err) { showToast('فشل الاتصال', 'error'); }
       }
     });
   };
 
-  // -----------------------------------------------------------------
-  // 🚀 رفع المرفقات (الحل الجذري لمشكلة الـ FormData)
-  // -----------------------------------------------------------------
   const handleAttachmentUpload = async (lectureId: number, file: File) => {
     try {
-      showToast('جاري رفع المرفق... يرجى الانتظار', 'info');
-      
+      const token = getToken();
+      showToast('جاري الرفع...', 'info');
+
       const formData = new FormData();
       formData.append('file', file);
 
-      // 🚀 إجبار Axios على إرسال البيانات كـ Multipart Form Data
-      await api.post(`/admin/lectures/${lectureId}/attachments`, formData, {
-        headers: {
-          'Content-Type': 'multipart/form-data',
-        },
-      });
-
-      showToast('تم إرفاق الملف بنجاح', 'success');
-      fetchData(false);
-    } catch (err: any) {
-      const errorMsg = err.response?.data?.message || err?.message || 'فشل إرفاق الملف';
-      showToast(errorMsg, 'error');
+      const res = await fetch(`${API_URL}/api/admin/lectures/${lectureId}/attachments`, {
+        method: 'POST',
+        headers: { 'Authorization': `Bearer ${token}` },
+        body: formData,
+      });
+
+      if (res.ok) {
+        showToast('تم إرفاق الملف بنجاح', 'success');
+        fetchData(false);
+      } else {
+        showToast('فشل إرفاق الملف', 'error');
+      }
+    } catch (err) {
+      showToast('خطأ في الاتصال', 'error');
     }
   };
 
   const handleDeleteAttachment = (lectureId: number, attachmentId: number) => {
     setConfirmDialog({
-      visible: true, 
-      message: 'سيتم حذف هذا الملف المرفق نهائياً. هل أنت متأكد؟',
+      visible: true, message: 'سيتم حذف هذا المرفق نهائياً. هل تستمر؟',
       onConfirm: async () => {
         setConfirmDialog(null);
         try {
-          await api.delete(`/admin/lectures/${lectureId}/attachments/${attachmentId}`);
-          showToast('تم حذف المرفق بنجاح', 'success'); 
-          fetchData(false); 
-        } catch (err: any) { 
-          showToast(err?.message || 'فشل الاتصال', 'error'); 
-        }
+          const token = getToken();
+          const res = await fetch(`${API_URL}/api/admin/lectures/${lectureId}/attachments/${attachmentId}`, {
+            method: 'DELETE', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
+          });
+          if (res.ok) { showToast('تم الحذف', 'success'); fetchData(false); }
+        } catch (err) { showToast('فشل الاتصال', 'error'); }
       }
     });
   };
 
   const handleDelete = (id: number) => {
     setConfirmDialog({
-      visible: true, 
-      message: '⚠️ تحذير: سيتم حذف المحاضرة بالكامل، بما فيها الفيديو المدمج والاختبارات المرتبطة بها. لا يمكن التراجع عن هذا!',
+      visible: true, message: 'سيتم حذف المحاضرة بالكامل. هل تستمر؟',
       onConfirm: async () => {
         setConfirmDialog(null);
         try {
-          await api.delete(`/admin/lectures/${id}`);
-          showToast('تم مسح المحاضرة من الكورس', 'success'); 
-          fetchData(); 
-        } catch (err: any) { 
-          showToast(err?.message || 'حدث خطأ يمنع الحذف', 'error'); 
-        }
+          const token = getToken();
+          const res = await fetch(`${API_URL}/api/admin/lectures/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
+          if (res.ok) { showToast('تم الحذف', 'success'); fetchData(); }
+        } catch (err) { showToast('خطأ في الاتصال', 'error'); }
       }
     });
   };
@@ -416,299 +390,190 @@
     setFormData({
       title: lecture.title,
       description: lecture.description || '',
-      order_index: lecture.orderIndex.toString(),
+      order_index: lecture.order_index.toString(),
     });
     setShowForm(true);
     window.scrollTo({ top: 0, behavior: 'smooth' });
   };
 
+  // 🚀 تم تصحيح خريطة الحالات لتشمل (completed)
   const getEncodingStatusBadge = (status: string | null) => {
     if (!status || status === 'pending') return null; 
     const statusMap: Record<string, { label: string; class: string }> = {
-      processing: { label: '⚙️ جاري التشفير (Go Encoder)', class: 'bg-blue-50 text-blue-700 border-blue-200' },
-      ready: { label: '🛡️ تم التشفير ومحمي بالكامل', class: 'bg-green-50 text-green-700 border-green-200' },
-      completed: { label: '🛡️ تم التشفير ومحمي بالكامل', class: 'bg-green-50 text-green-700 border-green-200' },
-      failed: { label: '❌ فشل التشفير (راجع السيرفر)', class: 'bg-red-50 text-red-700 border-red-200' },
+      processing: { label: '⚙️ جاري التشفير العسكري', class: 'badge-primary' },
+      ready: { label: '🛡️ جاهز ومحمي', class: 'badge-success' },
+      completed: { label: '🛡️ جاهز ومحمي', class: 'badge-success' }, // إضافة حالة نجاح خادم Go
+      failed: { label: '❌ فشل التشفير', class: 'badge-error' },
     };
-    const mapped = statusMap[status] || { label: status, class: 'bg-gray-50 text-gray-700 border-gray-200' };
-    
-    return <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border shadow-sm ${mapped.class}`}>{mapped.label}</span>;
-  };
-
-  if (isChecking) {
-    return (
-      <div className="admin-layout">
-        <AdminSidebar />
-        <main className="admin-content flex items-center justify-center min-h-[60vh]">
-          <div className="loading-state text-center flex flex-col items-center">
-             <div className="spinner spinner-primary spinner-lg mb-4 mx-auto" />
-             <p className="font-bold text-muted text-lg">جاري التحقق وتجهيز محرر المحاضرات...</p>
-          </div>
-        </main>
-      </div>
-    );
-  }
+    return statusMap[status] || { label: status, class: 'badge-secondary' };
+  };
 
   return (
     <div className="admin-layout relative">
       <AdminSidebar />
-      
-      {/* 🚀 نظام التنبيهات الموحد */}
-      <div 
-        className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300" 
-        style={{ 
-          opacity: toast.visible ? 1 : 0, 
-          transform: toast.visible ? 'translate(-50%, 0)' : 'translate(-50%, -20px)', 
-          pointerEvents: toast.visible ? 'auto' : 'none' 
-        }}
-      >
-        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl text-sm font-bold ${toast.type === 'success' ? 'bg-green-600 text-white' : toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
-          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : toast.type === 'error' ? <AlertTriangleIcon size={20} /> : <UploadIcon size={20} />}
-          <span>{toast.message}</span>
+      <div style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, transition: 'all 0.3s', opacity: toast.visible ? 1 : 0, pointerEvents: toast.visible ? 'auto' : 'none' }}>
+        <div style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
+          {toast.message}
         </div>
       </div>
-
-      {/* 🚀 نافذة التأكيد المحسنة */}
       {confirmDialog && (
-        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setConfirmDialog(null)}>
-          <div className="card shadow-2xl max-w-sm w-full text-center p-8 animate-scale-up border border-gray-100 bg-white rounded-2xl" onClick={e => e.stopPropagation()}>
-            <div className="flex justify-center mb-5 text-error">
-              <AlertTriangleIcon size={56} />
-            </div>
-            <h3 className="text-2xl font-black text-gray-900 mb-4">تأكيد الإجراء الخطير</h3>
-            <p className="text-gray-600 mb-8 leading-relaxed font-medium">{confirmDialog.message}</p>
-            <div className="flex gap-4">
-              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline flex-1 py-3 font-bold rounded-xl border-gray-200 hover:bg-gray-50">إلغاء</button>
-              <button onClick={confirmDialog.onConfirm} className="btn btn-danger flex-1 py-3 font-bold shadow-lg shadow-red-200 rounded-xl text-white">نعم، نفذ فوراً</button>
+        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
+          <div className="card" style={{ maxWidth: '400px', width: '90%', textAlign: 'center' }}>
+            <h3 style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '1.25rem' }}>⚠️ تأكيد الإجراء</h3>
+            <p style={{ marginBottom: '1.5rem', lineHeight: '1.5' }}>{confirmDialog.message}</p>
+            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
+              <button onClick={confirmDialog.onConfirm} className="btn btn-danger">نعم، نفذ</button>
+              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline">إلغاء</button>
             </div>
           </div>
         </div>
       )}
 
       <main className="admin-content">
-        
-        <div className="mb-6 flex">
-          <button 
-            onClick={() => router.push('/admin/courses')} 
-            className="btn btn-outline bg-white text-gray-600 hover:text-primary hover:bg-blue-50 border-gray-200 shadow-sm rounded-xl px-5 py-2.5 text-sm font-bold flex items-center gap-2 transition-all w-fit"
-          >
-            <span className="text-xl leading-none">&rarr;</span> العودة لقائمة الكورسات
-          </button>
+        <div className="page-header">
+          <div>
+            <button onClick={() => router.push('/admin/courses')} className="back-link">← العودة للكورسات</button>
+            <h1 className="page-title" dir="rtl">{course?.title}</h1>
+          </div>
+          <button onClick={() => { setShowForm(true); setEditingLecture(null); setFormData({ title: '', description: '', order_index: (lectures.length + 1).toString() }); }} className="btn btn-primary">+ إضافة محاضرة</button>
         </div>
 
-        <div className="page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
-          <div>
-            <h1 className="page-title text-3xl font-black text-gray-900 flex items-center gap-3">
-              <BookIcon size={32} className="text-primary" /> 
-              {course?.title || 'جاري التحميل...'}
-            </h1>
-          </div>
-          <button 
-            onClick={() => { setShowForm(true); setEditingLecture(null); setFormData({ title: '', description: '', order_index: (lectures.length + 1).toString() }); }} 
-            className="btn btn-primary font-bold shadow-lg shadow-blue-200 rounded-xl px-6 py-3 flex items-center gap-2"
-          >
-            <SparklesIcon size={18} /> إضافة محاضرة جديدة
-          </button>
-        </div>
-
-        {/* نموذج الإضافة/التعديل */}
         {showForm && (
-           <div className="card mb-8 shadow-xl border border-blue-100 p-8 bg-gradient-to-b from-blue-50/50 to-white rounded-2xl animate-fade-in">
-             <h3 className="text-xl font-black mb-6 text-primary flex items-center gap-2 border-b border-gray-100 pb-4">
-               {editingLecture ? <><EditIcon size={22} /> تعديل المحاضرة: {editingLecture.title}</> : <><SparklesIcon size={22} className="text-success" /> إنشاء محاضرة جديدة (بدون فيديو مبدئياً)</>}
-             </h3>
-             <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
-               <div className="form-group md:col-span-1 mb-0">
-                 <label className="form-label font-bold text-gray-700 mb-2 block">عنوان المحاضرة الرئيسي</label>
-                 <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input-field w-full font-bold text-lg bg-white rounded-xl py-3 border-gray-200 focus:border-primary shadow-sm" required dir="rtl" placeholder="مثال: الباب الأول - الدرس الأول..." />
-               </div>
-               <div className="form-group md:col-span-1 mb-0">
-                 <label className="form-label font-bold text-gray-700 mb-2 block">ترتيب المحاضرة (الرقم المتسلسل)</label>
-                 <input type="text" value={formData.order_index} onChange={(e) => setFormData({ ...formData, order_index: e.target.value.replace(/[^0-9]/g, '') })} className="input-field w-full font-black text-primary text-xl bg-white rounded-xl py-3 border-gray-200 focus:border-primary shadow-sm" required min="1" dir="ltr" />
-                 <small className="text-gray-400 text-xs mt-2 block font-bold">لا يمكن تكرار نفس الرقم لمحاضرتين متتاليتين.</small>
-               </div>
-               <div className="form-group col-span-full mb-0">
-                 <label className="form-label font-bold text-gray-700 mb-2 block">وصف قصير (اختياري)</label>
-                 <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field w-full bg-white rounded-xl p-4 border-gray-200 focus:border-primary shadow-sm" rows={3} dir="rtl" style={{ resize: 'none' }} placeholder="ملاحظات تظهر تحت الفيديو للطالب..." />
-               </div>
-               <div className="col-span-full flex flex-col md:flex-row gap-3 pt-6 border-t border-gray-100 mt-2">
-                 <button type="submit" disabled={isLoading} className="btn btn-primary px-10 py-3.5 font-bold text-base shadow-lg shadow-blue-200 rounded-xl flex-1 md:flex-none">
-                   {isLoading ? <span className="spinner spinner-light w-5 h-5 border-2 mx-auto block" /> : 'حفظ التكوين الأساسي'}
-                 </button>
-                 <button type="button" onClick={() => { setShowForm(false); setEditingLecture(null); }} className="btn btn-outline py-3.5 px-8 font-bold border-gray-200 hover:bg-gray-50 rounded-xl flex-1 md:flex-none">إلغاء الإغلاق</button>
-               </div>
-             </form>
-           </div>
+           <div className="card">
+           <form onSubmit={handleSubmit} className="form-grid">
+             <div className="form-group"><label className="form-label">عنوان المحاضرة</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input-field" required dir="rtl" /></div>
+             <div className="form-group"><label className="form-label">ترتيب المحاضرة</label><input type="number" value={formData.order_index} onChange={(e) => setFormData({ ...formData, order_index: e.target.value })} className="input-field" required min="1" /></div>
+             <div className="form-actions"><button type="submit" disabled={isLoading} className="btn btn-primary">حفظ</button><button type="button" onClick={() => { setShowForm(false); setEditingLecture(null); }} className="btn btn-outline">إلغاء</button></div>
+           </form>
+         </div>
         )}
 
-        {/* قائمة المحاضرات */}
-        {isLoading && lectures.length === 0 ? (
-          <div className="card p-16 flex justify-center border border-gray-100 bg-white rounded-2xl"><div className="spinner spinner-primary spinner-lg" /></div>
-        ) : lectures.length === 0 && !showForm ? (
-          <div className="empty-state bg-white border border-gray-100 rounded-2xl py-20 shadow-sm text-center">
-            <div className="empty-state-icon bg-blue-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner"><FileTextIcon size={48} className="text-primary" /></div>
-            <h3 className="text-2xl font-black text-gray-800">هذا الكورس فارغ تماماً</h3>
-            <p className="text-muted mt-2 font-medium mb-8 max-w-sm mx-auto">قم بإضافة الهيكل الأساسي للمحاضرات أولاً، ثم ارفع الفيديوهات المشفرة إليها.</p>
-            <button onClick={() => { setShowForm(true); setFormData(f => ({ ...f, order_index: '1' })); }} className="btn btn-primary shadow-lg shadow-blue-200 rounded-xl px-6 py-3 font-bold"><SparklesIcon size={20} className="ml-2 inline" /> أضف المحاضرة رقم 1</button>
-          </div>
-        ) : (
-          <div className="flex flex-col gap-6">
-            {lectures.sort((a, b) => a.orderIndex - b.orderIndex).map((lecture) => {
-              const isProcessingBackend = lecture.videoStatus === 'processing' || lecture.videoStatus === 'uploading';
-              const isUploadingFrontend = uploadingVideo === lecture.id;
-              const goState = goProcessingState[lecture.id]; 
-              
-              const hasVideo = lecture.videoStatus === 'completed' || lecture.videoStatus === 'ready' || !!lecture.m3u8Path;
-
-              return (
-                <div key={lecture.id} className="card bg-white border border-gray-200 shadow-sm rounded-2xl p-6 hover:shadow-md transition-shadow relative overflow-hidden group">
+        <div className="lectures-list">
+          {lectures.sort((a, b) => a.order_index - b.order_index).map((lecture) => {
+            const statusBadge = getEncodingStatusBadge(lecture.video_status);
+            const isProcessingBackend = lecture.video_status === 'processing' || lecture.video_status === 'uploading';
+            const isUploadingFrontend = uploadingVideo === lecture.id;
+            const goState = goProcessingState[lecture.id]; 
+            
+            // 🚀 الحل الجذري: تحديد وجود الفيديو من خلال الحالة وليس فقط الـ M3U8 Path
+            const hasVideo = lecture.video_status === 'completed' || lecture.video_status === 'ready' || !!lecture.m3u8_path;
+
+            return (
+              <div key={lecture.id} className="lecture-card">
+                <div className="lecture-header">
+                  <div className="lecture-number">{lecture.order_index}</div>
+                  <div className="lecture-info">
+                    <h4 className="lecture-title">{lecture.title}</h4>
+                  </div>
+                </div>
+
+                {isUploadingFrontend && (
+                  <div className="upload-progress mt-4" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
+                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
+                      <span style={{ fontWeight: '600', color: '#3b82f6' }}>🚀 جاري نقل الملف للسحابة مباشرة...</span>
+                      <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>{uploadProgress}%</span>
+                    </div>
+                    <div className="progress-bar" style={{ height: '8px', backgroundColor: 'rgba(59, 130, 246, 0.2)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.75rem' }}>
+                      <div className="progress-bar-fill" style={{ width: `${uploadProgress}%`, backgroundColor: '#3b82f6', height: '100%', transition: 'width 1s linear' }} />
+                    </div>
+                    <button
+                      onClick={() => handleCancelUpload(lecture.id)}
+                      className="btn btn-sm btn-outline"
+                      style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
+                    >
+                      ❌ إلغاء الرفع
+                    </button>
+                  </div>
+                )}
+
+                {(isProcessingBackend || goState) && !isUploadingFrontend && !hasVideo && (
+                  <div className="upload-progress mt-4" style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
+                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
+                      <span style={{ fontWeight: '600', color: '#059669' }}>
+                        {goState?.phase === 'starting' && '🚀 جاري إيقاظ خوادم التشفير...'}
+                        {goState?.phase === 'initializing' && '⚙️ جاري تجهيز بيئة العمل المعزولة...'}
+                        {goState?.phase === 'pulling' && '📥 جاري سحب الفيديو من السحابة...'}
+                        {goState?.phase === 'encoding' && '🔒 جاري تقطيع وتشفير الفيديو (AES-128)...'}
+                        {goState?.phase === 'pushing' && '☁️ جاري رفع الأجزاء المشفرة للسحابة...'}
+                        {goState?.phase === 'completed' && '✅ اكتمل التشفير بنجاح!'}
+                        {goState?.phase === 'failed' && '❌ حدث خطأ فادح أثناء التشفير!'}
+                        {!goState && '⏳ في انتظار الاستجابة...'}
+                      </span>
+                      <span style={{ fontWeight: 'bold', color: '#10b981' }}>
+                        {Math.floor(goState?.percent || 0)}%
+                      </span>
+                    </div>
+                    <div className="progress-bar" style={{ height: '8px', backgroundColor: 'rgba(16, 185, 129, 0.2)', borderRadius: '4px', overflow: 'hidden' }}>
+                      <div 
+                        className="progress-bar-fill" 
+                        style={{ 
+                          width: `${goState?.percent || 0}%`, 
+                          backgroundColor: goState?.phase === 'failed' ? '#ef4444' : '#10b981', 
+                          height: '100%',
+                          transition: 'width 1s linear' 
+                        }} 
+                      />
+                    </div>
+                  </div>
+                )}
+
+                {hasVideo && !isUploadingFrontend && statusBadge && (
+                  <div className="video-status mt-4">
+                    <span className={`badge ${statusBadge.class}`}>{statusBadge.label}</span>
+                  </div>
+                )}
+
+                <div className="lecture-actions mt-4" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                   
-                  {/* الشريط الجانبي لتوضيح الحالة */}
-                  <div className={`absolute top-0 right-0 w-1.5 h-full transition-colors ${hasVideo ? 'bg-green-500' : isProcessingBackend || isUploadingFrontend ? 'bg-blue-500 animate-pulse' : 'bg-orange-400 group-hover:bg-orange-500'}`}></div>
-
-                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
-                    <div className="flex items-center gap-4">
-                      <div className="w-14 h-14 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center text-2xl font-black text-gray-800 shadow-inner shrink-0">
-                        {lecture.orderIndex}
-                      </div>
-                      <div>
-                        <h4 className="text-xl font-black text-gray-900 leading-tight">{lecture.title}</h4>
-                        {lecture.description && <p className="text-sm text-gray-500 font-medium mt-1.5 line-clamp-2">{lecture.description}</p>}
-                      </div>
-                    </div>
-                    
-                    {hasVideo && !isUploadingFrontend && (
-                      <div className="shrink-0">{getEncodingStatusBadge(lecture.videoStatus)}</div>
-                    )}
-                  </div>
-
-                  {/* شريط الرفع إلى السحابة المباشرة */}
-                  {isUploadingFrontend && (
-                    <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 mb-5 shadow-inner">
-                      <div className="flex justify-between items-center text-sm mb-3">
-                        <span className="font-bold text-blue-700 flex items-center gap-2"><UploadIcon size={18} className="animate-bounce" /> جاري نقل الملف المشفر للسحابة...</span>
-                        <span className="font-black text-blue-800 text-lg">{uploadProgress}%</span>
-                      </div>
-                      <div className="w-full bg-blue-100 h-3 rounded-full overflow-hidden mb-4 border border-blue-200">
-                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300 ease-out relative" style={{ width: `${uploadProgress}%` }}>
-                           <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
-                        </div>
-                      </div>
-                      <button onClick={() => handleCancelUpload(lecture.id)} className="text-xs font-bold text-error hover:text-white bg-red-50 hover:bg-red-500 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 w-fit border border-red-100 hover:border-red-600">
-                        <XIcon size={14} /> إيقاف الإرسال وإلغاء
-                      </button>
-                    </div>
+                  {!hasVideo && !isProcessingBackend && !isUploadingFrontend && (
+                    <label className="upload-btn" style={{ cursor: 'pointer', margin: 0 }}>
+                      <input type="file" accept="video/mp4,video/mov,video/avi,video/mkv" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleVideoUpload(lecture.id, file); }} />
+                      <span className="btn btn-sm btn-primary flex items-center gap-1"><UploadIcon size={14} /><ShieldIcon size={14} /> رفع وتشفير الفيديو</span>
+                    </label>
                   )}
-
-                  {/* شريط التشفير العسكري */}
-                  {(isProcessingBackend || goState) && !isUploadingFrontend && !hasVideo && (
-                    <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 mb-5 shadow-inner">
-                      <div className="flex justify-between items-center text-sm mb-3">
-                        <span className="font-bold text-emerald-800 flex items-center gap-2">
-                          <ShieldIcon size={18} className={goState?.phase !== 'failed' && goState?.phase !== 'completed' ? 'animate-spin' : ''} />
-                          {goState?.phase === 'starting' && 'إيقاظ خوادم التشفير العسكرية...'}
-                          {goState?.phase === 'initializing' && 'تجهيز حاوية التقطيع الآمنة...'}
-                          {goState?.phase === 'pulling' && 'سحب الفيديو من محطة الرفع...'}
-                          {goState?.phase === 'encoding' && 'جاري التقطيع والتشفير...'}
-                          {goState?.phase === 'pushing' && 'رفع الأجزاء للسحابة النهائية...'}
-                          {goState?.phase === 'completed' && 'اكتمل التشفير! تحديث البيانات...'}
-                          {goState?.phase === 'failed' && 'خطأ: رفض الخادم التشفير.'}
-                          {!goState && 'في انتظار إشارة الخادم...'}
-                        </span>
-                        <span className="font-black text-emerald-700 text-lg">{Math.floor(goState?.percent || 0)}%</span>
-                      </div>
-                      <div className="w-full bg-emerald-100 h-3 rounded-full overflow-hidden border border-emerald-200">
-                        <div 
-                          className={`h-full transition-all duration-500 ease-out relative ${goState?.phase === 'failed' ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'}`} 
-                          style={{ width: `${goState?.percent || 0}%` }}
-                        >
-                          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
-                        </div>
-                      </div>
-                    </div>
+                  
+                  {hasVideo && (
+                    <button onClick={() => handleDeleteVideo(lecture.id)} className="btn btn-sm btn-danger flex items-center gap-1"><TrashIcon size={14} /> تدمير الفيديو</button>
                   )}
 
-                  {/* لوحة التحكم */}
-                  <div className="flex flex-wrap gap-3 mt-4 bg-gray-50 p-4 rounded-xl border border-gray-100 items-center">
-                    
-                    {!hasVideo && !isProcessingBackend && !isUploadingFrontend && (
-                      <label className="btn btn-sm btn-primary font-bold shadow-sm shadow-blue-200 cursor-pointer hover:-translate-y-0.5 transition-transform m-0 flex items-center gap-2 rounded-lg px-4">
-                        <input type="file" accept="video/mp4,video/mov,video/avi,video/mkv" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleVideoUpload(lecture.id, file); }} />
-                        <UploadIcon size={16} /> <ShieldIcon size={16} /> رفع وتشفير الفيديو
-                      </label>
-                    )}
-                    
-                    {hasVideo && (
-                      <button onClick={() => handleDeleteVideo(lecture.id)} className="btn btn-sm bg-red-50 text-red-700 hover:bg-red-600 hover:text-white border border-red-200 hover:border-red-600 font-bold flex items-center gap-1.5 transition-colors rounded-lg px-4">
-                        <TrashIcon size={16} /> تدمير الفيديو المدمج
-                      </button>
-                    )}
-
+                  {hasVideo && (
                     <button 
                       onClick={() => router.push(`/admin/courses/${courseId}/exams?lecture_id=${lecture.id}`)} 
-                      className="btn btn-sm btn-success font-bold flex items-center gap-1.5 shadow-sm shadow-green-100 rounded-lg px-4"
+                      className="btn btn-sm btn-success flex items-center gap-1"
                     >
-                      <FileTextIcon size={16} /> بنك الأسئلة
+                      <FileTextIcon size={14} /> إدارة الاختبارات
                     </button>
-                    
-                    <button onClick={() => handleEditLecture(lecture)} className="btn btn-sm btn-outline border-gray-200 hover:bg-white text-gray-700 font-bold flex items-center gap-1.5 rounded-lg px-3">
-                      <EditIcon size={16} /> التكوين
-                    </button>
-                    
-                    {/* 🚀 الحقل المحصن لرفع المرفقات */}
-                    <label className="btn btn-sm btn-outline border-gray-200 hover:bg-white text-gray-700 font-bold cursor-pointer m-0 flex items-center gap-1.5 rounded-lg px-3">
-                      <input 
-                        type="file" 
-                        className="hidden" 
-                        accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png" 
-                        onChange={(e) => { 
-                          const file = e.target.files?.[0]; 
-                          if (file) {
-                            handleAttachmentUpload(lecture.id, file);
-                            e.target.value = ''; // 🚀 تفريغ الحقل للسماح برفع نفس الملف لاحقاً إذا فشل
-                          } 
-                        }} 
-                      />
-                      <UploadIcon size={16} /> رفع ملزمة/مرفق
-                    </label>
-
-                    <button onClick={() => handleDelete(lecture.id)} className="btn btn-sm btn-outline border-red-100 text-error hover:bg-red-50 hover:border-red-200 font-bold flex items-center gap-1.5 mr-auto md:ml-auto md:mr-0 rounded-lg px-3 transition-colors">
-                      <TrashIcon size={16} /> إزالة الدرس
-                    </button>
+                  )}
+                  
+                  <button onClick={() => handleEditLecture(lecture)} className="btn btn-sm btn-outline flex items-center gap-1"><EditIcon size={14} /> تعديل</button>
+                  
+                  <label className="btn btn-sm btn-outline flex items-center gap-1" style={{ cursor: 'pointer', margin: 0 }}>
+                    <input type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleAttachmentUpload(lecture.id, file); }} />
+                    <UploadIcon size={14} /> إرفاق ملف
+                  </label>
+
+                  <button onClick={() => handleDelete(lecture.id)} className="btn btn-sm btn-outline flex items-center gap-1" style={{ borderColor: 'var(--error)', color: 'var(--error)' }}><TrashIcon size={14} /> حذف</button>
+                </div>
+
+                {lecture.attachments && lecture.attachments.length > 0 && (
+                  <div className="attachments-list mt-3" style={{ background: 'var(--background)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
+                    <h5 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 'bold' }} className="flex items-center gap-1"><FileTextIcon size={14} /> المرفقات:</h5>
+                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
+                      {lecture.attachments.map(att => (
+                        <div key={att.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface)', padding: '0.5rem', borderRadius: '6px' }}>
+                          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{att.file_name}</span>
+                          <button onClick={() => handleDeleteAttachment(lecture.id, att.id)} className="btn btn-sm flex items-center gap-1" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444', backgroundColor: 'transparent', border: '1px solid #ef4444', cursor: 'pointer' }}><TrashIcon size={12} /> حذف</button>
+                        </div>
+                      ))}
+                    </div>
                   </div>
-
-                  {/* قائمة المرفقات */}
-                  {lecture.attachments && lecture.attachments.length > 0 && (
-                    <div className="mt-5 bg-gray-50/50 p-5 rounded-xl border border-dashed border-gray-200">
-                      <h5 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2 border-b border-gray-200/50 pb-3">
-                        <FileTextIcon size={18} className="text-primary" /> ملازم وملفات مساعدة تابعة للدرس:
-                      </h5>
-                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
-                        {lecture.attachments.map(att => (
-                          <div key={att.id} className="flex justify-between items-center bg-white border border-gray-200 p-3 rounded-xl shadow-sm group hover:border-primary/40 transition-colors">
-                            <span className="text-xs font-bold text-gray-800 truncate pl-2" title={att.fileName}>{att.fileName}</span>
-                            <button onClick={() => handleDeleteAttachment(lecture.id, att.id)} className="text-gray-400 hover:text-white bg-gray-50 hover:bg-red-500 w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0" title="حذف الملف">
-                              <TrashIcon size={14} />
-                            </button>
-                          </div>
-                        ))}
-                      </div>
-                    </div>
-                  )}
-
-                </div>
-              );
-            })}
-          </div>
-        )}
+                )}
+
+              </div>
+            );
+          })}
+        </div>
       </main>
-
-      <style jsx>{`
-        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
-        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
-        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
-        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
-      `}</style>
     </div>
   );
 }```

### `app\admin\forum\page.tsx`
```diff
--- Current: app\admin\forum\page.tsx
+++ Other: app\admin\forum\page.tsx
@@ -1,11 +1,17 @@
 'use client';
 
-import { useEffect, useState, useRef, useCallback } from 'react';
+import { useEffect, useState, useRef } from 'react';
 import { useRouter } from 'next/navigation';
 import AdminSidebar from '../../components/AdminSidebar';
-import { useAuthGuard } from '../../hooks/useAuthGuard'; // 🚀 الدرع المركزي
-import api from '@/lib/axios'; // 🚀 العميل المركزي المحمي
-import { CheckCircleIcon, AlertCircleIcon } from '../../components/Icons';
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+
+const getToken = () => {
+  return document.cookie
+    .split('; ')
+    .find(row => row.startsWith('token='))
+    ?.split('=')[1] || localStorage.getItem('token');
+};
 
 interface ForumPost {
   id: number;
@@ -23,9 +29,6 @@
 export default function AdminForumPage() {
   const router = useRouter();
   
-  // 🚀 درع الحماية الذكي: يمنع دخول غير الإدارة ويعرض شاشة تحميل
-  const { isChecking } = useAuthGuard(['admin']);
-  
   const [posts, setPosts] = useState<ForumPost[]>([]);
   const [loading, setLoading] = useState(true);
   const [currentPage, setCurrentPage] = useState(1);
@@ -36,61 +39,24 @@
   const [replyText, setReplyText] = useState('');
   const [actionLoading, setActionLoading] = useState<number | null>(null);
 
-  // إعدادات الميديا (الصوت والصور)
+  // Media State
   const [isRecording, setIsRecording] = useState(false);
   const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
   const [recordingTime, setRecordingTime] = useState(0);
   const [replyImage, setReplyImage] = useState<File | null>(null);
-  
-  // روابط المعاينة الآمنة (لمنع تسريب الذاكرة)
-  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
-  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
-
   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
   const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
 
-  // 🚀 نظام التنبيهات الموحد الأنيق
+  // 🚀 نظام الإشعارات البديل لـ alert
   const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
-  
-  const showToast = useCallback((message: string, type: 'success' | 'error') => {
+  const showToast = (message: string, type: 'success' | 'error') => {
     setToast({ visible: true, message, type });
-    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
-  }, []);
-
+    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
+  };
+
+  // 🚀 نظام مودال الحذف البديل لـ confirm
   const [confirmModal, setConfirmModal] = useState<{ id: number; type: 'post' | 'reply' } | null>(null);
 
-  // 🚀 1. حماية الذاكرة: إنشاء ومسح الروابط المؤقتة للصوت والصورة
-  useEffect(() => {
-    if (audioBlob) {
-      const url = URL.createObjectURL(audioBlob);
-      setAudioPreviewUrl(url);
-      return () => URL.revokeObjectURL(url); // Cleanup
-    } else {
-      setAudioPreviewUrl(null);
-    }
-  }, [audioBlob]);
-
-  useEffect(() => {
-    if (replyImage) {
-      const url = URL.createObjectURL(replyImage);
-      setImagePreviewUrl(url);
-      return () => URL.revokeObjectURL(url); // Cleanup
-    } else {
-      setImagePreviewUrl(null);
-    }
-  }, [replyImage]);
-
-  // 🚀 2. حماية الذاكرة: إيقاف العداد الزمني والمايكروفون عند مغادرة الصفحة
-  useEffect(() => {
-    return () => {
-      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
-      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
-        mediaRecorderRef.current.stop();
-      }
-    };
-  }, []);
-
-  // دوال تسجيل الصوت
   const startRecording = async () => {
     try {
       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
@@ -100,9 +66,7 @@
 
       mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
       mediaRecorder.onstop = () => {
-        // 🚀 التوافقية: السماح للمتصفح باختيار الصيغة المدعومة (مثال: mp4 للسفاري، webm للكروم)
-        const mimeType = mediaRecorder.mimeType || 'audio/webm';
-        const blob = new Blob(chunks, { type: mimeType });
+        const blob = new Blob(chunks, { type: 'audio/webm' });
         setAudioBlob(blob);
         stream.getTracks().forEach((track) => track.stop());
       };
@@ -112,7 +76,7 @@
       setRecordingTime(0);
       timerIntervalRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
     } catch (e) {
-      showToast('لم نتمكن من الوصول للمايكروفون، تأكد من إعطاء الصلاحيات للمتصفح.', 'error');
+      showToast('لم نتمكن من الوصول للمايكروفون', 'error');
     }
   };
 
@@ -131,87 +95,102 @@
     if (isRecording) stopRecording();
   };
 
-  // 🚀 جلب البيانات فقط بعد التأكد من الصلاحيات
   useEffect(() => {
-    if (!isChecking) {
-      fetchPosts(currentPage);
-    }
-  }, [currentPage, isChecking]);
-
-  // إغلاق التمرير عند فتح نافذة الحذف
-  useEffect(() => {
-    if (confirmModal) document.body.style.overflow = 'hidden';
-    else document.body.style.overflow = '';
-    return () => { document.body.style.overflow = ''; };
-  }, [confirmModal]);
+    fetchPosts(currentPage);
+  // eslint-disable-next-line react-hooks/exhaustive-deps
+  }, [currentPage]);
 
   const fetchPosts = async (page = 1) => {
     setLoading(true);
     try {
-      // 🚀 الاستعلام عبر العميل المركزي
-      const response = await api.get('/admin/forum', { params: { page } });
-      const data = response.data;
+      const token = getToken();
+      if (!token) { router.push('/login'); return; }
+
+      // 🚀 تم تصحيح الرابط ليتطابق مع الكنترولر الخاص بك
+      const res = await fetch(`${API_URL}/api/admin/forum?page=${page}`, {
+        headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/json' },
+      });
       
-      setPosts(data?.posts || data?.data?.posts || data?.data || []);
-      setTotalPages(data?.pagination?.lastPage || data?.meta?.last_page || 1);
-    } catch (e: any) {
-      showToast(e?.message || 'فشل تحميل المنشورات', 'error');
+      if (res.ok) {
+        const result = await res.json();
+        setPosts(result.data?.posts || []);
+        if (result.data?.pagination) {
+          setTotalPages(result.data.pagination.lastPage);
+        }
+      } else {
+        showToast('فشل تحميل المنشورات', 'error');
+      }
+    } catch (e) {
+      showToast('خطأ في الاتصال بالخادم', 'error');
     } finally {
       setLoading(false);
     }
   };
 
-  // 🚀 دالة مركزية للتعامل مع الردود بذكاء
   const handleAction = async (postId: number, method: 'POST' | 'PUT' | 'DELETE', successMsg: string) => {
     setActionLoading(postId);
     try {
-      if (method === 'DELETE') {
-        // حذف الرد
-        await api.delete(`/admin/forum/${postId}/reply`);
-        showToast(successMsg, 'success');
-        fetchPosts(currentPage);
-      } else {
-        // إضافة أو تعديل الرد باستخدام FormData
+      const token = getToken();
+      
+      let bodyData: FormData | string | null = null;
+      let headersData: any = {
+        Authorization: `Bearer ${token}`,
+        'Accept': 'application/json'
+      };
+
+      if (method !== 'DELETE') {
         const formData = new FormData();
         if (replyText) formData.append('reply', replyText);
-        
-        if (audioBlob) {
-          const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
-          formData.append('audio', audioBlob, `voice_note.${ext}`);
-        }
-        
+        if (audioBlob) formData.append('audio', audioBlob, 'voice_note.webm');
         if (replyImage) formData.append('image', replyImage);
         
-        // Laravel يتطلب إرسال الـ PUT كـ POST مع إرفاق _method
         if (method === 'PUT') {
           formData.append('_method', 'PUT');
         }
-
-        const response = await api.post(`/admin/forum/${postId}/reply`, formData);
-        
+        bodyData = formData;
+      } else {
+        headersData['Content-Type'] = 'application/json';
+      }
+
+      const fetchMethod = method === 'PUT' ? 'POST' : method;
+
+      const res = await fetch(`${API_URL}/api/admin/forum/${postId}/reply`, {
+        method: fetchMethod,
+        headers: headersData,
+        body: bodyData,
+      });
+
+      if (res.ok) {
         showToast(successMsg, 'success');
-        const updatedPost = response.data?.post || response.data;
-
-        // تحديث الـ UI محلياً بسرعة
-        setPosts(prev => prev.map(p => {
-          if (p.id === postId) {
-            return {
-              ...p,
-              adminReply: updatedPost?.adminReply || updatedPost?.admin_reply || replyText,
-              adminReplyAudio: updatedPost?.adminReplyAudio || updatedPost?.admin_reply_audio,
-              adminReplyImage: updatedPost?.adminReplyImage || updatedPost?.admin_reply_image,
-              repliedAt: updatedPost?.repliedAt || updatedPost?.replied_at || new Date().toISOString(),
-            };
-          }
-          return p;
-        }));
+        setReplyingTo(null);
+        setEditingReply(null);
+        resetMediaState();
+
+        if (method === 'DELETE') {
+          fetchPosts(currentPage);
+        } else {
+          const data = await res.json();
+          const updatedPost = data.data;
+
+          setPosts(prev => prev.map(p => {
+            if (p.id === postId) {
+              return {
+                ...p,
+                adminReply: updatedPost.adminReply,
+                adminReplyAudio: updatedPost.adminReplyAudio,
+                adminReplyImage: updatedPost.adminReplyImage,
+                repliedAt: updatedPost.repliedAt,
+              };
+            }
+            return p;
+          }));
+        }
+      } else {
+        const error = await res.json();
+        showToast(error.message || 'فشلت العملية', 'error');
       }
-
-      setReplyingTo(null);
-      setEditingReply(null);
-      resetMediaState();
-    } catch (e: any) {
-      showToast(e?.message || e?.error || 'فشلت العملية', 'error');
+    } catch (e) {
+      showToast('حدث خطأ أثناء الاتصال', 'error');
     } finally {
       setActionLoading(null);
       setConfirmModal(null);
@@ -226,79 +205,58 @@
       return;
     }
 
+    // إذا كان الحذف لمنشور كامل
     setActionLoading(confirmModal.id);
     try {
-      // 🚀 حذف المنشور بالكامل
-      await api.delete(`/admin/forum/${confirmModal.id}`);
-      showToast('تم حذف المنشور بالكامل بنجاح', 'success');
-      
-      // التعامل الذكي مع التصفح
-      if (posts.length === 1 && currentPage > 1) {
-          setCurrentPage(currentPage - 1);
+      const token = getToken();
+      const res = await fetch(`${API_URL}/api/admin/forum/${confirmModal.id}`, {
+        method: 'DELETE',
+        headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/json' },
+      });
+      if (res.ok) {
+        showToast('تم حذف المنشور بنجاح', 'success');
+        if (posts.length === 1 && currentPage > 1) {
+            setCurrentPage(currentPage - 1);
+        } else {
+            fetchPosts(currentPage);
+        }
       } else {
-          fetchPosts(currentPage);
+        showToast('فشل الحذف', 'error');
       }
-    } catch (e: any) {
-      showToast(e?.message || 'خطأ أثناء الحذف', 'error');
+    } catch (e) {
+      showToast('خطأ أثناء الحذف', 'error');
     } finally {
       setActionLoading(null);
       setConfirmModal(null);
     }
   };
-
-  // 🚀 دالة معالجة مسارات الميديا بذكاء
-  const getMediaUrl = (path: string) => {
-    if (!path) return '';
-    if (path.startsWith('http')) return path;
-    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';
-    return `${baseUrl}/storage/${path}`;
-  };
-
-  if (isChecking) {
-    return (
-      <div className="admin-layout">
-        <AdminSidebar />
-        <main className="admin-content flex items-center justify-center min-h-[60vh]">
-          <div className="spinner spinner-lg" />
-        </main>
-      </div>
-    );
-  }
 
   return (
     <div className="admin-layout relative">
       <AdminSidebar />
       
-      {/* 🚀 نظام التنبيهات الموحد الأنيق */}
-      <div 
-        className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300" 
-        style={{ 
-          opacity: toast.visible ? 1 : 0, 
-          transform: toast.visible ? 'translate(-50%, 0)' : 'translate(-50%, -20px)', 
-          pointerEvents: toast.visible ? 'auto' : 'none' 
-        }}
-      >
-        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl text-sm font-bold ${toast.type === 'success' ? 'bg-green-600 text-white shadow-green-600/30' : 'bg-red-600 text-white shadow-red-600/30'}`}>
-          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
-          <span>{toast.message}</span>
+      {/* Toast Notification */}
+      <div style={{ position: 'fixed', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, transition: 'all 0.3s ease', opacity: toast.visible ? 1 : 0, pointerEvents: toast.visible ? 'auto' : 'none' }}>
+        <div style={{ padding: '0.75rem 2rem', borderRadius: '50px', fontWeight: 'bold', color: '#fff', backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
+          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
         </div>
       </div>
 
       {/* Confirmation Modal */}
       {confirmModal && (
-        <div className="fixed inset-0 flex items-center justify-center z-[100] animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setConfirmModal(null)}>
-          <div className="card max-w-sm w-full mx-4 transform transition-all animate-scale-up" onClick={e => e.stopPropagation()}>
+        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setConfirmModal(null)}>
+          <div className="card max-w-sm w-full mx-4 transform transition-all" onClick={e => e.stopPropagation()}>
             <div className="text-center mb-6">
               <span className="text-5xl block mb-2">⚠️</span>
               <h3 className="text-xl font-bold text-gray-900">تأكيد الحذف</h3>
-              <p className="text-muted text-sm mt-2 font-medium">
+              <p className="text-muted text-sm mt-2">
                 هل أنت متأكد من رغبتك في حذف هذا {confirmModal.type === 'post' ? 'المنشور بالكامل' : 'الرد'}؟ <br/> لا يمكن التراجع عن هذا الإجراء.
               </p>
             </div>
             <div className="flex gap-3">
-              <button onClick={() => setConfirmModal(null)} disabled={actionLoading !== null} className="btn btn-outline flex-1 font-bold">إلغاء</button>
-              <button onClick={executeDelete} disabled={actionLoading !== null} className="btn btn-danger flex-1 font-bold shadow-lg shadow-red-200 text-white">
-                {actionLoading === confirmModal.id ? <span className="spinner spinner-light w-5 h-5 border-2 mx-auto" /> : 'نعم، احذف'}
+              <button onClick={() => setConfirmModal(null)} disabled={actionLoading !== null} className="btn btn-outline flex-1">إلغاء</button>
+              <button onClick={executeDelete} disabled={actionLoading !== null} className="btn btn-danger flex-1">
+                {actionLoading === confirmModal.id ? 'جاري الحذف...' : 'نعم، احذف'}
               </button>
             </div>
           </div>
@@ -308,178 +266,171 @@
       <main className="admin-content">
         <div className="page-header mb-8">
           <div>
-            <h1 className="page-title flex items-center gap-2">
-              <span className="text-2xl">📡</span>
-              منتدى الاستفسارات
-            </h1>
-            <p className="page-subtitle">أجب على أسئلة الطلاب وتابع مشاكلهم بالصوت والصورة</p>
+            <h1 className="text-2xl font-bold text-primary mb-2">📡 منتدى الاستفسارات</h1>
+            <p className="text-muted">أجب على أسئلة الطلاب وتابع مشاكلهم</p>
           </div>
         </div>
 
         {loading ? (
-          <div className="flex justify-center p-12"><div className="spinner spinner-dark spinner-lg" /></div>
+          <div className="flex justify-center p-12"><div className="spinner spinner-dark" /></div>
         ) : posts.length === 0 ? (
-          <div className="card text-center p-12 border-dashed border-2 border-gray-200 bg-gray-50 rounded-2xl">
+          <div className="card text-center p-12 border-dashed border-2">
             <span className="text-6xl block mb-4 opacity-50">📭</span>
             <h3 className="text-xl font-bold text-gray-700">لا توجد استفسارات حالياً</h3>
-            <p className="text-muted mt-2 font-medium">عندما يقوم الطلاب بنشر أسئلتهم، ستظهر هنا.</p>
+            <p className="text-muted mt-2">عندما يقوم الطلاب بنشر أسئلتهم، ستظهر هنا.</p>
           </div>
         ) : (
           <div className="flex flex-col gap-6">
             {posts.map((post) => (
-              <div key={post.id} className="card shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl" style={{ borderInlineStart: `6px solid ${post.adminReply || post.adminReplyAudio ? '#10b981' : '#f59e0b'}` }}>
+              <div key={post.id} className="card shadow-sm hover:shadow-md transition-shadow" style={{ borderInlineStart: `6px solid ${post.adminReply ? '#10b981' : '#f59e0b'}` }}>
                 
                 {/* رأس المنشور */}
                 <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
                   <div className="flex items-center gap-3">
-                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-inner shrink-0" style={{ background: 'var(--gradient-primary)' }}>
+                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-inner" style={{ background: 'var(--gradient-primary)' }}>
                       {post.studentName.charAt(0)}
                     </div>
                     <div>
                       <h4 className="font-bold text-lg text-gray-900">{post.studentName}</h4>
-                      <p className="text-xs text-muted font-medium bg-gray-100 inline-block px-2 py-1 rounded-md mt-1 font-mono">
-                        كود: {post.studentNumber} • {new Date(post.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
+                      <p className="text-xs text-muted font-medium bg-gray-100 inline-block px-2 py-1 rounded-md mt-1">
+                        كود: {post.studentNumber} • {new Date(post.createdAt).toLocaleDateString('ar-EG', { month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                       </p>
                     </div>
                   </div>
                   
-                  <div className="flex gap-2 shrink-0">
+                  <div className="flex gap-2">
                     {!post.adminReply && !post.adminReplyAudio && !post.adminReplyImage ? (
-                      <button onClick={() => { setReplyingTo(post.id); setEditingReply(null); resetMediaState(); }} className="btn btn-sm btn-primary font-bold rounded-lg px-4 shadow-sm shadow-blue-100">
+                      <button onClick={() => { setReplyingTo(post.id); setEditingReply(null); resetMediaState(); }} className="btn btn-sm btn-primary">
                         ✏️ أضف رداً
                       </button>
                     ) : (
-                      <button onClick={() => { setEditingReply(post.id); setReplyingTo(null); resetMediaState(); setReplyText(post.adminReply || ''); }} className="btn btn-sm btn-outline font-bold rounded-lg px-4 border-gray-200">
+                      <button onClick={() => { setEditingReply(post.id); setReplyingTo(null); resetMediaState(); setReplyText(post.adminReply || ''); }} className="btn btn-sm btn-outline">
                         🔄 تعديل الرد
                       </button>
                     )}
-                    <button onClick={() => setConfirmModal({ id: post.id, type: 'post' })} className="btn btn-sm btn-danger text-lg px-3 hover:scale-105 transition-transform rounded-lg" title="حذف المنشور">
+                    <button onClick={() => setConfirmModal({ id: post.id, type: 'post' })} className="btn btn-sm btn-danger text-lg px-3" title="حذف المنشور">
                       🗑️
                     </button>
                   </div>
                 </div>
 
                 {/* محتوى المنشور */}
-                <div className="bg-gray-50 rounded-xl p-5 mb-4 border border-gray-100">
-                  <p className="leading-relaxed whitespace-pre-wrap text-gray-800 font-medium text-sm md:text-base">{post.body}</p>
+                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
+                  <p className="leading-relaxed whitespace-pre-wrap text-gray-800">{post.body}</p>
                 </div>
                 
-                {/* الصورة المرفقة من الطالب */}
+                {/* الصورة المرفقة */}
                 {post.image && (
                   <div className="mb-4">
-                    <a href={getMediaUrl(post.image)} target="_blank" rel="noopener noreferrer">
+                    <a href={post.image.startsWith('http') ? post.image : `${API_URL}/storage/${post.image}`} target="_blank" rel="noopener noreferrer">
                       <img 
-                        src={getMediaUrl(post.image)} 
+                        src={post.image.startsWith('http') ? post.image : `${API_URL}/storage/${post.image}`} 
                         alt="مرفق الطالب" 
-                        className="rounded-xl max-h-64 object-cover border border-gray-200 shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
+                        className="rounded-lg max-h-64 object-cover border shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
                       />
                     </a>
                   </div>
                 )}
 
-                {/* رد الإدارة المكتمل */}
+                {/* رد الإدارة */}
                 {(post.adminReply || post.adminReplyAudio || post.adminReplyImage) && editingReply !== post.id && (
-                  <div className="p-5 rounded-xl bg-green-50 border border-green-200 relative overflow-hidden mt-6">
-                    <div className="absolute top-0 right-0 w-1.5 h-full bg-success"></div>
-                    <div className="flex items-center gap-2 mb-4">
+                  <div className="p-4 rounded-lg bg-green-50 border border-green-200 relative overflow-hidden">
+                    <div className="absolute top-0 right-0 w-2 h-full bg-success"></div>
+                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">👨‍🏫</span>
-                       <p className="text-sm font-black text-success">رد الإدارة:</p>
-                    </div>
-                    
-                    {post.adminReply && <p className="text-gray-800 whitespace-pre-wrap pl-4 mb-4 font-bold text-sm leading-relaxed">{post.adminReply}</p>}
-                    
+                       <p className="text-sm font-bold text-success">رد الإدارة:</p>
+                    </div>
+                    {post.adminReply && <p className="text-gray-800 whitespace-pre-wrap pl-4 mb-3">{post.adminReply}</p>}
                     {post.adminReplyAudio && (
-                      <div className="mb-4 pl-4">
-                        <audio controls src={getMediaUrl(post.adminReplyAudio)} className="w-full max-w-md outline-none rounded-full shadow-sm" />
+                      <div className="mb-3 pl-4">
+                        <audio controls src={`${API_URL}/storage/${post.adminReplyAudio}`} className="w-full max-w-md" />
                       </div>
                     )}
-                    
                     {post.adminReplyImage && (
-                      <div className="mb-4 pl-4">
-                        <a href={getMediaUrl(post.adminReplyImage)} target="_blank" rel="noopener noreferrer">
-                          <img src={getMediaUrl(post.adminReplyImage)} alt="مرفق الإدارة" className="rounded-xl max-h-48 object-cover border border-gray-200 shadow-sm hover:opacity-90 transition-opacity cursor-pointer" />
+                      <div className="mb-3 pl-4">
+                        <a href={`${API_URL}/storage/${post.adminReplyImage}`} target="_blank" rel="noopener noreferrer">
+                          <img src={`${API_URL}/storage/${post.adminReplyImage}`} alt="مرفق الإدارة" className="rounded-lg max-h-48 object-cover border shadow-sm hover:opacity-90 transition-opacity cursor-pointer" />
                         </a>
                       </div>
                     )}
                     
-                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-green-200/50">
-                       <span className="text-xs text-green-700 font-bold bg-green-100/50 px-2 py-1 rounded">
-                         {post.repliedAt ? `تم الرد في: ${new Date(post.repliedAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'})}` : ''}
+                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-green-100">
+                       <span className="text-xs text-green-600/70 font-medium">
+                         {post.repliedAt ? `تم الرد في: ${new Date(post.repliedAt).toLocaleDateString('ar-EG', { hour: 'numeric', minute: 'numeric'})}` : ''}
                        </span>
-                       <button onClick={() => setConfirmModal({ id: post.id, type: 'reply' })} className="text-error text-xs font-bold hover:underline bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">
+                       <button onClick={() => setConfirmModal({ id: post.id, type: 'reply' })} className="text-error text-xs font-bold hover:underline bg-red-50 px-2 py-1 rounded">
                          حذف الرد 🗑️
                        </button>
                     </div>
                   </div>
                 )}
 
-                {/* حقل إدخال الرد (وضع التعديل أو الإضافة) */}
+                {/* حقل إدخال الرد */}
                 {(replyingTo === post.id || editingReply === post.id) && (
-                  <div className="mt-6 p-6 border border-gray-200 rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-fade-in relative">
-                    <label className="block text-sm font-black text-primary mb-3">
-                      {editingReply === post.id ? 'تعديل الرد الحالي:' : 'كتابة رد جديد:'}
+                  <div className="mt-4 p-4 border rounded-lg bg-white shadow-inner animate-fade-in">
+                    <label className="block text-sm font-bold text-primary mb-2">
+                      {editingReply === post.id ? 'تعديل الرد:' : 'إضافة رد جديد:'}
                     </label>
-                    
                     <textarea
                       value={replyText}
                       onChange={(e) => setReplyText(e.target.value)}
-                      placeholder="اكتب ردك الواضح هنا... (يمكنك أيضاً إرفاق صورة أو تسجيل صوتي)"
-                      className="input-field mb-5 w-full bg-gray-50 focus:bg-white resize-y min-h-[120px] rounded-xl border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all p-4 text-sm"
+                      placeholder="اكتب ردك الواضح هنا..."
+                      className="input-field mb-3 w-full bg-gray-50 focus:bg-white"
+                      rows={3}
                     />
 
-                    {/* عرض الميديا قبل الرفع باستخدام الروابط الآمنة */}
-                    <div className="flex flex-wrap gap-4 mb-5">
-                      {audioPreviewUrl && (
-                        <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-xl border border-gray-200 shadow-sm animate-scale-up">
-                          <audio controls src={audioPreviewUrl} className="h-10 w-56 outline-none" />
-                          <button onClick={() => setAudioBlob(null)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors bg-white shadow-sm" title="حذف المقطع">
+                    {/* Media Previews */}
+                    <div className="flex flex-wrap gap-4 mb-3">
+                      {audioBlob && (
+                        <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg">
+                          <audio controls src={URL.createObjectURL(audioBlob)} className="h-8 w-48" />
+                          <button onClick={() => setAudioBlob(null)} className="text-red-500 hover:text-red-700 p-1">
                             🗑️
                           </button>
                         </div>
                       )}
-                      {imagePreviewUrl && (
-                        <div className="flex items-start gap-2 bg-gray-100 p-2 rounded-xl relative group border border-gray-200 shadow-sm animate-scale-up">
-                          <img src={imagePreviewUrl} alt="Preview" className="h-20 w-20 object-cover rounded-lg" />
-                          <button onClick={() => setReplyImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
-                            ✕
+                      {replyImage && (
+                        <div className="flex items-start gap-2 bg-gray-100 p-2 rounded-lg relative group">
+                          <img src={URL.createObjectURL(replyImage)} alt="Preview" className="h-16 w-16 object-cover rounded" />
+                          <button onClick={() => setReplyImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
+                            ❌
                           </button>
                         </div>
                       )}
                     </div>
 
-                    {/* أدوات التحكم (تسجيل، صورة، حفظ) */}
-                    <div className="flex justify-between items-center flex-wrap gap-4 pt-4 border-t border-gray-100">
+                    <div className="flex justify-between items-center flex-wrap gap-3">
                       <div className="flex items-center gap-3">
                         {isRecording ? (
-                          <div className="flex items-center gap-3 text-red-600 font-bold bg-red-50 px-4 py-2 rounded-xl border border-red-100">
-                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
-                            <span className="font-mono text-lg">{Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
-                            <button onClick={stopRecording} className="mr-3 text-sm bg-red-600 text-white px-4 py-1.5 rounded-lg shadow-md shadow-red-200 hover:bg-red-700 transition-colors">
-                              إيقاف وحفظ
+                          <div className="flex items-center gap-2 text-red-500 font-bold bg-red-50 px-3 py-1.5 rounded-full">
+                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
+                            {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')}
+                            <button onClick={stopRecording} className="mr-2 text-sm bg-red-500 text-white px-2 py-0.5 rounded shadow-sm hover:bg-red-600">
+                              إيقاف
                             </button>
                           </div>
                         ) : (
-                          <button onClick={startRecording} className="flex items-center gap-2 text-gray-600 hover:text-primary bg-gray-50 hover:bg-blue-50 px-4 py-2.5 rounded-xl transition-colors font-bold text-sm border border-gray-200 hover:border-blue-200" title="تسجيل ملاحظة صوتية">
-                            🎤 تسجيل صوتي
+                          <button onClick={startRecording} className="text-gray-500 hover:text-primary transition-colors" title="تسجيل صوتي">
+                            🎤
                           </button>
                         )}
                         
-                        <label className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-primary bg-gray-50 hover:bg-blue-50 px-4 py-2.5 rounded-xl transition-colors font-bold text-sm border border-gray-200 hover:border-blue-200" title="إرفاق صورة مساعدة">
-                          📎 إرفاق صورة
+                        <label className="cursor-pointer text-gray-500 hover:text-primary transition-colors" title="إرفاق صورة">
+                          📎
                           <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && setReplyImage(e.target.files[0])} />
                         </label>
                       </div>
 
-                      <div className="flex gap-3 w-full md:w-auto">
-                        <button onClick={() => { setReplyingTo(null); setEditingReply(null); resetMediaState(); }} className="btn btn-outline flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold border-gray-200">
+                      <div className="flex gap-2">
+                        <button onClick={() => { setReplyingTo(null); setEditingReply(null); resetMediaState(); }} className="btn btn-outline text-sm">
                           إلغاء
                         </button>
                         <button
-                          onClick={() => editingReply === post.id ? handleAction(post.id, 'PUT', 'تم تحديث الرد بنجاح') : handleAction(post.id, 'POST', 'تم إرسال الرد بنجاح')}
+                          onClick={() => editingReply === post.id ? handleAction(post.id, 'PUT', 'تم تحديث الرد') : handleAction(post.id, 'POST', 'تم إرسال الرد')}
                           disabled={actionLoading === post.id || (!replyText.trim() && !audioBlob && !replyImage)}
-                          className="btn btn-primary flex-1 md:flex-none px-8 py-2.5 rounded-xl text-sm shadow-lg shadow-blue-200 font-bold"
+                          className="btn btn-primary text-sm shadow-md"
                         >
-                          {actionLoading === post.id ? <span className="spinner spinner-light w-5 h-5 border-2 mx-auto" /> : '🚀 حفظ الرد'}
+                          {actionLoading === post.id ? 'جاري الحفظ...' : '🚀 حفظ الرد'}
                         </button>
                       </div>
                     </div>
@@ -488,16 +439,14 @@
               </div>
             ))}
             
-            {/* أزرار التنقل بين الصفحات */}
+            {/* Pagination */}
             {totalPages > 1 && (
-              <div className="flex justify-center items-center gap-4 mt-8 bg-white p-2 rounded-2xl shadow-sm border border-gray-200 inline-flex mx-auto">
-                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn btn-outline rounded-xl px-6 py-2 disabled:opacity-50 font-bold border-none hover:bg-gray-50">
+              <div className="flex justify-center items-center gap-4 mt-8 bg-white p-3 rounded-full shadow-sm border inline-flex mx-auto">
+                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn btn-outline btn-sm rounded-full px-4 disabled:opacity-50">
                   السابق
                 </button>
-                <span className="font-black text-primary px-4 bg-blue-50 py-2 rounded-xl text-sm">
-                  الصفحة {currentPage} من {totalPages}
-                </span>
-                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn btn-outline rounded-xl px-6 py-2 disabled:opacity-50 font-bold border-none hover:bg-gray-50">
+                <span className="font-bold text-primary px-2">الصفحة {currentPage} من {totalPages}</span>
+                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn btn-outline btn-sm rounded-full px-4 disabled:opacity-50">
                   التالي
                 </button>
               </div>
@@ -505,13 +454,6 @@
           </div>
         )}
       </main>
-
-      <style jsx>{`
-        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
-        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
-        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
-        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
-      `}</style>
     </div>
   );
 }```

### `app\admin\homework\page.tsx`
```diff
--- Current: app\admin\homework\page.tsx
+++ Other: app\admin\homework\page.tsx
@@ -1,13 +1,17 @@
 'use client';
 
-import { useEffect, useState, useCallback } from 'react';
+import { useEffect, useState } from 'react';
 import AdminSidebar from '../../components/AdminSidebar';
-import { useAuthGuard } from '../../hooks/useAuthGuard'; // 🚀 حارس البوابات المركزي
-import api from '@/lib/axios'; // 🚀 العميل الشبكي الذكي
 import {
-  FileTextIcon, CheckIcon, XIcon, BookIcon,
+  FileTextIcon, CheckIcon, XIcon, ClockIcon, BookIcon,
   UserIcon, CheckCircleIcon, AlertCircleIcon, ExternalLinkIcon
 } from '../../components/Icons';
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+
+const getToken = () => {
+  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
+};
 
 interface Submission {
   id: number;
@@ -35,82 +39,42 @@
 }
 
 export default function AdminHomeworkPage() {
-  // 🚀 درع الحماية: يطرد أي متطفل فوراً ويعرض شاشة التحميل
-  const { isChecking } = useAuthGuard(['admin']);
-
   const [submissions, setSubmissions] = useState<Submission[]>([]);
   const [loading, setLoading] = useState(true);
   const [page, setPage] = useState(1);
   const [totalPages, setTotalPages] = useState(1);
-  
   const [reviewingSubmission, setReviewingSubmission] = useState<Submission | null>(null);
   const [actionType, setActionType] = useState<'approved' | 'rejected' | null>(null);
   const [rejectionReason, setRejectionReason] = useState('');
   const [score, setScore] = useState('');
   const [submittingReview, setSubmittingReview] = useState(false);
 
-  // 🚀 نظام التنبيهات الموحد الأنيق
   const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
-  const showToast = useCallback((message: string, type: 'success' | 'error') => {
+  const showToast = (message: string, type: 'success' | 'error') => {
     setToast({ visible: true, message, type });
     setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
-  }, []);
-
-  // 🚀 تجميد التمرير (Scroll Lock) بشكل آمن
+  };
+
   useEffect(() => {
-    if (reviewingSubmission) document.body.style.overflow = 'hidden';
-    else document.body.style.overflow = '';
-    return () => { document.body.style.overflow = ''; };
-  }, [reviewingSubmission]);
-
-  useEffect(() => {
-    if (!isChecking) {
-      fetchSubmissions(page);
-    }
-  }, [page, isChecking]);
+    fetchSubmissions(page);
+  }, [page]);
 
   const fetchSubmissions = async (pageNumber = 1) => {
     setLoading(true);
+    const token = getToken();
     try {
-      const response = await api.get('/admin/homework/submissions', {
-        params: { page: pageNumber }
+      const res = await fetch(`${API_URL}/api/admin/homework/submissions?page=${pageNumber}`, {
+        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
       });
-      
-      const data = response.data;
-      const rawSubmissions = data?.data?.data || data?.data || data || [];
-      
-      // 🚀 توافقية آمنة (Sanitization) لاستخراج البيانات
-      const validSubmissions = Array.isArray(rawSubmissions) ? rawSubmissions : [];
-      
-      const mappedSubmissions: Submission[] = validSubmissions.map((sub: any) => ({
-        id: sub.id,
-        status: sub.status || 'pending',
-        filePath: sub.file_path || sub.filePath || '',
-        submittedAt: sub.submitted_at || sub.submittedAt || new Date().toISOString(),
-        student: {
-          id: sub.student?.id,
-          fullName: sub.student?.full_name || sub.student?.fullName || 'طالب غير محدد',
-          phone: sub.student?.phone || '—',
-          studentNumber: sub.student?.student_number || sub.student?.studentNumber || '—',
-        },
-        homework: {
-          id: sub.homework?.id,
-          title: sub.homework?.title || 'واجب غير محدد',
-        },
-        lecture: {
-          id: sub.lecture?.id,
-          title: sub.lecture?.title || 'محاضرة غير محددة',
-        },
-        course: {
-          id: sub.course?.id,
-          title: sub.course?.title || 'كورس غير محدد',
-        },
-      }));
-
-      setSubmissions(mappedSubmissions);
-      setTotalPages(data?.meta?.last_page || data?.meta?.lastPage || data?.data?.last_page || 1);
-    } catch (e: any) {
-      showToast(e?.message || 'فشل تحميل الواجبات المعلقة', 'error');
+      if (res.ok) {
+        const data = await res.json();
+        setSubmissions(data.data.data || []);
+        setTotalPages(data.data.meta?.lastPage || data.data.last_page || 1);
+      } else {
+        showToast('فشل تحميل الواجبات المعلقة', 'error');
+      }
+    } catch (e) {
+      showToast('خطأ في الاتصال بالخادم', 'error');
     } finally {
       setLoading(false);
     }
@@ -132,196 +96,165 @@
     e.preventDefault();
     if (!reviewingSubmission || !actionType) return;
 
-    // 🚀 تأمين المدخلات
-    if (actionType === 'rejected' && (!rejectionReason.trim() || rejectionReason.length < 5)) {
-      showToast('يرجى كتابة سبب رفض واضح (5 أحرف على الأقل)', 'error');
-      return;
-    }
-    
-    const parsedScore = parseInt(score);
-    if (actionType === 'approved' && (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100)) {
-      showToast('يرجى إدخال درجة صحيحة بين 0 و 100', 'error');
-      return;
-    }
-
     setSubmittingReview(true);
+    const token = getToken();
 
     try {
-      await api.post(`/admin/homework/submissions/${reviewingSubmission.id}/review`, {
-        status: actionType,
-        rejection_reason: actionType === 'rejected' ? rejectionReason.trim() : undefined,
-        score: actionType === 'approved' ? parsedScore : undefined,
+      const response = await fetch(`${API_URL}/api/admin/homework/submissions/${reviewingSubmission.id}/review`, {
+        method: 'POST',
+        headers: {
+          'Authorization': `Bearer ${token}`,
+          'Content-Type': 'application/json',
+          'Accept': 'application/json'
+        },
+        body: JSON.stringify({
+          status: actionType,
+          rejection_reason: actionType === 'rejected' ? rejectionReason : null,
+          score: actionType === 'approved' ? parseInt(score) : null,
+        }),
       });
 
-      showToast(actionType === 'approved' ? 'تم قبول الواجب ورصد الدرجة بنجاح!' : 'تم رفض الواجب وإبلاغ الطالب.', 'success');
-      handleCloseReview();
-      fetchSubmissions(page);
-    } catch (error: any) {
-      showToast(error?.message || error?.error || 'فشل إرسال التقييم للمحاولة', 'error');
+      if (response.ok) {
+        showToast('تم مراجعة الواجب بنجاح!', 'success');
+        handleCloseReview();
+        fetchSubmissions(page);
+      } else {
+        const data = await response.json();
+        showToast(data.message || 'فشل إرسال المراجعة', 'error');
+      }
+    } catch (error) {
+      showToast('خطأ في الاتصال بالخادم', 'error');
     } finally {
       setSubmittingReview(false);
     }
   };
 
-  // 🚀 دالة ذكية لمعالجة روابط الملفات
-  const getFileUrl = (path: string) => {
-    if (!path) return '#';
-    if (path.startsWith('http')) return path;
-    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';
-    return `${baseUrl}/storage/${path}`;
-  };
-
-  if (isChecking) {
-    return (
-      <div className="admin-layout relative">
-        <AdminSidebar />
-        <main className="admin-content flex items-center justify-center min-h-[60vh]">
-          <div className="loading-state text-center flex flex-col items-center">
-            <div className="spinner spinner-primary spinner-lg mb-4 mx-auto" />
-            <p className="font-bold text-muted text-lg">جاري تحميل سجل الواجبات...</p>
-          </div>
-        </main>
-      </div>
-    );
-  }
-
   return (
     <div className="admin-layout relative">
       <AdminSidebar />
 
-      {/* 🚀 نظام التنبيهات الموحد العائم */}
-      <div 
-        className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300" 
-        style={{ 
-          opacity: toast.visible ? 1 : 0, 
-          transform: toast.visible ? 'translate(-50%, 0)' : 'translate(-50%, -20px)', 
-          pointerEvents: toast.visible ? 'auto' : 'none' 
-        }}
-      >
-        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl text-sm font-bold ${toast.type === 'success' ? 'bg-green-600 text-white shadow-green-600/30' : 'bg-red-600 text-white shadow-red-600/30'}`}>
-          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
-          <span>{toast.message}</span>
+      <div className={`toast-container ${toast.visible ? 'show' : ''}`}>
+        <div className={`toast-content ${toast.type}`}>
+          {toast.type === 'success' ? <CheckCircleIcon size={18} /> : <AlertCircleIcon size={18} />}
+          {toast.message}
         </div>
       </div>
 
       <main className="admin-content">
-        <div className="page-header mb-8">
+        <div className="page-header">
           <div>
-            <h1 className="page-title text-3xl font-black text-gray-900 flex items-center gap-3">
-              <FileTextIcon size={32} className="text-primary" />
-              مراجعة الواجبات
-            </h1>
-            <p className="page-subtitle text-base mt-2">قم بتقييم وقبول أو رفض واجبات الطلاب المعلقة في مختلف الكورسات.</p>
+            <h1 className="page-title">مراجعة الواجبات</h1>
+            <p className="page-subtitle">قم بتقييم وقبول أو رفض واجبات الطلاب المعلقة</p>
           </div>
         </div>
 
         {loading ? (
-          <div className="card p-16 flex flex-col justify-center items-center shadow-sm border border-gray-100 rounded-2xl bg-white">
-            <div className="spinner spinner-primary spinner-lg mb-4" />
-            <p className="text-muted font-bold text-lg">جاري سحب طلبات الواجبات من السيرفر...</p>
+          <div className="loading-state">
+            <div className="spinner spinner-lg" />
+            <p className="mt-4 text-muted">جاري تحميل طلبات الواجبات...</p>
           </div>
         ) : submissions.length === 0 ? (
-          <div className="empty-state bg-white rounded-2xl py-20 shadow-sm text-center">
-            <div className="empty-state-icon bg-green-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner">
-              <CheckCircleIcon size={48} className="text-success" />
-            </div>
-            <h3 className="text-2xl font-black text-success mb-3">صندوق المراجعة فارغ!</h3>
-            <p className="text-gray-500 font-medium text-lg">تم تقييم جميع الواجبات المرفوعة بنجاح، لا يوجد أي تراكمات.</p>
+          <div className="empty-state">
+            <div className="empty-state-icon">
+              <FileTextIcon size={32} />
+            </div>
+            <h3>لا توجد واجبات معلقة للمراجعة</h3>
+            <p>تم تقييم جميع الواجبات المرفوعة بنجاح.</p>
           </div>
         ) : (
           <>
-            <div className="table-container border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
-              {/* 🚀 الحماية من التداخل في الشاشات الصغيرة */}
-              <div className="overflow-x-auto w-full">
-                <table className="table w-full m-0 min-w-[900px]">
-                  <thead className="bg-gray-50 border-b border-gray-200">
-                    <tr>
-                      <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">بيانات الطالب</th>
-                      <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">الكورس والمحاضرة</th>
-                      <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">اسم الواجب</th>
-                      <th className="font-bold text-gray-700 py-5 px-5 text-center whitespace-nowrap">تاريخ الرفع</th>
-                      <th className="font-bold text-gray-700 py-5 px-5 text-center whitespace-nowrap">الملف المرفق</th>
-                      <th className="font-bold text-gray-700 py-5 px-5 text-center whitespace-nowrap">إجراءات التقييم</th>
+            <div className="table-container">
+              <table className="table text-right">
+                <thead>
+                  <tr>
+                    <th>الطالب</th>
+                    <th>الكورس / المحاضرة</th>
+                    <th>اسم الواجب</th>
+                    <th>تاريخ الرفع</th>
+                    <th>ملف الواجب</th>
+                    <th className="text-center">التقييم</th>
+                  </tr>
+                </thead>
+                <tbody>
+                  {submissions.map((sub) => (
+                    <tr key={sub.id}>
+                      <td>
+                        <div className="flex items-center gap-2">
+                          <div className="student-avatar" style={{ backgroundColor: 'var(--primary)', width: 32, height: 32 }}>
+                            {sub.student.fullName.charAt(0)}
+                          </div>
+                          <div>
+                            <div className="font-semibold">{sub.student.fullName}</div>
+                            <div className="text-xs text-muted" dir="ltr">{sub.student.studentNumber || sub.student.phone}</div>
+                          </div>
+                        </div>
+                      </td>
+                      <td>
+                        <div>
+                          <div className="font-semibold text-primary">{sub.course.title}</div>
+                          <div className="text-xs text-muted">{sub.lecture.title}</div>
+                        </div>
+                      </td>
+                      <td>
+                        <span className="font-medium">{sub.homework.title}</span>
+                      </td>
+                      <td>
+                        <div className="text-xs" dir="ltr">
+                          {new Date(sub.filePath.includes('dummy') ? sub.submittedAt : sub.submittedAt).toLocaleString('ar-EG')}
+                        </div>
+                      </td>
+                      <td>
+                        <a
+                          href={sub.filePath}
+                          target="_blank"
+                          rel="noreferrer"
+                          className="btn btn-xs btn-outline font-bold flex items-center gap-1.5"
+                          style={{ width: 'fit-content' }}
+                        >
+                          <ExternalLinkIcon size={12} />
+                          عرض الملف
+                        </a>
+                      </td>
+                      <td className="text-center">
+                        <div className="flex justify-center gap-2">
+                          <button
+                            onClick={() => handleOpenReview(sub, 'approved')}
+                            className="btn btn-xs btn-success font-bold"
+                          >
+                            <CheckIcon size={12} />
+                            قبول
+                          </button>
+                          <button
+                            onClick={() => handleOpenReview(sub, 'rejected')}
+                            className="btn btn-xs btn-danger font-bold"
+                          >
+                            <XIcon size={12} />
+                            رفض
+                          </button>
+                        </div>
+                      </td>
                     </tr>
-                  </thead>
-                  <tbody className="divide-y divide-gray-100">
-                    {submissions.map((sub) => (
-                      <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
-                        <td className="py-4 px-5">
-                          <div className="flex items-center gap-3">
-                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 text-primary font-black text-lg flex items-center justify-center shadow-inner shrink-0">
-                              {sub.student.fullName.charAt(0)}
-                            </div>
-                            <div>
-                              <div className="font-black text-gray-900 text-sm">{sub.student.fullName}</div>
-                              <div className="text-xs text-gray-500 font-mono font-bold mt-1" dir="ltr">{sub.student.studentNumber !== '—' ? `#${sub.student.studentNumber}` : sub.student.phone}</div>
-                            </div>
-                          </div>
-                        </td>
-                        <td className="py-4 px-5">
-                          <div>
-                            <div className="font-bold text-primary flex items-center gap-1.5"><BookIcon size={16} className="text-gray-400"/> {sub.course.title}</div>
-                            <div className="text-[11px] font-bold text-gray-500 mt-1.5 bg-gray-50 px-2 py-1 rounded-md inline-block border border-gray-200">{sub.lecture.title}</div>
-                          </div>
-                        </td>
-                        <td className="py-4 px-5">
-                          <span className="font-black text-gray-800 text-sm bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 inline-block">{sub.homework.title}</span>
-                        </td>
-                        <td className="py-4 px-5 text-center align-middle">
-                          <div className="text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1.5 rounded-lg inline-block border border-gray-100 shadow-sm" dir="ltr">
-                            {/* 🚀 حماية ضد Null */}
-                            {new Date((sub.filePath || '').includes('dummy') ? new Date().toISOString() : sub.submittedAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
-                          </div>
-                        </td>
-                        <td className="py-4 px-5 text-center align-middle">
-                          <a
-                            href={getFileUrl(sub.filePath)}
-                            target="_blank"
-                            rel="noreferrer"
-                            className="btn btn-sm btn-outline font-bold flex items-center justify-center gap-2 mx-auto hover:bg-gray-50 shadow-sm rounded-xl py-2 px-4 border-gray-200"
-                          >
-                            <ExternalLinkIcon size={16} className="text-primary" /> فتح الملف
-                          </a>
-                        </td>
-                        <td className="py-4 px-5 text-center align-middle">
-                          <div className="flex justify-center gap-2">
-                            <button
-                              onClick={() => handleOpenReview(sub, 'approved')}
-                              className="btn btn-sm btn-success font-bold flex items-center gap-1.5 shadow-sm rounded-lg px-4"
-                            >
-                              <CheckIcon size={16} /> قبول
-                            </button>
-                            <button
-                              onClick={() => handleOpenReview(sub, 'rejected')}
-                              className="btn btn-sm btn-outline text-error border-error hover:bg-red-50 font-bold flex items-center gap-1.5 shadow-sm rounded-lg px-4"
-                            >
-                              <XIcon size={16} /> رفض
-                            </button>
-                          </div>
-                        </td>
-                      </tr>
-                    ))}
-                  </tbody>
-                </table>
-              </div>
+                  ))}
+                </tbody>
+              </table>
             </div>
 
             {totalPages > 1 && (
-              <div className="flex justify-center items-center gap-4 mt-8 bg-white p-3 rounded-full shadow-sm border border-gray-200 inline-flex mx-auto">
+              <div className="flex justify-center gap-2 mt-6">
                 <button
                   onClick={() => setPage(p => Math.max(1, p - 1))}
                   disabled={page === 1}
-                  className="btn btn-outline rounded-full px-6 py-2 disabled:opacity-50 font-bold hover:bg-gray-50 border-none transition-colors"
+                  className="btn btn-outline"
                 >
                   السابق
                 </button>
-                <span className="font-black text-primary px-4 bg-blue-50 py-2 rounded-xl text-sm">
-                  الصفحة {page} من {totalPages}
+                <span className="flex items-center px-4 font-bold">
+                  {page} من {totalPages}
                 </span>
                 <button
                   onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                   disabled={page === totalPages}
-                  className="btn btn-outline rounded-full px-6 py-2 disabled:opacity-50 font-bold hover:bg-gray-50 border-none transition-colors"
+                  className="btn btn-outline"
                 >
                   التالي
                 </button>
@@ -331,95 +264,72 @@
         )}
       </main>
 
-      {/* 🚀 نافذة التقييم والمراجعة الأنيقة والمحصنة */}
+      {/* Review Modal */}
       {reviewingSubmission && actionType && (
-        <div className="fixed inset-0 flex items-center justify-center z-[150] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={handleCloseReview}>
+        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
           <form
             onSubmit={handleSubmitReview}
-            className="card w-full max-w-md p-0 overflow-hidden shadow-2xl animate-scale-up border border-gray-100 bg-white rounded-2xl"
+            className="bg-[#1a1b26] w-full max-w-md flex flex-col shadow-2xl border border-white/10 rounded-2xl overflow-hidden"
             dir="rtl"
-            onClick={e => e.stopPropagation()}
           >
-            {/* Modal Header */}
-            <div className={`px-6 py-5 flex justify-between items-center border-b border-gray-100 ${actionType === 'approved' ? 'bg-green-50' : 'bg-red-50'}`}>
-              <h3 className={`text-xl font-black flex items-center gap-2 ${actionType === 'approved' ? 'text-green-800' : 'text-red-800'}`}>
+            <div className="bg-black/40 border-b border-white/10 px-6 py-4 flex justify-between items-center">
+              <h3 className="text-lg font-bold flex items-center gap-2">
                 {actionType === 'approved' ? (
-                  <><CheckCircleIcon size={24} className="text-success" /> اعتماد درجة الواجب</>
+                  <><CheckCircleIcon size={20} className="text-success" /> قبول وتقييم واجب الطالب</>
                 ) : (
-                  <><AlertCircleIcon size={24} className="text-error" /> رفض واجب الطالب</>
+                  <><AlertCircleIcon size={20} className="text-error" /> رفض واجب الطالب</>
                 )}
               </h3>
-              <button type="button" onClick={handleCloseReview} className="text-gray-400 hover:text-gray-700 bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-colors border border-gray-200">
-                <XIcon size={16} />
-              </button>
-            </div>
-
-            {/* Modal Body */}
-            <div className="p-6 space-y-6">
-              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 shadow-inner">
-                <div className="flex items-center gap-3 mb-4 border-b border-gray-200 pb-4">
-                  <div className="w-10 h-10 bg-blue-100 text-primary flex items-center justify-center rounded-full font-black"><UserIcon size={20} /></div>
-                  <div>
-                    <span className="text-xs text-gray-500 font-bold block">اسم الطالب</span>
-                    <span className="font-black text-gray-900 text-base">{reviewingSubmission.student.fullName}</span>
-                  </div>
-                </div>
-                <div>
-                  <span className="text-xs text-gray-500 font-bold block mb-2">الكورس والمحاضرة</span>
-                  <span className="font-black text-primary text-sm bg-white border border-blue-100 px-3 py-1.5 rounded-lg inline-block shadow-sm">{reviewingSubmission.course.title} &bull; {reviewingSubmission.lecture.title}</span>
-                </div>
+              <button type="button" onClick={handleCloseReview} className="text-muted hover:text-error text-2xl leading-none">&times;</button>
+            </div>
+
+            <div className="p-6 space-y-4">
+              <div className="bg-black/20 p-3 rounded-lg border border-white/5 space-y-1">
+                <div><span className="text-muted text-xs">اسم الطالب:</span> <span className="font-bold">{reviewingSubmission.student.fullName}</span></div>
+                <div><span className="text-muted text-xs">المحاضرة:</span> <span className="font-bold">{reviewingSubmission.lecture.title}</span></div>
               </div>
 
               {actionType === 'approved' ? (
-                <div className="form-group mb-0">
-                  <label className="form-label font-bold text-gray-800 text-base mb-3 block">الدرجة الممنوحة للطالب (من 100):</label>
+                <div className="form-group">
+                  <label className="form-label">الدرجة الممنوحة (من 100):</label>
                   <input
                     type="number"
                     min="0"
                     max="100"
                     value={score}
-                    onChange={e => setScore(e.target.value.replace(/[^0-9]/g, ''))} // 🚀 منع إدخال الرموز
-                    className="input-field w-full text-center text-3xl font-black text-success border-2 border-green-200 focus:border-green-500 py-4 bg-green-50/50 rounded-xl"
+                    onChange={e => setScore(e.target.value)}
+                    className="input-field w-full text-center text-xl font-bold"
                     required
                   />
                 </div>
               ) : (
-                <div className="form-group mb-0">
-                  <label className="form-label font-bold text-gray-800 text-base mb-3 block">سبب الرفض (يظهر للطالب ليقوم بتصحيحه):</label>
+                <div className="form-group">
+                  <label className="form-label">سبب الرفض (سيظهر للطالب):</label>
                   <textarea
                     value={rejectionReason}
                     onChange={e => setRejectionReason(e.target.value)}
-                    placeholder="مثال: الملف غير واضح، أرجو رفع ملف PDF بدلاً من الصور..."
-                    className="input-field w-full p-4 border-2 border-red-200 focus:border-red-500 bg-red-50/50 font-medium text-gray-900 rounded-xl"
+                    placeholder="اكتب سبب الرفض هنا بوضوح ليعرف الطالب ماذا يصحح..."
+                    className="input-field w-full p-3"
                     rows={4}
-                    style={{ resize: 'none' }}
                     required
                   />
                 </div>
               )}
             </div>
 
-            {/* Modal Footer */}
-            <div className="bg-gray-50 border-t border-gray-100 px-6 py-5 flex justify-end gap-3">
-              <button type="button" onClick={handleCloseReview} className="btn btn-outline flex-1 font-bold bg-white shadow-sm border-gray-300 rounded-xl">إلغاء المراجعة</button>
+            <div className="bg-black/40 border-t border-white/10 px-6 py-4 flex justify-end gap-3">
+              <button type="button" onClick={handleCloseReview} className="btn btn-outline">إلغاء</button>
               <button
                 type="submit"
                 disabled={submittingReview}
-                className={`btn flex-[2] font-bold shadow-lg rounded-xl ${actionType === 'approved' ? 'btn-success shadow-green-200' : 'btn-danger shadow-red-200 text-white'}`}
+                className={`btn ${actionType === 'approved' ? 'btn-success' : 'btn-danger'}`}
               >
-                {submittingReview ? <span className="spinner spinner-light w-5 h-5 border-2 mx-auto" /> : 'تأكيد وحفظ التقييم'}
+                {submittingReview ? 'جاري الحفظ...' : 'تأكيد وحفظ'}
               </button>
             </div>
           </form>
         </div>
       )}
-
-      <style jsx>{`
-        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
-        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
-        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
-        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
-      `}</style>
     </div>
   );
-}+}
```

### `app\admin\monitoring\page.tsx`
```diff
--- Current: app\admin\monitoring\page.tsx
+++ Other: app\admin\monitoring\page.tsx
@@ -2,13 +2,17 @@
 
 import { useEffect, useState, useCallback } from 'react';
 import { useRouter } from 'next/navigation';
-import AdminSidebar from '../../components/AdminSidebar';
-import { useAuthGuard } from '../../hooks/useAuthGuard'; // 🚀 الدرع المركزي
-import api from '@/lib/axios'; // 🚀 العميل الذكي
+import AdminSidebar from '@/app/components/AdminSidebar';
 import {
   BellIcon, SearchIcon, RefreshIcon, XIcon, CheckCircleIcon,
-  AlertTriangleIcon, CheckIcon, FileTextIcon, AlertCircleIcon
-} from '../../components/Icons';
+  AlertTriangleIcon, CheckIcon, FileTextIcon, ClockIcon, UsersIcon
+} from '@/app/components/Icons';
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+
+const getToken = () => {
+  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
+};
 
 interface MissedLecture {
   id: number;
@@ -67,86 +71,73 @@
 
 export default function MonitoringPage() {
   const router = useRouter();
-  
-  // 🚀 درع الحماية: يطرد المتطفلين فوراً ويعرض شاشة التحميل
-  const { isChecking } = useAuthGuard(['admin']);
-
   const [flagged, setFlagged] = useState<FlaggedStudent[]>([]);
   const [loading, setLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');
   
-  // حالة تمديد المهلة
+  // Grace Period state
   const [extendingId, setExtendingId] = useState<string | null>(null);
   
-  // حالة نافذة المراجعة
+  // Review Modal state
   const [reviewAttemptId, setReviewAttemptId] = useState<number | null>(null);
   const [reviewData, setReviewData] = useState<AttemptReviewData | null>(null);
   const [reviewLoading, setReviewLoading] = useState(false);
 
-  // 🚀 نظام التنبيهات الموحد الأنيق
+  // Toast
   const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
   const showToast = useCallback((message: string, type: 'success' | 'error') => {
     setToast({ visible: true, message, type });
-    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
+    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
   }, []);
 
   const fetchFlaggedStudents = useCallback(async () => {
     setLoading(true);
     try {
-      // 🚀 جلب البيانات عبر العميل المركزي بأمان
-      const response = await api.get('/admin/monitoring/students');
-      
-      // التوافقية والأمان في استخراج البيانات (فك التغليف إن وجد)
-      const studentsData = response.data?.data || response.data || [];
-      
-      const mappedStudents: FlaggedStudent[] = studentsData.map((s: any) => ({
-        studentId: s.student_id || s.studentId,
-        fullName: s.full_name || s.fullName || 'غير محدد',
-        phone: s.phone || '',
-        parentPhone: s.parent_phone || s.parentPhone || '',
-        studentNumber: s.student_number || s.studentNumber || '',
-        academicYear: s.academic_year || s.academicYear || '',
-        courseId: s.course_id || s.courseId,
-        courseTitle: s.course_title || s.courseTitle || '',
-        subscriptionId: s.subscription_id || s.subscriptionId,
-        issues: s.issues || [],
-      }));
-
-      setFlagged(mappedStudents);
-    } catch (e: any) {
-      showToast(e?.message || 'فشل تحميل قائمة المتابعة', 'error');
+      const token = getToken();
+      if (!token) { router.push('/login'); return; }
+
+      const res = await fetch(`${API_URL}/api/admin/monitoring/students`, {
+        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
+      });
+
+      if (res.ok) {
+        const result = await res.json();
+        setFlagged(result.data || []);
+      } else {
+        showToast('فشل تحميل قائمة المتابعة', 'error');
+      }
+    } catch (e) {
+      showToast('خطأ في الاتصال بالخادم', 'error');
     } finally {
       setLoading(false);
     }
-  }, [showToast]);
-
-  // 🚀 جلب البيانات فقط بعد التأكد من الصلاحيات
+  }, [router, showToast]);
+
   useEffect(() => {
-    if (!isChecking) {
-      fetchFlaggedStudents();
-    }
-  }, [isChecking, fetchFlaggedStudents]);
-
-  // إغلاق التمرير عند فتح المودال
-  useEffect(() => {
-    if (reviewAttemptId) document.body.style.overflow = 'hidden';
-    else document.body.style.overflow = '';
-    return () => { document.body.style.overflow = ''; };
-  }, [reviewAttemptId]);
+    fetchFlaggedStudents();
+  }, [fetchFlaggedStudents]);
 
   const handleExtendGrace = async (studentId: number, courseId: number, days: number) => {
     try {
-      // 🚀 إرسال طلب التمديد عبر Axios
-      await api.post('/admin/monitoring/extend-grace', { 
-        student_id: studentId, 
-        course_id: courseId, 
-        days 
+      const token = getToken();
+      const res = await fetch(`${API_URL}/api/admin/monitoring/extend-grace`, {
+        method: 'POST',
+        headers: {
+          Authorization: `Bearer ${token}`,
+          Accept: 'application/json',
+          'Content-Type': 'application/json',
+        },
+        body: JSON.stringify({ student_id: studentId, course_id: courseId, days }),
       });
 
-      showToast(`تم إعطاء مهلة للطالب لمدة ${days} أيام بنجاح.`, 'success');
-      fetchFlaggedStudents(); // تحديث القائمة فوراً
-    } catch (e: any) {
-      showToast(e?.message || 'فشل تمديد المهلة', 'error');
+      if (res.ok) {
+        showToast(`تم إعطاء مهلة للطالب لمدة ${days} أيام بنجاح.`, 'success');
+        fetchFlaggedStudents();
+      } else {
+        showToast('فشل تمديد المهلة', 'error');
+      }
+    } catch (e) {
+      showToast('خطأ في الاتصال بالخادم', 'error');
     }
   };
 
@@ -155,327 +146,271 @@
     setReviewLoading(true);
     setReviewData(null);
     try {
-      // 🚀 جلب المراجعة عبر العميل المركزي
-      const response = await api.get(`/admin/monitoring/attempts/${attemptId}`);
-      
-      const data = response.data?.data || response.data;
-      
-      // 🚀 التوافقية الآمنة مع الردود ومنع الانهيار
-      setReviewData({
-        id: data.id,
-        studentName: data.student_name || data.studentName || 'طالب غير محدد',
-        examTitle: data.exam_title || data.examTitle || 'امتحان غير محدد',
-        score: data.score || 0,
-        passed: !!data.passed,
-        completedAt: data.completed_at || data.completedAt || new Date().toISOString(),
-        questions: Array.isArray(data.questions) ? data.questions.map((q: any) => ({
-          id: q.id,
-          body: q.body,
-          options: q.options || [],
-          correctAnswer: q.correct_answer ?? q.correctAnswer ?? 0,
-          selectedAnswer: q.selected_answer ?? q.selectedAnswer ?? null,
-        })) : []
+      const token = getToken();
+      const res = await fetch(`${API_URL}/api/admin/monitoring/attempts/${attemptId}`, {
+        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
       });
-    } catch (e: any) {
-      showToast(e?.message || 'فشل تحميل تفاصيل المحاولة', 'error');
+
+      if (res.ok) {
+        const result = await res.json();
+        setReviewData(result.data);
+      } else {
+        showToast('فشل تحميل تفاصيل المحاولة', 'error');
+        setReviewAttemptId(null);
+      }
+    } catch (e) {
+      showToast('خطأ في الاتصال بالخادم', 'error');
       setReviewAttemptId(null);
     } finally {
       setReviewLoading(false);
     }
   };
 
-  // 🚀 فلترة الطلاب محلياً (آمنة تماماً ضد الـ Null/Undefined)
+  // Filter flagged students based on search query
   const filteredFlagged = flagged.filter(f => 
-    (f.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
-    (f.studentNumber || '').includes(searchQuery) ||
-    (f.phone || '').includes(searchQuery) ||
-    (f.parentPhone || '').includes(searchQuery)
+    f.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
+    f.studentNumber.includes(searchQuery) ||
+    f.phone.includes(searchQuery)
   );
-
-  // 🚀 شاشة التحميل لمنع الوميض
-  if (isChecking) {
-    return (
-      <div className="admin-layout">
-        <AdminSidebar />
-        <main className="admin-content flex items-center justify-center min-h-[60vh]">
-          <div className="spinner spinner-lg" />
-        </main>
-      </div>
-    );
-  }
 
   return (
     <div className="admin-layout relative">
       <AdminSidebar />
 
-      {/* 🚀 نظام التنبيهات الموحد الأنيق */}
-      <div 
-        className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300" 
-        style={{ 
-          opacity: toast.visible ? 1 : 0, 
-          transform: toast.visible ? 'translate(-50%, 0)' : 'translate(-50%, -20px)', 
-          pointerEvents: toast.visible ? 'auto' : 'none' 
-        }}
-      >
-        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl text-sm font-bold ${toast.type === 'success' ? 'bg-green-600 text-white shadow-green-600/30' : 'bg-red-600 text-white shadow-red-600/30'}`}>
-          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
-          <span>{toast.message}</span>
+      {/* Toast Notification */}
+      <div className={`toast-container ${toast.visible ? 'show' : ''}`}>
+        <div className={`toast-content ${toast.type}`}>
+          {toast.type === 'success' ? <CheckCircleIcon size={18} /> : <XIcon size={18} />}
+          {toast.message}
         </div>
       </div>
 
       {/* Answers Review Modal */}
       {reviewAttemptId && (
-        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setReviewAttemptId(null)}>
-          <div className="card w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all shadow-2xl animate-scale-up bg-white rounded-2xl" onClick={e => e.stopPropagation()} dir="rtl">
-            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 p-6 pb-4">
-              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
-                <FileTextIcon size={22} /> مراجعة إجابات الطالب في الامتحان
-              </h2>
-              <button onClick={() => setReviewAttemptId(null)} className="text-gray-400 hover:text-error text-2xl font-bold transition-colors bg-gray-50 hover:bg-red-50 p-2 rounded-full">
-                <XIcon size={20} />
-              </button>
+        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setReviewAttemptId(null)}>
+          <div className="card w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all shadow-2xl" onClick={e => e.stopPropagation()}>
+            <div className="flex justify-between items-center mb-6 pb-4 border-b">
+              <h2 className="text-xl font-bold text-primary flex items-center gap-2"><FileTextIcon size={22} /> مراجعة إجابات الطالب في الامتحان</h2>
+              <button onClick={() => setReviewAttemptId(null)} className="text-gray-400 hover:text-error text-2xl font-bold transition-colors"><XIcon size={22} /></button>
             </div>
 
-            <div className="px-6 pb-6">
-              {reviewLoading || !reviewData ? (
-                <div className="loading-state h-64 flex flex-col items-center justify-center">
-                  <div className="spinner spinner-lg text-primary"></div>
-                  <p className="font-bold mt-4 text-muted">جاري تحميل إجابات الطالب...</p>
-                </div>
-              ) : (
-                <div className="space-y-6">
-                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 flex flex-wrap gap-4 justify-between items-center shadow-inner">
-                    <div>
-                      <h3 className="font-black text-xl text-gray-900">{reviewData.studentName}</h3>
-                      <p className="text-sm font-bold text-primary mt-2">{reviewData.examTitle} &bull; <span className="text-muted">{new Date(reviewData.completedAt).toLocaleString('ar-EG')}</span></p>
-                    </div>
-                    <div className="text-center bg-white px-6 py-3 rounded-xl shadow-sm border border-gray-100">
-                      <p className="text-xs text-muted font-bold mb-1">الدرجة المحققة</p>
-                      <p className={`text-3xl font-black ${reviewData.passed ? 'text-success' : 'text-error'}`}>{reviewData.score}%</p>
-                    </div>
+            {reviewLoading || !reviewData ? (
+              <div className="loading-state">
+                <div className="spinner spinner-lg"></div>
+                <p className="font-bold mt-4">جاري تحميل إجابات الطالب...</p>
+              </div>
+            ) : (
+              <div className="space-y-6">
+                <div className="bg-gray-50 p-4 rounded-lg border flex justify-between items-center">
+                  <div>
+                    <h3 className="font-bold text-lg">{reviewData.studentName}</h3>
+                    <p className="text-sm text-muted">{reviewData.examTitle} &bull; {reviewData.completedAt}</p>
                   </div>
-
-                  <div className="space-y-5">
-                    {reviewData.questions.length === 0 ? (
-                      <div className="text-center py-8 text-gray-500 font-bold">لا توجد أسئلة مسجلة لهذه المحاولة.</div>
-                    ) : (
-                      reviewData.questions.map((q, qIndex) => {
-                        const isCorrect = q.selectedAnswer === q.correctAnswer;
-                        return (
-                          <div key={q.id} className="border rounded-2xl p-6 bg-white shadow-sm transition-all hover:shadow-md" style={{ borderInlineStartWidth: '6px', borderInlineStartColor: isCorrect ? '#10b981' : '#ef4444' }}>
-                            <div className="flex justify-between items-start mb-5">
-                              <span className="font-bold text-sm text-gray-600 bg-gray-100 px-4 py-1.5 rounded-full">سؤال {qIndex + 1}</span>
-                              <span className={`badge text-xs font-bold px-3 py-1.5 ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
-                                {isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة'}
-                              </span>
-                            </div>
-                            <h4 className="font-bold text-gray-900 mb-5 text-lg leading-relaxed">{q.body}</h4>
-                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
-                              {q.options.map((opt, oIndex) => {
-                                const isSelected = q.selectedAnswer === oIndex;
-                                const isAnswerCorrect = q.correctAnswer === oIndex;
-
-                                let borderStyle = '1px solid var(--border-light)';
-                                let bgStyle = 'white';
-                                if (isSelected) {
-                                  borderStyle = isCorrect ? '2px solid #10b981' : '2px solid #ef4444';
-                                  bgStyle = isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)';
-                                } else if (isAnswerCorrect) {
-                                  borderStyle = '2px solid #10b981';
-                                  bgStyle = 'rgba(16, 185, 129, 0.05)';
-                                }
-
-                                return (
-                                  <div key={oIndex} className="p-4 rounded-xl flex items-center gap-3 transition-colors" style={{ border: borderStyle, backgroundColor: bgStyle }}>
-                                    <span className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${isSelected ? (isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') : isAnswerCorrect ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
-                                      {String.fromCharCode(65 + oIndex)}
-                                    </span>
-                                    <span className="flex-1 font-medium text-gray-800 text-sm">{opt}</span>
-                                    {isAnswerCorrect && <span className="text-success font-bold text-[10px] flex items-center gap-1 bg-white px-2 py-1 rounded-md shadow-sm border border-green-100 shrink-0"><CheckIcon size={12} /> إجابة صحيحة</span>}
-                                    {isSelected && !isCorrect && <span className="text-error font-bold text-[10px] flex items-center gap-1 bg-white px-2 py-1 rounded-md shadow-sm border border-red-100 shrink-0"><XIcon size={12} /> اختيار الطالب</span>}
-                                  </div>
-                                );
-                              })}
-                            </div>
-                          </div>
-                        );
-                      })
-                    )}
+                  <div className="text-left">
+                    <p className="text-xs text-muted">الدرجة المحققة</p>
+                    <p className={`text-2xl font-black ${reviewData.passed ? 'text-success' : 'text-error'}`}>{reviewData.score}%</p>
                   </div>
                 </div>
-              )}
-            </div>
+
+                <div className="space-y-4">
+                  {reviewData.questions.map((q, qIndex) => {
+                    const isCorrect = q.selectedAnswer === q.correctAnswer;
+                    return (
+                      <div key={q.id} className="border rounded-lg p-4 bg-white" style={{ borderInlineStartWidth: '5px', borderInlineStartColor: isCorrect ? '#10b981' : '#ef4444' }}>
+                        <div className="flex justify-between items-start mb-3">
+                          <span className="font-bold text-sm text-gray-500">سؤال {qIndex + 1}</span>
+                          <span className={`badge text-xs font-bold ${isCorrect ? 'badge-success' : 'badge-error'}`}>
+                            {isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة'}
+                          </span>
+                        </div>
+                        <h4 className="font-bold text-gray-800 mb-3">{q.body}</h4>
+                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
+                          {q.options.map((opt, oIndex) => {
+                            const isSelected = q.selectedAnswer === oIndex;
+                            const isAnswerCorrect = q.correctAnswer === oIndex;
+
+                            let borderStyle = '1px solid var(--border)';
+                            let bgStyle = 'white';
+                            if (isSelected) {
+                              borderStyle = isCorrect ? '2px solid #10b981' : '2px solid #ef4444';
+                              bgStyle = isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)';
+                            } else if (isAnswerCorrect) {
+                              borderStyle = '2px solid #10b981';
+                              bgStyle = 'rgba(16, 185, 129, 0.05)';
+                            }
+
+                            return (
+                              <div key={oIndex} className="p-3 rounded-lg flex items-center gap-2" style={{ border: borderStyle, backgroundColor: bgStyle }}>
+                                <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs">
+                                  {String.fromCharCode(65 + oIndex)}
+                                </span>
+                                <span className="flex-1 text-sm">{opt}</span>
+                                {isAnswerCorrect && <span className="text-success font-bold text-xs flex items-center gap-1"><CheckIcon size={14} /> الإجابة الصحيحة</span>}
+                                {isSelected && !isCorrect && <span className="text-error font-bold text-xs flex items-center gap-1"><XIcon size={14} /> إجابة الطالب</span>}
+                              </div>
+                            );
+                          })}
+                        </div>
+                      </div>
+                    );
+                  })}
+                </div>
+              </div>
+            )}
           </div>
         </div>
       )}
 
       {/* Main Content */}
       <main className="admin-content">
-        <div className="page-header mb-8">
+        <div className="page-header">
           <div>
-            <h1 className="page-title flex items-center gap-3 text-3xl font-black text-gray-900">
-              <BellIcon size={32} className="text-primary" /> 
-              قسم المتابعة والطلاب المتأخرين
-            </h1>
-            <p className="page-subtitle text-base mt-2">تتبع الطلاب الذين تراكمت لديهم المحاضرات أو رسبوا في الاختبارات.</p>
+            <h1 className="page-title flex items-center gap-2"><BellIcon size={26} /> قسم المتابعة والطلاب المتأخرين</h1>
+            <p className="page-subtitle">تتبع الطلاب الذين تراكمت لديهم المحاضرات أو رسبوا في جميع محاولات الاختبارات وتواصل معهم.</p>
           </div>
         </div>
 
         {/* Filter Toolbar */}
-        <div className="card mb-8 p-6 flex gap-4 flex-wrap items-center bg-white shadow-sm border border-gray-100 rounded-2xl">
+        <div className="card mb-6 p-4 flex gap-4 flex-wrap items-center">
           <div className="flex-1 min-w-[250px] relative">
-            <SearchIcon size={18} className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400" />
+            <SearchIcon size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-muted" />
             <input
               type="text"
-              placeholder="ابحث عن طالب بالاسم، الهاتف، أو الكود..."
-              className="input-field w-full pr-12 py-3 bg-gray-50 focus:bg-white transition-colors rounded-xl font-medium"
+              placeholder="ابحث عن طالب بالاسم، الهاتف، أو كود الطالب..."
+              className="input-field pr-10"
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
             />
           </div>
-          <button onClick={fetchFlaggedStudents} disabled={loading} className="btn btn-outline py-3 px-6 font-bold shadow-sm rounded-xl">
-            {loading ? <span className="spinner spinner-primary w-5 h-5 border-2" /> : <><RefreshIcon size={18} /> تحديث القائمة</>}
-          </button>
+          <button onClick={fetchFlaggedStudents} className="btn btn-outline font-bold"><RefreshIcon size={16} /> تحديث القائمة</button>
         </div>
 
         {loading ? (
-          <div className="loading-state h-64 flex flex-col items-center justify-center">
-            <div className="spinner spinner-lg text-primary"></div>
-            <p className="mt-4 font-bold text-muted">جاري سحب تقارير المتابعة...</p>
+          <div className="loading-state">
+            <div className="spinner spinner-lg"></div>
+            <p className="mt-4 font-bold">جاري تحميل بيانات المتابعة...</p>
           </div>
         ) : filteredFlagged.length === 0 ? (
-          <div className="empty-state bg-white shadow-sm rounded-2xl py-20">
-            <div className="empty-state-icon bg-green-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner">
-              <CheckCircleIcon size={48} className="text-success" />
+          <div className="empty-state">
+            <div className="empty-state-icon">
+              <CheckCircleIcon size={36} color="var(--success)" />
             </div>
-            <h3 className="text-2xl font-black text-success mb-3">الوضع ممتاز!</h3>
-            <p className="text-gray-500 font-medium max-w-sm mx-auto">جميع الطلاب يسيرون وفق الخطة ولا يوجد أي تأخير أو رسوب في الوقت الحالي.</p>
+            <h3 className="text-success">كل الطلاب يسيرون بشكل ممتاز!</h3>
+            <p>لا يوجد أي طلاب يحتاجون للمتابعة حالياً.</p>
           </div>
         ) : (
-          <div className="table-container border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
-            <div className="overflow-x-auto w-full">
-              <table className="table w-full m-0 min-w-[1000px]">
-                <thead className="bg-gray-50 border-b border-gray-200">
-                  <tr>
-                    <th className="font-bold text-gray-700 py-5 px-6 text-right whitespace-nowrap">الطالب</th>
-                    <th className="font-bold text-gray-700 py-5 px-6 text-right whitespace-nowrap">ولي الأمر / الهاتف</th>
-                    <th className="font-bold text-gray-700 py-5 px-6 text-right whitespace-nowrap">الكورس المستهدف</th>
-                    <th className="font-bold text-gray-700 py-5 px-6 text-right min-w-[300px]">المحاضرات المتراكمة / الرسوب</th>
-                    <th className="font-bold text-gray-700 py-5 px-6 text-center whitespace-nowrap">إجراءات الإدارة</th>
-                  </tr>
-                </thead>
-                <tbody className="divide-y divide-gray-100">
-                  {filteredFlagged.map((item) => {
-                    const uniqueId = `${item.studentId}-${item.courseId}`;
-                    return (
-                      <tr key={uniqueId} className="hover:bg-gray-50/50 transition-colors">
-                        <td className="py-5 px-6">
-                          <div className="flex items-center gap-4">
-                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-primary flex items-center justify-center font-black text-lg shadow-inner shrink-0">
-                              {item.fullName.charAt(0)}
+          <div className="table-container">
+            <table className="table">
+              <thead>
+                <tr>
+                  <th>الطالب</th>
+                  <th>ولي الأمر / الهاتف</th>
+                  <th>الكورس المشترك فيه</th>
+                  <th>المحاضرات المتراكمة / الرسوب</th>
+                  <th className="text-center">إجراءات المتابعة</th>
+                </tr>
+              </thead>
+              <tbody>
+                {filteredFlagged.map((item) => {
+                  const uniqueId = `${item.studentId}-${item.courseId}`;
+                  return (
+                    <tr key={uniqueId}>
+                      <td>
+                        <div className="flex items-center gap-3">
+                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
+                            {item.fullName.charAt(0)}
+                          </div>
+                          <div>
+                            <p className="font-bold text-gray-900">{item.fullName}</p>
+                            <span className="text-xs text-primary font-bold">{item.academicYear} &bull; #{item.studentNumber}</span>
+                          </div>
+                        </div>
+                      </td>
+                      <td>
+                        <p className="text-sm font-bold text-gray-800">{item.phone}</p>
+                        <p className="text-xs text-muted">ولي الأمر: {item.parentPhone}</p>
+                      </td>
+                      <td className="font-medium">{item.courseTitle}</td>
+                      <td>
+                        <div className="space-y-2">
+                          {item.issues.map((issue, index) => (
+                            <div key={index} className="p-2 rounded-lg text-xs flex items-start gap-2" style={{ backgroundColor: issue.type === 'accumulation' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: issue.type === 'accumulation' ? 'var(--warning-dark)' : 'var(--error)' }}>
+                              {issue.type === 'accumulation' ? (
+                                <div className="flex-1">
+                                  <strong className="flex items-center gap-1"><AlertTriangleIcon size={14} /> متراكم ({issue.missedCount} محاضرات):</strong>
+                                  <ul className="list-disc list-inside mt-1 space-y-0.5">
+                                    {issue.missedLectures?.map(l => (
+                                      <li key={l.id}>{l.title}</li>
+                                    ))}
+                                  </ul>
+                                </div>
+                              ) : (
+                                <div className="flex-1">
+                                  <strong className="flex items-center gap-1"><XIcon size={14} /> رسب في جميع المحاولات:</strong>
+                                  <p className="mt-1">محاضرة: {issue.lectureTitle}</p>
+                                  <div className="flex flex-wrap gap-2 mt-2">
+                                    {issue.attempts?.map(att => (
+                                      <button
+                                        key={att.id}
+                                        onClick={() => handleReviewAttempt(att.id)}
+                                        className="btn btn-xs btn-outline bg-white hover:bg-red-50 text-error px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"
+                                      >
+                                        <FileTextIcon size={12} /> مراجعة إجابات نموذج {att.formIndex} ({att.score}%)
+                                      </button>
+                                    ))}
+                                  </div>
+                                </div>
+                              )}
                             </div>
-                            <div>
-                              <p className="font-black text-gray-900 text-base">{item.fullName}</p>
-                              <span className="text-xs text-primary font-bold bg-blue-50 px-2 py-1 rounded-md mt-1 inline-block">
-                                {item.academicYear} &bull; #{item.studentNumber}
-                              </span>
+                          ))}
+                        </div>
+                      </td>
+                      <td className="text-center">
+                        <div className="relative inline-block text-right">
+                          {extendingId === uniqueId ? (
+                            <div className="bg-white border rounded-lg shadow-lg p-2 absolute left-0 bottom-full z-10 min-w-[150px] animate-fade-in">
+                              <p className="text-xs text-muted font-bold mb-2 text-center">اختر مدة المهلة:</p>
+                              <div className="flex flex-col gap-1">
+                                {[1, 2, 3, 7, 14, 30].map(days => (
+                                  <button
+                                    key={days}
+                                    onClick={() => {
+                                      handleExtendGrace(item.studentId, item.courseId, days);
+                                      setExtendingId(null);
+                                    }}
+                                    className="text-right text-xs p-2 rounded hover:bg-primary hover:text-white transition-colors"
+                                  >
+                                    {days === 1 ? 'يوم واحد' : days === 2 ? 'يومين' : `${days} أيام`}
+                                  </button>
+                                ))}
+                                <button onClick={() => setExtendingId(null)} className="text-xs text-error font-bold p-2 border-t mt-1">إلغاء</button>
+                              </div>
                             </div>
-                          </div>
-                        </td>
-                        <td className="py-5 px-6">
-                          <p className="text-sm font-bold text-gray-800 font-mono" dir="ltr">{item.phone}</p>
-                          <p className="text-xs text-muted font-medium mt-1">ولي الأمر: <span className="font-mono text-gray-600 font-bold" dir="ltr">{item.parentPhone}</span></p>
-                        </td>
-                        <td className="py-5 px-6 font-bold text-gray-800">{item.courseTitle}</td>
-                        <td className="py-5 px-6">
-                          <div className="space-y-3">
-                            {item.issues.map((issue, index) => (
-                              <div key={index} className="p-4 rounded-xl border flex items-start gap-3 shadow-sm transition-all hover:shadow-md" style={{ backgroundColor: issue.type === 'accumulation' ? '#fffbeb' : '#fef2f2', borderColor: issue.type === 'accumulation' ? '#fde68a' : '#fecaca' }}>
-                                {issue.type === 'accumulation' ? (
-                                  <div className="flex-1">
-                                    <strong className="flex items-center gap-2 text-yellow-800 text-sm mb-2">
-                                      <AlertTriangleIcon size={18} /> 
-                                      تراكم ({issue.missedCount} محاضرات):
-                                    </strong>
-                                    <ul className="list-disc list-inside space-y-1.5 text-xs text-yellow-900/90 font-bold pl-2">
-                                      {issue.missedLectures?.map(l => (
-                                        <li key={l.id}>{l.title}</li>
-                                      ))}
-                                    </ul>
-                                  </div>
-                                ) : (
-                                  <div className="flex-1">
-                                    <strong className="flex items-center gap-2 text-red-800 text-sm mb-2">
-                                      <XIcon size={18} /> 
-                                      رسوب متكرر:
-                                    </strong>
-                                    <p className="text-xs text-red-900 font-bold bg-white/60 px-3 py-1.5 rounded-lg inline-block shadow-sm border border-red-100">{issue.lectureTitle}</p>
-                                    <div className="flex flex-wrap gap-2 mt-3">
-                                      {issue.attempts?.map(att => (
-                                        <button
-                                          key={att.id}
-                                          onClick={() => handleReviewAttempt(att.id)}
-                                          className="btn btn-xs font-bold shadow-sm hover:-translate-y-0.5 transition-transform rounded-lg px-3 py-1.5"
-                                          style={{ backgroundColor: 'white', color: '#b91c1c', border: '1px solid #fecaca' }}
-                                        >
-                                          <FileTextIcon size={12} className="inline mr-1" /> نموذج {att.formIndex} ({att.score}%)
-                                        </button>
-                                      ))}
-                                    </div>
-                                  </div>
-                                )}
-                              </div>
-                            ))}
-                          </div>
-                        </td>
-                        <td className="py-5 px-6 text-center align-middle">
-                          <div className="relative inline-block text-right">
-                            {/* 🚀 نافذة التمديد الاستثنائي */}
-                            {extendingId === uniqueId && (
-                              <div className="bg-white border border-gray-200 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] p-4 absolute left-0 bottom-full mb-3 z-10 w-56 animate-scale-up origin-bottom-left">
-                                <p className="text-xs text-gray-500 font-bold mb-3 text-center pb-2 border-b border-gray-100">اختر مدة التمديد الاستثنائي:</p>
-                                <div className="flex flex-col gap-1.5">
-                                  {[1, 2, 3, 7, 14, 30].map(days => (
-                                    <button
-                                      key={days}
-                                      onClick={() => {
-                                        handleExtendGrace(item.studentId, item.courseId, days);
-                                        setExtendingId(null);
-                                      }}
-                                      className="text-right text-sm font-bold p-2.5 rounded-xl bg-gray-50 hover:bg-primary hover:text-white transition-colors"
-                                    >
-                                      {days === 1 ? 'يوم واحد' : days === 2 ? 'يومين' : `${days} أيام`}
-                                    </button>
-                                  ))}
-                                  <button onClick={() => setExtendingId(null)} className="text-xs text-error font-bold p-2.5 mt-2 w-full bg-red-50 hover:bg-red-100 rounded-xl transition-colors">إلغاء الإجراء</button>
-                                </div>
-                              </div>
-                            )}
-                            <button
-                              // 🚀 إصلاح الـ Toggle لكي يفتح ويغلق عند الضغط
-                              onClick={() => setExtendingId(prev => prev === uniqueId ? null : uniqueId)}
-                              className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-md shadow-emerald-200 inline-flex items-center gap-2"
-                            >
-                              <CheckIcon size={18} /> {extendingId === uniqueId ? 'إغلاق القائمة' : 'تم التحذير (إعطاء مهلة)'}
-                            </button>
-                          </div>
-                        </td>
-                      </tr>
-                    );
-                  })}
-                </tbody>
-              </table>
-            </div>
+                          ) : null}
+                          <button
+                            onClick={() => setExtendingId(uniqueId)}
+                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 shadow-sm inline-flex items-center gap-1"
+                          >
+                            <CheckIcon size={16} /> تم المتابعة (إعطاء مهلة)
+                          </button>
+                        </div>
+                      </td>
+                    </tr>
+                  );
+                })}
+              </tbody>
+            </table>
           </div>
         )}
       </main>
 
       <style jsx>{`
-        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
-        .animate-scale-up { animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
-        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
-        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
+        .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
+        @keyframes fadeIn {
+          from { opacity: 0; transform: translateY(5px); }
+          to { opacity: 1; transform: translateY(0); }
+        }
       `}</style>
     </div>
   );
-}+}
```

### `app\admin\payment-numbers\page.tsx`
```diff
--- Current: app\admin\payment-numbers\page.tsx
+++ Other: app\admin\payment-numbers\page.tsx
@@ -1,27 +1,23 @@
 'use client';
 
-import { useState, useEffect, useCallback } from 'react';
+import { useState, useEffect } from 'react';
+import { useRouter } from 'next/navigation';
 import AdminSidebar from '../../components/AdminSidebar';
-import { useAuthGuard } from '../../hooks/useAuthGuard'; // 🚀 حارس البوابة المركزي
-import api from '@/lib/axios'; // 🚀 العميل الشبكي المحمي
-import { 
-  PlusIcon, XIcon, TrashIcon, CheckCircleIcon, 
-  AlertCircleIcon, PhoneIcon, CreditCardIcon, AlertTriangleIcon 
-} from '../../components/Icons';
+import { PlusIcon, XIcon, TrashIcon, CheckCircleIcon, AlertCircleIcon, PhoneIcon, CreditCardIcon, AlertTriangleIcon } from '../../components/Icons';
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
 
 interface PaymentNumber {
   id: number;
   provider: 'instapay' | 'vodafone_cash';
   number: string;
-  displayOrder: number;
-  isActive: boolean;
-  createdAt: string;
+  display_order: number;
+  is_active: boolean;
+  created_at: string;
 }
 
 export default function PaymentNumbersPage() {
-  // 🚀 درع الحماية: يطرد المتطفلين فوراً ويعرض شاشة التحميل ريثما يتأكد
-  const { isChecking } = useAuthGuard(['admin']);
-
+  const router = useRouter();
   const [instapayNumbers, setInstapayNumbers] = useState<PaymentNumber[]>([]);
   const [vodafoneNumbers, setVodafoneNumbers] = useState<PaymentNumber[]>([]);
   const [loading, setLoading] = useState(true);
@@ -32,83 +28,83 @@
   const [newOrder, setNewOrder] = useState('1');
   const [saving, setSaving] = useState(false);
 
-  // 🚀 نظام التنبيهات الموحد الأنيق
   const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
+  
   const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; message: string; onConfirm: () => void } | null>(null);
 
-  const showToast = useCallback((message: string, type: 'success' | 'error') => {
+  const showToast = (message: string, type: 'success' | 'error') => {
     setToast({ visible: true, message, type });
-    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
-  }, []);
-
-  // إغلاق التمرير عند فتح نافذة التأكيد
-  useEffect(() => {
-    if (confirmDialog) document.body.style.overflow = 'hidden';
-    else document.body.style.overflow = '';
-    return () => { document.body.style.overflow = ''; };
-  }, [confirmDialog]);
-
-  // 🚀 جلب البيانات فقط بعد التأكد من الصلاحيات
-  useEffect(() => {
-    if (!isChecking) {
-      fetchNumbers();
-    }
-  }, [isChecking]);
+    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
+  };
+
+  const getToken = () => {
+    return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
+  };
 
   const fetchNumbers = async () => {
     setLoading(true);
     try {
-      // 🚀 الاستعلام عبر العميل المركزي
-      const response = await api.get('/admin/payment-numbers');
-      
-      const allNumbers = response.data?.data || response.data || [];
-      
-      // التوافقية والأمان في استخراج البيانات
-      const mappedNumbers: PaymentNumber[] = allNumbers.map((n: any) => ({
-        id: n.id,
-        provider: n.provider,
-        number: n.number,
-        displayOrder: n.display_order ?? n.displayOrder ?? 1,
-        isActive: n.is_active ?? n.isActive ?? false,
-        createdAt: n.created_at ?? n.createdAt ?? '',
-      }));
-
-      // 🚀 ترتيب الأرقام حسب ترتيب العرض (displayOrder) لضمان دقة العرض
-      mappedNumbers.sort((a, b) => a.displayOrder - b.displayOrder);
-
-      setInstapayNumbers(mappedNumbers.filter(n => n.provider === 'instapay'));
-      setVodafoneNumbers(mappedNumbers.filter(n => n.provider === 'vodafone_cash'));
-    } catch (err: any) {
-      showToast(err?.message || 'فشل الاتصال بالخادم لجلب الأرقام', 'error');
+      const token = getToken();
+      const response = await fetch(`${API_URL}/api/admin/payment-numbers`, {
+        headers: { 
+          'Authorization': `Bearer ${token}`,
+          'Accept': 'application/json'
+        },
+      });
+
+      if (response.ok) {
+        const data = await response.json();
+        const allNumbers = data.data || [];
+        setInstapayNumbers(allNumbers.filter((n: PaymentNumber) => n.provider === 'instapay'));
+        setVodafoneNumbers(allNumbers.filter((n: PaymentNumber) => n.provider === 'vodafone_cash'));
+      } else if (response.status === 401) {
+        router.push('/login');
+      }
+    } catch (err) {
+      showToast('فشل الاتصال بالخادم', 'error');
     } finally {
       setLoading(false);
     }
   };
 
+  useEffect(() => {
+    fetchNumbers();
+  }, []);
+
   const handleAdd = async (e: React.FormEvent) => {
     e.preventDefault();
-    if (!newNumber.trim() || !newOrder) {
-      showToast('يرجى تعبئة جميع الحقول المطلوبة', 'error');
-      return;
-    }
+    if (!newNumber || !newOrder) return;
 
     setSaving(true);
     try {
-      // 🚀 الإرسال الآمن عبر Axios
-      await api.post('/admin/payment-numbers', {
-        provider: newProvider,
-        number: newNumber.trim(),
-        display_order: parseInt(newOrder) || 1, // حماية من القيم الفارغة
-        is_active: true
+      const token = getToken();
+      const response = await fetch(`${API_URL}/api/admin/payment-numbers`, {
+        method: 'POST',
+        headers: { 
+          'Authorization': `Bearer ${token}`,
+          'Content-Type': 'application/json',
+          'Accept': 'application/json'
+        },
+        body: JSON.stringify({
+          provider: newProvider,
+          number: newNumber,
+          display_order: parseInt(newOrder),
+          is_active: true
+        }),
       });
 
-      showToast('تم إضافة حساب الدفع بنجاح', 'success');
-      setShowAddForm(false);
-      setNewNumber('');
-      setNewOrder('1');
-      fetchNumbers(); // تحديث القوائم فوراً
-    } catch (err: any) {
-      showToast(err?.message || err?.error || 'فشل الحفظ، تأكد من صحة البيانات', 'error');
+      if (response.ok) {
+        showToast('تم إضافة الرقم بنجاح', 'success');
+        setShowAddForm(false);
+        setNewNumber('');
+        setNewOrder('1');
+        fetchNumbers();
+      } else {
+        const errorData = await response.json();
+        showToast(errorData.message || 'فشل الحفظ، تأكد من البيانات', 'error');
+      }
+    } catch {
+      showToast('حدث خطأ أثناء الاتصال', 'error');
     } finally {
       setSaving(false);
     }
@@ -117,17 +113,25 @@
   const handleDelete = (id: number) => {
     setConfirmDialog({
       visible: true,
-      message: 'هل أنت متأكد من حذف حساب الدفع هذا؟ الإجراء نهائي.',
+      message: 'هل أنت متأكد من حذف هذا الرقم؟ لا يمكن التراجع عن هذا الإجراء.',
       onConfirm: async () => {
         setConfirmDialog(null);
         try {
-          // 🚀 الحذف عبر Axios
-          await api.delete(`/admin/payment-numbers/${id}`);
-          
-          showToast('تم حذف الحساب بنجاح', 'success');
-          fetchNumbers();
-        } catch (err: any) {
-          showToast(err?.message || err?.error || 'لا يمكن حذف حساب يمتلك سجل معاملات مالية', 'error');
+          const token = getToken();
+          const response = await fetch(`${API_URL}/api/admin/payment-numbers/${id}`, {
+            method: 'DELETE',
+            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
+          });
+
+          if (response.ok) {
+            showToast('تم حذف الرقم بنجاح', 'success');
+            fetchNumbers();
+          } else {
+            const error = await response.json();
+            showToast(error.message || 'لا يمكن حذف رقم له سجل معاملات', 'error');
+          }
+        } catch {
+          showToast('خطأ في الاتصال', 'error');
         }
       }
     });
@@ -135,244 +139,162 @@
 
   const handleToggle = async (num: PaymentNumber) => {
     try {
-      // 🚀 التحديث الآمن
-      await api.patch(`/admin/payment-numbers/${num.id}`, { 
-        is_active: !num.isActive 
+      const token = getToken();
+      const response = await fetch(`${API_URL}/api/admin/payment-numbers/${num.id}`, {
+        method: 'PATCH',
+        headers: { 
+          'Authorization': `Bearer ${token}`,
+          'Content-Type': 'application/json',
+          'Accept': 'application/json'
+        },
+        body: JSON.stringify({ is_active: !num.is_active }),
       });
 
-      showToast('تم تحديث حالة الحساب بنجاح', 'success');
-      fetchNumbers();
-    } catch (err: any) {
-      showToast(err?.message || 'فشل تحديث حالة الحساب من الخادم', 'error');
+      if (response.ok) {
+        showToast('تم تحديث حالة الرقم', 'success');
+        fetchNumbers();
+      } else {
+        showToast('فشل تحديث الحالة من الخادم', 'error');
+      }
+    } catch {
+      showToast('فشل تحديث الحالة', 'error');
     }
   };
-
-  // 🚀 شاشة التحميل الأولية لمنع وميض الواجهة
-  if (isChecking || (loading && instapayNumbers.length === 0 && vodafoneNumbers.length === 0)) {
-    return (
-      <div className="admin-layout">
-        <AdminSidebar />
-        <div className="admin-content flex items-center justify-center min-h-[60vh]">
-          <div className="loading-state text-center flex flex-col items-center">
-            <div className="spinner spinner-primary spinner-lg mb-4 mx-auto" />
-            <p className="text-muted font-bold text-lg">جاري تحميل قنوات الدفع المتاحة...</p>
-          </div>
-        </div>
-      </div>
-    );
-  }
 
   return (
     <div className="admin-layout relative">
       <AdminSidebar />
       
-      {/* 🚀 نافذة التأكيد المحسنة والاحترافية */}
       {confirmDialog && (
-        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setConfirmDialog(null)}>
-          <div className="card shadow-2xl max-w-sm w-full text-center p-8 animate-scale-up bg-white rounded-2xl border border-gray-100" onClick={e => e.stopPropagation()}>
-            <div className="flex justify-center mb-5 text-error">
-              <AlertTriangleIcon size={56} />
+        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
+          <div className="card shadow-2xl max-w-sm w-full text-center p-8">
+            <div className="flex justify-center mb-4 text-error">
+              <AlertTriangleIcon size={48} />
             </div>
-            <h3 className="text-2xl font-black text-gray-900 mb-4">تأكيد الحذف</h3>
-            <p className="text-gray-600 mb-8 leading-relaxed font-medium">{confirmDialog.message}</p>
+            <h3 className="text-xl font-bold text-error mb-4">تأكيد الحذف</h3>
+            <p className="text-muted mb-6 leading-relaxed">{confirmDialog.message}</p>
             <div className="flex gap-4 justify-center">
-              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline flex-1 font-bold py-3 rounded-xl hover:bg-gray-50 border-gray-200">إلغاء</button>
-              <button onClick={confirmDialog.onConfirm} className="btn btn-danger flex-1 font-bold py-3 rounded-xl shadow-lg shadow-red-200">نعم، احذف</button>
+              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline flex-1">إلغاء</button>
+              <button onClick={confirmDialog.onConfirm} className="btn btn-danger flex-1">نعم، احذف</button>
             </div>
           </div>
         </div>
       )}
 
-      {/* 🚀 نظام التنبيهات الموحد العائم */}
-      <div 
-        className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300" 
-        style={{ 
-          opacity: toast.visible ? 1 : 0, 
-          transform: toast.visible ? 'translate(-50%, 0)' : 'translate(-50%, -20px)', 
-          pointerEvents: toast.visible ? 'auto' : 'none' 
-        }}
-      >
-        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl text-sm font-bold ${toast.type === 'success' ? 'bg-green-600 text-white shadow-green-600/30' : 'bg-red-600 text-white shadow-red-600/30'}`}>
+      <div className="toast-container" style={{ opacity: toast.visible ? 1 : 0, pointerEvents: toast.visible ? 'auto' : 'none' }}>
+        <div className={`toast-content ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
           {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
-          <span>{toast.message}</span>
+          {toast.message}
         </div>
       </div>
 
       <main className="admin-content">
-        <div className="page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
+        <div className="page-header">
           <div>
-            <h1 className="page-title text-3xl font-black text-gray-900 flex items-center gap-3">
-              <PhoneIcon size={32} className="text-primary" />
-              أرقام وحسابات الدفع
+            <h1 className="page-title">
+              <PhoneIcon size={28} />
+              أرقام الدفع
             </h1>
-            <p className="page-subtitle text-base mt-2">إدارة الحسابات البنكية ومحافظ الهاتف المتاحة لشحن رصيد الطلاب.</p>
+            <p className="page-subtitle">إدارة أرقام InstaPay و Vodafone Cash</p>
           </div>
-          <button 
-            onClick={() => setShowAddForm(!showAddForm)} 
-            className={`btn ${showAddForm ? 'btn-outline border-error text-error hover:bg-red-50' : 'btn-primary shadow-lg shadow-blue-200'} font-bold transition-all rounded-xl px-6 py-3 h-auto`}
-          >
-            {showAddForm ? <><XIcon size={18} /> إلغاء الإضافة</> : <><PlusIcon size={18} /> إضافة حساب جديد</>}
+          <button onClick={() => setShowAddForm(!showAddForm)} className="btn btn-primary">
+            {showAddForm ? <><XIcon size={16} /> إلغاء</> : <><PlusIcon size={16} /> إضافة رقم جديد</>}
           </button>
         </div>
 
-        {/* 🚀 نموذج إضافة حساب جديد */}
         {showAddForm && (
-          <div className="card mb-8 animate-fade-in border-2 border-primary/20 shadow-xl shadow-blue-50/50 p-6 bg-gradient-to-b from-blue-50/50 to-white rounded-2xl">
-            <h2 className="text-xl font-black mb-6 text-primary flex items-center gap-2 pb-4">
-              <PlusIcon size={22} className="text-success" /> 
-              إدراج قناة دفع جديدة
-            </h2>
-            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
-              <div className="form-group mb-0">
-                <label className="form-label font-bold text-gray-700 mb-2 block">مزود الخدمة</label>
-                <select 
-                  value={newProvider} 
-                  onChange={(e) => setNewProvider(e.target.value as any)} 
-                  className="input-field bg-white font-bold shadow-sm rounded-xl py-3 border-gray-200 w-full" 
-                  dir="rtl"
-                >
+          <div className="card mb-6 animate-fade-in border border-primary/20 shadow-lg">
+            <h2 className="card-title mb-5 text-primary flex items-center gap-2"><PlusIcon size={20} /> إضافة رقم دفع جديد</h2>
+            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
+              <div className="form-group">
+                <label className="form-label">مزود الخدمة</label>
+                <select value={newProvider} onChange={(e) => setNewProvider(e.target.value as any)} className="input-field" dir="rtl">
                   <option value="instapay">إنستاباي (InstaPay)</option>
                   <option value="vodafone_cash">فودافون كاش (Vodafone Cash)</option>
                 </select>
               </div>
-              <div className="form-group mb-0">
-                <label className="form-label font-bold text-gray-700 mb-2 block">رقم الهاتف / المُعرّف (Username)</label>
-                <input 
-                  type="text" 
-                  value={newNumber} 
-                  // 🚀 تأمين الإدخال: إزالة أي مسافات لمنع الأخطاء أثناء نسخ الطالب للرقم
-                  onChange={(e) => setNewNumber(e.target.value.replace(/\s/g, ''))} 
-                  className="input-field bg-white font-mono text-lg font-bold shadow-sm rounded-xl py-3 border-gray-200 w-full" 
-                  placeholder={newProvider === 'instapay' ? 'user@instapay' : '01012345678'} 
-                  required 
-                  dir="ltr"
-                />
-              </div>
-              <div className="form-group mb-0">
-                <label className="form-label font-bold text-gray-700 mb-2 block">ترتيب الظهور للطلاب (1, 2, 3..)</label>
-                <input 
-                  type="number" 
-                  value={newOrder} 
-                  // منع الحروف والمسافات
-                  onChange={(e) => setNewOrder(e.target.value.replace(/[^0-9]/g, ''))} 
-                  className="input-field bg-white font-bold text-lg shadow-sm rounded-xl py-3 border-gray-200 w-full text-center" 
-                  min="1" 
-                  required 
-                  dir="ltr"
-                />
-              </div>
-              <div className="col-span-full mt-2">
-                <button type="submit" disabled={saving} className="btn btn-success font-bold text-base px-10 py-3.5 rounded-xl shadow-lg shadow-green-200 w-full md:w-auto">
-                  {saving ? <span className="spinner spinner-light w-5 h-5 border-2 mx-auto" /> : 'حفظ وإضافة الحساب ✔️'}
+              <div className="form-group">
+                <label className="form-label">رقم الدفع / المعرف</label>
+                <input type="text" value={newNumber} onChange={(e) => setNewNumber(e.target.value)} className="input-field" placeholder="01xxxxxxxxx أو معرف إنستاباي" required />
+              </div>
+              <div className="form-group">
+                <label className="form-label">ترتيب العرض</label>
+                <input type="number" value={newOrder} onChange={(e) => setNewOrder(e.target.value)} className="input-field" min="1" required />
+              </div>
+              <div className="col-span-full mt-4 flex gap-3">
+                <button type="submit" disabled={saving} className="btn btn-primary px-8">
+                  {saving ? 'جاري الحفظ...' : <><PlusIcon size={16} /> حفظ الرقم</>}
                 </button>
               </div>
             </form>
           </div>
         )}
 
-        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
-          {/* قسم إنستاباي */}
-          <div className="card shadow-sm border border-gray-200 bg-white rounded-2xl h-full flex flex-col p-6">
-            <div className="flex justify-between items-center mb-6 pb-4">
-              <h2 className="text-2xl font-black flex items-center gap-3 text-gray-800">
-                <CreditCardIcon size={28} className="text-purple-600" />
-                حسابات إنستاباي
-              </h2>
-              <span className="badge font-bold px-4 py-1.5 rounded-lg text-sm" style={{ backgroundColor: 'rgba(147, 51, 234, 0.1)', color: '#9333ea' }}>
-                {instapayNumbers.length} حساب
-              </span>
-            </div>
-            
-            <div className="flex flex-col gap-4 flex-1">
-              {instapayNumbers.map(num => (
-                <div key={num.id} className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-purple-300 hover:shadow-md transition-all flex justify-between items-center gap-4 group">
-                  <div className="flex-1 overflow-hidden">
-                    <div className="font-bold text-xl text-gray-900 truncate text-left font-mono tracking-wide" dir="ltr">{num.number}</div>
-                    <div className="text-sm font-bold text-gray-500 mt-1.5 flex items-center gap-2">
-                      <span className="w-2 h-2 rounded-full bg-gray-300 inline-block"></span> ترتيب العرض: {num.displayOrder}
+        {loading ? (
+          <div className="loading-state"><div className="spinner spinner-lg" /></div>
+        ) : (
+          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
+            <div className="card">
+              <div className="flex justify-between items-center mb-6 pb-4 border-b">
+                <h2 className="card-title text-xl flex items-center gap-2">
+                  <CreditCardIcon size={20} />
+                  أرقام إنستاباي
+                </h2>
+                <span className="badge badge-primary">{instapayNumbers.length}</span>
+              </div>
+              <div className="flex flex-col gap-3">
+                {instapayNumbers.map(num => (
+                  <div key={num.id} className="p-4 rounded-xl border bg-gray-50 hover:border-primary/30 transition-colors flex justify-between items-center gap-4">
+                    <div className="flex-1 overflow-hidden">
+                      <div className="font-bold text-lg text-primary truncate text-left" dir="ltr">{num.number}</div>
+                      <div className="text-xs text-muted mt-1">الترتيب: {num.display_order}</div>
+                    </div>
+                    <div className="flex gap-2 shrink-0">
+                      <button onClick={() => handleToggle(num)} className={`btn btn-sm ${num.is_active ? 'btn-success' : 'btn-outline'}`}>
+                        {num.is_active ? <><CheckCircleIcon size={14} /> نشط</> : 'معطل'}
+                      </button>
+                      <button onClick={() => handleDelete(num.id)} className="btn btn-sm btn-danger" title="حذف"><TrashIcon size={14} /></button>
                     </div>
                   </div>
-                  <div className="flex gap-2 shrink-0">
-                    <button 
-                      onClick={() => handleToggle(num)} 
-                      className={`btn btn-sm font-bold rounded-lg px-4 ${num.isActive ? 'btn-success bg-green-50 text-green-700 hover:bg-green-100 border-none shadow-sm' : 'btn-outline bg-white text-gray-500 hover:bg-gray-50 border-gray-200 shadow-sm'}`}
-                    >
-                      {num.isActive ? <><CheckCircleIcon size={16} /> مُفعل</> : 'معطل'}
-                    </button>
-                    <button 
-                      onClick={() => handleDelete(num.id)} 
-                      className="btn btn-sm btn-outline border-red-100 text-error bg-white hover:bg-red-50 hover:border-red-200 rounded-lg px-3 shadow-sm transition-colors" 
-                      title="حذف الحساب"
-                    >
-                      <TrashIcon size={18} />
-                    </button>
+                ))}
+                {instapayNumbers.length === 0 && <p className="text-center text-muted p-4">لا توجد أرقام مسجلة</p>}
+              </div>
+            </div>
+
+            <div className="card">
+              <div className="flex justify-between items-center mb-6 pb-4 border-b">
+                <h2 className="card-title text-xl flex items-center gap-2">
+                  <PhoneIcon size={20} />
+                  فودافون كاش
+                </h2>
+                <span className="badge badge-success">{vodafoneNumbers.length}</span>
+              </div>
+              <div className="flex flex-col gap-3">
+                {vodafoneNumbers.map(num => (
+                  <div key={num.id} className="p-4 rounded-xl border bg-gray-50 hover:border-success/30 transition-colors flex justify-between items-center gap-4">
+                    <div className="flex-1 overflow-hidden">
+                      <div className="font-bold text-lg text-success tracking-wider truncate text-left" dir="ltr">{num.number}</div>
+                      <div className="text-xs text-muted mt-1">الترتيب: {num.display_order}</div>
+                    </div>
+                    <div className="flex gap-2 shrink-0">
+                      <button onClick={() => handleToggle(num)} className={`btn btn-sm ${num.is_active ? 'btn-success' : 'btn-outline'}`}>
+                        {num.is_active ? <><CheckCircleIcon size={14} /> نشط</> : 'معطل'}
+                      </button>
+                      <button onClick={() => handleDelete(num.id)} className="btn btn-sm btn-danger" title="حذف"><TrashIcon size={14} /></button>
+                    </div>
                   </div>
-                </div>
-              ))}
-              {instapayNumbers.length === 0 && (
-                <div className="flex flex-col items-center justify-center flex-1 py-12 text-muted bg-gray-50/50 rounded-2xl">
-                  <CreditCardIcon size={56} className="mb-4 text-gray-300" />
-                  <p className="font-bold text-gray-500">لا توجد حسابات إنستاباي مسجلة</p>
-                </div>
-              )}
+                ))}
+                {vodafoneNumbers.length === 0 && <p className="text-center text-muted p-4">لا توجد أرقام مسجلة</p>}
+              </div>
             </div>
           </div>
-
-          {/* قسم فودافون كاش */}
-          <div className="card shadow-sm border border-gray-200 bg-white rounded-2xl h-full flex flex-col p-6">
-            <div className="flex justify-between items-center mb-6 pb-4">
-              <h2 className="text-2xl font-black flex items-center gap-3 text-gray-800">
-                <PhoneIcon size={28} className="text-red-600" />
-                محافظ فودافون كاش
-              </h2>
-              <span className="badge font-bold px-4 py-1.5 rounded-lg text-sm" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}>
-                {vodafoneNumbers.length} محفظة
-              </span>
-            </div>
-            
-            <div className="flex flex-col gap-4 flex-1">
-              {vodafoneNumbers.map(num => (
-                <div key={num.id} className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-red-300 hover:shadow-md transition-all flex justify-between items-center gap-4 group">
-                  <div className="flex-1 overflow-hidden">
-                    <div className="font-bold text-xl text-red-600 tracking-widest truncate text-left font-mono" dir="ltr">{num.number}</div>
-                    <div className="text-sm font-bold text-gray-500 mt-1.5 flex items-center gap-2">
-                       <span className="w-2 h-2 rounded-full bg-gray-300 inline-block"></span> ترتيب العرض: {num.displayOrder}
-                    </div>
-                  </div>
-                  <div className="flex gap-2 shrink-0">
-                    <button 
-                      onClick={() => handleToggle(num)} 
-                      className={`btn btn-sm font-bold rounded-lg px-4 ${num.isActive ? 'btn-success bg-green-50 text-green-700 hover:bg-green-100 border-none shadow-sm' : 'btn-outline bg-white text-gray-500 hover:bg-gray-50 border-gray-200 shadow-sm'}`}
-                    >
-                      {num.isActive ? <><CheckCircleIcon size={16} /> مُفعل</> : 'معطل'}
-                    </button>
-                    <button 
-                      onClick={() => handleDelete(num.id)} 
-                      className="btn btn-sm btn-outline border-red-100 text-error bg-white hover:bg-red-50 hover:border-red-200 rounded-lg px-3 shadow-sm transition-colors" 
-                      title="حذف المحفظة"
-                    >
-                      <TrashIcon size={18} />
-                    </button>
-                  </div>
-                </div>
-              ))}
-              {vodafoneNumbers.length === 0 && (
-                <div className="flex flex-col items-center justify-center flex-1 py-12 text-muted bg-gray-50/50 rounded-2xl">
-                  <PhoneIcon size={56} className="mb-4 text-gray-300" />
-                  <p className="font-bold text-gray-500">لا توجد محافظ فودافون كاش مسجلة</p>
-                </div>
-              )}
-            </div>
-          </div>
-        </div>
+        )}
       </main>
 
       <style jsx>{`
         .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
-        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
         @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
-        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
       `}</style>
     </div>
   );
-}+}
```

### `app\admin\pending-students\page.tsx`
```diff
--- Current: app\admin\pending-students\page.tsx
+++ Other: app\admin\pending-students\page.tsx
@@ -3,12 +3,14 @@
 import { useRouter } from 'next/navigation';
 import { useEffect, useState, useCallback } from 'react';
 import AdminSidebar from '../../components/AdminSidebar';
-import { useAuthGuard } from '../../hooks/useAuthGuard';
-import api from '@/lib/axios';
-import { 
-  CheckIcon, XIcon, SparklesIcon, AlertCircleIcon, 
-  CheckCircleIcon, FileTextIcon 
-} from '../../components/Icons';
+import { CheckIcon, XIcon, UsersIcon, SearchIcon, AlertCircleIcon, CheckCircleIcon, FileTextIcon, SparklesIcon } from '../../components/Icons';
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
+
+const getToken = () => {
+  if (typeof window === 'undefined') return null;
+  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
+};
 
 interface Student {
   id: number;
@@ -26,10 +28,33 @@
   createdAt: string;
 }
 
+interface RawStudent {
+  id: number;
+  full_name?: string;
+  name?: string;
+  fullName?: string;
+  email: string;
+  phone: string;
+  parent_phone?: string;
+  parentPhone?: string;
+  academic_year?: string;
+  academicYear?: string;
+  student_number?: string;
+  studentNumber?: string;
+  school: string;
+  parent_job?: string;
+  parentJob?: string;
+  governorate: string;
+  id_image?: string;
+  idImage?: string;
+  is_verified?: boolean;
+  isVerified?: boolean;
+  created_at?: string;
+  createdAt?: string;
+}
+
 export default function PendingStudentsPage() {
   const router = useRouter();
-  const { isChecking } = useAuthGuard(['admin']);
-
   const [loading, setLoading] = useState(true);
   const [students, setStudents] = useState<Student[]>([]);
   const [processing, setProcessing] = useState(false);
@@ -37,9 +62,6 @@
   const [approveModal, setApproveModal] = useState<Student | null>(null);
   const [rejectModal, setRejectModal] = useState<Student | null>(null);
   const [rejectReason, setRejectReason] = useState('');
-  
-  // 🚀 حالة جديدة مخصصة لعرض الصورة المكبرة فقط
-  const [imagePreview, setImagePreview] = useState<string | null>(null);
 
   const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
   
@@ -49,71 +71,86 @@
   }, []);
 
   useEffect(() => {
-    if (!isChecking) {
-      fetchPendingStudents();
-    }
-  }, [isChecking]);
-
-  // إغلاق التمرير عند فتح أي مودال أو صورة
-  useEffect(() => {
-    if (approveModal || rejectModal || imagePreview) {
-      document.body.style.overflow = 'hidden';
-    } else {
-      document.body.style.overflow = '';
-    }
-    return () => { document.body.style.overflow = ''; };
-  }, [approveModal, rejectModal, imagePreview]);
+    console.log('🔄 [PendingStudentsPage] Component Mounted & Rendering Started');
+    fetchPendingStudents();
+  // eslint-disable-next-line react-hooks/exhaustive-deps
+  }, []);
 
   const fetchPendingStudents = async () => {
-    setLoading(true);
     try {
-      const response = await api.get('/admin/users/pending');
-      const usersArray = response.data || [];
-
-      const mappedStudents = usersArray.map((s: any) => {
-        let imageUrl = s.idImageUrl || s.id_image_url || s.idImage || s.id_image || '';
-        if (imageUrl && imageUrl.includes('s3.us-east-005.backblazeb2.com/file/')) {
-          imageUrl = imageUrl.replace('s3.us-east-005.backblazeb2.com/file/', 's3.us-east-005.backblazeb2.com/');
-        }
-
-        return {
-          id: s.id,
-          fullName: s.fullName || s.full_name || 'غير محدد',
-          email: s.email,
-          phone: s.phone,
-          parentPhone: s.parentPhone || s.parent_phone || '',
-          academicYear: s.academicYear || s.academic_year || '',
-          studentNumber: s.studentNumber || s.student_number || '',
-          school: s.school,
-          parentJob: s.parentJob || s.parent_job || '',
-          governorate: s.governorate,
-          idImage: imageUrl,
-          isVerified: s.isVerified || s.is_verified || false,
-          // 🚀 الحل السحري للتاريخ: قراءة joinedAt القادمة من UserResource
-          createdAt: s.joinedAt || s.joined_at || s.createdAt || s.created_at || '',
-        };
+      const token = getToken();
+
+      if (!token) {
+        router.push('/login');
+        return;
+      }
+
+      const response = await fetch(`${API_URL}/api/admin/users/pending`, {
+        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
       });
 
-      setStudents(mappedStudents);
-    } catch (error: any) {
-      showToast(error?.message || 'خطأ في جلب طلبات التسجيل المعلقة', 'error');
+      if (response.ok) {
+        const data = await response.json();
+        const mappedStudents = (data.data || []).map((s: RawStudent) => {
+          let imageUrl = s.id_image || s.idImage;
+          if (imageUrl && imageUrl.includes('s3.us-east-005.backblazeb2.com/file/')) {
+            imageUrl = imageUrl.replace('s3.us-east-005.backblazeb2.com/file/', 's3.us-east-005.backblazeb2.com/');
+          }
+
+          return {
+            id: s.id,
+            fullName: s.full_name || s.fullName || 'غير محدد',
+            email: s.email,
+            phone: s.phone,
+            parentPhone: s.parent_phone || s.parentPhone || '',
+            academicYear: s.academic_year || s.academicYear || '',
+            studentNumber: s.student_number || s.studentNumber || '',
+            school: s.school,
+            parentJob: s.parent_job || s.parentJob || '',
+            governorate: s.governorate,
+            idImage: imageUrl || '',
+            isVerified: s.is_verified || s.isVerified || false,
+            createdAt: s.created_at || s.createdAt || '',
+          };
+        });
+
+        setStudents(mappedStudents);
+      }
+    } catch (error) {
+      showToast('خطأ في الاتصال بالخادم', 'error');
     } finally {
       setLoading(false);
     }
   };
 
   const executeApprove = async () => {
-    if (!approveModal) return;
+    if (!approveModal) {
+      return;
+    }
+
     setProcessing(true);
     
     try {
-      await api.post(`/admin/users/${approveModal.id}/approve`);
+      const token = getToken();
       
-      showToast('تمت الموافقة على الطالب وتفعيل حسابه بنجاح', 'success');
-      setStudents(prev => prev.filter((s) => s.id !== approveModal.id));
-      setApproveModal(null);
-    } catch (error: any) {
-      showToast(error?.message || 'فشل في الموافقة على الطالب', 'error');
+      const response = await fetch(`${API_URL}/api/admin/users/${approveModal.id}/approve`, {
+        method: 'POST',
+        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
+      });
+
+
+      const isJson = response.headers.get("content-type")?.includes("application/json");
+      const data = isJson ? await response.json() : await response.text();
+
+      if (response.ok) {
+        showToast('تمت الموافقة على الطالب بنجاح', 'success');
+        setStudents(prev => prev.filter((s) => s.id !== approveModal.id));
+        setApproveModal(null);
+      } else {
+        showToast(isJson ? (data.message || 'فشل في الموافقة') : `خطأ سيرفر (${response.status}) راجع الـ Console`, 'error');
+      }
+    } catch (error) {
+      showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
     } finally {
       setProcessing(false);
     }
@@ -128,14 +165,34 @@
 
     setProcessing(true);
     try {
-      await api.post(`/admin/users/${rejectModal.id}/reject`, { reason: rejectReason });
+      const token = getToken();
       
-      showToast('تم رفض الطالب بنجاح', 'success');
-      setStudents(prev => prev.filter((s) => s.id !== rejectModal.id));
-      setRejectModal(null);
-      setRejectReason('');
-    } catch (error: any) {
-      showToast(error?.message || 'فشل في رفض الطالب', 'error');
+      const response = await fetch(`${API_URL}/api/admin/users/${rejectModal.id}/reject`, {
+        method: 'POST',
+        headers: {
+          Authorization: `Bearer ${token}`,
+          'Content-Type': 'application/json',
+          Accept: 'application/json'
+        },
+        body: JSON.stringify({ reason: rejectReason }),
+      });
+
+
+      const isJson = response.headers.get("content-type")?.includes("application/json");
+      const data = isJson ? await response.json() : await response.text();
+
+
+      if (response.ok) {
+        showToast('تم رفض الطالب وإرسال إشعار له بنجاح', 'success');
+        setStudents(prev => prev.filter((s) => s.id !== rejectModal.id));
+        setRejectModal(null);
+        setRejectReason('');
+      } else {
+        console.error('❌ [API] Server Error:', data);
+        showToast(isJson ? (data.message || 'فشل في الرفض') : `خطأ سيرفر (${response.status}) راجع الـ Console`, 'error');
+      }
+    } catch (error) {
+      showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
     } finally {
       setProcessing(false);
     }
@@ -147,27 +204,19 @@
         setApproveModal(null);
         setRejectModal(null);
         setRejectReason('');
-        setImagePreview(null);
       }
     };
     window.addEventListener('keydown', handleEsc);
     return () => window.removeEventListener('keydown', handleEsc);
   }, []);
 
-  const getImageUrl = (path: string) => {
-    if (!path) return '';
-    if (path.startsWith('http')) return path;
-    return `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/storage/${path}`;
-  };
-
-  if (isChecking || loading) {
+  if (loading) {
     return (
       <div className="admin-layout">
         <AdminSidebar />
         <main className="admin-content">
           <div className="loading-state">
             <div className="spinner spinner-lg" />
-            <p className="mt-4 text-muted font-bold">جاري تحميل الطلبات المعلقة...</p>
           </div>
         </main>
       </div>
@@ -178,18 +227,10 @@
     <div className="admin-layout relative">
       <AdminSidebar />
       
-      {/* 🚀 إشعار عائم في أعلى منتصف الشاشة بشكل لطيف جداً */}
-      <div 
-        className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300" 
-        style={{ 
-          opacity: toast.visible ? 1 : 0, 
-          transform: toast.visible ? 'translate(-50%, 0)' : 'translate(-50%, -20px)', 
-          pointerEvents: toast.visible ? 'auto' : 'none' 
-        }}
-      >
-        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl text-sm font-bold ${toast.type === 'success' ? 'bg-green-600 text-white shadow-green-600/30' : 'bg-red-600 text-white shadow-red-600/30'}`}>
+      <div className="toast-container" style={{ opacity: toast.visible ? 1 : 0, pointerEvents: toast.visible ? 'auto' : 'none' }}>
+        <div className={`toast-content ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
           {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
-          <span>{toast.message}</span>
+          {toast.message}
         </div>
       </div>
 
@@ -215,20 +256,20 @@
             <p>لقد قمت بمراجعة جميع الطلبات. عمل رائع!</p>
           </div>
         ) : (
-          <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface)' }}>
-            <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
-              <table className="table" style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', margin: 0 }}>
+          <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface)' }}>
+            <div className="table-responsive">
+              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
                 <thead>
                   <tr style={{ background: 'var(--soft-bg)', borderBottom: '1px solid var(--border)' }}>
-                    <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>الطالب</th>
-                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>السنة الدراسية</th>
-                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>المحافظة</th>
-                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>رقم الهاتف</th>
-                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>هاتف ولي الأمر</th>
-                    <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>المدرسة / وظيفة ولي الأمر</th>
-                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>إثبات الهوية</th>
-                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>تاريخ الطلب</th>
-                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>الإجراءات</th>
+                    <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 'bold' }}>الطالب</th>
+                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold' }}>السنة الدراسية</th>
+                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold' }}>المحافظة</th>
+                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold' }}>رقم الهاتف</th>
+                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold' }}>هاتف ولي الأمر</th>
+                    <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 'bold' }}>المدرسة / وظيفة ولي الأمر</th>
+                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold' }}>إثبات الهوية</th>
+                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold' }}>تاريخ الطلب</th>
+                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold' }}>الإجراءات</th>
                   </tr>
                 </thead>
                 <tbody>
@@ -236,7 +277,7 @@
                     <tr key={student.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                       <td style={{ padding: '1rem 1.25rem' }}>
                         <div className="flex items-center gap-3">
-                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-md font-bold bg-gradient-to-br from-yellow-400 to-orange-500 shrink-0">
+                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-md font-bold bg-gradient-to-br from-yellow-400 to-orange-500">
                             {(student.fullName || '?').charAt(0)}
                           </div>
                           <div>
@@ -255,14 +296,12 @@
                       </td>
                       <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                         {student.idImage ? (
-                          <div className="inline-block overflow-hidden rounded border border-gray-200 shadow-sm" style={{ width: '60px', height: '40px' }}>
+                          <div className="inline-block overflow-hidden rounded border" style={{ width: '60px', height: '40px' }}>
                             {/* eslint-disable-next-line @next/next/no-img-element */}
                             <img
-                              src={getImageUrl(student.idImage)}
+                              src={student.idImage.startsWith('http') ? student.idImage : `${API_URL}/storage/${student.idImage}`}
                               alt="الهوية"
-                              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition"
-                              // 🚀 فتح الصورة المكبرة فقط بدلاً من نافذة الموافقة
-                              onClick={() => setImagePreview(getImageUrl(student.idImage))}
+                              className="w-full h-full object-cover"
                             />
                           </div>
                         ) : (
@@ -270,24 +309,25 @@
                         )}
                       </td>
                       <td style={{ padding: '1rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
-                        {/* 🚀 إظهار التاريخ بنجاح */}
-                        {student.createdAt ? new Date(student.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }) : '-'}
+                        {new Date(student.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                       </td>
                       <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                         <div className="flex gap-2 justify-center">
                           <button
                             onClick={() => setApproveModal(student)}
-                            className="btn btn-sm btn-success shrink-0"
-                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.75rem', borderRadius: '8px' }}
+                            className="btn btn-sm btn-success"
+                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.75rem', borderRadius: '8px' }}
                           >
-                            <CheckIcon size={14} /> موافقة
+                            <CheckIcon size={14} />
+                            موافقة
                           </button>
                           <button
                             onClick={() => setRejectModal(student)}
-                            className="btn btn-sm btn-outline shrink-0"
-                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid var(--error)', color: 'var(--error)', background: 'transparent' }}
+                            className="btn btn-sm btn-outline"
+                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.75rem', borderRadius: '8px', border: '1px solid var(--error)', color: 'var(--error)', background: 'transparent' }}
                           >
-                            <XIcon size={14} /> رفض
+                            <XIcon size={14} />
+                            رفض
                           </button>
                         </div>
                       </td>
@@ -300,109 +340,260 @@
         )}
       </main>
 
-      {/* 🚀 نافذة عرض الصورة المكبرة (يُغلق عند الضغط خارج الصورة) */}
-      {imagePreview && (
-        <div 
-          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
-          onClick={() => setImagePreview(null)}
-        >
-          <div className="relative max-w-4xl max-h-[90vh] flex items-center justify-center">
-            {/* eslint-disable-next-line @next/next/no-img-element */}
-            <img
-              src={imagePreview}
-              alt="تكبير الهوية"
-              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain"
-              onClick={(e) => e.stopPropagation()} // منع الإغلاق عند الضغط على الصورة نفسها
-            />
+      {approveModal && (
+        <div className="fixed inset-0 z-[100] bg-white flex flex-col md:flex-row overflow-y-auto animate-fade-in" style={{ direction: 'rtl' }}>
+          {/* Left panel: Large ID Image */}
+          <div className="md:w-1/2 bg-slate-950 flex flex-col justify-center items-center p-6 relative min-h-[300px] md:min-h-screen">
+            <h4 className="absolute top-4 right-4 text-white text-sm font-bold bg-black/50 px-3 py-1.5 rounded-full z-10">
+              صورة إثبات الهوية للتحقق
+            </h4>
+            {approveModal.idImage ? (
+              // eslint-disable-next-line @next/next/no-img-element
+              <img
+                src={approveModal.idImage.startsWith('http') ? approveModal.idImage : `${API_URL}/storage/${approveModal.idImage}`}
+                alt="صورة الهوية"
+                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
+              />
+            ) : (
+              <div className="text-gray-400 text-center">
+                <AlertCircleIcon size={48} className="mx-auto mb-2" />
+                <p>لا توجد صورة إثبات هوية مرفقة</p>
+              </div>
+            )}
+            {approveModal.idImage && (
+              <a
+                href={approveModal.idImage.startsWith('http') ? approveModal.idImage : `${API_URL}/storage/${approveModal.idImage}`}
+                target="_blank"
+                rel="noopener noreferrer"
+                className="mt-4 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-lg flex items-center gap-2 border border-white/20 transition-all"
+              >
+                <SearchIcon size={18} />
+                عرض الصورة بالحجم الكامل ↗
+              </a>
+            )}
+          </div>
+
+          {/* Right panel: Details & Confirmation Form */}
+          <div className="md:w-1/2 bg-white flex flex-col justify-between p-8 md:p-12 relative min-h-[400px]">
+            {/* Close Button */}
             <button
-              className="absolute -top-12 right-0 text-white hover:text-red-400 bg-black/50 hover:bg-black/80 rounded-full p-2 transition-all cursor-pointer"
-              onClick={() => setImagePreview(null)}
+              type="button"
+              onClick={() => setApproveModal(null)}
+              className="absolute top-6 left-6 w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 transition-all border border-gray-200 cursor-pointer shadow-sm"
+              title="إغلاق"
             >
-              <XIcon size={24} />
+              <XIcon size={20} />
             </button>
-          </div>
-        </div>
-      )}
-
-      {/* 🚀 نافذة تأكيد الموافقة (تصميم صغير وجميل في المنتصف) */}
-      {approveModal && (
-        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" dir="rtl" onClick={() => setApproveModal(null)}>
-          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden relative" onClick={e => e.stopPropagation()}>
-            <div className="p-6 text-center">
-              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
-                <CheckIcon size={32} />
-              </div>
-              <h3 className="text-xl font-bold text-gray-900 mb-2">تأكيد الموافقة</h3>
-              <p className="text-gray-500 mb-6 text-sm">
-                هل أنت متأكد من رغبتك في تفعيل حساب الطالب <span className="font-bold text-gray-800">{approveModal.fullName}</span>؟
-              </p>
-              <div className="flex gap-3">
-                <button 
-                  onClick={() => setApproveModal(null)} 
-                  disabled={processing} 
-                  className="btn btn-outline flex-1 py-2.5 rounded-xl text-gray-700 text-sm font-bold border-gray-200 hover:bg-gray-50"
+
+            {/* Content Container */}
+            <div className="my-auto max-w-lg mx-auto w-full space-y-8">
+              <div className="text-center md:text-right">
+                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 mx-auto md:mx-0 shadow-inner">
+                  <CheckIcon size={36} />
+                </div>
+                <h2 className="text-3xl font-black text-gray-900 leading-tight">قبول وتفعيل حساب الطالب</h2>
+                <p className="text-gray-500 mt-2">يرجى مراجعة البيانات الشخصية وتأكيد رغبتك في تفعيل الحساب.</p>
+              </div>
+
+              {/* Student Details Card */}
+              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm text-right">
+                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
+                  <span className="text-gray-500 font-medium">اسم الطالب</span>
+                  <span className="font-bold text-gray-900 text-base">{approveModal.fullName}</span>
+                </div>
+                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
+                  <span className="text-gray-500 font-medium">السنة الدراسية</span>
+                  <span className="font-bold text-primary text-base">{approveModal.academicYear}</span>
+                </div>
+                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
+                  <span className="text-gray-500 font-medium">المحافظة</span>
+                  <span className="font-bold text-gray-800">{approveModal.governorate || '-'}</span>
+                </div>
+                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
+                  <span className="text-gray-500 font-medium">رقم الهاتف</span>
+                  <span className="font-bold text-gray-900 font-mono" dir="ltr">{approveModal.phone}</span>
+                </div>
+                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
+                  <span className="text-gray-500 font-medium">هاتف ولي الأمر</span>
+                  <span className="font-bold text-gray-900 font-mono" dir="ltr">{approveModal.parentPhone}</span>
+                </div>
+                <div className="flex justify-between items-center pb-1">
+                  <span className="text-gray-500 font-medium">المدرسة</span>
+                  <span className="font-bold text-gray-800">{approveModal.school || '-'}</span>
+                </div>
+              </div>
+
+              {/* Action Buttons */}
+              <div className="flex gap-4">
+                <button
+                  type="button"
+                  onClick={() => setApproveModal(null)}
+                  disabled={processing}
+                  className="btn btn-outline flex-1 py-3.5 rounded-xl font-bold text-base cursor-pointer hover:bg-gray-50 transition-all border-gray-300"
                 >
                   إلغاء
                 </button>
-                <button 
-                  onClick={executeApprove} 
-                  disabled={processing} 
-                  className="btn btn-success flex-1 py-2.5 rounded-xl text-white shadow-lg shadow-green-200/50 text-sm font-bold"
+                <button
+                  type="button"
+                  onClick={executeApprove}
+                  disabled={processing}
+                  className="btn btn-success flex-[2] py-3.5 rounded-xl font-bold text-base cursor-pointer shadow-lg shadow-green-200/50 hover:shadow-xl transition-all"
                 >
-                  {processing ? <span className="spinner spinner-light w-4 h-4 border-2" /> : 'نعم، موافق'}
+                  {processing ? <span className="spinner spinner-light w-5 h-5 border-2" /> : 'تفعيل الحساب فوراً'}
                 </button>
               </div>
+            </div>
+
+            {/* Footer */}
+            <div className="text-center text-xs text-gray-400 mt-6 border-t pt-4">
+              الموافقة على الطالب ستمنحه صلاحية الدخول للمنصة وشحن محفظته والاشتراك في الكورسات.
             </div>
           </div>
         </div>
       )}
 
-      {/* 🚀 نافذة تأكيد الرفض (تصميم صغير وجميل في المنتصف) */}
       {rejectModal && (
-        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" dir="rtl" onClick={() => { setRejectModal(null); setRejectReason(''); }}>
-          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden relative" onClick={e => e.stopPropagation()}>
-            <div className="p-6 text-center">
-              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
-                <XIcon size={32} />
-              </div>
-              <h3 className="text-xl font-bold text-gray-900 mb-2">رفض الحساب</h3>
-              <p className="text-gray-500 mb-4 text-sm">
-                يرجى كتابة سبب رفض الطالب <span className="font-bold text-gray-800">{rejectModal.fullName}</span>
-              </p>
-              
-              <textarea
-                value={rejectReason}
-                onChange={(e) => setRejectReason(e.target.value)}
-                placeholder="اكتب سبب الرفض هنا ليظهر للطالب..."
-                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-right text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none mb-4 resize-none transition-all"
-                rows={3}
+        <div className="fixed inset-0 z-[100] bg-white flex flex-col md:flex-row overflow-y-auto animate-fade-in" style={{ direction: 'rtl' }}>
+          {/* Left panel: Large ID Image */}
+          <div className="md:w-1/2 bg-slate-950 flex flex-col justify-center items-center p-6 relative min-h-[300px] md:min-h-screen">
+            <h4 className="absolute top-4 right-4 text-white text-sm font-bold bg-black/50 px-3 py-1.5 rounded-full z-10">
+              صورة إثبات الهوية للتحقق
+            </h4>
+            {rejectModal.idImage ? (
+              // eslint-disable-next-line @next/next/no-img-element
+              <img
+                src={rejectModal.idImage.startsWith('http') ? rejectModal.idImage : `${API_URL}/storage/${rejectModal.idImage}`}
+                alt="صورة الهوية"
+                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
               />
-
-              <div className="flex gap-3">
-                <button 
-                  onClick={() => { setRejectModal(null); setRejectReason(''); }} 
-                  disabled={processing} 
-                  className="btn btn-outline flex-1 py-2.5 rounded-xl text-gray-700 text-sm font-bold border-gray-200 hover:bg-gray-50"
+            ) : (
+              <div className="text-gray-400 text-center">
+                <AlertCircleIcon size={48} className="mx-auto mb-2" />
+                <p>لا توجد صورة إثبات هوية مرفقة</p>
+              </div>
+            )}
+            {rejectModal.idImage && (
+              <a
+                href={rejectModal.idImage.startsWith('http') ? rejectModal.idImage : `${API_URL}/storage/${rejectModal.idImage}`}
+                target="_blank"
+                rel="noopener noreferrer"
+                className="mt-4 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-lg flex items-center gap-2 border border-white/20 transition-all"
+              >
+                <SearchIcon size={18} />
+                عرض الصورة بالحجم الكامل ↗
+              </a>
+            )}
+          </div>
+
+          {/* Right panel: Details & Rejection Form */}
+          <div className="md:w-1/2 bg-white flex flex-col justify-between p-8 md:p-12 relative min-h-[400px]">
+            {/* Close Button */}
+            <button
+              type="button"
+              onClick={() => { setRejectModal(null); setRejectReason(''); }}
+              className="absolute top-6 left-6 w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 transition-all border border-gray-200 cursor-pointer shadow-sm"
+              title="إغلاق"
+            >
+              <XIcon size={20} />
+            </button>
+
+            {/* Content Container */}
+            <div className="my-auto max-w-lg mx-auto w-full space-y-6">
+              <div className="text-center md:text-right">
+                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto md:mx-0 shadow-inner">
+                  <XIcon size={36} />
+                </div>
+                <h2 className="text-3xl font-black text-gray-900 leading-tight">رفض طلب التسجيل</h2>
+                <p className="text-gray-500 mt-2">سيتم رفض الحساب وإرسال رسالة توضح سبب الرفض للطالب.</p>
+              </div>
+
+              {/* Student Details Card */}
+              <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 text-sm text-right flex justify-between items-center">
+                <div>
+                  <span className="text-gray-500 block text-xs">اسم الطالب</span>
+                  <strong className="text-red-900 text-base">{rejectModal.fullName}</strong>
+                </div>
+                <div className="text-left">
+                  <span className="text-gray-500 block text-xs">السنة الدراسية</span>
+                  <strong className="text-primary text-base">{rejectModal.academicYear}</strong>
+                </div>
+              </div>
+
+              {/* Rejection Form Input */}
+              <div className="space-y-3 text-right">
+                <label className="form-label text-gray-700 font-bold block">سبب الرفض (يظهر للطالب في لوحة التحكم)</label>
+                <textarea
+                  value={rejectReason}
+                  onChange={(e) => setRejectReason(e.target.value)}
+                  placeholder="مثال: صورة إثبات الهوية غير واضحة أو لا تطابق البيانات المدخلة، يرجى إعادة رفع صورة واضحة ومقروءة..."
+                  className="input-field w-full bg-gray-50 focus:bg-white transition-all border-gray-300 focus:border-red-500 focus:ring-red-100 rounded-xl"
+                  rows={5}
+                  dir="rtl"
+                  style={{ resize: 'none', padding: '1rem', fontSize: '0.95rem' }}
+                />
+                
+                {/* Quick select templates */}
+                <div className="flex flex-wrap gap-2 mt-2">
+                  <span className="text-xs text-gray-500 font-semibold py-1">أسباب سريعة:</span>
+                  <button
+                    type="button"
+                    onClick={() => setRejectReason('صورة إثبات الهوية غير واضحة ومشوَّشة، يرجى إعادة رفع صورة واضحة لبطاقة الهوية.')}
+                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full cursor-pointer transition-colors"
+                  >
+                    صورة غير واضحة
+                  </button>
+                  <button
+                    type="button"
+                    onClick={() => setRejectReason('صورة الهوية المرفوعة لا تخص الطالب صاحب الطلب. يرجى رفع إثبات هوية صحيح.')}
+                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full cursor-pointer transition-colors"
+                  >
+                    الهوية لا تطابق الاسم
+                  </button>
+                  <button
+                    type="button"
+                    onClick={() => setRejectReason('يرجى التأكد من كتابة الاسم ثلاثي باللغة العربية وإعادة إرسال طلب تفعيل الحساب.')}
+                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full cursor-pointer transition-colors"
+                  >
+                    الاسم يحتاج تعديل
+                  </button>
+                </div>
+              </div>
+
+              {/* Action Buttons */}
+              <div className="flex gap-4">
+                <button
+                  type="button"
+                  onClick={() => { setRejectModal(null); setRejectReason(''); }}
+                  disabled={processing}
+                  className="btn btn-outline flex-1 py-3.5 rounded-xl font-bold text-base cursor-pointer hover:bg-gray-50 transition-all border-gray-300"
                 >
                   إلغاء
                 </button>
-                <button 
-                  onClick={executeReject} 
-                  disabled={processing || rejectReason.trim().length < 10} 
-                  className="btn btn-danger flex-1 py-2.5 rounded-xl text-white shadow-lg shadow-red-200/50 text-sm font-bold"
+                <button
+                  type="button"
+                  onClick={executeReject}
+                  disabled={processing || rejectReason.trim().length < 10}
+                  className="btn btn-danger flex-[2] py-3.5 rounded-xl font-bold text-base cursor-pointer shadow-lg shadow-red-200/50 hover:shadow-xl transition-all"
                 >
-                  {processing ? <span className="spinner spinner-light w-4 h-4 border-2" /> : 'تأكيد الرفض'}
+                  {processing ? <span className="spinner spinner-light w-5 h-5 border-2" /> : 'تأكيد الرفض والإرسال'}
                 </button>
               </div>
+            </div>
+
+            {/* Footer */}
+            <div className="text-center text-xs text-gray-400 mt-6 border-t pt-4">
+              عند الرفض، سيتمكن الطالب من الدخول لداشبورد محدود لرفع صورة هوية أو تعديل بياناته لإعادة المراجعة.
             </div>
           </div>
         </div>
       )}
 
       <style jsx>{`
-        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
+        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
+        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
         @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
+        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
       `}</style>
     </div>
   );
-}+}
```

### `app\admin\plan\page.tsx`
```diff
--- Current: app\admin\plan\page.tsx
+++ Other: app\admin\plan\page.tsx
@@ -1,15 +1,15 @@
 'use client';
 
 import { useRouter } from 'next/navigation';
-import { useEffect, useState, useCallback } from 'react';
+import { useEffect, useState } from 'react';
 import AdminSidebar from '../../components/AdminSidebar';
-import { useAuthGuard } from '../../hooks/useAuthGuard'; // 🚀 الدرع المركزي
-import api from '@/lib/axios'; // 🚀 العميل الذكي
-import { 
-  TrendingUpIcon, UsersIcon, DownloadIcon, 
-  VideoIcon, KeyIcon, MessageIcon, 
-  AwardIcon, AlertTriangleIcon, CheckCircleIcon, AlertCircleIcon 
-} from '../../components/Icons';
+import { TrendingUpIcon, UsersIcon, DownloadIcon, VideoIcon, KeyIcon, MessageIcon, AwardIcon, AlertTriangleIcon } from '../../components/Icons';
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+
+const getToken = () => {
+  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
+};
 
 interface LimitInfo {
   plan: string;
@@ -21,134 +21,104 @@
 
 export default function AdminPlanPage() {
   const router = useRouter();
-  
-  // 🚀 درع الحماية: يطرد أي شخص ليس أدمن فوراً ويعرض شاشة التحميل
-  const { isChecking } = useAuthGuard(['admin']);
-  
   const [loading, setLoading] = useState(true);
+  const [authorized, setAuthorized] = useState(false);
   const [limits, setLimits] = useState<LimitInfo | null>(null);
 
-  // 🚀 نظام التنبيهات الموحد والاحترافي بدلاً من الدالة الوهمية
-  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
-  const showToast = useCallback((message: string, type: 'success' | 'error') => {
-    setToast({ visible: true, message, type });
-    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
+  useEffect(() => {
+    checkAdminAuth();
+    // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);
 
-  useEffect(() => {
-    // 🚀 لا نطلب البيانات إلا بعد التأكد من أن المستخدم أدمن
-    if (!isChecking) {
-      fetchPlanLimits();
+  const checkAdminAuth = async () => {
+    try {
+      const token = getToken();
+      if (!token) {
+        router.push('/login');
+        return;
+      }
+
+      const authRes = await fetch(`${API_URL}/api/auth/me`, {
+        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
+      });
+
+      if (!authRes.ok) {
+        router.push('/login');
+        return;
+      }
+
+      const userData = await authRes.json();
+      const user = userData.data?.user || userData.data || userData;
+      const isAdmin = user?.is_admin === true || user?.is_admin === 1 || user?.isAdmin === true || user?.role === 'admin';
+
+      if (!isAdmin) {
+        router.push('/');
+        return;
+      }
+
+      setAuthorized(true);
+      fetchPlanLimits(token);
+    } catch {
+      router.push('/login');
     }
-  }, [isChecking]);
-
-  const fetchPlanLimits = async () => {
+  };
+
+  const fetchPlanLimits = async (token: string) => {
     try {
-      const response: any = await api.get('/admin/limits');
-      const data = response.data || response;
-      
-      if (data) {
-        // 🚀 تنظيف وتوحيد البيانات (Sanitization) لمنع مشكلة NaN نهائياً
-        const safeLimits: LimitInfo = {
-          plan: data.plan || 'startup',
-          planName: data.planName || data.plan_name || 'باقة النشأة',
-          students: {
-            current: Number(data.students?.current) || 0,
-            max: Number(data.students?.max) || 1, // لمنع القسمة على صفر
-            percentage: Number(data.students?.percentage) || 0,
-          },
-          storage: {
-            // دعم كلا التسميتين من الباك إند
-            current_bytes: Number(data.storage?.current_bytes ?? data.storage?.currentBytes) || 0,
-            max_bytes: Number(data.storage?.max_bytes ?? data.storage?.maxBytes) || 1,
-            percentage: Number(data.storage?.percentage) || 0,
-          },
-          warning: !!data.warning
-        };
-        setLimits(safeLimits);
-      }
-    } catch (e: any) {
+      const res = await fetch(`${API_URL}/api/admin/limits`, {
+        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
+      });
+      if (res.ok) {
+        const data = await res.json();
+        if (data.success && data.data) {
+          setLimits(data.data);
+        }
+      }
+    } catch (e) {
       console.error('Failed to fetch plan limits:', e);
-      showToast('تعذر جلب بيانات الباقة، يرجى تحديث الصفحة', 'error');
     } finally {
       setLoading(false);
     }
   };
 
-  // 🚀 دالة ذكية تحمي من أي قيمة غير صالحة
-  const formatBytes = (bytes: any): string => {
-    const num = Number(bytes);
-    if (isNaN(num)) return '0.00 GB';
-    const gb = num / (1024 * 1024 * 1024);
-    return `${gb.toFixed(2)} GB`;
-  };
-
-  const getPercentageColor = (percentage: number): string => {
-    if (isNaN(percentage)) return '#10b981'; // حماية إضافية
-    if (percentage >= 90) return '#ef4444'; // أحمر (خطر)
-    if (percentage >= 75) return '#f59e0b'; // برتقالي (تحذير)
-    return '#10b981'; // أخضر (آمن)
-  };
-
-  const getAllowedQualities = (plan: string): string[] => {
-    if (plan === 'professional' || plan === 'enterprise') {
-      return ['480p (SD)', '720p (HD)', '1080p (FHD)'];
-    }
-    return ['480p (SD)'];
-  };
-
-  const whatsappLink = "https://api.whatsapp.com/send/?phone=201067473845&text=%D8%AD%D8%A7%D8%A8%D8%A8+%D8%A7%D8%B1%D9%81%D8%B9+%D8%A7%D9%84%D8%A8%D8%A7%D9%82%D8%A9&type=phone_number&app_absent=0";
-
-  if (isChecking || loading) {
+  if (loading) {
     return (
       <div className="admin-layout">
         <AdminSidebar />
         <main className="admin-content flex items-center justify-center min-h-[60vh]">
-          <div className="text-center">
-            <div className="spinner spinner-lg mb-4 mx-auto" />
-            <p className="text-muted font-bold">جاري تحميل بيانات الاستهلاك...</p>
-          </div>
+          <div className="spinner spinner-lg" />
         </main>
       </div>
     );
   }
 
-  if (!limits) {
-    return (
-      <div className="admin-layout">
-        <AdminSidebar />
-        <main className="admin-content flex items-center justify-center min-h-[60vh]">
-          <div className="text-center">
-            <AlertTriangleIcon size={48} className="mx-auto mb-4 text-error opacity-50" />
-            <p className="text-error font-bold text-lg">حدث خطأ في جلب بيانات الباقة.</p>
-            <button onClick={() => window.location.reload()} className="btn btn-outline mt-4 font-bold">
-              تحديث الصفحة
-            </button>
-          </div>
-        </main>
-      </div>
-    );
+  if (!authorized || !limits) {
+    return null;
   }
 
+  const formatBytes = (bytes: number): string => {
+    const gb = bytes / (1024 * 1024 * 1024);
+    return `${gb.toFixed(2)} GB`;
+  };
+
+  const getPercentageColor = (percentage: number): string => {
+    if (percentage >= 90) return '#ef4444';
+    if (percentage >= 75) return '#f59e0b';
+    return '#10b981';
+  };
+
+  const getAllowedQualities = (plan: string): string[] => {
+    if (plan === 'professional') {
+      return ['480p (SD)', '720p (HD)'];
+    }
+    return ['480p (SD)'];
+  };
+
+  const whatsappLink = "https://api.whatsapp.com/send/?phone=201067473845&text=%D8%AD%D8%A7%D8%A8%D8%A8+%D8%A7%D8%B1%D9%81%D8%B9+%D8%A7%D9%84%D8%A8%D8%A7%D9%82%D8%A9&type=phone_number&app_absent=0";
+
   return (
-    <div className="admin-layout relative">
+    <div className="admin-layout">
       <AdminSidebar />
-
-      {/* 🚀 إشعار عائم في أعلى منتصف الشاشة */}
-      <div 
-        className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300" 
-        style={{ 
-          opacity: toast.visible ? 1 : 0, 
-          transform: toast.visible ? 'translate(-50%, 0)' : 'translate(-50%, -20px)', 
-          pointerEvents: toast.visible ? 'auto' : 'none' 
-        }}
-      >
-        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl text-sm font-bold ${toast.type === 'success' ? 'bg-green-600 text-white shadow-green-600/30' : 'bg-red-600 text-white shadow-red-600/30'}`}>
-          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
-          <span>{toast.message}</span>
-        </div>
-      </div>
-
       <main className="admin-content">
         <div className="max-w-3xl mx-auto">
           
@@ -162,41 +132,41 @@
             </p>
           </div>
 
-          <div className="card mb-8 overflow-hidden relative shadow-md" style={{ background: 'linear-gradient(135deg, var(--gradient-primary), #0B4F6C)', color: 'white', border: 'none' }}>
+          <div className="card mb-8 overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--gradient-primary), #0B4F6C)', color: 'white', border: 'none' }}>
             <div className="relative" style={{ zIndex: 1 }}>
               <div className="absolute top-[-20px] left-[-20px] w-[120px] h-[120px] rounded-full" style={{ background: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }} />
               <div className="flex justify-between items-center flex-wrap gap-4">
                 <div>
-                  <p className="text-sm uppercase tracking-wider opacity-85 mb-1 font-bold">الباقة الحالية للمنصة</p>
+                  <p className="text-sm uppercase tracking-wider opacity-85 mb-1">الباقة الحالية للمنصة</p>
                   <h2 className="text-3xl font-extrabold m-0">{limits.planName}</h2>
                 </div>
                 <div className="flex items-center gap-2 py-3 px-5 rounded-lg font-semibold text-sm" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                   <KeyIcon size={16} />
-                  باقة مدارة برمجياً (Enterprise)
+                  باقة مدارة برمجياً
                 </div>
               </div>
             </div>
           </div>
 
           <div className="flex flex-col gap-6 mb-8">
-            {/* قسم الطلاب */}
-            <div className="card p-6 shadow-sm border border-gray-100 bg-white rounded-2xl">
+            
+            <div className="card p-6">
               <div className="flex justify-between items-center mb-4">
-                <span className="font-bold text-lg flex items-center gap-2 text-gray-800">
-                  <UsersIcon size={20} className="text-primary" />
+                <span className="font-bold text-lg flex items-center gap-2">
+                  <UsersIcon size={20} />
                   عدد الطلاب المشتركين
                 </span>
-                <span className="font-semibold text-gray-600 font-mono bg-gray-50 px-3 py-1 rounded-lg" dir="ltr">
-                  {limits.students.current} / {limits.students.max}
-                </span>
-              </div>
-              <div className="h-3 rounded-full mb-3" style={{ background: 'var(--soft-bg)', overflow: 'hidden' }}>
-                <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(limits.students.percentage || 0, 100)}%`, background: getPercentageColor(limits.students.percentage) }} />
-              </div>
-              <div className="flex justify-between text-sm font-bold text-muted">
-                <span>نسبة الاستهلاك: {(limits.students.percentage || 0).toFixed(1)}%</span>
+                <span className="font-semibold text-muted">
+                  {limits.students.current} / {limits.students.max} طالب
+                </span>
+              </div>
+              <div className="h-3 rounded-full mb-3" style={{ background: 'var(--background)', overflow: 'hidden' }}>
+                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(limits.students.percentage, 100)}%`, background: getPercentageColor(limits.students.percentage) }} />
+              </div>
+              <div className="flex justify-between text-sm text-muted">
+                <span>نسبة الاستهلاك: {limits.students.percentage.toFixed(1)}%</span>
                 {limits.students.percentage >= 80 && (
-                  <span className="flex items-center gap-1 font-bold text-error animate-pulse">
+                  <span className="flex items-center gap-1 font-bold" style={{ color: '#ef4444' }}>
                     <AlertTriangleIcon size={14} />
                     قارب حد الطلاب على النفاد!
                   </span>
@@ -204,44 +174,44 @@
               </div>
             </div>
 
-            {/* قسم التخزين */}
-            <div className="card p-6 shadow-sm border border-gray-100 bg-white rounded-2xl">
+            <div className="card p-6">
               <div className="flex justify-between items-center mb-4">
-                <span className="font-bold text-lg flex items-center gap-2 text-gray-800">
-                  <DownloadIcon size={20} className="text-secondary" />
+                <span className="font-bold text-lg flex items-center gap-2">
+                  <DownloadIcon size={20} />
                   المساحة المستخدمة للفيديوهات
                 </span>
-                <span className="font-semibold text-gray-600 font-mono bg-gray-50 px-3 py-1 rounded-lg" dir="ltr">
+                <span className="font-semibold text-muted">
                   {formatBytes(limits.storage.current_bytes)} / {formatBytes(limits.storage.max_bytes)}
                 </span>
               </div>
-              <div className="h-3 rounded-full mb-3" style={{ background: 'var(--soft-bg)', overflow: 'hidden' }}>
-                <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(limits.storage.percentage || 0, 100)}%`, background: getPercentageColor(limits.storage.percentage) }} />
-              </div>
-              <div className="flex justify-between text-sm font-bold text-muted">
-                <span>نسبة الاستهلاك: {(limits.storage.percentage || 0).toFixed(1)}%</span>
+              <div className="h-3 rounded-full mb-3" style={{ background: 'var(--background)', overflow: 'hidden' }}>
+                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(limits.storage.percentage, 100)}%`, background: getPercentageColor(limits.storage.percentage) }} />
+              </div>
+              <div className="flex justify-between text-sm text-muted">
+                <span>نسبة الاستهلاك: {limits.storage.percentage.toFixed(1)}%</span>
                 {limits.storage.percentage >= 80 && (
-                  <span className="flex items-center gap-1 font-bold text-error animate-pulse">
+                  <span className="flex items-center gap-1 font-bold" style={{ color: '#ef4444' }}>
                     <AlertTriangleIcon size={14} />
                     قاربت المساحة التخزينية على الامتلاء!
                   </span>
                 )}
               </div>
             </div>
-          </div>
-
-          <div className="card p-6 mb-8 shadow-sm border border-gray-100 rounded-2xl bg-white">
-            <h3 className="font-bold text-lg mb-5 flex items-center gap-2 text-gray-800">
-              <VideoIcon size={20} className="text-primary" />
+
+          </div>
+
+          <div className="card p-6 mb-8">
+            <h3 className="font-bold text-lg mb-5 flex items-center gap-2">
+              <VideoIcon size={20} />
               ميزات التشفير والبث المتاحة
             </h3>
             
             <div className="flex flex-col gap-4">
-              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
-                <span className="text-muted font-bold">جودة تشفير الفيديوهات:</span>
+              <div className="flex justify-between items-center pb-3 border-b">
+                <span className="text-muted">جودة تشفير الفيديوهات:</span>
                 <div className="flex gap-2">
                   {getAllowedQualities(limits.plan).map((q, idx) => (
-                    <span key={idx} className="badge text-sm font-bold" style={{ background: 'rgba(11, 79, 108, 0.1)', color: 'var(--primary)' }}>
+                    <span key={idx} className="badge text-sm" style={{ background: 'rgba(11, 79, 108, 0.1)', color: 'var(--primary)' }}>
                       {q}
                     </span>
                   ))}
@@ -249,26 +219,26 @@
               </div>
               
               <div className="flex justify-between items-center">
-                <span className="text-muted font-bold">وضع التخزين السحابي:</span>
-                <span className="font-bold flex items-center gap-1 text-gray-800">
-                  Backblaze B2 مع شبكة Cloudflare CDN <TrendingUpIcon size={16} className="text-success" />
-                </span>
-              </div>
-            </div>
-          </div>
-
-          <div className="card p-8 text-center rounded-2xl" style={{ border: '2px dashed #10b981', background: 'rgba(16, 185, 129, 0.05)' }}>
+                <span className="text-muted">وضع التخزين السحابي:</span>
+                <span className="font-semibold flex items-center gap-1">
+                  Backblaze B2 مع شبكة Cloudflare CDN <TrendingUpIcon size={16} />
+                </span>
+              </div>
+            </div>
+          </div>
+
+          <div className="card p-8 text-center" style={{ border: '1px dashed #10b981', background: 'rgba(16, 185, 129, 0.05)' }}>
             <h3 className="font-extrabold text-xl mb-2" style={{ color: '#047857' }}>
               هل ترغب في ترقية باقتك أو تعديل الموارد؟
             </h3>
-            <p className="text-muted text-sm mb-6 max-w-lg mx-auto font-medium">
+            <p className="text-muted text-sm mb-6 max-w-lg mx-auto">
               تستطيع رفع باقتك في أي وقت لتوفير مساحة لرفع محاضرات أكثر، أو زيادة أعداد الطلاب الذين يمكنهم التسجيل في منصتك.
             </p>
             <a
               href={whatsappLink}
               target="_blank"
               rel="noopener noreferrer"
-              className="btn inline-flex items-center gap-3 text-white font-bold text-base no-underline shadow-lg hover:-translate-y-1 transition-all rounded-xl"
+              className="btn inline-flex items-center gap-3 text-white font-bold text-base no-underline shadow-lg hover:-translate-y-0.5 transition-all"
               style={{ background: '#10b981', padding: '0.75rem 2rem' }}
             >
               <MessageIcon size={20} />
@@ -280,4 +250,4 @@
       </main>
     </div>
   );
-}+}
```

### `app\admin\security\page.tsx`
```diff
--- Current: app\admin\security\page.tsx
+++ Other: app\admin\security\page.tsx
@@ -1,52 +1,9 @@
 'use client';
-
-import { useEffect, useState, useCallback } from 'react';
+import { useEffect, useState } from 'react';
 import { useRouter } from 'next/navigation';
 import AdminSidebar from '../../components/AdminSidebar';
-import { useAuthGuard } from '../../hooks/useAuthGuard'; // 🚀 حارس البوابة المركزي
-import api from '@/lib/axios'; // 🚀 العميل المركزي المحمي
-import { 
-  ShieldIcon, UsersIcon, AlertTriangleIcon, XIcon, 
-  TrashIcon, LockIcon, UnlockIcon, AlertCircleIcon, 
-  CheckCircleIcon, BarChartIcon 
-} from '../../components/Icons';
-
-// 🚀 قاموس ترجمة السنوات الدراسية لجماليات العرض
-const ACADEMIC_YEARS = [
-  { value: 'grade_1', label: 'الأول الابتدائي' },
-  { value: 'grade_2', label: 'الثاني الابتدائي' },
-  { value: 'grade_3', label: 'الثالث الابتدائي' },
-  { value: 'grade_4', label: 'الرابع الابتدائي' },
-  { value: 'grade_5', label: 'الخامس الابتدائي' },
-  { value: 'grade_6', label: 'السادس الابتدائي' },
-  { value: 'grade_7', label: 'الأول الإعدادي' },
-  { value: 'grade_8', label: 'الثاني الإعدادي' },
-  { value: 'grade_9', label: 'الثالث الإعدادي' },
-  { value: 'grade_10', label: 'الأول الثانوي' },
-  { value: 'grade_11', label: 'الثاني الثانوي' },
-  { value: 'grade_12', label: 'الثالث الثانوي' },
-  { value: 'other', label: 'أخرى / جامعي' }
-];
-
-function getAcademicYearLabel(val: string) {
-  const found = ACADEMIC_YEARS.find(y => y.value === val);
-  return found ? found.label : val;
-}
-
-// 🚀 دالة مضادة للرصاص لاستخراج المصفوفات من استجابة Laravel
-const extractArray = (response: any) => {
-  if (!response) return [];
-  if (Array.isArray(response)) return response;
-  if (Array.isArray(response.data)) return response.data;
-  if (response.data && Array.isArray(response.data.data)) return response.data.data;
-  return [];
-};
-
-interface OmittedStudent {
-  fullName: string; 
-  phone: string; 
-  parentPhone: string;
-}
+import { ShieldIcon, UsersIcon, AlertTriangleIcon, XIcon, TrashIcon, LockIcon, UnlockIcon, AlertCircleIcon, CheckCircleIcon, BarChartIcon } from '../../components/Icons';
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
 
 interface Violation {
   id: number;
@@ -58,7 +15,7 @@
   academicYear: string;
   school: string;
   governorate: string;
-  user: OmittedStudent;
+  user: { fullName: string; phone: string; parentPhone: string };
 }
 
 interface StudentWithViolations {
@@ -78,95 +35,94 @@
 
 export default function AdminSecurityPage() {
   const router = useRouter();
-
-  // 🚀 درع الحماية: يطرد أي شخص ليس أدمن فوراً ويعرض شاشة التحميل
-  const { isChecking } = useAuthGuard(['admin']);
-
   const [students, setStudents] = useState<StudentWithViolations[]>([]);
   const [violations, setViolations] = useState<Violation[]>([]);
   const [loading, setLoading] = useState(true);
   const [activeTab, setActiveTab] = useState<'students' | 'violations'>('students');
-  
-  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
+  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
   const [blockingId, setBlockingId] = useState<number | null>(null);
   const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; message: string; onConfirm: () => void } | null>(null);
 
-  const showToast = useCallback((message: string, type: 'success' | 'error') => {
-    setToast({ visible: true, message, type });
-    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
+  useEffect(() => {
+    checkAuth();
+    fetchData();
   }, []);
 
-  // منع تمرير الصفحة عند فتح نافذة التأكيد
-  useEffect(() => {
-    if (confirmDialog) {
-      document.body.style.overflow = 'hidden';
-    } else {
-      document.body.style.overflow = '';
+  const showNotification = (type: 'success' | 'error', message: string) => {
+    setNotification({ type, message });
+    setTimeout(() => setNotification(null), 3_000);
+  };
+
+  const checkAuth = async () => {
+    const token = document.cookie
+      .split('; ')
+      .find(row => row.startsWith('token='))
+      ?.substring(6);
+
+    if (!token) {
+      router.push('/login');
+      return;
     }
-    return () => { document.body.style.overflow = ''; };
-  }, [confirmDialog]);
-
-  useEffect(() => {
-    if (!isChecking) {
-      fetchData();
-    }
-  }, [isChecking]);
+  };
 
   const fetchData = async () => {
-    setLoading(true);
     try {
-      // 🚀 الأداء الخارق: جلب الطلاب والمخالفات في نفس اللحظة بالتوازي
-      const [studentsRes, violationsRes] = await Promise.allSettled([
-        api.get('/admin/security/students-with-violations'),
-        api.get('/admin/security/violations')
-      ]);
-
-      if (studentsRes.status === 'fulfilled') {
-        const usersData = extractArray(studentsRes.value);
-        const mappedStudents = usersData.map((student: any) => ({
+      const token = document.cookie
+        .split('; ')
+        .find(row => row.startsWith('token='))
+        ?.substring(6);
+
+      if (!token) return;
+
+      const studentsResponse = await fetch(`${API_URL}/api/admin/security/students-with-violations`, {
+        headers: { Authorization: `Bearer ${token}` },
+      });
+
+      if (studentsResponse.ok) {
+        const data = await studentsResponse.json();
+        const mappedStudents = (data.data || []).map((student: any) => ({
           id: student.id,
-          fullName: student.full_name || student.fullName || 'غير محدد',
+          fullName: student.full_name,
           phone: student.phone,
-          parentPhone: student.parent_phone || student.parentPhone,
+          parentPhone: student.parent_phone,
           email: student.email || 'غير متوفر',
-          academicYear: getAcademicYearLabel(student.academic_year || student.academicYear || ''),
+          academicYear: student.academic_year || '',
           school: student.school || '',
           governorate: student.governorate || '',
-          violationCount: student.violations_count || student.violationCount || 0,
-          unblockCount: student.unblock_count || student.unblockCount || 0,
-          lastViolation: student.last_violation || student.lastViolation,
-          isBlocked: student.is_blocked || student.isBlocked,
+          violationCount: student.violations_count,
+          unblockCount: student.unblock_count || 0,
+          lastViolation: student.last_violation,
+          isBlocked: student.is_blocked,
         }));
         setStudents(mappedStudents);
-      } else {
-        console.error('Failed to fetch students:', studentsRes.reason);
       }
 
-      if (violationsRes.status === 'fulfilled') {
-        const vData = extractArray(violationsRes.value);
-        const mappedViolations = vData.map((v: any) => ({
+      const violationsResponse = await fetch(`${API_URL}/api/admin/security/violations`, {
+        headers: { Authorization: `Bearer ${token}` },
+      });
+
+      if (violationsResponse.ok) {
+        const data = await violationsResponse.json();
+        const mappedViolations = (data.data || []).map((v: any) => ({
           id: v.id,
-          userId: v.user_id || v.userId,
-          lectureTitle: v.lecture_title || v.lectureTitle || 'غير محدد',
-          courseTitle: v.course_title || v.courseTitle || '',
-          violationType: v.violation_type || v.violationType,
-          createdAt: v.created_at || v.createdAt,
-          academicYear: getAcademicYearLabel(v.academic_year || v.academicYear || ''),
+          userId: v.user_id,
+          lectureTitle: v.lecture_title || 'غير محدد',
+          courseTitle: v.course_title || '',
+          violationType: v.violation_type,
+          createdAt: v.created_at,
+          academicYear: v.academic_year || '',
           school: v.school || '',
           governorate: v.governorate || '',
           user: { 
-            fullName: v.full_name || v.user?.fullName || v.user?.full_name || 'غير محدد', 
-            phone: v.phone || v.user?.phone || '', 
-            parentPhone: v.parent_phone || v.user?.parentPhone || '' 
+            fullName: v.full_name, 
+            phone: v.phone, 
+            parentPhone: v.parent_phone 
           }
         }));
         setViolations(mappedViolations);
-      } else {
-        console.error('Failed to fetch violations:', violationsRes.reason);
       }
-
-    } catch (error: any) {
-      showToast(error?.message || 'فشل في جلب بيانات الأمان', 'error');
+    } catch (error) {
+      console.error('Failed to fetch security data:', error);
     } finally {
       setLoading(false);
     }
@@ -175,16 +131,33 @@
   const handleBlockStudent = (userId: number) => {
     setConfirmDialog({
       visible: true,
-      message: 'هل أنت متأكد من حظر هذا الطالب ومنعه من الوصول للمنصة بالكامل؟',
+      message: 'هل أنت متأكد من حظر هذا الطالب ومنعه من الوصول للمنصة؟',
       onConfirm: async () => {
         setConfirmDialog(null);
         setBlockingId(userId);
         try {
-          await api.post(`/admin/security/block-student/${userId}`);
-          showToast('تم حظر الطالب بنجاح', 'success');
-          fetchData(); // تحديث القوائم
-        } catch (error: any) {
-          showToast(error?.message || 'فشل حظر الطالب', 'error');
+          const token = document.cookie
+            .split('; ')
+            .find(row => row.startsWith('token='))
+            ?.substring(6);
+
+          const response = await fetch(`${API_URL}/api/admin/security/block-student/${userId}`, {
+            method: 'POST',
+            headers: {
+              'Authorization': `Bearer ${token}`,
+              'Content-Type': 'application/json',
+            },
+          });
+
+          if (response.ok) {
+            showNotification('success', 'تم حظر الطالب بنجاح');
+            fetchData();
+          } else {
+            showNotification('error', 'فشل حظر الطالب');
+          }
+        } catch (error) {
+          console.error('Failed to block student:', error);
+          showNotification('error', 'حدث خطأ');
         } finally {
           setBlockingId(null);
         }
@@ -195,16 +168,33 @@
   const handleUnblockStudent = (userId: number) => {
     setConfirmDialog({
       visible: true,
-      message: 'هل أنت متأكد من رفع الحظر عن هذا الطالب وإعادته للمنصة؟',
+      message: 'هل أنت متأكد من رفع الحظر عن هذا الطالب؟',
       onConfirm: async () => {
         setConfirmDialog(null);
         setBlockingId(userId);
         try {
-          await api.post(`/admin/security/unblock-student/${userId}`);
-          showToast('تم رفع الحظر بنجاح', 'success');
-          fetchData();
-        } catch (error: any) {
-          showToast(error?.message || 'فشل رفع الحظر', 'error');
+          const token = document.cookie
+            .split('; ')
+            .find(row => row.startsWith('token='))
+            ?.substring(6);
+
+          const response = await fetch(`${API_URL}/api/admin/security/unblock-student/${userId}`, {
+            method: 'POST',
+            headers: {
+              'Authorization': `Bearer ${token}`,
+              'Content-Type': 'application/json',
+            },
+          });
+
+          if (response.ok) {
+            showNotification('success', 'تم رفع الحظر بنجاح');
+            fetchData();
+          } else {
+            showNotification('error', 'فشل رفع الحظر');
+          }
+        } catch (error) {
+          console.error('Failed to unblock student:', error);
+          showNotification('error', 'حدث خطأ');
         } finally {
           setBlockingId(null);
         }
@@ -215,15 +205,32 @@
   const handleDeleteViolation = async (violationId: number) => {
     setConfirmDialog({
       visible: true,
-      message: 'هل أنت متأكد من حذف هذه المخالفة نهائياً من سجل الطالب؟',
+      message: 'هل أنت متأكد من حذف هذه المخالفة نهائياً؟',
       onConfirm: async () => {
         setConfirmDialog(null);
         try {
-          await api.delete(`/admin/security/violations/${violationId}`);
-          showToast('تم حذف المخالفة بنجاح', 'success');
-          fetchData();
-        } catch (error: any) {
-          showToast(error?.message || 'فشل حذف المخالفة', 'error');
+          const token = document.cookie
+            .split('; ')
+            .find(row => row.startsWith('token='))
+            ?.substring(6);
+
+          const response = await fetch(`${API_URL}/api/admin/security/violations/${violationId}`, {
+            method: 'DELETE',
+            headers: {
+              'Authorization': `Bearer ${token}`,
+              'Content-Type': 'application/json',
+            },
+          });
+
+          if (response.ok) {
+            showNotification('success', 'تم حذف المخالفة بنجاح');
+            fetchData();
+          } else {
+            showNotification('error', 'فشل حذف المخالفة');
+          }
+        } catch (error) {
+          console.error('Failed to delete violation:', error);
+          showNotification('error', 'حدث خطأ');
         }
       }
     });
@@ -232,15 +239,32 @@
   const handleClearStudentViolations = async (userId: number) => {
     setConfirmDialog({
       visible: true,
-      message: 'هل أنت متأكد من مسح جميع مخالفات هذا الطالب وتصفير العداد الخاص به؟',
+      message: 'هل أنت متأكد من مسح جميع مخالفات هذا الطالب وتصفير العداد؟',
       onConfirm: async () => {
         setConfirmDialog(null);
         try {
-          await api.delete(`/admin/security/students/${userId}/violations`);
-          showToast('تم مسح جميع المخالفات وتصفير العداد بنجاح', 'success');
-          fetchData();
-        } catch (error: any) {
-          showToast(error?.message || 'فشل مسح المخالفات', 'error');
+          const token = document.cookie
+            .split('; ')
+            .find(row => row.startsWith('token='))
+            ?.substring(6);
+
+          const response = await fetch(`${API_URL}/api/admin/security/students/${userId}/violations`, {
+            method: 'DELETE',
+            headers: {
+              'Authorization': `Bearer ${token}`,
+              'Content-Type': 'application/json',
+            },
+          });
+
+          if (response.ok) {
+            showNotification('success', 'تم مسح المخالفات بنجاح');
+            fetchData();
+          } else {
+            showNotification('error', 'فشل مسح المخالفات');
+          }
+        } catch (error) {
+          console.error('Failed to clear violations:', error);
+          showNotification('error', 'حدث خطأ');
         }
       }
     });
@@ -256,6 +280,12 @@
     return labels[type] || type;
   };
 
+  const getViolationColor = (count: number) => {
+    if (count >= 5) return 'var(--error)';
+    if (count >= 3) return 'var(--warning)';
+    return 'var(--success)';
+  };
+
   const getViolationBadgeClass = (count: number) => {
     if (count >= 5) return 'badge badge-error';
     if (count >= 3) return 'badge badge-warning';
@@ -269,14 +299,14 @@
     violations: violations.length,
   };
 
-  if (isChecking || loading) {
+  if (loading) {
     return (
       <div className="admin-layout">
         <AdminSidebar />
         <main className="admin-content">
           <div className="loading-state">
             <div className="spinner spinner-lg" />
-            <p className="mt-4 font-bold text-muted">جاري تحميل السجلات الأمنية...</p>
+            <p>جارٍ التحميل...</p>
           </div>
         </main>
       </div>
@@ -285,79 +315,71 @@
 
   return (
     <div className="admin-layout relative">
-      {/* 🚀 نافذة التأكيد (Modal) بتصميم احترافي */}
       {confirmDialog && (
-        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
-          <div className="card shadow-2xl max-w-sm w-full text-center p-8 animate-scale-up border border-gray-100 bg-white rounded-2xl">
+        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
+          <div className="card shadow-2xl max-w-sm w-full text-center p-8">
             <div className="flex justify-center mb-4 text-error">
-              <AlertTriangleIcon size={56} />
+              <AlertTriangleIcon size={48} />
             </div>
-            <h3 className="text-2xl font-black text-gray-900 mb-4">تأكيد الإجراء</h3>
-            <p className="text-gray-600 mb-8 leading-relaxed font-medium">{confirmDialog.message}</p>
+            <h3 className="text-xl font-bold text-error mb-4">تأكيد الإجراء</h3>
+            <p className="text-muted mb-6 leading-relaxed">{confirmDialog.message}</p>
             <div className="flex gap-4 justify-center">
-              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline flex-1 py-3 text-gray-600 font-bold border-gray-300 rounded-xl hover:bg-gray-50">إلغاء</button>
-              <button onClick={confirmDialog.onConfirm} className="btn btn-danger flex-1 py-3 font-bold shadow-lg shadow-red-200 rounded-xl text-white">نعم، متأكد</button>
+              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline flex-1">إلغاء</button>
+              <button onClick={confirmDialog.onConfirm} className="btn btn-danger flex-1">نعم، متأكد</button>
             </div>
           </div>
         </div>
       )}
-
       <AdminSidebar />
 
       <main className="admin-content">
-        {/* 🚀 إشعار التأكيد (Toast) الموحد في منتصف الشاشة من الأعلى */}
-        <div 
-          className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300" 
-          style={{ 
-            opacity: toast.visible ? 1 : 0, 
-            transform: toast.visible ? 'translate(-50%, 0)' : 'translate(-50%, -20px)', 
-            pointerEvents: toast.visible ? 'auto' : 'none' 
-          }}
-        >
-          <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl text-sm font-bold ${toast.type === 'success' ? 'bg-green-600 text-white shadow-green-600/30' : 'bg-red-600 text-white shadow-red-600/30'}`}>
-            {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
-            <span>{toast.message}</span>
-          </div>
-        </div>
+        {notification && (
+          <div className={`toast-container`} style={{ position: 'relative', opacity: 1 }}>
+            <div className={`toast-content ${notification.type === 'success' ? 'toast-success' : 'toast-error'}`} style={{ position: 'relative', top: 0, left: 0, transform: 'none' }}>
+              {notification.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
+              {notification.message}
+            </div>
+          </div>
+        )}
 
         <div className="page-header">
           <div>
-            <h1 className="page-title flex items-center gap-2">
+            <h1 className="page-title">
               <ShieldIcon size={28} />
-              لوحة الأمان والمراقبة
+              لوحة الأمان
             </h1>
-            <p className="page-subtitle">مراقبة المخالفات، كشف محاولات الغش، وحظر الطلاب</p>
+            <p className="page-subtitle">مراقبة المخالفات وحظر الطلاب</p>
           </div>
         </div>
 
         <div className="security-stats-grid">
-          <div className="card text-center p-6 shadow-sm border border-[var(--border)]">
-            <div className="flex justify-center mb-3 text-primary">
-              <UsersIcon size={36} />
+          <div className="card text-center p-6">
+            <div className="flex justify-center mb-2 text-primary">
+              <UsersIcon size={32} />
             </div>
-            <div className="text-3xl font-black text-primary">{stats.total}</div>
-            <div className="text-sm text-muted mt-2 font-bold">طلاب لديهم مخالفات</div>
-          </div>
-          <div className="card text-center p-6 border-t-4 border-t-warning shadow-sm bg-[var(--surface)]">
-            <div className="flex justify-center mb-3" style={{ color: 'var(--warning)' }}>
-              <AlertTriangleIcon size={36} />
+            <div className="text-2xl font-bold text-primary">{stats.total}</div>
+            <div className="text-sm text-muted mt-1">طلاب لديهم مخالفات</div>
+          </div>
+          <div className="card text-center p-6 border-t-4 border-t-warning">
+            <div className="flex justify-center mb-2" style={{ color: 'var(--warning)' }}>
+              <AlertTriangleIcon size={32} />
             </div>
-            <div className="text-3xl font-black" style={{ color: 'var(--warning)' }}>{stats.atRisk}</div>
-            <div className="text-sm text-muted mt-2 font-bold">طلاب في خطر (3+ مخالفات)</div>
-          </div>
-          <div className="card text-center p-6 border-t-4 border-t-error shadow-sm bg-[var(--surface)]">
-            <div className="flex justify-center mb-3 text-error">
-              <XIcon size={36} />
+            <div className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>{stats.atRisk}</div>
+            <div className="text-sm text-muted mt-1">طلاب في خطر (3+ مخالفات)</div>
+          </div>
+          <div className="card text-center p-6 border-t-4 border-t-error">
+            <div className="flex justify-center mb-2 text-error">
+              <XIcon size={32} />
             </div>
-            <div className="text-3xl font-black text-error">{stats.blocked}</div>
-            <div className="text-sm text-muted mt-2 font-bold">محظورون حالياً</div>
-          </div>
-          <div className="card text-center p-6 shadow-sm border border-[var(--border)]">
-            <div className="flex justify-center mb-3 text-secondary">
-              <BarChartIcon size={36} />
+            <div className="text-2xl font-bold text-error">{stats.blocked}</div>
+            <div className="text-sm text-muted mt-1">محظورون</div>
+          </div>
+          <div className="card text-center p-6">
+            <div className="flex justify-center mb-2">
+              <BarChartIcon size={32} />
             </div>
-            <div className="text-3xl font-black text-secondary">{stats.violations}</div>
-            <div className="text-sm text-muted mt-2 font-bold">إجمالي المخالفات المرصودة</div>
+            <div className="text-2xl font-bold">{stats.violations}</div>
+            <div className="text-sm text-muted mt-1">إجمالي المخالفات</div>
           </div>
         </div>
 
@@ -367,7 +389,7 @@
             className={`tab-btn ${activeTab === 'students' ? 'tab-btn-active' : ''}`}
           >
             <UsersIcon size={18} />
-            سجل الطلاب
+            الطلاب
             <span className={`tab-count ${activeTab === 'students' ? 'tab-count-active' : ''}`}>{students.length}</span>
           </button>
           <button
@@ -375,183 +397,175 @@
             className={`tab-btn ${activeTab === 'violations' ? 'tab-btn-active' : ''}`}
           >
             <AlertTriangleIcon size={18} />
-            سجل المخالفات
+            المخالفات
             <span className={`tab-count ${activeTab === 'violations' ? 'tab-count-active' : ''}`}>{violations.length}</span>
           </button>
         </div>
 
-        {/* 🚀 تأمين التمرير الأفقي للجداول لمنع تشوه التصميم */}
         {activeTab === 'students' && (
-          <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface)' }}>
-            <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
-              <table className="table" style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', margin: 0 }}>
-                <thead style={{ background: 'var(--soft-bg)' }}>
-                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
-                      <th style={{ padding: '1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>بيانات الطالب</th>
-                      <th style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>رقم الهاتف</th>
-                      <th style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>السنة الدراسية</th>
-                      <th style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>المخالفات</th>
-                      <th style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>آخر مخالفة</th>
-                      <th style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>الإجراءات</th>
+          <div className="table-container">
+            <table className="table">
+              <thead>
+                  <tr>
+                    <th>الاسم</th>
+                    <th>الهاتف</th>
+                    <th>السنة الدراسية</th>
+                    <th>المدرسة</th>
+                    <th style={{ textAlign: 'center' }}>المخالفات</th>
+                    <th>آخر مخالفة</th>
+                    <th style={{ textAlign: 'center' }}>الإجراء</th>
+                  </tr>
+              </thead>
+              <tbody>
+                {students.length === 0 ? (
+                  <tr>
+                    <td colSpan={7} className="text-center py-8 text-muted">
+                      لا توجد مخالفات مسجلة
+                    </td>
+                  </tr>
+                ) : (
+                  students.map((student) => (
+                    <tr key={student.id}>
+                      <td>
+                        <div className="font-bold text-primary">{student.fullName}</div>
+                        <div className="text-xs text-muted mt-1">{student.email}</div>
+                      </td>
+                      <td className="font-mono text-sm" dir="ltr">{student.phone}</td>
+                      <td className="text-sm">{student.academicYear}</td>
+                      <td className="text-sm">{student.school}</td>
+                      <td style={{ textAlign: 'center' }}>
+                        <span className={getViolationBadgeClass(student.violationCount)}>
+                          {student.violationCount}
+                        </span>
+                      </td>
+                      <td className="text-sm text-muted">
+                        {student.lastViolation ? new Date(student.lastViolation).toLocaleString('ar-EG') : '—'}
+                      </td>
+                      <td style={{ textAlign: 'center' }}>
+                        <div className="flex gap-1 justify-center">
+                          {student.isBlocked ? (
+                            <button
+                              onClick={() => handleUnblockStudent(student.id)}
+                              disabled={blockingId === student.id}
+                              className="btn btn-sm btn-success"
+                            >
+                              <UnlockIcon size={14} />
+                              رفع الحظر
+                            </button>
+                          ) : (
+                            <button
+                              onClick={() => handleBlockStudent(student.id)}
+                              disabled={blockingId === student.id}
+                              className="btn btn-sm btn-danger"
+                            >
+                              <LockIcon size={14} />
+                              حظر
+                            </button>
+                          )}
+                          <button 
+                            onClick={() => handleClearStudentViolations(student.id)} 
+                            disabled={student.violationCount === 0} 
+                            className="btn btn-sm btn-outline"
+                          >
+                            <TrashIcon size={14} />
+                            مسح
+                          </button>
+                        </div>
+                      </td>
                     </tr>
-                </thead>
-                <tbody>
-                  {students.length === 0 ? (
-                    <tr>
-                      <td colSpan={6} className="text-center py-12 text-muted font-bold">
-                        <ShieldIcon size={48} className="mx-auto mb-3 opacity-20" />
-                        الوضع آمن. لا توجد أي مخالفات مسجلة!
+                  ))
+                )}
+              </tbody>
+            </table>
+          </div>
+        )}
+
+        {activeTab === 'violations' && (
+          <div className="table-container">
+            <table className="table">
+              <thead>
+                <tr>
+                  <th>الطالب</th>
+                  <th>السنة الدراسية</th>
+                  <th>نوع المخالفة</th>
+                  <th>التاريخ</th>
+                  <th>المحاضرة</th>
+                  <th style={{ textAlign: 'center' }}>الإجراء</th>
+                </tr>
+              </thead>
+              <tbody>
+                {violations.length === 0 ? (
+                  <tr>
+                    <td colSpan={6} className="text-center py-8 text-muted">
+                      لا توجد مخالفات مسجلة
+                    </td>
+                  </tr>
+                ) : (
+                  violations.slice(0, 100).map((violation) => (
+                    <tr key={violation.id}>
+                      <td>
+                        <div className="font-bold text-primary">{violation.user.fullName}</div>
+                        <div className="text-xs text-muted">{violation.user.phone}</div>
+                      </td>
+                      <td>
+                        <div className="text-sm">{violation.academicYear}</div>
+                        <div className="text-xs text-muted">{violation.school}</div>
+                      </td>
+                      <td>
+                        <span className="badge badge-warning">
+                          {getViolationTypeLabel(violation.violationType)}
+                        </span>
+                      </td>
+                      <td className="text-sm text-muted">
+                        {new Date(violation.createdAt).toLocaleString('ar-EG')}
+                      </td>
+                      <td className="text-sm text-muted">
+                        {violation.courseTitle} - {violation.lectureTitle}
+                      </td>
+                      <td style={{ textAlign: 'center' }}>
+                        <button onClick={() => handleDeleteViolation(violation.id)} className="btn btn-sm btn-danger" title="حذف المخالفة">
+                          <TrashIcon size={14} /> حذف
+                        </button>
                       </td>
                     </tr>
-                  ) : (
-                    students.map((student) => (
-                      <tr key={student.id} className="hover:bg-[var(--soft-bg)] transition-colors" style={{ borderBottom: '1px solid var(--border-light)' }}>
-                        <td style={{ padding: '1rem' }}>
-                          <div className="font-bold text-gray-900 text-sm">{student.fullName}</div>
-                          <div className="text-xs text-muted mt-1">{student.school}</div>
-                        </td>
-                        <td className="font-mono font-bold text-sm text-center" dir="ltr" style={{ padding: '1rem' }}>{student.phone}</td>
-                        <td className="text-sm font-semibold text-center text-primary" style={{ padding: '1rem' }}>{student.academicYear}</td>
-                        <td style={{ textAlign: 'center', padding: '1rem' }}>
-                          <span className={getViolationBadgeClass(student.violationCount)}>
-                            {student.violationCount} {student.violationCount > 10 ? '🔥' : ''}
-                          </span>
-                        </td>
-                        <td className="text-xs text-muted font-semibold text-center" style={{ padding: '1rem' }}>
-                          {student.lastViolation ? new Date(student.lastViolation).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
-                        </td>
-                        <td style={{ textAlign: 'center', padding: '1rem' }}>
-                          <div className="flex gap-2 justify-center">
-                            {student.isBlocked ? (
-                              <button
-                                onClick={() => handleUnblockStudent(student.id)}
-                                disabled={blockingId === student.id}
-                                className="btn btn-sm btn-success font-bold rounded-lg"
-                              >
-                                {blockingId === student.id ? <span className="spinner w-4 h-4 border-2" /> : <><UnlockIcon size={14} /> رفع الحظر</>}
-                              </button>
-                            ) : (
-                              <button
-                                onClick={() => handleBlockStudent(student.id)}
-                                disabled={blockingId === student.id}
-                                className="btn btn-sm btn-danger font-bold rounded-lg"
-                              >
-                                {blockingId === student.id ? <span className="spinner w-4 h-4 border-2" /> : <><LockIcon size={14} /> حظر فوراً</>}
-                              </button>
-                            )}
-                            <button 
-                              onClick={() => handleClearStudentViolations(student.id)} 
-                              disabled={student.violationCount === 0} 
-                              className="btn btn-sm btn-outline font-bold rounded-lg"
-                              title="مسح جميع مخالفات الطالب"
-                            >
-                              <TrashIcon size={14} />
-                              تصفير
-                            </button>
-                          </div>
-                        </td>
-                      </tr>
-                    ))
-                  )}
-                </tbody>
-              </table>
-            </div>
-          </div>
-        )}
-
-        {activeTab === 'violations' && (
-          <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface)' }}>
-            <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
-              <table className="table" style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', margin: 0 }}>
-                <thead style={{ background: 'var(--soft-bg)' }}>
-                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
-                    <th style={{ padding: '1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>بيانات الطالب</th>
-                    <th style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>نوع المخالفة</th>
-                    <th style={{ padding: '1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>مكان المخالفة (الكورس - المحاضرة)</th>
-                    <th style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>التاريخ والوقت</th>
-                    <th style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>الإجراء</th>
-                  </tr>
-                </thead>
-                <tbody>
-                  {violations.length === 0 ? (
-                    <tr>
-                      <td colSpan={5} className="text-center py-12 text-muted font-bold">
-                        <CheckCircleIcon size={48} className="mx-auto mb-3 opacity-20 text-success" />
-                        لا توجد أي مخالفات فردية مسجلة!
-                      </td>
-                    </tr>
-                  ) : (
-                    violations.slice(0, 100).map((violation) => (
-                      <tr key={violation.id} className="hover:bg-[var(--soft-bg)] transition-colors" style={{ borderBottom: '1px solid var(--border-light)' }}>
-                        <td style={{ padding: '1rem' }}>
-                          <div className="font-bold text-gray-900 text-sm">{violation.user.fullName}</div>
-                          <div className="text-xs text-muted font-mono mt-1" dir="ltr">{violation.user.phone}</div>
-                        </td>
-                        <td style={{ textAlign: 'center', padding: '1rem' }}>
-                          <span className="badge badge-warning font-bold">
-                            {getViolationTypeLabel(violation.violationType)}
-                          </span>
-                        </td>
-                        <td className="text-sm font-semibold text-primary" style={{ padding: '1rem' }}>
-                          {violation.courseTitle}
-                          <br/>
-                          <span className="text-xs text-muted">{violation.lectureTitle}</span>
-                        </td>
-                        <td className="text-xs text-muted font-semibold text-center" style={{ padding: '1rem' }}>
-                          {new Date(violation.createdAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
-                        </td>
-                        <td style={{ textAlign: 'center', padding: '1rem' }}>
-                          <button 
-                            onClick={() => handleDeleteViolation(violation.id)} 
-                            className="btn btn-sm btn-outline text-error border-error hover:bg-red-50 font-bold rounded-lg" 
-                            title="حذف هذا السجل فقط"
-                          >
-                            <TrashIcon size={14} /> حذف السجل
-                          </button>
-                        </td>
-                      </tr>
-                    ))
-                  )}
-                </tbody>
-              </table>
-            </div>
-            {violations.length > 100 && (
-               <div className="text-center p-3 text-xs text-muted bg-gray-50 border-t border-gray-100 font-bold">
-                 يتم عرض أحدث 100 مخالفة فقط لتسريع الصفحة.
-               </div>
-            )}
+                  ))
+                )}
+              </tbody>
+            </table>
           </div>
         )}
       </main>
 
       <style jsx>{`
-        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
-        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
+        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
         @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
-        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
 
         .security-stats-grid {
           display: grid;
           grid-template-columns: repeat(4, 1fr);
-          gap: 1.5rem;
-          margin-bottom: 2rem;
-        }
-        @media (max-width: 1024px) {
-          .security-stats-grid { grid-template-columns: repeat(2, 1fr); }
-        }
-        @media (max-width: 640px) {
-          .security-stats-grid { grid-template-columns: 1fr; }
+          gap: 1rem;
+          margin-bottom: 1.5rem;
+        }
+        @media (max-width: 900px) {
+          .security-stats-grid {
+            grid-template-columns: repeat(2, 1fr);
+          }
+        }
+        @media (max-width: 500px) {
+          .security-stats-grid {
+            grid-template-columns: 1fr;
+          }
         }
 
         .tab-switcher {
           display: flex;
           gap: 0.5rem;
-          padding: 0.5rem;
+          padding: 0.375rem;
           background: var(--surface);
           border: 1px solid var(--border);
           border-radius: 16px;
           margin-bottom: 2rem;
-          max-width: 450px;
+          max-width: 420px;
           box-shadow: var(--shadow-sm);
         }
         .tab-btn {
@@ -561,8 +575,8 @@
           gap: 0.5rem;
           padding: 0.75rem 1.25rem;
           font-family: var(--font-body);
-          font-size: 0.95rem;
-          font-weight: 800;
+          font-size: 0.875rem;
+          font-weight: 700;
           border-radius: 12px;
           border: 1px solid transparent;
           background: transparent;
@@ -580,18 +594,21 @@
           background: var(--gradient-primary);
           color: white;
           border-color: transparent;
-          box-shadow: 0 4px 16px rgba(11, 79, 108, 0.3);
-          transform: translateY(-2px);
+          box-shadow: 0 4px 16px rgba(11, 79, 108, 0.25);
+          transform: translateY(-1px);
+        }
+        .tab-btn-active:hover {
+          box-shadow: 0 6px 20px rgba(11, 79, 108, 0.3);
         }
         .tab-count {
           display: inline-flex;
           align-items: center;
           justify-content: center;
-          min-width: 24px;
-          height: 24px;
+          min-width: 22px;
+          height: 22px;
           padding: 0 6px;
           font-size: 0.75rem;
-          font-weight: 900;
+          font-weight: 800;
           border-radius: 8px;
           background: var(--soft-bg);
           color: var(--text-muted);
@@ -601,7 +618,12 @@
           background: rgba(255, 255, 255, 0.25);
           color: white;
         }
+
+        [data-theme="dark"] .tab-switcher {
+          background: var(--glass-bg);
+          border-color: var(--glass-border);
+        }
       `}</style>
     </div>
   );
-}+}
```

### `app\admin\settings\page.tsx`
```diff
--- Current: app\admin\settings\page.tsx
+++ Other: app\admin\settings\page.tsx
@@ -1,185 +1,107 @@
 'use client';
 
-import { useEffect, useState, useCallback } from 'react';
+import { useEffect, useState } from 'react';
 import AdminSidebar from '../../components/AdminSidebar';
-import { useAuthGuard } from '../../hooks/useAuthGuard'; // 🚀 حارس البوابة
-import api from '@/lib/axios'; // 🚀 العميل المركزي المحمي
-import { 
-  SettingsIcon, PhoneIcon, CheckCircleIcon, 
-  AlertCircleIcon, ShieldIcon 
-} from '../../components/Icons';
+import { SettingsIcon, PhoneIcon, CheckCircleIcon, AlertCircleIcon } from '../../components/Icons';
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+
+const getToken = () => {
+  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
+};
 
 export default function AdminSettingsPage() {
-  // 🚀 درع الحماية: يطرد أي شخص ليس أدمن فوراً ويعرض شاشة التحميل
-  const { isChecking } = useAuthGuard(['admin']);
+  const [whatsappNumber, setWhatsappNumber] = useState('');
+  const [saving, setSaving] = useState(false);
+  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
 
-  const [loading, setLoading] = useState(true);
-  const [saving, setSaving] = useState(false);
-  const [whatsappNumber, setWhatsappNumber] = useState('');
-  
-  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
-
-  const showToast = useCallback((message: string, type: 'success' | 'error') => {
-    setToast({ visible: true, message, type });
-    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
+  useEffect(() => {
+    const fetchSettings = async () => {
+      const token = getToken();
+      try {
+        const res = await fetch(`${API_URL}/api/admin/settings`, {
+          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
+        });
+        if (res.ok) {
+          const data = await res.json();
+          setWhatsappNumber(data.data?.whatsapp_number || '');
+        }
+      } catch (e) {
+        console.error('Failed to fetch settings:', e);
+      }
+    };
+    fetchSettings();
   }, []);
 
-  useEffect(() => {
-    // 🚀 لا نطلب البيانات إلا بعد التأكد من صلاحيات الأدمن
-    if (!isChecking) {
-      fetchSettings();
-    }
-  }, [isChecking]);
-
-  const fetchSettings = async () => {
-    setLoading(true);
+  const handleSave = async () => {
+    setSaving(true);
+    setMessage(null);
+    const token = getToken();
     try {
-      // 🚀 استخدام العميل المركزي لجلب الإعدادات
-      const response = await api.get('/admin/settings');
-      
-      // التوافق مع هيكل البيانات العائد من Laravel
-      const data = response.data;
-      setWhatsappNumber(data?.whatsapp_number || data?.whatsappNumber || '');
-      
-    } catch (error: any) {
-      showToast(error?.message || 'فشل في جلب إعدادات المنصة', 'error');
-    } finally {
-      setLoading(false);
-    }
-  };
-
-  const handleSave = async () => {
-    if (!whatsappNumber.trim()) {
-      showToast('يرجى إدخال رقم الواتساب أولاً', 'error');
-      return;
-    }
-
-    setSaving(true);
-    try {
-      // 🚀 إرسال التحديثات عبر العميل المركزي
-      await api.put('/admin/settings', { 
-        whatsapp_number: whatsappNumber.replace(/\s/g, '') // تنظيف المسافات
+      const res = await fetch(`${API_URL}/api/admin/settings`, {
+        method: 'PUT',
+        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
+        body: JSON.stringify({ whatsapp_number: whatsappNumber }),
       });
-      
-      showToast('تم حفظ الإعدادات بنجاح', 'success');
-    } catch (error: any) {
-      showToast(error?.message || error?.error || 'فشل حفظ الإعدادات', 'error');
+      if (res.ok) {
+        setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' });
+      } else {
+        setMessage({ type: 'error', text: 'فشل حفظ الإعدادات' });
+      }
+    } catch {
+      setMessage({ type: 'error', text: 'خطأ في الاتصال بالخادم' });
     } finally {
       setSaving(false);
     }
   };
 
-  // 🚀 منع وميض الشاشة وعرض Loader أثناء التأكد من أن المستخدم أدمن
-  if (isChecking || loading) {
-    return (
-      <div className="admin-layout">
-        <AdminSidebar />
-        <main className="admin-content">
-          <div className="loading-state">
-            <div className="spinner spinner-lg" />
-            <p className="mt-4 font-bold text-muted">جاري تحميل إعدادات المنصة...</p>
+  return (
+    <div className="admin-layout">
+      <AdminSidebar />
+      <div className="admin-content">
+        <div className="page-header">
+          <h1 className="page-title">
+            <SettingsIcon size={28} />
+            الإعدادات
+          </h1>
+          <p className="page-subtitle">إعدادات المنصة العامة</p>
+        </div>
+
+        <div className="card max-w-lg">
+          <div className="form-group">
+            <label className="form-label">
+              <PhoneIcon size={16} className="inline ml-1" />
+              رقم الواتساب (للطلاب المحظورين)
+            </label>
+            <input
+              type="text"
+              value={whatsappNumber}
+              onChange={e => setWhatsappNumber(e.target.value)}
+              placeholder="201000000000"
+              className="input-field w-full text-left"
+              dir="ltr"
+            />
+            <p className="text-xs text-muted mt-2">
+              هذا الرقم سيظهر للطلاب المحظورين للتواصل مع الإدارة
+            </p>
           </div>
-        </main>
-      </div>
-    );
-  }
 
-  return (
-    <div className="admin-layout relative">
-      <AdminSidebar />
+          {message && (
+            <div className={`toast-content mt-4 ${message.type === 'success' ? 'toast-success' : 'toast-error'}`} style={{ position: 'relative', top: 0, left: 0, transform: 'none' }}>
+              {message.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
+              {message.text}
+            </div>
+          )}
 
-      {/* 🚀 نظام التنبيهات الموحد */}
-      <div className={`toast-container ${toast.visible ? 'show' : ''}`} style={{ position: 'fixed', top: '2rem', left: '2rem', zIndex: 1000 }}>
-        <div className={`toast-content ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
-          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
-          {toast.message}
+          <button
+            onClick={handleSave}
+            disabled={saving}
+            className="btn btn-primary w-full mt-4"
+          >
+            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
+          </button>
         </div>
       </div>
-
-      <main className="admin-content">
-        <div className="page-header">
-          <div>
-            <h1 className="page-title">
-              <SettingsIcon size={28} />
-              الإعدادات العامة
-            </h1>
-            <p className="page-subtitle">إدارة متغيرات المنصة وطرق التواصل</p>
-          </div>
-        </div>
-
-        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
-          {/* قسم إعدادات التواصل */}
-          <div className="card shadow-sm border border-gray-100 p-8">
-            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
-              <div className="w-10 h-10 rounded-full bg-blue-50 text-primary flex items-center justify-center">
-                <PhoneIcon size={20} />
-              </div>
-              <h2 className="text-xl font-bold text-gray-800">إعدادات الدعم والتواصل</h2>
-            </div>
-
-            <div className="space-y-6">
-              <div className="form-group">
-                <label className="form-label font-bold text-gray-700 flex items-center gap-2">
-                  رقم الواتساب (للدعم الفني)
-                </label>
-                <div className="relative">
-                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm" dir="ltr">
-                    +20
-                  </span>
-                  <input
-                    type="tel"
-                    value={whatsappNumber}
-                    onChange={e => setWhatsappNumber(e.target.value)}
-                    placeholder="1000000000"
-                    className="input-field w-full text-left font-mono text-lg bg-gray-50 focus:bg-white pl-12"
-                    dir="ltr"
-                  />
-                </div>
-                <div className="flex items-start gap-2 mt-3 p-3 bg-blue-50 rounded-lg text-primary text-sm font-medium">
-                  <ShieldIcon size={16} className="mt-0.5 flex-shrink-0" />
-                  <p>
-                    هذا الرقم سيظهر في صفحة الطلاب المحظورين ليتمكنوا من التواصل مع الإدارة لطلب رفع الحظر أو الاستفسار.
-                  </p>
-                </div>
-              </div>
-
-              <button
-                onClick={handleSave}
-                disabled={saving || !whatsappNumber}
-                className="btn btn-primary w-full py-3.5 text-base font-bold shadow-lg shadow-blue-200 hover:shadow-xl transition-all"
-              >
-                {saving ? <span className="spinner spinner-light w-5 h-5 border-2" /> : 'حفظ التغييرات الآن'}
-              </button>
-            </div>
-          </div>
-
-          {/* قسم معلومات الباقة (استعداداً للمستقبل) */}
-          <div className="card shadow-sm border border-gray-100 p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
-            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
-            
-            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4 relative z-10">
-              <div className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center">
-                <ShieldIcon size={20} />
-              </div>
-              <h2 className="text-xl font-bold text-white">معلومات النظام</h2>
-            </div>
-
-            <div className="space-y-4 relative z-10">
-              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
-                <span className="text-gray-300">نسخة المنصة</span>
-                <span className="font-mono font-bold text-white">v2.0.0 Enterprise</span>
-              </div>
-              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
-                <span className="text-gray-300">حالة السيرفر</span>
-                <span className="flex items-center gap-2 font-bold text-green-400">
-                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
-                  متصل ومستقر
-                </span>
-              </div>
-            </div>
-          </div>
-        </div>
-      </main>
     </div>
   );
-}+}
```

### `app\admin\stats\courses\page.tsx`
```diff
--- Current: app\admin\stats\courses\page.tsx
+++ Other: app\admin\stats\courses\page.tsx
@@ -1,15 +1,19 @@
 'use client';
 
-import { useEffect, useState, useCallback } from 'react';
+import { useEffect, useState } from 'react';
 import { useRouter } from 'next/navigation';
 import AdminSidebar from '@/app/components/AdminSidebar';
-import { useAuthGuard } from '../../../hooks/useAuthGuard'; // 🚀 الدرع المركزي
-import api from '@/lib/axios'; // 🚀 العميل الذكي للشبكة
 import {
   BarChartIcon, RefreshIcon, FileTextIcon, UsersIcon, XIcon,
   SearchIcon, SettingsIcon, UserIcon, CreditCardIcon, BookIcon,
-  CheckIcon, CheckCircleIcon, AlertCircleIcon
+  CheckIcon, CheckCircleIcon
 } from '@/app/components/Icons';
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+
+const getToken = () => {
+  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
+};
 
 interface CourseStat {
   id: number;
@@ -20,21 +24,17 @@
 
 export default function CourseStatsPage() {
   const router = useRouter();
-
-  // 🚀 درع الحماية: يطرد المتطفلين فوراً ويعرض شاشة التحميل
-  const { isChecking } = useAuthGuard(['admin']);
-
   const [stats, setStats] = useState<CourseStat[]>([]);
   const [loading, setLoading] = useState(true);
 
-  // إعدادات النوافذ المنبثقة (Modals)
+  // Modal States
   const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
   const [selectedCourseTitle, setSelectedCourseTitle] = useState<string | null>(null);
   const [courseStudents, setCourseStudents] = useState<any[]>([]);
   const [loadingStudents, setLoadingStudents] = useState(false);
   const [studentSearchQuery, setStudentSearchQuery] = useState('');
 
-  // إعدادات بروفايل الطالب
+  // Profile management states
   const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
   const [studentProgress, setStudentProgress] = useState<any>(null);
   const [allCourses, setAllCourses] = useState<any[]>([]);
@@ -43,48 +43,31 @@
   const [togglingCourseId, setTogglingCourseId] = useState<number | null>(null);
   const [loadingProgress, setLoadingProgress] = useState(false);
 
-  // 🚀 نظام التنبيهات الموحد الأنيق
+  // Toast
   const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
-  const showToast = useCallback((message: string, type: 'success' | 'error') => {
+  const showToast = (message: string, type: 'success' | 'error') => {
     setToast({ visible: true, message, type });
-    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
-  }, []);
-
-  // 🚀 تجميد التمرير (Scroll Lock) بشكل آمن
-  useEffect(() => {
-    if (selectedCourseId || selectedStudent) {
-      document.body.style.overflow = 'hidden';
-    } else {
-      document.body.style.overflow = '';
-    }
-    return () => { document.body.style.overflow = ''; };
-  }, [selectedCourseId, selectedStudent]);
-
-  useEffect(() => {
-    if (!isChecking) {
-      fetchCourseStats();
-    }
-  }, [isChecking]);
+    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
+  };
 
   const fetchCourseStats = async () => {
     setLoading(true);
     try {
-      const response = await api.get('/admin/wallet/course-stats');
-      
-      const rawData = response.data?.data || response.data || [];
-      // 🚀 حماية المصفوفة
-      const validData = Array.isArray(rawData) ? rawData : [];
-      
-      const mappedStats: CourseStat[] = validData.map((s: any) => ({
-        id: s.id,
-        title: s.title || 'كورس بدون عنوان',
-        pricePoints: Number(s.price_points ?? s.pricePoints ?? 0),
-        studentsCount: Number(s.students_count ?? s.studentsCount ?? 0),
-      }));
-
-      setStats(mappedStats);
-    } catch (e: any) {
-      showToast(e?.message || 'فشل تحميل إحصائيات الكورسات', 'error');
+      const token = getToken();
+      if (!token) { router.push('/login'); return; }
+
+      const res = await fetch(`${API_URL}/api/admin/wallet/course-stats`, {
+        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
+      });
+
+      if (res.ok) {
+        const result = await res.json();
+        setStats(result.data || []);
+      } else {
+        showToast('فشل تحميل إحصائيات الكورسات', 'error');
+      }
+    } catch (e) {
+      showToast('خطأ في الاتصال بالخادم', 'error');
     } finally {
       setLoading(false);
     }
@@ -96,25 +79,20 @@
     setLoadingStudents(true);
     setCourseStudents([]);
     setStudentSearchQuery('');
-    
     try {
-      const response = await api.get(`/admin/wallet/courses/${courseId}/students`);
-      
-      const studentsData = response.data?.data?.students || response.data?.students || [];
-      // 🚀 حماية المصفوفة
-      const validStudents = Array.isArray(studentsData) ? studentsData : [];
-      
-      const mappedStudents = validStudents.map((st: any) => ({
-        id: st.id,
-        fullName: st.full_name ?? st.fullName ?? 'غير محدد',
-        phone: st.phone ?? '',
-        academicYear: st.academic_year ?? st.academicYear ?? 'غير محدد',
-        subscribedAt: st.subscribed_at ?? st.subscribedAt ?? null,
-      }));
-
-      setCourseStudents(mappedStudents);
-    } catch (e: any) {
-      showToast(e?.message || 'فشل تحميل قائمة الطلاب المشتركين', 'error');
+      const token = getToken();
+      if (!token) return;
+      const res = await fetch(`${API_URL}/api/admin/wallet/courses/${courseId}/students`, {
+        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
+      });
+      if (res.ok) {
+        const result = await res.json();
+        setCourseStudents(result.data.students || []);
+      } else {
+        showToast('فشل تحميل قائمة الطلاب', 'error');
+      }
+    } catch (e) {
+      showToast('خطأ في الاتصال بالخادم', 'error');
     } finally {
       setLoadingStudents(false);
     }
@@ -123,19 +101,19 @@
   const fetchStudentProgress = async (studentId: number) => {
     setLoadingProgress(true);
     try {
-      const response = await api.get(`/admin/student-progress/${studentId}`);
-      const data = response.data?.data || response.data || {};
-      
-      // 🚀 تأمين هيكل البيانات لمنع الانهيار الداخلي
-      const safeData = {
-        student: data.student || {},
-        courses: Array.isArray(data.courses) ? data.courses : []
-      };
-      
-      setStudentProgress(safeData);
-      setWalletAmount(safeData.student.walletBalance?.toString() || safeData.student.wallet_balance?.toString() || '0');
-    } catch (error: any) {
-      showToast(error?.message || 'فشل تحميل بيانات تقدم الطالب', 'error');
+      const token = getToken();
+      if (!token) return;
+
+      const response = await fetch(`${API_URL}/api/admin/student-progress/${studentId}`, {
+        headers: { Authorization: `Bearer ${token}` },
+      });
+      if (response.ok) {
+        const data = await response.json();
+        setStudentProgress(data.data);
+        setWalletAmount(data.data.student.walletBalance.toString());
+      }
+    } catch (error) {
+      console.error('Error fetching student progress:', error);
     } finally {
       setLoadingProgress(false);
     }
@@ -143,11 +121,18 @@
 
   const fetchAllCourses = async () => {
     try {
-      const response = await api.get('/admin/courses');
-      const data = response.data?.data || response.data || [];
-      setAllCourses(Array.isArray(data) ? data : []);
+      const token = getToken();
+      if (!token) return;
+
+      const response = await fetch(`${API_URL}/api/admin/courses`, {
+        headers: { Authorization: `Bearer ${token}` },
+      });
+      if (response.ok) {
+        const data = await response.json();
+        setAllCourses(data.data || []);
+      }
     } catch (error) {
-      console.error('Error fetching all courses:', error);
+      console.error('Error fetching courses:', error);
     }
   };
 
@@ -162,19 +147,30 @@
     if (!selectedStudent) return;
     setUpdatingWallet(true);
     try {
-      // 🚀 إرسال الرقم الفعلي دون مسح الكسور إن وجدت
-      await api.post(`/admin/users/${selectedStudent.id}/wallet`, { 
-        balance: Number(walletAmount) || 0 
+      const token = getToken();
+      if (!token) return;
+
+      const response = await fetch(`${API_URL}/api/admin/users/${selectedStudent.id}/wallet`, {
+        method: 'POST',
+        headers: {
+          'Authorization': `Bearer ${token}`,
+          'Content-Type': 'application/json',
+          'Accept': 'application/json'
+        },
+        body: JSON.stringify({ balance: parseInt(walletAmount) }),
       });
 
-      showToast('تم تحديث رصيد المحفظة بنجاح!', 'success');
-      
-      fetchStudentProgress(selectedStudent.id);
-      if (selectedCourseId !== null && selectedCourseTitle !== null) {
-        fetchCourseStudents(selectedCourseId, selectedCourseTitle);
+      if (response.ok) {
+        showToast('تم تحديث رصيد المحفظة بنجاح!', 'success');
+        fetchStudentProgress(selectedStudent.id);
+        if (selectedCourseId !== null && selectedCourseTitle !== null) {
+          fetchCourseStudents(selectedCourseId, selectedCourseTitle);
+        }
+      } else {
+        showToast('فشل تحديث رصيد المحفظة', 'error');
       }
-    } catch (error: any) {
-      showToast(error?.message || error?.error || 'فشل تحديث رصيد المحفظة', 'error');
+    } catch (error) {
+      showToast('خطأ في الاتصال بالخادم', 'error');
     } finally {
       setUpdatingWallet(false);
     }
@@ -184,326 +180,292 @@
     if (!selectedStudent) return;
     setTogglingCourseId(courseId);
     try {
-      await api.post(`/admin/users/${selectedStudent.id}/courses/${courseId}/toggle`);
-
-      showToast('تم تغيير حالة الاشتراك للكورس بنجاح!', 'success');
-      
-      fetchStudentProgress(selectedStudent.id);
-      if (selectedCourseId !== null && selectedCourseTitle !== null) {
-        fetchCourseStudents(selectedCourseId, selectedCourseTitle);
+      const token = getToken();
+      if (!token) return;
+
+      const response = await fetch(`${API_URL}/api/admin/users/${selectedStudent.id}/courses/${courseId}/toggle`, {
+        method: 'POST',
+        headers: {
+          'Authorization': `Bearer ${token}`,
+          'Accept': 'application/json'
+        },
+      });
+
+      if (response.ok) {
+        showToast('تم تغيير حالة الاشتراك للكورس بنجاح!', 'success');
+        fetchStudentProgress(selectedStudent.id);
+        if (selectedCourseId !== null && selectedCourseTitle !== null) {
+          fetchCourseStudents(selectedCourseId, selectedCourseTitle);
+        }
+      } else {
+        showToast('فشل تغيير حالة الاشتراك', 'error');
       }
-    } catch (error: any) {
-      showToast(error?.message || error?.error || 'فشل تغيير حالة الاشتراك', 'error');
+    } catch (error) {
+      showToast('خطأ في الاتصال بالخادم', 'error');
     } finally {
       setTogglingCourseId(null);
     }
   };
 
+  useEffect(() => {
+    fetchCourseStats();
+  // eslint-disable-next-line react-hooks/exhaustive-deps
+  }, []);
+
   const totalEnrollments = stats.reduce((acc, curr) => acc + curr.studentsCount, 0);
-
-  if (isChecking) {
-    return (
-      <div className="admin-layout relative">
-        <AdminSidebar />
-        <main className="admin-content flex items-center justify-center min-h-[60vh]">
-          <div className="loading-state text-center flex flex-col items-center">
-            <div className="spinner spinner-primary spinner-lg mb-4 mx-auto" />
-            <p className="font-bold text-muted text-lg">جاري تجهيز إحصائيات الكورسات...</p>
-          </div>
-        </main>
-      </div>
-    );
-  }
 
   return (
     <div className="admin-layout relative">
       <AdminSidebar />
 
-      {/* 🚀 نظام التنبيهات الموحد العائم */}
-      <div 
-        className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300" 
-        style={{ 
-          opacity: toast.visible ? 1 : 0, 
-          transform: toast.visible ? 'translate(-50%, 0)' : 'translate(-50%, -20px)', 
-          pointerEvents: toast.visible ? 'auto' : 'none' 
-        }}
-      >
-        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl text-sm font-bold ${toast.type === 'success' ? 'bg-green-600 text-white shadow-green-600/30' : 'bg-red-600 text-white shadow-red-600/30'}`}>
-          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
-          <span>{toast.message}</span>
+      {/* Toast */}
+      <div className={`toast-container ${toast.visible ? 'show' : ''}`}>
+        <div className={`toast-content ${toast.type}`}>
+          {toast.type === 'success' ? <CheckCircleIcon size={18} /> : <XIcon size={18} />}
+          {toast.message}
         </div>
       </div>
 
       <main className="admin-content">
-        <div className="page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
+        <div className="page-header">
           <div>
-            <h1 className="page-title text-3xl font-black text-gray-900 flex items-center gap-3">
-              <BarChartIcon size={32} className="text-primary" /> 
-              إحصائيات الكورسات والاشتراكات
-            </h1>
-            <p className="page-subtitle text-base mt-2">تتبع أعداد الطلاب المشتركين ومعدلات الإقبال على الكورسات المختلفة.</p>
-          </div>
-          <button onClick={fetchCourseStats} disabled={loading} className="btn btn-outline font-bold bg-white shadow-sm border-gray-200 rounded-xl px-6 py-2.5 hover:bg-gray-50 transition-colors">
-            {loading ? <span className="spinner spinner-primary w-5 h-5 border-2 mx-auto" /> : <span className="flex items-center gap-2"><RefreshIcon size={18} /> تحديث الإحصائيات</span>}
-          </button>
+            <h1 className="page-title flex items-center gap-2"><BarChartIcon size={26} /> إحصائيات الكورسات والاشتراكات</h1>
+            <p className="page-subtitle">تتبع أعداد الطلاب المشتركين ومعدلات الإقبال على الكورسات المختلفة.</p>
+          </div>
+          <button onClick={fetchCourseStats} className="btn btn-outline font-bold"><RefreshIcon size={16} /> تحديث</button>
         </div>
 
         {/* Highlight Cards */}
-        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
-          <div className="card text-right p-8 border-r-4 border-r-primary shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl">
-            <span className="text-sm font-bold text-gray-500 block mb-3">إجمالي الكورسات النشطة</span>
-            <span className="text-5xl font-black text-primary font-mono">{stats.length} <span className="text-2xl text-gray-400 font-bold">كورس</span></span>
-          </div>
-          <div className="card text-right p-8 border-r-4 border-r-success shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl">
-            <span className="text-sm font-bold text-gray-500 block mb-3">إجمالي اشتراكات الطلاب</span>
-            <span className="text-5xl font-black text-success font-mono">{totalEnrollments.toLocaleString('en-US')} <span className="text-2xl text-gray-400 font-bold">اشتراك</span></span>
+        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
+          <div className="card text-right p-6" style={{ borderInlineStartWidth: '5px', borderInlineStartColor: 'var(--primary)' }}>
+            <span className="text-xs text-muted block mb-1">إجمالي الكورسات النشطة</span>
+            <span className="text-3xl font-black text-gray-800">{stats.length}</span>
+          </div>
+          <div className="card text-right p-6" style={{ borderInlineStartWidth: '5px', borderInlineStartColor: '#10b981' }}>
+            <span className="text-xs text-muted block mb-1">إجمالي اشتراكات الطلاب</span>
+            <span className="text-3xl font-black text-success">{totalEnrollments}</span>
           </div>
         </div>
 
         {loading ? (
-          <div className="card border border-gray-100 flex justify-center p-16 shadow-sm rounded-2xl bg-white">
-            <div className="spinner spinner-primary spinner-lg" />
+          <div className="loading-state">
+            <div className="spinner spinner-lg"></div>
+            <p className="mt-4 font-bold">جاري تحميل الإحصائيات...</p>
           </div>
         ) : stats.length === 0 ? (
-          <div className="empty-state bg-white rounded-2xl py-20 shadow-sm text-center">
-            <div className="empty-state-icon bg-gray-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner">
-              <FileTextIcon size={48} className="text-gray-400" />
+          <div className="empty-state">
+            <div className="empty-state-icon">
+              <FileTextIcon size={36} />
             </div>
-            <h3 className="text-2xl font-black text-gray-800">لا توجد كورسات مسجلة</h3>
-            <p className="text-muted mt-2 font-medium">قم بإنشاء كورس من صفحة الكورسات للبدء في تتبع الإحصائيات.</p>
+            <h3>لا توجد كورسات مسجلة</h3>
+            <p>قم بإنشاء كورس من صفحة الكورسات للبدء.</p>
           </div>
         ) : (
-          <div className="table-container border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
-            <div className="overflow-x-auto w-full">
-              <table className="table w-full m-0 min-w-[800px]">
-                <thead className="bg-gray-50 border-b border-gray-200">
-                  <tr>
-                    <th className="font-bold text-gray-700 py-5 px-6 text-right whitespace-nowrap">الكورس التعليمي</th>
-                    <th className="font-bold text-gray-700 py-5 px-6 text-center whitespace-nowrap">سعر الاشتراك (بالنقاط)</th>
-                    <th className="font-bold text-gray-700 py-5 px-6 text-center whitespace-nowrap">عدد الطلاب المشتركين</th>
-                    <th className="font-bold text-gray-700 py-5 px-6 text-center min-w-[250px]">معدل الإقبال والتوزيع</th>
-                  </tr>
-                </thead>
-                <tbody className="divide-y divide-gray-100">
-                  {stats.map((course) => {
-                    const pct = totalEnrollments > 0 ? Math.round((course.studentsCount / totalEnrollments) * 100) : 0;
-                    return (
-                      <tr 
-                        key={course.id} 
-                        className="cursor-pointer hover:bg-blue-50/50 transition-colors group" 
-                        onClick={() => fetchCourseStudents(course.id, course.title)}
-                      >
-                        <td className="py-5 px-6">
-                          <span className="font-black text-gray-900 group-hover:text-primary transition-colors text-base flex items-center gap-3">
-                            <BookIcon size={20} className="text-gray-400 group-hover:text-primary" />
-                            {course.title}
-                          </span>
-                        </td>
-                        <td className="py-5 px-6 text-center">
-                          <span className="badge font-bold px-4 py-1.5 text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg">
-                            {course.pricePoints.toLocaleString('en-US')} ج.م
-                          </span>
-                        </td>
-                        <td className="py-5 px-6 text-center">
-                          <span className="font-black text-gray-800 text-xl font-mono">
-                            {course.studentsCount.toLocaleString('en-US')} <span className="text-sm text-gray-500 font-bold">طالب</span>
-                          </span>
-                        </td>
-                        <td className="py-5 px-6">
-                          <div className="flex items-center justify-center gap-4">
-                            <span className="text-xs text-gray-500 font-bold w-10 text-left font-mono">{pct}%</span>
-                            <div className="flex-1 w-full bg-gray-100 h-2.5 rounded-full overflow-hidden shadow-inner border border-gray-200/50">
-                              <div className="bg-gradient-to-l from-primary to-blue-400 h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%` }}></div>
-                            </div>
+          <div className="table-container">
+            <table className="table">
+              <thead>
+                <tr>
+                  <th>الكورس التعليمي</th>
+                  <th className="text-center">سعر الاشتراك (بالنقاط)</th>
+                  <th className="text-center">عدد الطلاب المشتركين</th>
+                  <th className="text-center">النسبة من إجمالي الاشتراكات</th>
+                </tr>
+              </thead>
+              <tbody>
+                {stats.map((course) => {
+                  const pct = totalEnrollments > 0 ? Math.round((course.studentsCount / totalEnrollments) * 100) : 0;
+                  return (
+                    <tr key={course.id} className="cursor-pointer" onClick={() => fetchCourseStudents(course.id, course.title)}>
+                      <td>
+                        <span className="font-bold text-primary hover:underline text-base">{course.title}</span>
+                      </td>
+                      <td className="text-center">
+                        <span className="badge badge-success px-3 py-1 font-bold">{course.pricePoints} EGP</span>
+                      </td>
+                      <td className="text-center">
+                        <span className="font-black text-gray-800 text-lg">{course.studentsCount} طالب/ة</span>
+                      </td>
+                      <td>
+                        <div className="flex items-center justify-center gap-3">
+                          <span className="text-xs text-muted font-bold w-8 text-left">{pct}%</span>
+                          <div className="flex-1 max-w-[150px] bg-gray-100 h-2 rounded-full overflow-hidden">
+                            <div className="bg-primary h-full" style={{ width: `${pct}%` }}></div>
                           </div>
-                        </td>
-                      </tr>
-                    );
-                  })}
-                </tbody>
-              </table>
+                        </div>
+                      </td>
+                    </tr>
+                  );
+                })}
+              </tbody>
+            </table>
+          </div>
+        )}
+
+        {/* Course Students Modal */}
+        {selectedCourseId !== null && (
+          <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedCourseId(null)}>
+            <div className="card w-full max-w-2xl max-h-[80vh] overflow-y-auto transform transition-all shadow-2xl text-right bg-white p-6 rounded-xl" onClick={e => e.stopPropagation()}>
+              <div className="flex justify-between items-center mb-6 pb-4 border-b">
+                <h2 className="text-xl font-bold text-primary flex items-center gap-2"><UsersIcon size={22} /> الطلاب المشتركون في كورس: {selectedCourseTitle}</h2>
+                <button onClick={() => setSelectedCourseId(null)} className="text-gray-400 hover:text-error text-2xl font-bold transition-colors"><XIcon size={22} /></button>
+              </div>
+
+              <div className="mb-4 relative">
+                <SearchIcon size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-muted" />
+                <input
+                  type="text"
+                  placeholder="ابحث عن طالب بالاسم أو الهاتف..."
+                  value={studentSearchQuery}
+                  onChange={e => setStudentSearchQuery(e.target.value)}
+                  className="input-field w-full pr-10 bg-gray-50 border border-gray-200 rounded-lg text-sm"
+                  dir="rtl"
+                />
+              </div>
+
+              {loadingStudents ? (
+                <div className="loading-state">
+                  <div className="spinner spinner-lg"></div>
+                  <p className="mt-4 font-bold">جاري تحميل قائمة الطلاب...</p>
+                </div>
+              ) : (() => {
+                const filtered = courseStudents.filter(s => 
+                  s.fullName.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
+                  s.phone.includes(studentSearchQuery)
+                );
+
+                return filtered.length === 0 ? (
+                  <p className="text-muted text-center py-8">لا يوجد طلاب مشتركين يطابقون البحث.</p>
+                ) : (
+                  <div className="overflow-x-auto">
+                    <table className="w-full text-right text-xs">
+                      <thead>
+                        <tr className="border-b text-gray-500">
+                          <th className="pb-2">الاسم</th>
+                          <th className="pb-2">الهاتف</th>
+                          <th className="pb-2">السنة الدراسية</th>
+                          <th className="pb-2">تاريخ الاشتراك</th>
+                          <th className="pb-2 text-center">إجراءات</th>
+                        </tr>
+                      </thead>
+                      <tbody className="divide-y">
+                        {filtered.map(student => (
+                          <tr key={student.id}>
+                            <td className="py-2.5 font-bold text-gray-800">{student.fullName}</td>
+                            <td className="py-2.5 font-mono">{student.phone}</td>
+                            <td className="py-2.5">
+                              <span className="badge badge-primary text-[10px]">
+                                {student.academicYear || 'غير محدد'}
+                              </span>
+                            </td>
+                            <td className="py-2.5 text-muted">
+                              {student.subscribedAt ? new Date(student.subscribedAt).toLocaleDateString('ar-EG') : 'غير معروف'}
+                            </td>
+                            <td className="py-2.5 text-center">
+                              <button
+                                onClick={() => handleOpenProfile(student)}
+                                className="btn btn-xs btn-outline font-bold text-xs flex items-center gap-1"
+                                style={{ padding: '0.25rem 0.75rem' }}
+                              >
+                                <SettingsIcon size={14} /> إدارة البروفايل
+                              </button>
+                            </td>
+                          </tr>
+                        ))}
+                      </tbody>
+                    </table>
+                  </div>
+                );
+              })()}
             </div>
           </div>
         )}
 
-        {/* 🚀 نافذة: الطلاب المشتركين في الكورس */}
-        {selectedCourseId !== null && (
-          <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedCourseId(null)}>
-            <div className="card w-full max-w-4xl max-h-[85vh] overflow-y-auto transform transition-all shadow-2xl text-right bg-white p-0 rounded-2xl animate-scale-up border border-gray-100" onClick={e => e.stopPropagation()}>
-              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm">
-                <h2 className="text-xl font-black text-primary flex items-center gap-3">
-                  <div className="w-10 h-10 bg-blue-50 text-primary flex items-center justify-center rounded-full shadow-inner"><UsersIcon size={20} /></div>
-                  الطلاب المشتركون في: {selectedCourseTitle}
+        {/* Profile Management Modal */}
+        {selectedStudent && (
+          <div className="profile-overlay" onClick={() => setSelectedStudent(null)}>
+            <div className="profile-fullscreen" onClick={e => e.stopPropagation()}>
+              <div className="profile-header">
+                <h2 className="profile-header-title">
+                  <UserIcon size={20} />
+                  إدارة بروفايل الطالب: {selectedStudent.fullName}
                 </h2>
-                <button onClick={() => setSelectedCourseId(null)} className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 text-gray-400 hover:text-error hover:border-red-200 hover:bg-red-50 flex items-center justify-center transition-colors">
-                  <XIcon size={20} />
+                <button onClick={() => setSelectedStudent(null)} className="profile-close-btn">
+                  <XIcon size={24} />
                 </button>
               </div>
 
-              <div className="p-6">
-                <div className="mb-6 relative">
-                  <SearchIcon size={18} className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400" />
-                  <input
-                    type="text"
-                    placeholder="ابحث عن طالب بالاسم أو الهاتف..."
-                    value={studentSearchQuery}
-                    onChange={e => setStudentSearchQuery(e.target.value)}
-                    className="input-field w-full pr-12 py-3 bg-gray-50 focus:bg-white transition-colors font-medium border-gray-200 rounded-xl"
-                    dir="rtl"
-                  />
-                </div>
-
-                {loadingStudents ? (
-                  <div className="loading-state h-64 border border-gray-100 rounded-xl flex flex-col justify-center items-center bg-gray-50/50">
-                    <div className="spinner spinner-primary spinner-lg"></div>
-                    <p className="mt-4 font-bold text-muted">جاري تحميل قائمة الطلاب...</p>
-                  </div>
-                ) : (() => {
-                  // 🚀 الفلترة الآمنة ضد القيم الفارغة
-                  const filtered = courseStudents.filter(s => 
-                    (s.fullName || '').toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
-                    (s.phone || '').includes(studentSearchQuery)
-                  );
-
-                  return filtered.length === 0 ? (
-                    <div className="text-center py-16 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
-                      <UsersIcon size={48} className="mx-auto mb-4 text-gray-300" />
-                      <p className="text-gray-500 font-bold">لا يوجد طلاب مشتركين يطابقون كلمة البحث.</p>
-                    </div>
-                  ) : (
-                    <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm bg-white">
-                      <table className="w-full text-right text-sm m-0 min-w-[800px]">
-                        <thead className="bg-gray-50 border-b border-gray-200">
-                          <tr>
-                            <th className="py-4 px-5 font-bold text-gray-700 whitespace-nowrap">الاسم</th>
-                            <th className="py-4 px-5 font-bold text-gray-700 whitespace-nowrap">الهاتف</th>
-                            <th className="py-4 px-5 font-bold text-gray-700 text-center whitespace-nowrap">السنة الدراسية</th>
-                            <th className="py-4 px-5 font-bold text-gray-700 text-center whitespace-nowrap">تاريخ الاشتراك</th>
-                            <th className="py-4 px-5 font-bold text-gray-700 text-center whitespace-nowrap">إجراءات</th>
-                          </tr>
-                        </thead>
-                        <tbody className="divide-y divide-gray-100">
-                          {filtered.map(student => (
-                            <tr key={student.id} className="hover:bg-gray-50/80 transition-colors">
-                              <td className="py-4 px-5 font-black text-gray-900">{student.fullName}</td>
-                              <td className="py-4 px-5 font-mono font-bold text-gray-600" dir="ltr">{student.phone}</td>
-                              <td className="py-4 px-5 text-center">
-                                <span className="text-xs font-bold text-primary bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
-                                  {student.academicYear || 'غير محدد'}
-                                </span>
-                              </td>
-                              <td className="py-4 px-5 text-center text-xs font-bold text-gray-500">
-                                {student.subscribedAt ? new Date(student.subscribedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : 'غير معروف'}
-                              </td>
-                              <td className="py-4 px-5 text-center">
-                                <button
-                                  onClick={() => handleOpenProfile(student)}
-                                  className="btn btn-sm btn-outline font-bold flex items-center justify-center gap-1.5 mx-auto bg-white shadow-sm border-gray-300 hover:bg-gray-50 rounded-lg px-4"
-                                >
-                                  <SettingsIcon size={14} /> إدارة
-                                </button>
-                              </td>
-                            </tr>
-                          ))}
-                        </tbody>
-                      </table>
-                    </div>
-                  );
-                })()}
-              </div>
-            </div>
-          </div>
-        )}
-
-        {/* 🚀 نافذة: إدارة بروفايل الطالب (التي تفتح من داخل الكورس) */}
-        {selectedStudent && (
-          <div className="profile-overlay z-[200] fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-end" onClick={() => setSelectedStudent(null)}>
-            <div className="profile-fullscreen shadow-2xl border-l border-gray-200 bg-white w-full max-w-2xl h-full overflow-y-auto animate-slide-in-right" onClick={e => e.stopPropagation()}>
-              <div className="profile-header bg-white border-b border-gray-100 p-6 flex justify-between items-center sticky top-0 z-10">
-                <h2 className="profile-header-title text-xl font-black text-gray-900 flex items-center gap-3">
-                  <div className="w-12 h-12 bg-blue-50 text-primary flex items-center justify-center rounded-full shadow-inner"><UserIcon size={24} /></div>
-                  ملف الطالب: {selectedStudent.fullName}
-                </h2>
-                <button onClick={() => setSelectedStudent(null)} className="profile-close-btn w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 border border-gray-200 hover:bg-red-50 hover:text-error hover:border-red-200 transition-colors">
-                  <XIcon size={20} />
-                </button>
-              </div>
-
               {loadingProgress || !studentProgress ? (
-                <div className="loading-state h-[calc(100vh-100px)] flex flex-col justify-center items-center">
-                  <div className="spinner spinner-primary spinner-lg mb-4"></div>
-                  <p className="font-bold text-gray-500">جاري تحميل بيانات ومستويات الطالب...</p>
+                <div className="loading-state">
+                  <div className="spinner spinner-lg"></div>
+                  <p className="mt-4 font-bold">جاري تحميل بيانات الطالب والتقدم...</p>
                 </div>
               ) : (
-                <div className="space-y-6 p-6">
+                <div className="space-y-6">
                   
                   {/* 1. Student Basic Details */}
-                  <div className="profile-info-grid grid grid-cols-2 gap-4 bg-gray-50 p-5 rounded-2xl border border-gray-200 shadow-inner">
-                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
-                      <span className="text-xs font-bold text-gray-400 block mb-1.5 uppercase tracking-wider">السنة الدراسية</span>
-                      <span className="font-black text-primary text-sm">{studentProgress.student?.academicYear || selectedStudent.academicYear || 'غير محدد'}</span>
+                  <div className="profile-info-grid">
+                    <div>
+                      <span className="text-xs text-muted block">السنة الدراسية</span>
+                      <span className="font-bold">{studentProgress.student.academicYear || selectedStudent.academicYear || 'غير محدد'}</span>
                     </div>
-                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
-                      <span className="text-xs font-bold text-gray-400 block mb-1.5 uppercase tracking-wider">رقم هاتف الطالب</span>
-                      <span className="font-black text-gray-800 text-sm font-mono" dir="ltr">{studentProgress.student?.phone || '—'}</span>
+                    <div>
+                      <span className="text-xs text-muted block">رقم هاتف الطالب</span>
+                      <span className="font-bold" dir="ltr">{studentProgress.student.phone}</span>
                     </div>
-                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
-                      <span className="text-xs font-bold text-gray-400 block mb-1.5 uppercase tracking-wider">رقم ولي الأمر</span>
-                      <span className="font-black text-gray-800 text-sm font-mono" dir="ltr">{studentProgress.student?.parentPhone || 'غير محدد'}</span>
+                    <div>
+                      <span className="text-xs text-muted block">رقم هاتف ولي الأمر</span>
+                      <span className="font-bold" dir="ltr">{studentProgress.student.parentPhone || 'غير محدد'}</span>
                     </div>
-                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
-                      <span className="text-xs font-bold text-gray-400 block mb-1.5 uppercase tracking-wider">رصيد المحفظة</span>
-                      <span className="font-black text-success text-lg">{studentProgress.student?.walletBalance || 0} ج.م</span>
+                    <div>
+                      <span className="text-xs text-muted block">رصيد المحفظة</span>
+                      <span className="font-bold text-success">{studentProgress.student.walletBalance} ج.م</span>
                     </div>
                   </div>
 
                   {/* 2. Wallet Adjustment */}
-                  <div className="card p-6 border border-green-200 bg-green-50/50 rounded-2xl shadow-sm">
-                    <h3 className="font-black text-success mb-4 flex items-center gap-2 text-lg"><CreditCardIcon size={22} /> إدارة رصيد المحفظة</h3>
-                    <div className="flex gap-4 items-end max-w-md">
+                  <div className="card p-4 border border-success/20 bg-success/5 rounded-lg">
+                    <h3 className="font-bold text-success mb-3 flex items-center gap-2"><CreditCardIcon size={20} /> إدارة رصيد المحفظة</h3>
+                    <div className="flex gap-3 items-end max-w-md">
                       <div className="flex-1">
-                        <label className="text-xs font-bold text-gray-700 mb-2 block">الرصيد الجديد (ج.م)</label>
+                        <label className="text-xs text-muted mb-1 block">الرصيد الجديد (بالنقاط/جنيه)</label>
                         <input
-                          type="text" // استخدام text للتحكم الكامل ومنع الكسور إن لزم الأمر
-                          className="input-field w-full font-black text-xl bg-white border-green-200 focus:border-green-500 shadow-sm rounded-xl py-3"
+                          type="number"
+                          className="input-field w-full font-bold text-lg"
                           value={walletAmount}
-                          // 🚀 حماية حقل الإدخال
-                          onChange={e => setWalletAmount(e.target.value.replace(/[^0-9.]/g, ''))}
+                          onChange={e => setWalletAmount(e.target.value)}
+                          min="0"
                         />
                       </div>
                       <button
                         onClick={handleUpdateWallet}
-                        disabled={updatingWallet || walletAmount === ''}
-                        className="btn btn-success shadow-lg shadow-green-200 font-bold rounded-xl"
-                        style={{ padding: '0 1.5rem', height: '54px' }}
+                        disabled={updatingWallet}
+                        className="btn btn-success"
+                        style={{ padding: '0.75rem 1.5rem', height: '42px' }}
                       >
-                        {updatingWallet ? <span className="spinner spinner-light w-5 h-5 border-2" /> : 'تحديث الرصيد'}
+                        {updatingWallet ? 'جاري الحفظ...' : 'تحديث الرصيد'}
                       </button>
                     </div>
                   </div>
 
                   {/* 3. Course Enrollment Controls & Lecture Progress */}
                   <div className="space-y-4">
-                    <h3 className="font-black border-b border-gray-100 pb-4 flex items-center gap-2 text-xl text-gray-900 mt-8">
-                      <BookIcon size={24} className="text-primary" /> اشتراكات الكورسات والتقدم
-                    </h3>
+                    <h3 className="font-bold border-b pb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><BookIcon size={20} /> اشتراكات الكورسات والتقدم التعليمي</h3>
                     
                     {allCourses.length === 0 ? (
-                      <div className="text-center py-10 bg-gray-50 border border-dashed border-gray-200 rounded-2xl"><p className="font-bold text-gray-500">لا توجد كورسات مسجلة في المنصة.</p></div>
+                      <p className="text-muted text-center py-4">لا توجد كورسات مسجلة في المنصة.</p>
                     ) : (
                       <div className="space-y-4">
                         {allCourses.map(course => {
-                          // 🚀 حماية المصفوفة
-                          const courseProg = studentProgress.courses?.find((c: any) => c.courseId === course.id);
+                          const courseProg = studentProgress.courses.find((c: any) => c.courseId === course.id);
                           const isEnrolled = !!courseProg;
 
                           return (
-                            <div key={course.id} className={`profile-course-card p-5 rounded-2xl border transition-all ${isEnrolled ? 'border-primary/30 bg-blue-50/20 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
-                              <div className="flex justify-between items-center flex-wrap gap-4">
+                            <div key={course.id} className="profile-course-card space-y-3 text-right">
+                              <div className="flex justify-between items-center flex-wrap gap-2">
                                 <div>
-                                  <h4 className="font-black text-lg text-gray-900">{course.title}</h4>
+                                  <h4 className="font-bold text-base text-primary">{course.title}</h4>
                                   {course.academic_year && (
-                                    <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md mt-1.5 inline-block border border-gray-200">
+                                    <span className="text-xs text-muted px-2 py-0.5 rounded" style={{ background: 'var(--soft-bg, #f1f5f9)' }}>
                                       {course.academic_year}
                                     </span>
                                   )}
@@ -511,60 +473,53 @@
                                 <button
                                   onClick={() => handleToggleCourse(course.id)}
                                   disabled={togglingCourseId === course.id}
-                                  className={`btn text-sm font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all ${isEnrolled ? 'btn-outline border-error text-error hover:bg-red-50' : 'btn-primary shadow-blue-200'}`}
+                                  className={`btn text-xs font-bold px-4 py-2 rounded-lg transition-all ${isEnrolled ? 'btn-danger' : 'btn-primary'}`}
                                 >
                                   {togglingCourseId === course.id ? (
-                                    <span className="spinner w-5 h-5 border-2"></span>
+                                    <span className="spinner w-4 h-4 border-2"></span>
                                   ) : isEnrolled ? (
-                                    <span className="flex items-center gap-1.5"><XIcon size={16} /> إلغاء الاشتراك</span>
+                                    <span className="flex items-center gap-1"><XIcon size={14} /> إلغاء الاشتراك</span>
                                   ) : (
-                                    <span className="flex items-center gap-1.5"><CheckIcon size={16} /> تفعيل الكورس للطالب</span>
+                                    <span className="flex items-center gap-1"><CheckIcon size={14} /> تفعيل الاشتراك</span>
                                   )}
                                 </button>
                               </div>
 
                               {/* Enrolled Course Progress Details */}
-                              {isEnrolled && courseProg && (
-                                <div className="mt-5 p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
-                                  <div className="flex justify-between items-center text-xs font-bold flex-wrap gap-3 mb-5 bg-gray-50 p-3.5 rounded-lg border border-gray-100">
-                                    <span className="text-gray-700">المحاضرات المكتملة: <span className="text-primary font-black text-sm bg-white px-2 py-0.5 rounded border border-gray-100">{courseProg.completedLectures} / {courseProg.totalLectures}</span></span>
-                                    <div className="flex items-center gap-2">
-                                      <span className="text-gray-700">نسبة الإنجاز:</span>
-                                      <span className={`px-2.5 py-1 rounded-md text-white shadow-sm ${courseProg.totalLectures > 0 && Math.round((courseProg.completedLectures / courseProg.totalLectures) * 100) >= 50 ? 'bg-success' : 'bg-warning'}`}>
-                                        {courseProg.totalLectures > 0 ? Math.round((courseProg.completedLectures / courseProg.totalLectures) * 100) : 0}%
-                                      </span>
-                                    </div>
+                              {isEnrolled && (
+                                <div className="p-3 rounded-lg space-y-3 text-right" style={{ background: 'var(--soft-bg, #f8fafc)', border: '1px solid var(--border, #DCE5EB)' }}>
+                                  <div className="flex justify-between items-center text-xs font-bold flex-wrap gap-2" style={{ color: 'var(--text-secondary)' }}>
+                                    <span>عدد المحاضرات المكتملة: {courseProg.completedLectures} / {courseProg.totalLectures}</span>
+                                    <span>نسبة الإنجاز: {courseProg.totalLectures > 0 ? Math.round((courseProg.completedLectures / courseProg.totalLectures) * 100) : 0}%</span>
                                   </div>
                                   
-                                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
-                                    <table className="w-full text-right text-sm m-0 min-w-[500px]">
-                                      <thead className="bg-gray-50 border-b border-gray-200">
-                                        <tr>
-                                          <th className="py-3 px-4 font-bold text-gray-700">اسم المحاضرة</th>
-                                          <th className="py-3 px-4 font-bold text-gray-700 text-center">حالة الفيديو</th>
-                                          <th className="py-3 px-4 font-bold text-gray-700 text-center">أعلى درجة امتحان</th>
+                                  <div className="overflow-x-auto">
+                                    <table className="w-full text-right text-xs">
+                                      <thead>
+                                        <tr className="border-b text-gray-500">
+                                          <th className="pb-2">اسم المحاضرة</th>
+                                          <th className="pb-2 text-center">مشاهدة الفيديو</th>
+                                          <th className="pb-2 text-center">أعلى درجة امتحان</th>
                                         </tr>
                                       </thead>
-                                      <tbody className="divide-y divide-gray-100">
-                                        {courseProg.lectures?.map((lec: any) => (
-                                          <tr key={lec.id} className="hover:bg-gray-50/50 transition-colors">
-                                            <td className="py-3 px-4 font-bold text-gray-900">{lec.title}</td>
-                                            <td className="py-3 px-4 text-center">
+                                      <tbody className="divide-y">
+                                        {courseProg.lectures.map((lec: any) => (
+                                          <tr key={lec.id}>
+                                            <td className="py-2 font-medium">{lec.title}</td>
+                                            <td className="py-2 text-center">
                                               {lec.isCompleted ? (
-                                                <span className="text-success font-bold flex items-center justify-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-lg inline-flex border border-green-100 text-xs shadow-sm"><CheckIcon size={14} /> مكتمل</span>
+                                                <span className="text-success font-bold flex items-center justify-center gap-1"><CheckIcon size={14} /> مكتمل</span>
                                               ) : (
-                                                <span className="text-gray-500 font-bold flex items-center justify-center gap-1.5 text-xs bg-gray-50 px-3 py-1.5 rounded-lg inline-flex border border-gray-200">
-                                                  غير مكتمل ({Math.round(lec.watchTime / 60)} د)
-                                                </span>
+                                                <span className="text-muted flex items-center justify-center gap-1">{Math.round(lec.watchTime / 60)} د</span>
                                               )}
                                             </td>
-                                            <td className="py-3 px-4 text-center">
+                                            <td className="py-2 text-center">
                                               {lec.lastExamScore !== null ? (
-                                                <span className={`font-bold px-3 py-1.5 rounded-lg inline-block text-xs border shadow-sm ${lec.examPassed ? 'text-success bg-green-50 border-green-100' : 'text-error bg-red-50 border-red-100'}`}>
+                                                <span className={`font-bold ${lec.examPassed ? 'text-success' : 'text-error'}`}>
                                                   {lec.lastExamScore}% ({lec.examPassed ? 'ناجح' : 'راسب'})
                                                 </span>
                                               ) : (
-                                                <span className="text-gray-400 font-bold">—</span>
+                                                <span className="text-muted">&mdash;</span>
                                               )}
                                             </td>
                                           </tr>
@@ -588,15 +543,6 @@
           </div>
         )}
       </main>
-
-      <style jsx>{`
-        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
-        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
-        .animate-slide-in-right { animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
-        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
-        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
-        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
-      `}</style>
     </div>
   );
-}+}
```

### `app\admin\stats\finance\page.tsx`
```diff
--- Current: app\admin\stats\finance\page.tsx
+++ Other: app\admin\stats\finance\page.tsx
@@ -1,13 +1,18 @@
 'use client';
 
 import { useEffect, useState, useCallback } from 'react';
+import { useRouter } from 'next/navigation';
 import AdminSidebar from '@/app/components/AdminSidebar';
-import { useAuthGuard } from '../../../hooks/useAuthGuard'; // 🚀 الدرع المركزي
-import api from '@/lib/axios'; // 🚀 العميل الذكي للشبكة
 import {
   TrendingUpIcon, BarChartIcon, CreditCardIcon, FileTextIcon,
-  CheckCircleIcon, XIcon, AlertCircleIcon, UsersIcon
+  CheckCircleIcon, XIcon, AlertCircleIcon
 } from '@/app/components/Icons';
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+
+const getToken = () => {
+  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
+};
 
 interface FinancialSummary {
   period: { start: string; end: string };
@@ -41,9 +46,7 @@
 }
 
 export default function FinanceStatsPage() {
-  // 🚀 حارس البوابة: يطرد المتطفلين ويعرض شاشة التحميل ريثما يتم الفحص
-  const { isChecking } = useAuthGuard(['admin']);
-
+  const router = useRouter();
   const [activeTab, setActiveTab] = useState<'summary' | 'transactions' | 'subscriptions'>('summary');
   
   // States
@@ -59,298 +62,252 @@
   const [subPage, setSubPage] = useState(1);
   const [subTotalPages, setSubTotalPages] = useState(1);
 
-  // 🚀 نظام التنبيهات الموحد العائم
+  // Toast
   const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
   const showToast = useCallback((message: string, type: 'success' | 'error') => {
     setToast({ visible: true, message, type });
-    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
+    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
   }, []);
 
   const fetchSummary = useCallback(async () => {
     setLoading(true);
     try {
-      const response = await api.get('/admin/wallet/summary');
-      const data = response.data?.data || response.data || {};
-      
-      // 🚀 التحويل الصارم للأرقام لمنع انهيار الصفحة أثناء استخدام toLocaleString
-      setSummary({
-        period: data.period || { start: '—', end: '—' },
-        totalTopups: Number(data.total_topups ?? data.totalTopups ?? 0),
-        topupsCount: Number(data.topups_count ?? data.topupsCount ?? 0),
-        courseSalesCount: Number(data.course_sales_count ?? data.courseSalesCount ?? 0),
-        students: {
-          total: Number(data.students?.total ?? 0),
-          active: Number(data.students?.active ?? 0)
-        }
+      const token = getToken();
+      if (!token) { router.push('/login'); return; }
+
+      const res = await fetch(`${API_URL}/api/admin/wallet/summary`, {
+        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
       });
-    } catch (e: any) {
-      showToast(e?.message || 'فشل تحميل الملخص المالي', 'error');
+
+      if (res.ok) {
+        const result = await res.json();
+        setSummary(result.data);
+      } else {
+        showToast('فشل تحميل الملخص المالي', 'error');
+      }
+    } catch (e) {
+      showToast('خطأ في الاتصال بالخادم', 'error');
     } finally {
       setLoading(false);
     }
-  }, [showToast]);
+  }, [router, showToast]);
 
   const fetchTransactions = useCallback(async (page = 1) => {
     setLoading(true);
     try {
-      const response = await api.get('/admin/wallet/transactions', {
-        params: { page, limit: 20 }
+      const token = getToken();
+      if (!token) { router.push('/login'); return; }
+
+      const res = await fetch(`${API_URL}/api/admin/wallet/transactions?page=${page}&limit=20`, {
+        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
       });
-      
-      const data = response.data;
-      const rawTx = data?.data?.data || data?.data || [];
-      
-      const mappedTx: TransactionLog[] = rawTx.map((tx: any) => ({
-        id: tx.id,
-        type: tx.type,
-        amount: Number(tx.amount) || 0,
-        balanceBefore: Number(tx.balance_before ?? tx.balanceBefore ?? 0),
-        balanceAfter: Number(tx.balance_after ?? tx.balanceAfter ?? 0),
-        description: tx.description || 'بدون وصف',
-        status: tx.status || 'مكتمل',
-        date: tx.date || tx.created_at || tx.createdAt || new Date().toISOString(),
-        reference: tx.reference || '—',
-        studentName: tx.student_name ?? tx.studentName ?? tx.student?.full_name ?? 'غير محدد',
-      }));
-
-      setTransactions(mappedTx);
-      setTxPage(data?.data?.pagination?.currentPage ?? data?.meta?.current_page ?? 1);
-      setTxTotalPages(data?.data?.pagination?.lastPage ?? data?.meta?.last_page ?? 1);
-    } catch (e: any) {
-      showToast(e?.message || 'فشل تحميل سجل العمليات المالية', 'error');
+
+      if (res.ok) {
+        const result = await res.json();
+        setTransactions(result.data?.data || []);
+        setTxPage(result.data?.pagination?.currentPage || 1);
+        setTxTotalPages(result.data?.pagination?.lastPage || 1);
+      } else {
+        showToast('فشل تحميل سجل العمليات المالية', 'error');
+      }
+    } catch (e) {
+      showToast('خطأ في الاتصال بالخادم', 'error');
     } finally {
       setLoading(false);
     }
-  }, [showToast]);
+  }, [router, showToast]);
 
   const fetchSubscriptions = useCallback(async (page = 1) => {
     setLoading(true);
     try {
-      const response = await api.get('/admin/wallet/subscriptions', {
-        params: { page, limit: 20 }
+      const token = getToken();
+      if (!token) { router.push('/login'); return; }
+
+      const res = await fetch(`${API_URL}/api/admin/wallet/subscriptions?page=${page}&limit=20`, {
+        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
       });
-      
-      const data = response.data;
-      const rawSubs = data?.data?.data || data?.data || [];
-
-      const mappedSubs: SubscriptionLog[] = rawSubs.map((sub: any) => ({
-        id: sub.id,
-        studentName: sub.student_name ?? sub.studentName ?? sub.student?.full_name ?? 'طالب غير محدد',
-        courseTitle: sub.course_title ?? sub.courseTitle ?? sub.course?.title ?? 'كورس غير محدد',
-        accessType: sub.access_type ?? sub.accessType ?? 'unknown',
-        reference: sub.reference,
-        grantedAt: sub.granted_at ?? sub.grantedAt,
-        createdAt: sub.created_at ?? sub.createdAt ?? new Date().toISOString(),
-      }));
-
-      setSubscriptions(mappedSubs);
-      setSubPage(data?.data?.pagination?.currentPage ?? data?.meta?.current_page ?? 1);
-      setSubTotalPages(data?.data?.pagination?.lastPage ?? data?.meta?.last_page ?? 1);
-    } catch (e: any) {
-      showToast(e?.message || 'فشل تحميل سجل الاشتراكات', 'error');
+
+      if (res.ok) {
+        const result = await res.json();
+        setSubscriptions(result.data?.data || []);
+        setSubPage(result.data?.pagination?.currentPage || 1);
+        setSubTotalPages(result.data?.pagination?.lastPage || 1);
+      } else {
+        showToast('فشل تحميل سجل الاشتراكات', 'error');
+      }
+    } catch (e) {
+      showToast('خطأ في الاتصال بالخادم', 'error');
     } finally {
       setLoading(false);
     }
-  }, [showToast]);
-
-  // 🚀 المراقبة الذكية للتبويبات
+  }, [router, showToast]);
+
   useEffect(() => {
-    if (!isChecking) {
-      if (activeTab === 'summary') {
-        fetchSummary();
-      } else if (activeTab === 'transactions') {
-        fetchTransactions(txPage);
-      } else if (activeTab === 'subscriptions') {
-        fetchSubscriptions(subPage);
-      }
+    if (activeTab === 'summary') {
+      fetchSummary();
+    } else if (activeTab === 'transactions') {
+      fetchTransactions(txPage);
+    } else if (activeTab === 'subscriptions') {
+      fetchSubscriptions(subPage);
     }
-  }, [activeTab, txPage, subPage, fetchSummary, fetchTransactions, fetchSubscriptions, isChecking]);
-
-  if (isChecking) {
-    return (
-      <div className="admin-layout relative">
-        <AdminSidebar />
-        <main className="admin-content flex items-center justify-center min-h-[60vh]">
-          <div className="loading-state text-center flex flex-col items-center">
-            <div className="spinner spinner-primary spinner-lg mb-4 mx-auto" />
-            <p className="font-bold text-muted text-lg">جاري تجهيز البيانات المالية...</p>
-          </div>
-        </main>
-      </div>
-    );
-  }
+  }, [activeTab, txPage, subPage, fetchSummary, fetchTransactions, fetchSubscriptions]);
 
   return (
     <div className="admin-layout relative">
       <AdminSidebar />
 
-      {/* 🚀 نظام التنبيهات الموحد العائم */}
-      <div 
-        className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300" 
-        style={{ 
-          opacity: toast.visible ? 1 : 0, 
-          transform: toast.visible ? 'translate(-50%, 0)' : 'translate(-50%, -20px)', 
-          pointerEvents: toast.visible ? 'auto' : 'none' 
-        }}
-      >
-        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl text-sm font-bold ${toast.type === 'success' ? 'bg-green-600 text-white shadow-green-600/30' : 'bg-red-600 text-white shadow-red-600/30'}`}>
-          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
-          <span>{toast.message}</span>
+      {/* Toast */}
+      <div className={`toast-container ${toast.visible ? 'show' : ''}`}>
+        <div className={`toast-content ${toast.type}`}>
+          {toast.type === 'success' ? <CheckCircleIcon size={18} /> : <XIcon size={18} />}
+          {toast.message}
         </div>
       </div>
 
       <main className="admin-content">
-        <div className="page-header mb-8">
+        <div className="page-header">
           <div>
-            <h1 className="page-title text-3xl font-black text-gray-900 flex items-center gap-3">
-              <TrendingUpIcon size={32} className="text-primary" /> 
-              السجل والتقرير المالي الشامل
-            </h1>
-            <p className="page-subtitle text-base mt-2">مراقبة تفصيلية للمبيعات، إيرادات الشحن، واشتراكات الطلاب في المنصة.</p>
+            <h1 className="page-title flex items-center gap-2"><TrendingUpIcon size={26} /> السجل والتقرير المالي للمنصة</h1>
+            <p className="page-subtitle">تتبع المبيعات والعمليات المالية والاشتراكات للوقوف على أداء المنصة المالي.</p>
           </div>
         </div>
 
-        {/* 🚀 Tab Controls */}
-        <div className="flex gap-3 mb-8 bg-white p-2 rounded-xl border border-gray-100 w-fit overflow-x-auto shadow-sm" style={{ direction: 'rtl' }}>
+        {/* Tab Controls */}
+        <div className="flex gap-2 border-b-2 mb-6" style={{ direction: 'rtl' }}>
           <button
             onClick={() => setActiveTab('summary')}
-            className={`px-6 py-3 font-bold text-sm transition-all rounded-lg flex items-center gap-2 whitespace-nowrap ${activeTab === 'summary' ? 'bg-blue-50 text-primary shadow-sm border border-blue-100' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50 border border-transparent'}`}
+            className={`pb-3 px-6 font-bold text-sm transition-all border-b-2 flex items-center gap-1.5 ${activeTab === 'summary' ? 'border-primary text-primary font-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
           >
-            <BarChartIcon size={18} /> ملخص الإيرادات
+            <BarChartIcon size={16} /> ملخص المبيعات
           </button>
           <button
             onClick={() => setActiveTab('transactions')}
-            className={`px-6 py-3 font-bold text-sm transition-all rounded-lg flex items-center gap-2 whitespace-nowrap ${activeTab === 'transactions' ? 'bg-blue-50 text-primary shadow-sm border border-blue-100' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50 border border-transparent'}`}
+            className={`pb-3 px-6 font-bold text-sm transition-all border-b-2 flex items-center gap-1.5 ${activeTab === 'transactions' ? 'border-primary text-primary font-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
           >
-            <CreditCardIcon size={18} /> سجل المحافظ (Ledger)
+            <CreditCardIcon size={16} /> سجل عمليات المحفظة
           </button>
           <button
             onClick={() => setActiveTab('subscriptions')}
-            className={`px-6 py-3 font-bold text-sm transition-all rounded-lg flex items-center gap-2 whitespace-nowrap ${activeTab === 'subscriptions' ? 'bg-blue-50 text-primary shadow-sm border border-blue-100' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50 border border-transparent'}`}
+            className={`pb-3 px-6 font-bold text-sm transition-all border-b-2 flex items-center gap-1.5 ${activeTab === 'subscriptions' ? 'border-primary text-primary font-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
           >
-            <FileTextIcon size={18} /> سجل اشتراكات الكورسات
+            <FileTextIcon size={16} /> سجل اشتراكات الطلاب
           </button>
         </div>
 
         {loading ? (
-          <div className="loading-state h-64 border border-gray-100 bg-white rounded-2xl shadow-sm flex flex-col justify-center items-center">
-            <div className="spinner spinner-primary spinner-lg mb-4"></div>
-            <p className="font-bold text-gray-500">جاري سحب التقارير من قاعدة البيانات...</p>
+          <div className="loading-state">
+            <div className="spinner spinner-lg"></div>
+            <p className="mt-4 font-bold">جاري تحميل البيانات المالية...</p>
           </div>
         ) : (
           <div className="space-y-6 text-right" style={{ direction: 'rtl' }}>
             
-            {/* 🚀 TAB 1: Summary */}
+            {/* TAB 1: Summary */}
             {activeTab === 'summary' && summary && (
               <div className="space-y-6 animate-fade-in">
-                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
-                  <div className="card p-8 border-l-4 border-l-success shadow-sm bg-white rounded-2xl hover:shadow-md transition-shadow group">
-                    <span className="text-sm font-bold text-gray-500 block mb-3">إجمالي إيرادات الشحن (الموافق عليها)</span>
-                    <span className="text-4xl font-black text-success font-mono group-hover:scale-105 transition-transform origin-right inline-block">
-                      {summary.totalTopups.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-lg">ج.م</span>
-                    </span>
-                    <span className="text-xs font-bold text-gray-500 block mt-4 bg-gray-50 p-2.5 rounded-lg border border-gray-100">بناءً على {summary.topupsCount.toLocaleString('en-US')} عملية شحن مقبولة.</span>
+                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
+                  <div className="card p-6" style={{ borderInlineStartWidth: '5px', borderInlineStartColor: 'var(--success)' }}>
+                    <span className="text-xs text-muted block mb-1">إجمالي إيرادات الشحن (مكتملة)</span>
+                    <span className="text-3xl font-black text-success">{summary.totalTopups} ج.م</span>
+                    <span className="text-xs text-muted block mt-2">({summary.topupsCount} عملية شحن مقبولة)</span>
                   </div>
-                  
-                  <div className="card p-8 border-l-4 border-l-primary shadow-sm bg-white rounded-2xl hover:shadow-md transition-shadow group">
-                    <span className="text-sm font-bold text-gray-500 block mb-3">إجمالي عمليات بيع الكورسات</span>
-                    <span className="text-4xl font-black text-primary font-mono group-hover:scale-105 transition-transform origin-right inline-block">
-                      {summary.courseSalesCount.toLocaleString('en-US')} <span className="text-xl">عملية</span>
-                    </span>
-                    <span className="text-xs font-bold text-gray-500 block mt-4 bg-gray-50 p-2.5 rounded-lg border border-gray-100">يشمل الدفع بالمحفظة أو التفعيل المباشر.</span>
+                  <div className="card p-6" style={{ borderInlineStartWidth: '5px', borderInlineStartColor: 'var(--primary)' }}>
+                    <span className="text-xs text-muted block mb-1">إجمالي مبيعات الكورسات</span>
+                    <span className="text-3xl font-black text-primary">{summary.courseSalesCount} مبيعات</span>
                   </div>
-                  
-                  <div className="card p-8 border-l-4 border-l-orange-500 shadow-sm bg-white rounded-2xl hover:shadow-md transition-shadow group">
-                    <span className="text-sm font-bold text-gray-500 block mb-3">إحصائيات الطلاب (نشط / إجمالي)</span>
-                    <span className="text-4xl font-black text-gray-900 font-mono group-hover:scale-105 transition-transform origin-right inline-block">
-                      {summary.students.active.toLocaleString('en-US')} <span className="text-xl text-gray-400">/ {summary.students.total.toLocaleString('en-US')}</span>
-                    </span>
-                    <span className="text-xs font-bold text-gray-500 block mt-4 bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-center gap-1.5"><UsersIcon size={14} className="text-orange-500"/> طالب نشط اشترى كورساً واحداً على الأقل.</span>
+                  <div className="card p-6" style={{ borderInlineStartWidth: '5px', borderInlineStartColor: 'var(--primary)' }}>
+                    <span className="text-xs text-muted block mb-1">الطلاب النشطين / الإجمالي</span>
+                    <span className="text-3xl font-black text-gray-800">{summary.students.active} / {summary.students.total}</span>
                   </div>
                 </div>
 
-                <div className="card p-6 border border-blue-100 shadow-sm bg-blue-50/50 rounded-2xl">
-                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-primary"><AlertCircleIcon size={20} /> النطاق الزمني للتقرير</h3>
-                  <p className="text-gray-600 text-sm font-medium leading-relaxed">
-                    يتم عرض الأرقام المالية والحسابات الخاصة بالفترة من <strong className="font-mono text-gray-900 bg-white px-2.5 py-1 rounded-md shadow-sm border border-gray-200" dir="ltr">{summary.period.start}</strong> إلى <strong className="font-mono text-gray-900 bg-white px-2.5 py-1 rounded-md shadow-sm border border-gray-200" dir="ltr">{summary.period.end}</strong> (آخر 30 يوماً).
-                  </p>
+                <div className="card p-6">
+                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><AlertCircleIcon size={20} /> النطاق الزمني للملخص المالي</h3>
+                  <p className="text-muted text-sm">يعرض هذا الملخص الأرقام للفترة بين <strong>{summary.period.start}</strong> و <strong>{summary.period.end}</strong> (آخر 30 يوماً).</p>
                 </div>
               </div>
             )}
 
-            {/* 🚀 TAB 2: Transactions */}
+            {/* TAB 2: Transactions */}
             {activeTab === 'transactions' && (
               <div className="space-y-6 animate-fade-in">
                 {transactions.length === 0 ? (
-                  <div className="empty-state bg-white border border-gray-100 rounded-2xl py-20 shadow-sm text-center">
-                    <div className="empty-state-icon bg-gray-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner">
-                      <CreditCardIcon size={48} className="text-gray-400" />
+                  <div className="empty-state">
+                    <div className="empty-state-icon">
+                      <FileTextIcon size={36} />
                     </div>
-                    <h3 className="text-2xl font-black text-gray-800">لا توجد حركات مالية مسجلة بعد</h3>
+                    <h3>لا توجد عمليات مالية مسجلة بعد</h3>
                   </div>
                 ) : (
                   <>
-                    <div className="table-container border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
-                      <div className="overflow-x-auto w-full">
-                        <table className="table w-full m-0 min-w-[1000px]">
-                          <thead className="bg-gray-50 border-b border-gray-200">
-                            <tr>
-                              <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">التاريخ والوقت</th>
-                              <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">الطالب</th>
-                              <th className="font-bold text-gray-700 py-5 px-5 text-center whitespace-nowrap">نوع العملية</th>
-                              <th className="font-bold text-gray-700 py-5 px-5 text-center whitespace-nowrap">قيمة العملية</th>
-                              <th className="font-bold text-gray-700 py-5 px-5 text-center whitespace-nowrap">الرصيد (قبل &larr; بعد)</th>
-                              <th className="font-bold text-gray-700 py-5 px-5 text-right min-w-[200px]">البيان / الوصف</th>
-                              <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">كود المرجع</th>
+                    <div className="table-container">
+                      <table className="table">
+                        <thead>
+                          <tr>
+                            <th>التاريخ</th>
+                            <th>الطالب</th>
+                            <th className="text-center">النوع</th>
+                            <th className="text-center">المبلغ</th>
+                            <th className="text-center">الرصيد قبل / بعد</th>
+                            <th>تفاصيل العملية</th>
+                            <th>كود المرجع</th>
+                          </tr>
+                        </thead>
+                        <tbody>
+                          {transactions.map((tx) => (
+                            <tr key={tx.id}>
+                              <td className="text-xs text-muted">
+                                {new Date(tx.date).toLocaleString('ar-EG')}
+                              </td>
+                              <td className="font-bold text-gray-800">
+                                {tx.studentName}
+                              </td>
+                              <td className="text-center">
+                                {tx.type === 'top_up' ? (
+                                  <span className="badge badge-success">شحن رصيد</span>
+                                ) : tx.type === 'purchase' ? (
+                                  <span className="badge badge-primary">شراء كورس</span>
+                                ) : (
+                                  <span className="badge badge-secondary">{tx.type}</span>
+                                )}
+                              </td>
+                              <td className="text-center font-bold text-gray-900">
+                                {tx.amount} ج.م
+                              </td>
+                              <td className="text-center text-xs text-muted font-semibold">
+                                {tx.balanceBefore} ج.م &larr; {tx.balanceAfter} ج.م
+                              </td>
+                              <td className="text-sm text-gray-600">
+                                {tx.description}
+                              </td>
+                              <td className="text-xs font-mono text-muted">
+                                {tx.reference || '—'}
+                              </td>
                             </tr>
-                          </thead>
-                          <tbody className="divide-y divide-gray-100">
-                            {transactions.map((tx) => {
-                              const isTopup = tx.type === 'top_up' || tx.type === 'topup';
-                              return (
-                                <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
-                                  <td className="py-4 px-5">
-                                    <div className="text-xs font-bold text-gray-500 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg inline-block">
-                                      {new Date(tx.date).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
-                                    </div>
-                                  </td>
-                                  <td className="py-4 px-5 font-black text-gray-900 text-sm">{tx.studentName}</td>
-                                  <td className="py-4 px-5 text-center">
-                                    {isTopup ? (
-                                      <span className="badge font-bold px-3 py-1.5 rounded-lg text-xs bg-green-50 text-green-700 border border-green-100">إيداع / شحن</span>
-                                    ) : tx.type === 'purchase' ? (
-                                      <span className="badge font-bold px-3 py-1.5 rounded-lg text-xs bg-blue-50 text-blue-700 border border-blue-100">خصم / شراء</span>
-                                    ) : (
-                                      <span className="badge font-bold px-3 py-1.5 rounded-lg text-xs bg-gray-100 text-gray-700 border border-gray-200">{tx.type}</span>
-                                    )}
-                                  </td>
-                                  <td className="py-4 px-5 text-center">
-                                    <span className={`font-black text-lg font-mono px-3 py-1 rounded-lg border shadow-sm ${isTopup ? 'text-success bg-green-50 border-green-100' : 'text-error bg-red-50 border-red-100'}`} dir="ltr">
-                                      {isTopup ? '+' : '-'}{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
-                                    </span>
-                                  </td>
-                                  <td className="py-4 px-5 text-center font-bold text-xs text-gray-500 font-mono bg-gray-50/50" dir="ltr">
-                                    {tx.balanceBefore.toLocaleString('en-US')} <span className="text-gray-300 mx-1">&rarr;</span> <span className="text-gray-800">{tx.balanceAfter.toLocaleString('en-US')}</span>
-                                  </td>
-                                  <td className="py-4 px-5 text-sm font-bold text-gray-700 leading-relaxed">{tx.description}</td>
-                                  <td className="py-4 px-5">
-                                    <span className="text-[11px] font-mono font-bold text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-md select-all" dir="ltr">
-                                      {tx.reference || '—'}
-                                    </span>
-                                  </td>
-                                </tr>
-                              );
-                            })}
-                          </tbody>
-                        </table>
-                      </div>
+                          ))}
+                        </tbody>
+                      </table>
                     </div>
 
                     {txTotalPages > 1 && (
-                      <div className="flex justify-center items-center gap-4 mt-8 bg-white p-3 rounded-full shadow-sm border border-gray-200 inline-flex mx-auto">
-                        <button onClick={() => setTxPage((p) => Math.max(1, p - 1))} disabled={txPage === 1} className="btn btn-outline rounded-full px-6 py-2 disabled:opacity-50 font-bold border-none hover:bg-gray-50">السابق</button>
-                        <span className="font-black text-primary px-4 bg-blue-50 py-2 rounded-xl text-sm">الصفحة {txPage} من {txTotalPages}</span>
-                        <button onClick={() => setTxPage((p) => Math.min(txTotalPages, p + 1))} disabled={txPage === txTotalPages} className="btn btn-outline rounded-full px-6 py-2 disabled:opacity-50 font-bold border-none hover:bg-gray-50">التالي</button>
+                      <div className="flex justify-center gap-2 mt-6">
+                        <button
+                          onClick={() => setTxPage((p) => Math.max(1, p - 1))}
+                          disabled={txPage === 1}
+                          className="btn btn-outline text-xs"
+                        >
+                          السابق
+                        </button>
+                        <span className="flex items-center px-4 font-bold text-sm">
+                          {txPage} من {txTotalPages}
+                        </span>
+                        <button
+                          onClick={() => setTxPage((p) => Math.min(txTotalPages, p + 1))}
+                          disabled={txPage === txTotalPages}
+                          className="btn btn-outline text-xs"
+                        >
+                          التالي
+                        </button>
                       </div>
                     )}
                   </>
@@ -358,66 +315,78 @@
               </div>
             )}
 
-            {/* 🚀 TAB 3: Subscriptions */}
+            {/* TAB 3: Subscriptions */}
             {activeTab === 'subscriptions' && (
               <div className="space-y-6 animate-fade-in">
                 {subscriptions.length === 0 ? (
-                  <div className="empty-state bg-white border border-gray-100 rounded-2xl py-20 shadow-sm text-center">
-                    <div className="empty-state-icon bg-gray-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner">
-                      <FileTextIcon size={48} className="text-gray-400" />
+                  <div className="empty-state">
+                    <div className="empty-state-icon">
+                      <FileTextIcon size={36} />
                     </div>
-                    <h3 className="text-2xl font-black text-gray-800">لا توجد اشتراكات مسجلة في النظام</h3>
+                    <h3>لا توجد اشتراكات مسجلة في النظام</h3>
                   </div>
                 ) : (
                   <>
-                    <div className="table-container border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
-                      <div className="overflow-x-auto w-full">
-                        <table className="table w-full m-0 min-w-[1000px]">
-                          <thead className="bg-gray-50 border-b border-gray-200">
-                            <tr>
-                              <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">تاريخ التفعيل</th>
-                              <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">الطالب المشترك</th>
-                              <th className="font-bold text-gray-700 py-5 px-5 text-right min-w-[200px]">الكورس (المحتوى)</th>
-                              <th className="font-bold text-gray-700 py-5 px-5 text-center whitespace-nowrap">بوابة / طريقة التفعيل</th>
-                              <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">كود المرجع / الإيصال</th>
+                    <div className="table-container">
+                      <table className="table">
+                        <thead>
+                          <tr>
+                            <th>تاريخ الاشتراك</th>
+                            <th>الطالب</th>
+                            <th>الكورس المشترك فيه</th>
+                            <th className="text-center">طريقة الاشتراك</th>
+                            <th>تفاصيل كود السنتر / المرجع</th>
+                          </tr>
+                        </thead>
+                        <tbody>
+                          {subscriptions.map((sub) => (
+                            <tr key={sub.id}>
+                              <td className="text-xs text-muted">
+                                {sub.createdAt ? new Date(sub.createdAt).toLocaleString('ar-EG') : '—'}
+                              </td>
+                              <td className="font-bold text-gray-800">
+                                {sub.studentName}
+                              </td>
+                              <td className="font-bold text-primary">
+                                {sub.courseTitle}
+                              </td>
+                              <td className="text-center">
+                                {sub.accessType === 'wallet' ? (
+                                  <span className="badge badge-success">محفظة الطالب</span>
+                                ) : sub.accessType === 'center_code' ? (
+                                  <span className="badge badge-primary">كود السنتر</span>
+                                ) : (
+                                  <span className="badge badge-warning">تفعيل يدوي (إدمن)</span>
+                                )}
+                              </td>
+                              <td className="text-xs font-mono text-muted">
+                                {sub.reference || '—'}
+                              </td>
                             </tr>
-                          </thead>
-                          <tbody className="divide-y divide-gray-100">
-                            {subscriptions.map((sub) => (
-                              <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
-                                <td className="py-4 px-5">
-                                  <span className="text-xs font-bold text-gray-500 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg inline-block">
-                                    {sub.createdAt ? new Date(sub.createdAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
-                                  </span>
-                                </td>
-                                <td className="py-4 px-5 font-black text-gray-900 text-sm">{sub.studentName}</td>
-                                <td className="py-4 px-5 font-black text-primary">{sub.courseTitle}</td>
-                                <td className="py-4 px-5 text-center">
-                                  {sub.accessType === 'wallet' ? (
-                                    <span className="badge font-bold px-3 py-1.5 rounded-lg text-xs bg-green-50 text-green-700 border border-green-100">محفظة الطالب 💳</span>
-                                  ) : sub.accessType === 'center_code' ? (
-                                    <span className="badge font-bold px-3 py-1.5 rounded-lg text-xs bg-blue-50 text-blue-700 border border-blue-100">كود سنتر 🎟️</span>
-                                  ) : (
-                                    <span className="badge font-bold px-3 py-1.5 rounded-lg text-xs bg-orange-50 text-orange-700 border border-orange-100">تفعيل يدوي للإدارة ⚙️</span>
-                                  )}
-                                </td>
-                                <td className="py-4 px-5">
-                                  <span className="text-[11px] font-mono font-bold text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-md select-all" dir="ltr">
-                                    {sub.reference || '—'}
-                                  </span>
-                                </td>
-                              </tr>
-                            ))}
-                          </tbody>
-                        </table>
-                      </div>
+                          ))}
+                        </tbody>
+                      </table>
                     </div>
 
                     {subTotalPages > 1 && (
-                      <div className="flex justify-center items-center gap-4 mt-8 bg-white p-3 rounded-full shadow-sm border border-gray-200 inline-flex mx-auto">
-                        <button onClick={() => setSubPage((p) => Math.max(1, p - 1))} disabled={subPage === 1} className="btn btn-outline rounded-full px-6 py-2 disabled:opacity-50 font-bold border-none hover:bg-gray-50">السابق</button>
-                        <span className="font-black text-primary px-4 bg-blue-50 py-2 rounded-xl text-sm">الصفحة {subPage} من {subTotalPages}</span>
-                        <button onClick={() => setSubPage((p) => Math.min(subTotalPages, p + 1))} disabled={subPage === subTotalPages} className="btn btn-outline rounded-full px-6 py-2 disabled:opacity-50 font-bold border-none hover:bg-gray-50">التالي</button>
+                      <div className="flex justify-center gap-2 mt-6">
+                        <button
+                          onClick={() => setSubPage((p) => Math.max(1, p - 1))}
+                          disabled={subPage === 1}
+                          className="btn btn-outline text-xs"
+                        >
+                          السابق
+                        </button>
+                        <span className="flex items-center px-4 font-bold text-sm">
+                          {subPage} من {subTotalPages}
+                        </span>
+                        <button
+                          onClick={() => setSubPage((p) => Math.min(subTotalPages, p + 1))}
+                          disabled={subPage === subTotalPages}
+                          className="btn btn-outline text-xs"
+                        >
+                          التالي
+                        </button>
                       </div>
                     )}
                   </>
@@ -428,11 +397,6 @@
           </div>
         )}
       </main>
-
-      <style jsx>{`
-        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
-        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
-      `}</style>
     </div>
   );
-}+}
```

### `app\admin\students\page.tsx`
```diff
--- Current: app\admin\students\page.tsx
+++ Other: app\admin\students\page.tsx
@@ -3,8 +3,6 @@
 import { useRouter } from 'next/navigation';
 import { useEffect, useState } from 'react';
 import AdminSidebar from '../../components/AdminSidebar';
-import { useAuthGuard } from '../../hooks/useAuthGuard';
-import api from '@/lib/axios';
 import {
   UserIcon,
   UsersIcon,
@@ -20,25 +18,9 @@
   KeyIcon,
 } from '../../components/Icons';
 
+const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
 const PER_PAGE = 10;
 
-const ACADEMIC_YEARS = [
-  { value: 'grade_1', label: 'الأول الابتدائي' },
-  { value: 'grade_2', label: 'الثاني الابتدائي' },
-  { value: 'grade_3', label: 'الثالث الابتدائي' },
-  { value: 'grade_4', label: 'الرابع الابتدائي' },
-  { value: 'grade_5', label: 'الخامس الابتدائي' },
-  { value: 'grade_6', label: 'السادس الابتدائي' },
-  { value: 'grade_7', label: 'الأول الإعدادي' },
-  { value: 'grade_8', label: 'الثاني الإعدادي' },
-  { value: 'grade_9', label: 'الثالث الإعدادي' },
-  { value: 'grade_10', label: 'الأول الثانوي' },
-  { value: 'grade_11', label: 'الثاني الثانوي' },
-  { value: 'grade_12', label: 'الثالث الثانوي' },
-  { value: 'other', label: 'أخرى / جامعي' }
-];
-
-// احتفظنا بالـ Interface القديم للواجهة لكي لا نكسر التصميم
 interface Student {
   id: number;
   full_name: string;
@@ -60,15 +42,8 @@
   return <span className={`badge ${cfg.className}`}>{cfg.text}</span>;
 }
 
-function getAcademicYearLabel(val: string) {
-  const found = ACADEMIC_YEARS.find(y => y.value === val);
-  return found ? found.label : val;
-}
-
 export default function AllStudentsPage() {
   const router = useRouter();
-  const { isChecking } = useAuthGuard(['admin']);
-
   const [loading, setLoading] = useState(true);
   const [students, setStudents] = useState<Student[]>([]);
   const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'rejected'>('all');
@@ -90,70 +65,42 @@
   const [resettingPassword, setResettingPassword] = useState(false);
 
   const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
-  
   const showToast = (message: string, type: 'success' | 'error') => {
     setToast({ visible: true, message, type });
-    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
+    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
   };
 
   useEffect(() => {
-    if (selectedStudent) {
-      document.body.style.overflow = 'hidden';
-    } else {
-      document.body.style.overflow = '';
-    }
-    return () => { document.body.style.overflow = ''; };
-  }, [selectedStudent]);
-
-  useEffect(() => {
-    if (!isChecking) {
-      fetchStudents(currentPage);
-    }
-  }, [filter, currentPage, search, academicYearFilter, isChecking]);
-
-  // 🚀 الدالة العبقرية الجديدة لجلب البيانات وفك تشفيرها
+    fetchStudents(currentPage);
+  }, [filter, currentPage, search, academicYearFilter]);
+
   const fetchStudents = async (page = 1) => {
     setLoading(true);
     try {
-      const params: any = { page, limit: PER_PAGE };
-      if (filter !== 'all') params.status = filter;
-      if (search) params.search = search;
-      if (academicYearFilter) params.academic_year = academicYearFilter;
-
-      const response: any = await api.get('/admin/users', { params });
-      
-      let usersArray = [];
-      let total = 0;
-      let lastPage = 1;
-
-      // 1. معالجة التغليف الخاص بـ Pagination من Laravel بجميع حالاته
-      if (Array.isArray(response.data)) {
-        usersArray = response.data;
-        total = response.meta?.total || usersArray.length;
-        lastPage = response.meta?.lastPage || response.meta?.last_page || 1;
-      } else if (response.data && Array.isArray(response.data.data)) {
-        usersArray = response.data.data;
-        total = response.data.meta?.total || response.data.total || usersArray.length;
-        lastPage = response.data.meta?.last_page || response.data.last_page || 1;
+      const token = document.cookie
+        .split('; ')
+        .find((row) => row.startsWith('token='))
+        ?.substring(6) || localStorage.getItem('token');
+
+      const url = new URL(`${API_URL}/api/admin/users`);
+      url.searchParams.append('page', page.toString());
+      url.searchParams.append('limit', PER_PAGE.toString());
+      if (filter !== 'all') url.searchParams.append('status', filter);
+      if (search) url.searchParams.append('search', search);
+      if (academicYearFilter) url.searchParams.append('academic_year', academicYearFilter);
+
+      const response = await fetch(url.toString(), {
+        headers: { Authorization: `Bearer ${token}` },
+      });
+
+      if (response.ok) {
+        const data = await response.json();
+        setStudents(data.data.data || []);
+        setTotalPages(data.data.last_page || 1);
+        setTotalCount(data.data.total || 0);
       }
-
-      // 2. توحيد الأسماء (ترجمة CamelCase من الباك إند إلى Snake_case للواجهة)
-      const mappedStudents = usersArray.map((s: any) => ({
-        id: s.id,
-        full_name: s.fullName || s.full_name || 'بدون اسم',
-        email: s.email || '-',
-        phone: s.phone || '-',
-        academic_year: getAcademicYearLabel(s.academicYear || s.academic_year || 'غير محدد'),
-        status: s.status || 'pending',
-        wallet_balance: s.walletBalance !== undefined ? s.walletBalance : (s.wallet_balance || 0),
-        created_at: s.joinedAt || s.joined_at || s.createdAt || s.created_at || new Date().toISOString(),
-      }));
-
-      setStudents(mappedStudents);
-      setTotalPages(lastPage);
-      setTotalCount(total);
-    } catch (error: any) {
-      showToast(error?.message || 'فشل في جلب بيانات الطلاب', 'error');
+    } catch (error) {
+      console.error('Error fetching students:', error);
     } finally {
       setLoading(false);
     }
@@ -162,11 +109,21 @@
   const fetchStudentProgress = async (studentId: number) => {
     setLoadingProgress(true);
     try {
-      const response = await api.get(`/admin/student-progress/${studentId}`);
-      setStudentProgress(response.data);
-      setWalletAmount(response.data.student.walletBalance.toString());
-    } catch (error: any) {
-      showToast('فشل في جلب تقدم الطالب', 'error');
+      const token = document.cookie
+        .split('; ')
+        .find((row) => row.startsWith('token='))
+        ?.substring(6) || localStorage.getItem('token');
+
+      const response = await fetch(`${API_URL}/api/admin/student-progress/${studentId}`, {
+        headers: { Authorization: `Bearer ${token}` },
+      });
+      if (response.ok) {
+        const data = await response.json();
+        setStudentProgress(data.data);
+        setWalletAmount(data.data.student.walletBalance.toString());
+      }
+    } catch (error) {
+      console.error('Error fetching student progress:', error);
     } finally {
       setLoadingProgress(false);
     }
@@ -174,8 +131,18 @@
 
   const fetchAllCourses = async () => {
     try {
-      const response = await api.get('/admin/courses');
-      setAllCourses(response.data || []);
+      const token = document.cookie
+        .split('; ')
+        .find((row) => row.startsWith('token='))
+        ?.substring(6) || localStorage.getItem('token');
+
+      const response = await fetch(`${API_URL}/api/admin/courses`, {
+        headers: { Authorization: `Bearer ${token}` },
+      });
+      if (response.ok) {
+        const data = await response.json();
+        setAllCourses(data.data || []);
+      }
     } catch (error) {
       console.error('Error fetching courses:', error);
     }
@@ -193,14 +160,31 @@
     if (!selectedStudent) return;
     setUpdatingWallet(true);
     try {
-      await api.post(`/admin/users/${selectedStudent.id}/wallet`, {
-        balance: parseInt(walletAmount)
+      const token = document.cookie
+        .split('; ')
+        .find((row) => row.startsWith('token='))
+        ?.substring(6) || localStorage.getItem('token');
+
+      const response = await fetch(`${API_URL}/api/admin/users/${selectedStudent.id}/wallet`, {
+        method: 'POST',
+        headers: {
+          'Authorization': `Bearer ${token}`,
+          'Content-Type': 'application/json',
+          'Accept': 'application/json'
+        },
+        body: JSON.stringify({ balance: parseInt(walletAmount) }),
       });
-      showToast('تم تحديث رصيد المحفظة بنجاح!', 'success');
-      fetchStudentProgress(selectedStudent.id);
-      fetchStudents(currentPage); 
-    } catch (error: any) {
-      showToast(error?.message || 'فشل تحديث رصيد المحفظة', 'error');
+
+      const data = await response.json();
+      if (response.ok) {
+        showToast('تم تحديث رصيد المحفظة بنجاح!', 'success');
+        fetchStudentProgress(selectedStudent.id);
+        fetchStudents(currentPage);
+      } else {
+        showToast(data.error || data.message || 'فشل تحديث رصيد المحفظة', 'error');
+      }
+    } catch (error) {
+      showToast('خطأ في الاتصال بالخادم', 'error');
     } finally {
       setUpdatingWallet(false);
     }
@@ -210,11 +194,28 @@
     if (!selectedStudent) return;
     setTogglingCourseId(courseId);
     try {
-      await api.post(`/admin/users/${selectedStudent.id}/courses/${courseId}/toggle`);
-      showToast('تم تغيير حالة الاشتراك للكورس بنجاح!', 'success');
-      fetchStudentProgress(selectedStudent.id);
-    } catch (error: any) {
-      showToast(error?.message || 'فشل تغيير حالة الاشتراك', 'error');
+      const token = document.cookie
+        .split('; ')
+        .find((row) => row.startsWith('token='))
+        ?.substring(6) || localStorage.getItem('token');
+
+      const response = await fetch(`${API_URL}/api/admin/users/${selectedStudent.id}/courses/${courseId}/toggle`, {
+        method: 'POST',
+        headers: {
+          'Authorization': `Bearer ${token}`,
+          'Accept': 'application/json'
+        },
+      });
+
+      const data = await response.json();
+      if (response.ok) {
+        showToast('تم تغيير حالة الاشتراك للكورس بنجاح!', 'success');
+        fetchStudentProgress(selectedStudent.id);
+      } else {
+        showToast(data.error || data.message || 'فشل تغيير حالة الاشتراك', 'error');
+      }
+    } catch (error) {
+      showToast('خطأ في الاتصال بالخادم', 'error');
     } finally {
       setTogglingCourseId(null);
     }
@@ -222,73 +223,66 @@
 
   const handleResetPassword = async () => {
     if (!selectedStudent) return;
-    if (!newPassword || newPassword.length < 8) {
-      showToast('كلمة المرور يجب أن تكون 8 أحرف على الأقل وتتضمن أرقام', 'error');
+    if (!newPassword || newPassword.length < 6) {
+      showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
       return;
     }
     setResettingPassword(true);
     try {
-      await api.post(`/admin/users/${selectedStudent.id}/reset-password`, {
-        password: newPassword
+      const token = document.cookie
+        .split('; ')
+        .find((row) => row.startsWith('token='))
+        ?.substring(6) || localStorage.getItem('token');
+
+      const response = await fetch(`${API_URL}/api/admin/users/${selectedStudent.id}/reset-password`, {
+        method: 'POST',
+        headers: {
+          'Authorization': `Bearer ${token}`,
+          'Content-Type': 'application/json',
+          'Accept': 'application/json'
+        },
+        body: JSON.stringify({ password: newPassword }),
       });
-      showToast('تم إعادة تعيين كلمة المرور بنجاح!', 'success');
-      setNewPassword('');
-    } catch (error: any) {
-      showToast(error?.message || 'فشل إعادة تعيين كلمة المرور', 'error');
+
+      if (response.ok) {
+        showToast('تم إعادة تعيين كلمة المرور بنجاح!', 'success');
+        setNewPassword('');
+      } else {
+        const errData = await response.json();
+        showToast(errData.message || 'فشل إعادة تعيين كلمة المرور', 'error');
+      }
+    } catch (error) {
+      showToast('خطأ في الاتصال بالخادم', 'error');
     } finally {
       setResettingPassword(false);
     }
   };
 
-  if (isChecking) {
-    return (
-      <div className="admin-layout">
-        <AdminSidebar />
-        <main className="admin-content">
-          <div className="loading-state">
-            <div className="spinner spinner-lg" />
-            <p className="mt-4 text-muted font-bold">جاري التحقق من الصلاحيات...</p>
-          </div>
-        </main>
-      </div>
-    );
-  }
-
   return (
     <div className="admin-layout relative">
       <AdminSidebar />
 
-      <div 
-        className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300" 
-        style={{ 
-          opacity: toast.visible ? 1 : 0, 
-          transform: toast.visible ? 'translate(-50%, 0)' : 'translate(-50%, -20px)', 
-          pointerEvents: toast.visible ? 'auto' : 'none' 
-        }}
-      >
-        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl text-sm font-bold ${toast.type === 'success' ? 'bg-green-600 text-white shadow-green-600/30' : 'bg-red-600 text-white shadow-red-600/30'}`}>
-          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
-          <span>{toast.message}</span>
+      <div className={`toast-container ${toast.visible ? 'show' : ''}`}>
+        <div className={`toast-content ${toast.type}`}>
+          {toast.type === 'success' ? <CheckCircleIcon size={18} /> : <AlertCircleIcon size={18} />}
+          {toast.message}
         </div>
       </div>
 
       <main className="admin-content">
         <div className="page-header">
           <div>
-            <h1 className="page-title flex items-center gap-2">
-              <UsersIcon size={28} />
-              إدارة جميع الطلاب
-            </h1>
+            <h1 className="page-title">إدارة الطلاب</h1>
             <p className="page-subtitle">
-              إجمالي الطلاب المسجلين: <span className="font-bold text-primary">{totalCount}</span> طالب/ة
+              إجمالي الطلاب: {totalCount} طالب/ة
             </p>
           </div>
         </div>
 
-        <div className="card mb-6 shadow-sm border border-[var(--border)]">
+        <div className="card mb-6">
           <div className="flex gap-4 flex-wrap">
             <div className="flex-1 min-w-[200px] relative">
-              <SearchIcon size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
+              <SearchIcon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
               <input
                 type="text"
                 placeholder="ابحث بالاسم أو البريد أو الهاتف..."
@@ -297,25 +291,24 @@
                   setSearch(e.target.value);
                   setCurrentPage(1);
                 }}
-                className="input-field pr-12 w-full font-semibold"
+                className="input-field pr-9"
                 dir="rtl"
               />
             </div>
 
-            <div style={{ width: '220px' }}>
+            <div style={{ width: '200px' }}>
               <select
                 value={academicYearFilter}
                 onChange={(e) => {
                   setAcademicYearFilter(e.target.value);
-                  setCurrentPage(1); // العودة للصفحة الأولى عند الفلترة
+                  setCurrentPage(1);
                 }}
-                className="input-field w-full font-semibold cursor-pointer"
+                className="input-field animate-fade-in"
                 dir="rtl"
               >
                 <option value="">كل السنوات الدراسية</option>
-                {/* 🚀 رسم الفلتر باللغة العربية، ولكن القيمة المرسلة ستكون إنجليزية */}
-                {ACADEMIC_YEARS.map(year => (
-                  <option key={year.value} value={year.value}>{year.label}</option>
+                {['الاول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي', 'الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي', 'الاول الاعدادي', 'الثاني الاعدادي', 'الثالث الاعدادي', 'الاول الثانوي', 'الثاني الثانوية', 'الثالث الثانوي'].map(year => (
+                  <option key={year} value={year}>{year}</option>
                 ))}
               </select>
             </div>
@@ -328,7 +321,7 @@
                     setFilter(status);
                     setCurrentPage(1);
                   }}
-                  className={`btn btn-sm font-bold px-4 ${filter === status ? 'btn-primary shadow-md' : 'btn-outline bg-[var(--soft-bg)]'}`}
+                  className={`btn btn-sm ${filter === status ? 'btn-primary' : 'btn-outline'}`}
                 >
                   {status === 'all' ? 'الكل' : status === 'active' ? 'نشط' : status === 'pending' ? 'معلق' : 'مرفوض'}
                 </button>
@@ -340,95 +333,88 @@
         {loading ? (
           <div className="loading-state">
             <div className="spinner spinner-lg" />
-            <p className="mt-4 text-muted font-bold">جاري تحميل قائمة الطلاب...</p>
+            <p className="mt-4 text-muted">جاري تحميل قائمة الطلاب...</p>
           </div>
         ) : students.length === 0 ? (
           <div className="empty-state">
             <div className="empty-state-icon">
-              <UsersIcon size={48} />
+              <UsersIcon size={32} />
             </div>
-            <h3 className="text-xl font-bold mt-4">لا يوجد طلاب</h3>
-            <p className="text-muted">لم يتم العثور على طلاب يطابقون معايير البحث الحالية.</p>
+            <h3>لا يوجد طلاب</h3>
+            <p>لا يوجد طلاب يطابقون البحث</p>
           </div>
         ) : (
           <>
-            <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface)' }}>
-              <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
-                <table className="table text-right" style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', margin: 0 }}>
-                  <thead>
-                    <tr style={{ background: 'var(--soft-bg)', borderBottom: '1px solid var(--border)' }}>
-                      <th style={{ padding: '1rem' }}>#</th>
-                      <th style={{ padding: '1rem' }}>الاسم</th>
-                      <th style={{ padding: '1rem', textAlign: 'center' }}>السنة</th>
-                      <th style={{ padding: '1rem', textAlign: 'center' }}>المحفظة</th>
-                      <th style={{ padding: '1rem', textAlign: 'center' }}>الحالة</th>
-                      <th style={{ padding: '1rem', textAlign: 'center' }}>التاريخ</th>
-                      <th style={{ padding: '1rem', textAlign: 'center' }}>الإجراءات</th>
+            <div className="table-container">
+              <table className="table text-right">
+                <thead>
+                  <tr>
+                    <th>#</th>
+                    <th>الاسم</th>
+                    <th>السنة</th>
+                    <th>المحفظة</th>
+                    <th>الحالة</th>
+                    <th>التاريخ</th>
+                    <th className="text-center">الإجراءات</th>
+                  </tr>
+                </thead>
+                <tbody>
+                  {students.map((student, index) => (
+                    <tr key={student.id}>
+                      <td>{(currentPage - 1) * PER_PAGE + index + 1}</td>
+                      <td>
+                        <div className="flex items-center gap-3">
+                          <div
+                            className="student-avatar"
+                            style={{ backgroundColor: 'var(--primary)' }}
+                          >
+                            {(student.full_name || '?').charAt(0)}
+                          </div>
+                          <div>
+                            <div className="font-semibold">{student.full_name}</div>
+                            <div className="text-xs text-muted" dir="ltr">{student.phone}</div>
+                          </div>
+                        </div>
+                      </td>
+                      <td>{student.academic_year}</td>
+                      <td>
+                        <span className="font-semibold text-success">
+                          {student.wallet_balance} ج.م
+                        </span>
+                      </td>
+                      <td>{getStatusBadge(student.status)}</td>
+                      <td>{new Date(student.created_at).toLocaleDateString('ar-EG')}</td>
+                      <td className="text-center">
+                        <button
+                          onClick={() => handleOpenProfile(student)}
+                          className="btn btn-sm btn-outline font-bold"
+                        >
+                          <SettingsIcon size={14} />
+                          إدارة البروفايل
+                        </button>
+                      </td>
                     </tr>
-                  </thead>
-                  <tbody>
-                    {students.map((student, index) => (
-                      <tr key={student.id} className="hover:bg-[var(--soft-bg)] transition-colors" style={{ borderBottom: '1px solid var(--border-light)' }}>
-                        <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
-                          {(currentPage - 1) * PER_PAGE + index + 1}
-                        </td>
-                        <td style={{ padding: '1rem' }}>
-                          <div className="flex items-center gap-3">
-                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-md font-bold bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] shrink-0">
-                              {(student.full_name || '?').charAt(0)}
-                            </div>
-                            <div>
-                              <div className="font-bold text-sm text-[var(--text-primary)]">{student.full_name}</div>
-                              <div className="text-xs text-muted font-mono" dir="ltr">{student.phone}</div>
-                            </div>
-                          </div>
-                        </td>
-                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }} className="text-primary">
-                          {student.academic_year}
-                        </td>
-                        <td style={{ padding: '1rem', textAlign: 'center' }}>
-                          <span className="font-bold text-success bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs">
-                            {student.wallet_balance} ج.م
-                          </span>
-                        </td>
-                        <td style={{ padding: '1rem', textAlign: 'center' }}>
-                          {getStatusBadge(student.status)}
-                        </td>
-                        <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
-                          {new Date(student.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' })}
-                        </td>
-                        <td style={{ padding: '1rem', textAlign: 'center' }}>
-                          <button
-                            onClick={() => handleOpenProfile(student)}
-                            className="btn btn-sm btn-outline font-bold inline-flex items-center gap-2 px-4 rounded-lg"
-                          >
-                            <SettingsIcon size={14} />
-                            إدارة الملف
-                          </button>
-                        </td>
-                      </tr>
-                    ))}
-                  </tbody>
-                </table>
-              </div>
+                  ))}
+                </tbody>
+              </table>
             </div>
 
             {totalPages > 1 && (
-              <div className="flex justify-center items-center gap-4 mt-8">
+              <div className="flex justify-center gap-2 mt-6">
                 <button
                   onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                   disabled={currentPage === 1}
-                  className="btn btn-outline px-6 rounded-xl font-bold disabled:opacity-50"
+                  className="btn btn-outline"
                 >
                   السابق
                 </button>
-                <span className="font-bold text-sm bg-[var(--soft-bg)] px-4 py-2 rounded-lg border border-[var(--border)]">
-                  صفحة <span className="text-primary">{currentPage}</span> من {totalPages}
+                <span className="flex items-center px-4 font-bold">
+                  {currentPage} من {totalPages}
                 </span>
                 <button
                   onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                   disabled={currentPage === totalPages}
-                  className="btn btn-primary px-6 rounded-xl font-bold disabled:opacity-50"
+                  className="btn btn-outline"
                 >
                   التالي
                 </button>
@@ -438,234 +424,210 @@
         )}
       </main>
 
-      {/* نافذة إدارة بروفايل الطالب */}
       {selectedStudent && (
-        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in" onClick={() => setSelectedStudent(null)}>
-          <div 
-            className="bg-[var(--background)] w-full max-w-2xl h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden" 
-            onClick={e => e.stopPropagation()}
-            dir="rtl"
-          >
-            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface)]">
-              <div>
-                <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
-                  <UserIcon size={24} className="text-primary" />
-                  ملف الطالب: {selectedStudent.full_name}
-                </h2>
-                <p className="text-sm text-muted mt-1 font-mono">{selectedStudent.email}</p>
-              </div>
-              <button 
-                onClick={() => setSelectedStudent(null)} 
-                className="p-2 rounded-full hover:bg-[var(--soft-bg)] text-muted hover:text-red-500 transition-colors"
-              >
+        <div className="profile-overlay" onClick={() => setSelectedStudent(null)}>
+          <div className="profile-fullscreen" onClick={e => e.stopPropagation()}>
+            <div className="profile-header">
+              <h2 className="profile-header-title">
+                <UserIcon size={20} />
+                إدارة بروفايل الطالب: {selectedStudent.full_name}
+              </h2>
+              <button onClick={() => setSelectedStudent(null)} className="profile-close-btn">
                 <XIcon size={24} />
               </button>
             </div>
 
-            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
-              {loadingProgress || !studentProgress ? (
-                <div className="h-full flex flex-col items-center justify-center space-y-4">
-                  <div className="spinner spinner-lg text-primary" />
-                  <p className="text-muted font-bold animate-pulse">جاري جلب الملف الشامل للطالب...</p>
-                </div>
-              ) : (
-                <div className="space-y-6">
-
-                  {/* معلومات أساسية */}
-                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-5 bg-[var(--soft-bg)] rounded-2xl border border-[var(--border)]">
-                    <div>
-                      <span className="text-xs text-muted block mb-1">السنة الدراسية</span>
-                      <span className="font-bold text-sm bg-white px-2 py-1 rounded shadow-sm">{studentProgress.student.academicYear || selectedStudent.academic_year || 'غير محدد'}</span>
-                    </div>
-                    <div>
-                      <span className="text-xs text-muted block mb-1">هاتف الطالب</span>
-                      <span className="font-bold text-sm font-mono" dir="ltr">{studentProgress.student.phone}</span>
-                    </div>
-                    <div>
-                      <span className="text-xs text-muted block mb-1">هاتف ولي الأمر</span>
-                      <span className="font-bold text-sm font-mono" dir="ltr">{studentProgress.student.parentPhone || 'غير محدد'}</span>
-                    </div>
-                    <div>
-                      <span className="text-xs text-muted block mb-1">المحافظة</span>
-                      <span className="font-bold text-sm">{studentProgress.student.governorate || 'غير محدد'}</span>
-                    </div>
-                    <div>
-                      <span className="text-xs text-muted block mb-1">المدرسة</span>
-                      <span className="font-bold text-sm truncate block" title={studentProgress.student.school}>{studentProgress.student.school || 'غير محدد'}</span>
-                    </div>
-                    <div>
-                      <span className="text-xs text-muted block mb-1">رصيد المحفظة الحالي</span>
-                      <span className="font-bold text-success text-sm">{studentProgress.student.walletBalance} ج.م</span>
-                    </div>
+            {loadingProgress || !studentProgress ? (
+              <div className="loading-state">
+                <div className="spinner spinner-lg" />
+                <p className="mt-4 text-muted font-bold">جاري تحميل بيانات الطالب والتقدم...</p>
+              </div>
+            ) : (
+              <div className="space-y-6">
+
+                <div className="profile-info-grid">
+                  <div>
+                    <span className="text-xs text-muted block">البريد الإلكتروني</span>
+                    <span className="font-bold">{studentProgress.student.email || selectedStudent.email || 'غير محدد'}</span>
                   </div>
-
-                  {/* إدارة المحفظة */}
-                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
-                    <h3 className="font-bold text-green-600 mb-4 flex items-center gap-2">
-                      <WalletIcon size={20} />
-                      تعديل رصيد المحفظة
-                    </h3>
-                    <div className="flex gap-3 items-end">
-                      <div className="flex-1">
-                        <input
-                          type="number"
-                          className="input-field w-full font-bold text-lg text-left"
-                          value={walletAmount}
-                          onChange={e => setWalletAmount(e.target.value)}
-                          min="0"
-                          dir="ltr"
-                        />
-                      </div>
-                      <button
-                        onClick={handleUpdateWallet}
-                        disabled={updatingWallet}
-                        className="btn btn-success px-6 py-3 rounded-xl font-bold shadow-lg shadow-green-200/50"
-                      >
-                        {updatingWallet ? <span className="spinner spinner-light w-5 h-5 border-2" /> : 'حفظ الرصيد'}
-                      </button>
-                    </div>
+                  <div>
+                    <span className="text-xs text-muted block">السنة الدراسية</span>
+                    <span className="font-bold">{studentProgress.student.academicYear || selectedStudent.academic_year || 'غير محدد'}</span>
                   </div>
-
-                  {/* إعادة تعيين كلمة المرور */}
-                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
-                    <h3 className="font-bold text-amber-500 mb-4 flex items-center gap-2">
-                      <KeyIcon size={20} />
-                      تغيير كلمة المرور
-                    </h3>
-                    <div className="flex gap-3 items-end">
-                      <div className="flex-1">
-                        <input
-                          type="text"
-                          placeholder="أدخل 8 أحرف وأرقام على الأقل"
-                          className="input-field w-full font-bold font-mono text-left"
-                          value={newPassword}
-                          onChange={e => setNewPassword(e.target.value)}
-                          dir="ltr"
-                        />
-                      </div>
-                      <button
-                        onClick={handleResetPassword}
-                        disabled={resettingPassword}
-                        className="btn btn-warning px-6 py-3 rounded-xl font-bold shadow-lg shadow-amber-200/50 text-white"
-                      >
-                        {resettingPassword ? <span className="spinner spinner-light w-5 h-5 border-2" /> : 'تغيير'}
-                      </button>
-                    </div>
+                  <div>
+                    <span className="text-xs text-muted block">رقم هاتف الطالب</span>
+                    <span className="font-bold" dir="ltr">{studentProgress.student.phone}</span>
                   </div>
-
-                  {/* إدارة الكورسات والتقدم */}
-                  <div className="space-y-4 pt-4 border-t border-[var(--border)]">
-                    <h3 className="font-bold text-xl flex items-center gap-2 text-[var(--text-primary)]">
-                      <BookIcon size={22} className="text-primary" />
-                      الاشتراكات والتقدم التعليمي
-                    </h3>
-
-                    {allCourses.length === 0 ? (
-                      <div className="text-center py-8 bg-[var(--soft-bg)] rounded-xl border border-dashed border-gray-300">
-                        <BookIcon size={32} className="mx-auto text-gray-400 mb-2" />
-                        <p className="text-gray-500 font-bold">لا توجد كورسات متاحة في المنصة حالياً.</p>
-                      </div>
-                    ) : (
-                      <div className="space-y-4">
-                        {allCourses.map(course => {
-                          const courseProg = studentProgress.courses.find((c: any) => c.courseId === course.id);
-                          const isEnrolled = !!courseProg;
-
-                          return (
-                            <div key={course.id} className={`bg-white rounded-2xl border transition-all ${isEnrolled ? 'border-primary shadow-md' : 'border-gray-200 opacity-75 hover:opacity-100'}`}>
-                              <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100">
-                                <div>
-                                  <h4 className="font-bold text-lg text-gray-900">{course.title}</h4>
-                                  <div className="flex items-center gap-2 mt-1">
-                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-bold">
-                                      {course.academic_year || 'عام'}
-                                    </span>
-                                    {isEnrolled && (
-                                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold">
-                                        إنجاز: {courseProg.totalLectures > 0 ? Math.round((courseProg.completedLectures / courseProg.totalLectures) * 100) : 0}%
-                                      </span>
-                                    )}
-                                  </div>
-                                </div>
-                                <button
-                                  onClick={() => handleToggleCourse(course.id)}
-                                  disabled={togglingCourseId === course.id}
-                                  className={`btn btn-sm font-bold w-full md:w-auto px-6 py-2 rounded-xl transition-all ${isEnrolled ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-100' : 'btn-primary shadow-lg shadow-primary/30'}`}
-                                >
-                                  {togglingCourseId === course.id ? (
-                                    <span className="spinner w-4 h-4 border-2 mx-auto" style={{ borderColor: isEnrolled ? 'red transparent red transparent' : 'white transparent white transparent'}} />
-                                  ) : isEnrolled ? (
-                                    <><XIcon size={16} /> إلغاء الاشتراك</>
-                                  ) : (
-                                    <><CheckIcon size={16} /> تفعيل الكورس</>
-                                  )}
-                                </button>
-                              </div>
-
-                              {isEnrolled && courseProg.lectures.length > 0 && (
-                                <div className="p-4 bg-gray-50/50 rounded-b-2xl">
-                                  <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
-                                    <table className="w-full text-right text-sm">
-                                      <thead>
-                                        <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
-                                          <th className="py-3 px-4 font-bold">المحاضرة</th>
-                                          <th className="py-3 px-4 text-center font-bold">الفيديو</th>
-                                          <th className="py-3 px-4 text-center font-bold">الامتحان</th>
-                                        </tr>
-                                      </thead>
-                                      <tbody className="divide-y divide-gray-100">
-                                        {courseProg.lectures.map((lec: any) => (
-                                          <tr key={lec.id} className="hover:bg-gray-50 transition-colors">
-                                            <td className="py-3 px-4 font-semibold text-gray-800">{lec.title}</td>
-                                            <td className="py-3 px-4 text-center">
-                                              {lec.isCompleted ? (
-                                                <span className="text-green-600 bg-green-50 px-2 py-1 rounded inline-flex items-center gap-1 text-xs font-bold">
-                                                  <CheckIcon size={14} /> مكتمل
-                                                </span>
-                                              ) : (
-                                                <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded inline-flex items-center gap-1 text-xs font-bold">
-                                                  <ClockIcon size={14} /> شاهد {Math.round(lec.watchTime / 60)} دقيقة
-                                                </span>
-                                              )}
-                                            </td>
-                                            <td className="py-3 px-4 text-center">
-                                              {lec.lastExamScore !== null ? (
-                                                <span className={`font-bold inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${lec.examPassed ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
-                                                  {lec.examPassed ? <CheckIcon size={14} /> : <XIcon size={14} />}
-                                                  {lec.lastExamScore}%
-                                                </span>
-                                              ) : (
-                                                <span className="text-gray-400 text-xs font-bold">—</span>
-                                              )}
-                                            </td>
-                                          </tr>
-                                        ))}
-                                      </tbody>
-                                    </table>
-                                  </div>
-                                </div>
-                              )}
-                            </div>
-                          );
-                        })}
-                      </div>
-                    )}
+                  <div>
+                    <span className="text-xs text-muted block">رقم هاتف ولي الأمر</span>
+                    <span className="font-bold" dir="ltr">{studentProgress.student.parentPhone || 'غير محدد'}</span>
+                  </div>
+                  <div>
+                    <span className="text-xs text-muted block">رصيد المحفظة</span>
+                    <span className="font-bold text-success">{studentProgress.student.walletBalance} ج.م</span>
                   </div>
                 </div>
-              )}
-            </div>
+
+                <div className="card">
+                  <h3 className="font-bold text-success mb-3 flex items-center gap-2">
+                    <WalletIcon size={18} />
+                    إدارة رصيد المحفظة
+                  </h3>
+                  <div className="flex gap-3 items-end max-w-md">
+                    <div className="flex-1">
+                      <label className="form-label">الرصيد الجديد (بالنقاط/جنيه)</label>
+                      <input
+                        type="number"
+                        className="input-field w-full font-bold text-lg"
+                        value={walletAmount}
+                        onChange={e => setWalletAmount(e.target.value)}
+                        min="0"
+                      />
+                    </div>
+                    <button
+                      onClick={handleUpdateWallet}
+                      disabled={updatingWallet}
+                      className="btn btn-success"
+                    >
+                      {updatingWallet ? 'جاري الحفظ...' : 'تحديث الرصيد'}
+                    </button>
+                  </div>
+                </div>
+
+                <div className="card">
+                  <h3 className="font-bold text-warning mb-3 flex items-center gap-2">
+                    <KeyIcon size={18} />
+                    إعادة تعيين كلمة المرور
+                  </h3>
+                  <div className="flex gap-3 items-end max-w-md">
+                    <div className="flex-1">
+                      <label className="form-label">كلمة المرور الجديدة</label>
+                      <input
+                        type="text"
+                        placeholder="أدخل 6 أحرف على الأقل"
+                        className="input-field w-full font-bold"
+                        value={newPassword}
+                        onChange={e => setNewPassword(e.target.value)}
+                      />
+                    </div>
+                    <button
+                      onClick={handleResetPassword}
+                      disabled={resettingPassword}
+                      className="btn btn-warning"
+                    >
+                      {resettingPassword ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
+                    </button>
+                  </div>
+                </div>
+
+                <div className="space-y-4">
+                  <h3 className="font-bold border-b pb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
+                    <BookIcon size={18} />
+                    اشتراكات الكورسات والتقدم التعليمي
+                  </h3>
+
+                  {allCourses.length === 0 ? (
+                    <p className="text-muted text-center py-4">لا توجد كورسات مسجلة في المنصة.</p>
+                  ) : (
+                    <div className="space-y-4">
+                      {allCourses.map(course => {
+                        const courseProg = studentProgress.courses.find((c: any) => c.courseId === course.id);
+                        const isEnrolled = !!courseProg;
+
+                        return (
+                          <div key={course.id} className="profile-course-card space-y-3 text-right">
+                            <div className="flex justify-between items-center flex-wrap gap-2">
+                              <div>
+                                <h4 className="font-bold text-base text-primary">{course.title}</h4>
+                                {course.academic_year && (
+                                  <span className="text-xs text-muted px-2 py-0.5 rounded" style={{ background: 'var(--soft-bg, #f1f5f9)' }}>
+                                    {course.academic_year}
+                                  </span>
+                                )}
+                              </div>
+                              <button
+                                onClick={() => handleToggleCourse(course.id)}
+                                disabled={togglingCourseId === course.id}
+                                className={`btn btn-sm font-bold ${isEnrolled ? 'btn-danger' : 'btn-primary'}`}
+                              >
+                                {togglingCourseId === course.id ? (
+                                  <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
+                                ) : isEnrolled ? (
+                                  <>
+                                    <XIcon size={14} />
+                                    إلغاء الاشتراك
+                                  </>
+                                ) : (
+                                  <>
+                                    <CheckIcon size={14} />
+                                    تفعيل الاشتراك
+                                  </>
+                                )}
+                              </button>
+                            </div>
+
+                            {isEnrolled && (
+                              <div className="p-3 rounded-lg space-y-3 text-right" style={{ background: 'var(--soft-bg, #f8fafc)', border: '1px solid var(--border, #DCE5EB)' }}>
+                                <div className="flex justify-between items-center text-xs font-bold flex-wrap gap-2" style={{ color: 'var(--text-secondary)' }}>
+                                  <span>عدد المحاضرات المكتملة: {courseProg.completedLectures} / {courseProg.totalLectures}</span>
+                                  <span>نسبة الإنجاز: {courseProg.totalLectures > 0 ? Math.round((courseProg.completedLectures / courseProg.totalLectures) * 100) : 0}%</span>
+                                </div>
+
+                                <div className="overflow-x-auto">
+                                  <table className="w-full text-right text-xs">
+                                    <thead>
+                                      <tr className="border-b text-muted">
+                                        <th className="pb-2">اسم المحاضرة</th>
+                                        <th className="pb-2 text-center">مشاهدة الفيديو</th>
+                                        <th className="pb-2 text-center">أعلى درجة امتحان</th>
+                                      </tr>
+                                    </thead>
+                                    <tbody className="divide-y">
+                                      {courseProg.lectures.map((lec: any) => (
+                                        <tr key={lec.id}>
+                                          <td className="py-2 font-medium">{lec.title}</td>
+                                          <td className="py-2 text-center">
+                                            {lec.isCompleted ? (
+                                              <span className="text-success font-bold inline-flex items-center gap-1">
+                                                <CheckIcon size={14} />
+                                                مكتمل
+                                              </span>
+                                            ) : (
+                                              <span className="text-muted inline-flex items-center gap-1">
+                                                <ClockIcon size={14} />
+                                                غير مكتمل ({Math.round(lec.watchTime / 60)} د)
+                                              </span>
+                                            )}
+                                          </td>
+                                          <td className="py-2 text-center">
+                                            {lec.lastExamScore !== null ? (
+                                              <span className={`font-bold ${lec.examPassed ? 'text-success' : 'text-error'}`}>
+                                                {lec.lastExamScore}% ({lec.examPassed ? 'ناجح' : 'راسب'})
+                                              </span>
+                                            ) : (
+                                              <span className="text-muted">—</span>
+                                            )}
+                                          </td>
+                                        </tr>
+                                      ))}
+                                    </tbody>
+                                  </table>
+                                </div>
+                              </div>
+                            )}
+
+                          </div>
+                        );
+                      })}
+                    </div>
+                  )}
+                </div>
+
+              </div>
+            )}
           </div>
         </div>
       )}
-
-      <style jsx>{`
-        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
-        .animate-slide-in-right { animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
-        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
-        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
-        .scrollbar-hide::-webkit-scrollbar { display: none; }
-        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
-      `}</style>
     </div>
   );
-}+}
```

### `app\admin\topups\page.tsx`
```diff
--- Current: app\admin\topups\page.tsx
+++ Other: app\admin\topups\page.tsx
@@ -1,14 +1,15 @@
 'use client';
 
-import { useEffect, useState, useCallback } from 'react';
 import { useRouter } from 'next/navigation';
+import { useEffect, useState } from 'react';
 import AdminSidebar from '../../components/AdminSidebar';
-import { useAuthGuard } from '../../hooks/useAuthGuard'; // 🚀 حارس البوابات
-import api from '@/lib/axios'; // 🚀 العميل الذكي للشبكة
-import { 
-  CheckIcon, XIcon, EditIcon, ImageIcon, SearchIcon,
-  AlertCircleIcon, CheckCircleIcon, ClockIcon, FilterIcon 
-} from '../../components/Icons';
+import { CheckIcon, XIcon, EditIcon, ImageIcon, AlertCircleIcon, CheckCircleIcon, ClockIcon, FilterIcon } from '../../components/Icons';
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+
+const getToken = () => {
+  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
+};
 
 interface TopupRequest {
   id: number;
@@ -26,87 +27,68 @@
 
 export default function TopupsPage() {
   const router = useRouter();
-  
-  // 🚀 درع الحماية: يطرد أي متطفل فوراً
-  const { isChecking } = useAuthGuard(['admin']);
-
   const [loading, setLoading] = useState(true);
   const [topups, setTopups] = useState<TopupRequest[]>([]);
   const [filter, setFilter] = useState<'pending' | 'approved' | 'declined' | 'all'>('pending');
-  const [searchQuery, setSearchQuery] = useState(''); // 🚀 شريط البحث الذكي
   const [selectedTopup, setSelectedTopup] = useState<TopupRequest | null>(null);
   
   const [modalMode, setModalMode] = useState<'approve' | 'adjust' | 'decline' | null>(null);
   
   const [processing, setProcessing] = useState(false);
   const [declineReason, setDeclineReason] = useState('');
-  const [adjustAmount, setAdjustAmount] = useState<string>(''); // محصن ضد الـ NaN
+  const [adjustAmount, setAdjustAmount] = useState<number | null>(null);
   const [adjustNotes, setAdjustNotes] = useState('');
   const [lightboxImage, setLightboxImage] = useState<string | null>(null);
 
   const [currentPage, setCurrentPage] = useState(1);
   const [totalPages, setTotalPages] = useState(1);
 
-  // 🚀 نظام التنبيهات الموحد العائم
   const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
-  const showToast = useCallback((message: string, type: 'success' | 'error') => {
+  const showToast = (message: string, type: 'success' | 'error') => {
     setToast({ visible: true, message, type });
-    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
-  }, []);
-
-  // 🚀 تجميد التمرير عند فتح المودال أو صورة الإيصال
+    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
+  };
+
   useEffect(() => {
-    if (modalMode || lightboxImage) document.body.style.overflow = 'hidden';
-    else document.body.style.overflow = '';
-    return () => { document.body.style.overflow = ''; };
-  }, [modalMode, lightboxImage]);
-
-  // 🚀 جلب البيانات بمجرد عبور الدرع الأمني
-  useEffect(() => {
-    if (!isChecking) {
-      fetchTopups(currentPage);
-    }
-  }, [filter, currentPage, isChecking]);
+    fetchTopups(currentPage);
+  // eslint-disable-next-line react-hooks/exhaustive-deps
+  }, [filter, currentPage]);
 
   const fetchTopups = async (page = 1) => {
     setLoading(true);
     try {
-      const response = await api.get('/admin/wallet/topups', {
-        params: {
-          status: filter === 'all' ? undefined : filter,
-          page
-        }
+      const token = getToken();
+      if (!token) { router.push('/login'); return; }
+
+      const response = await fetch(`${API_URL}/api/admin/wallet/topups?status=${filter}&page=${page}`, {
+        headers: { Authorization: `Bearer ${token}` },
       });
 
-      const data = response.data;
-      const dataList = data?.data || data || [];
-      
-      const mappedTopups = dataList.map((t: any) => ({
-        id: t.id,
-        amount: Number(t.amount) || 0,
-        verifiedAmount: t.verified_amount != null ? Number(t.verified_amount) : (t.verifiedAmount != null ? Number(t.verifiedAmount) : null),
-        finalAmount: Number(t.final_amount ?? t.finalAmount) || 0,
-        paymentMethod: t.payment_method ?? t.paymentMethod ?? 'غير محدد',
-        status: t.status || 'pending',
-        adminNotes: t.admin_notes ?? t.adminNotes ?? null,
-        proofImageUrl: t.proof_image_url ?? t.proofImageUrl ?? '',
-        createdAt: t.created_at ?? t.createdAt ?? new Date().toISOString(),
-        student: {
-          id: t.student?.id,
-          fullName: t.student?.full_name ?? t.student?.fullName ?? 'طالب غير معروف',
-          phone: t.student?.phone ?? '—',
-          walletBalance: Number(t.student?.wallet_balance ?? t.student?.walletBalance ?? 0),
-        },
-        paymentNumber: t.payment_number || t.paymentNumber ? { 
-          number: t.payment_number?.number ?? t.paymentNumber?.number ?? '—', 
-          provider: t.payment_number?.provider ?? t.paymentNumber?.provider ?? '—' 
-        } : null,
-      }));
-      
-      setTopups(mappedTopups);
-      setTotalPages(data?.meta?.last_page ?? data?.meta?.lastPage ?? 1);
-    } catch (error: any) {
-      showToast(error?.message || 'فشل جلب طلبات الشحن', 'error');
+      if (response.ok) {
+        const json = await response.json();
+        const mappedTopups = (json.data || []).map((t: any) => ({
+          id: t.id,
+          amount: t.amount,
+          verifiedAmount: t.verified_amount,
+          finalAmount: t.final_amount,
+          paymentMethod: t.payment_method,
+          status: t.status,
+          adminNotes: t.admin_notes,
+          proofImageUrl: t.proof_image_url,
+          createdAt: t.created_at,
+          student: {
+            id: t.student?.id,
+            fullName: t.student?.full_name || 'غير معروف',
+            phone: t.student?.phone || '',
+            walletBalance: t.student?.wallet_balance || 0,
+          },
+          paymentNumber: t.payment_number ? { number: t.payment_number.number, provider: t.payment_number.provider } : null,
+        }));
+        setTopups(mappedTopups);
+        if (json.meta) setTotalPages(json.meta.last_page || 1);
+      }
+    } catch (error) {
+      showToast('فشل جلب الطلبات', 'error');
     } finally {
       setLoading(false);
     }
@@ -116,39 +98,62 @@
     if (!selectedTopup) return;
     setProcessing(true);
     try {
-      await api.post(`/admin/wallet/topups/${selectedTopup.id}/approve`, {
+      const token = getToken();
+      const payload = {
         verified_amount: Number(selectedTopup.amount),
         admin_notes: 'تمت الموافقة المباشرة'
+      };
+
+      const response = await fetch(`${API_URL}/api/admin/wallet/topups/${selectedTopup.id}/approve`, {
+        method: 'POST',
+        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
+        body: JSON.stringify(payload),
       });
 
-      showToast('تمت الموافقة على الطلب بنجاح وإضافة الرصيد', 'success');
-      fetchTopups(currentPage);
-      closeModal();
-    } catch (error: any) {
-      showToast(error?.message || error?.error || 'فشل في الموافقة على الطلب', 'error');
+      if (response.ok) {
+        showToast('تمت الموافقة على الطلب بنجاح', 'success');
+        fetchTopups(currentPage);
+        closeModal();
+      } else {
+        const error = await response.json();
+        showToast(error.message || 'فشل في الموافقة على الطلب', 'error');
+      }
+    } catch (error) {
+      showToast('حدث خطأ أثناء الموافقة', 'error');
     } finally {
       setProcessing(false);
     }
   };
 
   const handleAdjustAndApprove = async () => {
-    const amountNum = Number(adjustAmount);
-    if (!selectedTopup || isNaN(amountNum) || amountNum <= 0) {
-      showToast('يرجى إدخال مبلغ صحيح أكبر من الصفر', 'error');
+    if (!selectedTopup || !adjustAmount || adjustAmount <= 0) {
+      showToast('يرجى إدخال مبلغ صحيح', 'error');
       return;
     }
     setProcessing(true);
     try {
-      await api.post(`/admin/wallet/topups/${selectedTopup.id}/adjust`, {
-        verified_amount: amountNum,
-        notes: adjustNotes.trim() || 'تم تعديل المبلغ من قبل الإدارة',
+      const token = getToken();
+      const payload = {
+        verified_amount: Number(adjustAmount),
+        notes: adjustNotes || 'تم تعديل المبلغ من قبل الإدارة',
+      };
+
+      const response = await fetch(`${API_URL}/api/admin/wallet/topups/${selectedTopup.id}/adjust`, {
+        method: 'POST',
+        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
+        body: JSON.stringify(payload),
       });
 
-      showToast('تم تعديل المبلغ واعتماده بنجاح', 'success');
-      fetchTopups(currentPage);
-      closeModal();
-    } catch (error: any) {
-      showToast(error?.message || error?.error || 'فشل في تعديل المبلغ', 'error');
+      if (response.ok) {
+        showToast('تم تعديل المبلغ واعتماده بنجاح', 'success');
+        fetchTopups(currentPage);
+        closeModal();
+      } else {
+        const error = await response.json();
+        showToast(error.message || 'فشل في تعديل المبلغ', 'error');
+      }
+    } catch (error) {
+      showToast('حدث خطأ أثناء التعديل', 'error');
     } finally {
       setProcessing(false);
     }
@@ -156,20 +161,32 @@
 
   const handleDecline = async () => {
     if (!selectedTopup || !declineReason.trim() || declineReason.length < 10) {
-      showToast('يرجى إدخال سبب الرفض بوضوح (10 أحرف على الأقل)', 'error');
+      showToast('يرجى إدخال سبب الرفض (10 أحرف على الأقل)', 'error');
       return;
     }
     setProcessing(true);
     try {
-      await api.post(`/admin/wallet/topups/${selectedTopup.id}/decline`, {
-        admin_notes: declineReason.trim()
+      const token = getToken();
+      const payload = {
+        admin_notes: declineReason
+      };
+
+      const response = await fetch(`${API_URL}/api/admin/wallet/topups/${selectedTopup.id}/decline`, {
+        method: 'POST',
+        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
+        body: JSON.stringify(payload), 
       });
 
-      showToast('تم رفض الطلب بنجاح', 'success');
-      fetchTopups(currentPage);
-      closeModal();
-    } catch (error: any) {
-      showToast(error?.message || error?.error || 'فشل في رفض الطلب', 'error');
+      if (response.ok) {
+        showToast('تم رفض الطلب بنجاح', 'success');
+        fetchTopups(currentPage);
+        closeModal();
+      } else {
+        const error = await response.json();
+        showToast(error.message || 'فشل في رفض الطلب', 'error');
+      }
+    } catch (error) {
+      showToast('حدث خطأ أثناء الرفض', 'error');
     } finally {
       setProcessing(false);
     }
@@ -179,356 +196,185 @@
     setSelectedTopup(null);
     setModalMode(null);
     setDeclineReason('');
-    setAdjustAmount('');
+    setAdjustAmount(null);
     setAdjustNotes('');
-  };
-
-  // 🚀 معالجة مسارات الصور بذكاء
-  const getImageUrl = (path: string) => {
-    if (!path) return '';
-    if (path.startsWith('http')) return path;
-    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';
-    return `${baseUrl}/storage/${path}`;
   };
 
   const getStatusBadge = (status: string) => {
     const styles: Record<string, string> = {
-      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
-      approved: 'bg-green-50 text-green-700 border-green-200',
-      declined: 'bg-red-50 text-red-700 border-red-200',
+      pending: 'badge badge-warning',
+      approved: 'badge badge-success',
+      declined: 'badge badge-error',
     };
     const labels: Record<string, string> = {
-      pending: 'قيد المراجعة',
-      approved: 'مكتمل',
+      pending: 'معلق',
+      approved: 'موافق عليه',
       declined: 'مرفوض',
     };
-    return (
-      <span className={`px-4 py-1.5 rounded-lg text-xs font-bold border ${styles[status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
-        {labels[status] || status}
-      </span>
-    );
-  };
-
-  // 🚀 فلترة الطلبات محلياً للبحث السريع
-  const filteredTopups = topups.filter(t => 
-    (t.student.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
-    (t.student.phone || '').includes(searchQuery) ||
-    (t.paymentNumber?.number || '').includes(searchQuery)
-  );
-
-  if (isChecking) {
-    return (
-      <div className="admin-layout">
-        <AdminSidebar />
-        <div className="admin-content flex items-center justify-center min-h-[60vh]">
-          <div className="loading-state flex flex-col items-center">
-            <div className="spinner spinner-primary spinner-lg mb-4" />
-            <p className="text-muted font-bold text-lg">جاري تحميل المعاملات المالية...</p>
-          </div>
-        </div>
-      </div>
-    );
-  }
+    return <span className={styles[status] || 'badge'}>{labels[status] || status}</span>;
+  };
 
   return (
-    <main className="admin-layout relative">
+    <div className="admin-layout relative">
       <AdminSidebar />
       
-      {/* 🚀 نظام التنبيهات الموحد العائم */}
-      <div 
-        className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300" 
-        style={{ 
-          opacity: toast.visible ? 1 : 0, 
-          transform: toast.visible ? 'translate(-50%, 0)' : 'translate(-50%, -20px)', 
-          pointerEvents: toast.visible ? 'auto' : 'none' 
-        }}
-      >
-        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl text-sm font-bold ${toast.type === 'success' ? 'bg-green-600 text-white shadow-green-600/30' : 'bg-red-600 text-white shadow-red-600/30'}`}>
+      <div className="toast-container" style={{ opacity: toast.visible ? 1 : 0 }}>
+        <div className={`toast-content ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
           {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
-          <span>{toast.message}</span>
+          {toast.message}
         </div>
       </div>
 
-      {/* 🚀 عارض الإيصالات (Lightbox) */}
-      {lightboxImage && (
-        <div className="fixed inset-0 flex items-center justify-center z-[150] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }} onClick={() => setLightboxImage(null)}>
-          <div className="bg-white p-2 rounded-2xl max-w-4xl w-[calc(100%-32px)] relative mx-4 shadow-2xl animate-scale-up" onClick={e => e.stopPropagation()}>
-            <div className="absolute -top-4 -right-4 z-10">
-               <button className="text-error bg-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg border border-red-100 cursor-pointer hover:bg-red-50 hover:scale-105 transition-all" onClick={() => setLightboxImage(null)}>
-                 <XIcon size={24} />
-               </button>
-            </div>
-            <img src={getImageUrl(lightboxImage)} alt="إيصال الدفع" className="w-full max-h-[85vh] object-contain rounded-xl" />
-            <div className="text-center p-4 text-sm font-bold text-gray-500 mt-2 bg-gray-50 rounded-lg border border-gray-100">
-              صورة الإيصال المرفقة من الطالب للتحقق
-            </div>
-          </div>
-        </div>
-      )}
-
-      {/* 🚀 نافذة الموافقة المباشرة */}
-      {selectedTopup && modalMode === 'approve' && (
-        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={closeModal}>
-          <div className="card max-w-sm w-full p-8 text-center animate-scale-up bg-white rounded-2xl border border-gray-100" onClick={(e) => e.stopPropagation()}>
-            <div className="text-success mb-5 flex justify-center bg-green-50 w-24 h-24 rounded-full items-center mx-auto border border-green-100 shadow-inner">
-              <CheckCircleIcon size={56} />
-            </div>
-            <h3 className="text-2xl font-black text-gray-900 mb-3">تأكيد الموافقة</h3>
-            <p className="text-gray-600 text-sm mb-8 leading-relaxed font-medium">
-              هل أنت متأكد من الموافقة على إضافة <strong className="text-success text-lg bg-green-50 px-2 py-0.5 rounded">{selectedTopup.amount} ج.م</strong> لمحفظة الطالب <strong className="text-gray-900">{selectedTopup.student.fullName}</strong>؟
-            </p>
-            <div className="flex gap-3">
-              <button onClick={closeModal} disabled={processing} className="btn btn-outline flex-1 font-bold rounded-xl py-3 border-gray-200 hover:bg-gray-50">إلغاء</button>
-              <button onClick={handleApprove} disabled={processing} className="btn btn-success flex-1 font-bold shadow-lg shadow-green-200 rounded-xl py-3">
-                {processing ? <span className="spinner spinner-light w-5 h-5 border-2 mx-auto" /> : 'تأكيد وإضافة'}
-              </button>
-            </div>
-          </div>
-        </div>
-      )}
-
-      {/* 🚀 نافذة التعديل والموافقة */}
-      {selectedTopup && modalMode === 'adjust' && (
-        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={closeModal}>
-          <div className="card max-w-md w-full p-8 animate-scale-up bg-white rounded-2xl border border-gray-100" onClick={(e) => e.stopPropagation()}>
-            <h3 className="text-2xl font-black mb-6 text-gray-900 flex items-center gap-3 border-b border-gray-100 pb-5">
-              <div className="w-12 h-12 bg-yellow-100 text-yellow-600 flex items-center justify-center rounded-full shadow-inner"><EditIcon size={24} /></div>
-              تعديل المبلغ المطلوب
-            </h3>
-            
-            <div className="bg-red-50 text-red-800 p-5 rounded-xl mb-6 border border-red-100 flex justify-between items-center shadow-sm">
-              <span className="font-bold text-sm">المبلغ المكتوب في الطلب:</span>
-              <span className="font-black text-2xl tracking-tight">{selectedTopup.amount} <span className="text-sm">ج.م</span></span>
-            </div>
-
-            <div className="form-group mb-6">
-              <label className="form-label font-bold text-gray-700 mb-2 block">المبلغ الفعلي المراد إضافته (بالجنيه)</label>
-              <input 
-                type="number" 
-                className="input-field w-full text-xl font-black bg-gray-50 focus:bg-white text-center py-4 rounded-xl border-gray-200 focus:border-yellow-400 focus:ring-yellow-400 transition-all" 
-                value={adjustAmount} 
-                onChange={(e) => setAdjustAmount(e.target.value.replace(/[^0-9]/g, ''))} 
-                placeholder="أدخل المبلغ النهائي..." 
-                min="1" 
-                dir="ltr"
-              />
-            </div>
-
-            <div className="form-group mb-8">
-              <label className="form-label font-bold text-gray-700 mb-2 block">ملاحظات الإدارة (تظهر للطالب)</label>
-              <textarea 
-                className="input-field w-full bg-gray-50 focus:bg-white rounded-xl border-gray-200 p-4 text-sm" 
-                value={adjustNotes} 
-                onChange={(e) => setAdjustNotes(e.target.value)} 
-                placeholder="مثال: تم خصم 5 جنيه رسوم تحويل من البنك..." 
-                rows={3} 
-                style={{ resize: 'none' }} 
-              />
-            </div>
-
-            <div className="flex gap-3">
-              <button onClick={closeModal} disabled={processing} className="btn btn-outline flex-1 font-bold py-3 rounded-xl border-gray-200 hover:bg-gray-50">إلغاء</button>
-              <button onClick={handleAdjustAndApprove} disabled={processing || !adjustAmount} className="btn btn-warning flex-[2] font-bold py-3 text-white shadow-lg shadow-yellow-200/50 rounded-xl">
-                {processing ? <span className="spinner spinner-light w-5 h-5 border-2 mx-auto" /> : 'اعتماد المبلغ الجديد'}
-              </button>
-            </div>
-          </div>
-        </div>
-      )}
-
-      {/* 🚀 نافذة رفض الطلب */}
-      {selectedTopup && modalMode === 'decline' && (
-        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={closeModal}>
-          <div className="card max-w-md w-full p-8 animate-scale-up bg-white rounded-2xl border border-gray-100" onClick={(e) => e.stopPropagation()}>
-            <h3 className="text-2xl font-black mb-6 text-error flex items-center gap-3 border-b border-gray-100 pb-5">
-              <div className="w-12 h-12 bg-red-100 text-error flex items-center justify-center rounded-full shadow-inner"><XIcon size={24} /></div>
-              رفض طلب الشحن
-            </h3>
-            
-            <div className="form-group mb-3">
-              <label className="form-label font-bold text-gray-700 mb-2 block">سبب الرفض (إجباري ليظهر للطالب)</label>
-              <textarea 
-                className="input-field w-full bg-gray-50 focus:bg-white rounded-xl border-gray-200 p-4 text-sm" 
-                value={declineReason} 
-                onChange={(e) => setDeclineReason(e.target.value)} 
-                placeholder="مثال: الإيصال غير واضح، أو لم يتم استلام حوالة بهذا الرقم. يرجى مراجعة الدعم الفني..." 
-                rows={4} 
-                style={{ resize: 'none' }} 
-              />
-            </div>
-            
-            <p className="text-xs text-red-600 font-bold mb-8 bg-red-50 p-2.5 rounded-lg inline-block border border-red-100 w-full flex items-center gap-2">
-              <AlertCircleIcon size={16} /> يرجى كتابة سبب واضح لتجنب تكرار الطلب.
-            </p>
-            
-            <div className="flex gap-3">
-              <button onClick={closeModal} disabled={processing} className="btn btn-outline flex-1 font-bold py-3 rounded-xl border-gray-200 hover:bg-gray-50">إلغاء</button>
-              <button onClick={handleDecline} disabled={processing || declineReason.trim().length < 10} className="btn btn-danger flex-[2] font-bold py-3 shadow-lg shadow-red-200 rounded-xl">
-                 {processing ? <span className="spinner spinner-light w-5 h-5 border-2 mx-auto" /> : 'تأكيد الرفض النهائي'}
-              </button>
-            </div>
-          </div>
-        </div>
-      )}
-
-      <main className="admin-content">
-        <div className="page-header mb-8">
-          <h1 className="page-title text-3xl font-black text-gray-900 flex items-center gap-3">
-            <FilterIcon size={32} className="text-primary" />
+      <div className="admin-content">
+        <div className="page-header">
+          <h1 className="page-title">
+            <FilterIcon size={24} />
             طلبات شحن المحفظة
           </h1>
-          <p className="page-subtitle text-base mt-2">مراجعة الإيصالات المرسلة من الطلاب واعتمادها في النظام.</p>
-        </div>
-
-        {/* 🚀 شريط البحث والفلاتر */}
-        <div className="card p-6 mb-8 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between bg-white shadow-sm border border-gray-100 rounded-2xl">
-          <div className="flex gap-3 flex-wrap items-center">
-            {(['pending', 'approved', 'declined', 'all'] as const).map((status) => (
-              <button 
-                key={status} 
-                onClick={() => { setFilter(status); setCurrentPage(1); }} 
-                className={`btn ${filter === status ? 'btn-primary shadow-md shadow-blue-200' : 'btn-outline border-gray-200 text-gray-600 hover:bg-gray-50'} text-sm font-bold px-5 py-2.5 rounded-xl transition-all`}
-              >
-                {status === 'pending' ? <><ClockIcon size={16} className={filter === 'pending' ? 'text-white' : 'text-warning'} /> قيد المراجعة</> : 
-                 status === 'approved' ? <><CheckCircleIcon size={16} className={filter === 'approved' ? 'text-white' : 'text-success'} /> موافق عليها</> : 
-                 status === 'declined' ? <><XIcon size={16} className={filter === 'declined' ? 'text-white' : 'text-error'} /> مرفوضة</> : 'جميع الطلبات'}
-              </button>
-            ))}
-          </div>
-
-          <div className="relative w-full md:w-72">
-            <SearchIcon size={18} className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400" />
-            <input 
-              type="text" 
-              placeholder="ابحث بالاسم أو الرقم..." 
-              value={searchQuery}
-              onChange={(e) => setSearchQuery(e.target.value)}
-              className="input-field w-full pr-12 py-2.5 bg-gray-50 focus:bg-white rounded-xl border-gray-200 text-sm font-medium transition-all"
-            />
-          </div>
+        </div>
+
+        <div className="card p-4 mb-6 flex gap-2 flex-wrap items-center">
+          {(['pending', 'approved', 'declined', 'all'] as const).map((status) => (
+            <button key={status} onClick={() => { setFilter(status); setCurrentPage(1); }} className={`btn ${filter === status ? 'btn-primary' : 'btn-outline'} text-sm`}>
+              {status === 'pending' ? <><ClockIcon size={14} /> معلقة</> : status === 'approved' ? <><CheckCircleIcon size={14} /> موافق عليها</> : status === 'declined' ? <><XIcon size={14} /> مرفوضة</> : 'الكل'}
+            </button>
+          ))}
         </div>
 
         {loading ? (
-          <div className="loading-state h-64 flex flex-col items-center justify-center">
-            <div className="spinner spinner-lg mb-4 text-primary" />
-            <p className="font-bold text-muted text-lg">جاري سحب الطلبات المالية...</p>
-          </div>
-        ) : filteredTopups.length === 0 ? (
-          <div className="empty-state bg-white rounded-2xl py-20 shadow-sm">
-            <div className="empty-state-icon bg-gray-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner">
-              <CheckCircleIcon size={48} className="text-gray-400" />
-            </div>
-            <h3 className="text-2xl font-black text-gray-800">صندوق الطلبات فارغ</h3>
-            <p className="text-muted mt-2 font-medium max-w-sm mx-auto">لا توجد طلبات شحن تطابق حالة الفلتر أو البحث المحدد حالياً.</p>
+          <div className="loading-state"><div className="spinner spinner-lg" /></div>
+        ) : topups.length === 0 ? (
+          <div className="empty-state">
+            <div className="empty-state-icon"><CheckCircleIcon size={48} /></div>
+            <h3 className="text-xl font-bold">لا توجد طلبات</h3>
           </div>
         ) : (
           <>
-            <div className="table-container border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
-              <div className="overflow-x-auto w-full">
-                <table className="table w-full m-0 min-w-[900px]">
-                  <thead className="bg-gray-50 border-b border-gray-200">
-                    <tr>
-                      <th className="font-bold text-gray-700 py-5 px-6 text-right whitespace-nowrap">بيانات الطالب</th>
-                      <th className="font-bold text-gray-700 py-5 px-6 text-center whitespace-nowrap">المبلغ المطلوب</th>
-                      <th className="font-bold text-gray-700 py-5 px-6 text-center whitespace-nowrap">بوابة الدفع</th>
-                      <th className="font-bold text-gray-700 py-5 px-6 text-center whitespace-nowrap">الحالة والتاريخ</th>
-                      <th className="font-bold text-gray-700 py-5 px-6 text-center whitespace-nowrap">إجراءات المراجعة</th>
+            <div className="table-container">
+              <table className="table">
+                <thead>
+                  <tr>
+                    <th>الطالب</th>
+                    <th>المبلغ</th>
+                    <th>طريقة الدفع</th>
+                    <th>الحالة</th>
+                    <th>الإجراءات</th>
+                  </tr>
+                </thead>
+                <tbody>
+                  {topups.map((topup) => (
+                    <tr key={topup.id}>
+                      <td>
+                        <span className="font-bold text-primary block">{topup.student.fullName}</span>
+                        <span className="text-xs text-muted block">{topup.student.phone} | رصيد: {topup.student.walletBalance} ج</span>
+                      </td>
+                      <td><span className="font-bold text-success">{topup.amount} ج.م</span></td>
+                      <td>
+                        <span className="font-bold">{topup.paymentMethod === 'instapay' ? 'إنستا باي' : 'فودافون كاش'}</span>
+                        <span className="text-xs text-muted block">{topup.paymentNumber?.number}</span>
+                      </td>
+                      <td>{getStatusBadge(topup.status)}</td>
+                      <td>
+                        <div className="flex flex-col gap-2">
+                          {topup.proofImageUrl && (
+                            <button onClick={() => setLightboxImage(topup.proofImageUrl)} className="btn btn-outline btn-sm flex items-center gap-1">
+                              <ImageIcon size={14} />
+                              الإيصال
+                            </button>
+                          )}
+                          {topup.status === 'pending' && (
+                            <div className="flex gap-1">
+                              <button onClick={() => { setSelectedTopup(topup); setModalMode('approve'); }} className="btn btn-success btn-sm flex-1" title="موافقة"><CheckIcon size={16} /></button>
+                              <button onClick={() => { setSelectedTopup(topup); setAdjustAmount(topup.amount); setModalMode('adjust'); }} className="btn btn-warning btn-sm flex-1" title="تعديل"><EditIcon size={16} /></button>
+                              <button onClick={() => { setSelectedTopup(topup); setModalMode('decline'); }} className="btn btn-danger btn-sm flex-1" title="رفض"><XIcon size={16} /></button>
+                            </div>
+                          )}
+                        </div>
+                      </td>
                     </tr>
-                  </thead>
-                  <tbody className="divide-y divide-gray-100">
-                    {filteredTopups.map((topup) => (
-                      <tr key={topup.id} className="hover:bg-gray-50/50 transition-colors">
-                        <td className="py-5 px-6">
-                          <div className="flex items-center gap-4">
-                             <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-primary font-black text-lg flex items-center justify-center shadow-inner shrink-0">
-                               {topup.student.fullName.charAt(0)}
-                             </div>
-                             <div>
-                               <span className="font-black text-gray-900 block text-base">{topup.student.fullName}</span>
-                               <span className="text-sm text-gray-500 block font-mono mt-0.5 font-bold" dir="ltr">{topup.student.phone}</span>
-                               <span className="text-xs font-bold text-primary bg-blue-50 px-2 py-1 rounded-md mt-1.5 inline-block border border-blue-100 shadow-sm">الرصيد الحالي: {topup.student.walletBalance} ج.م</span>
-                             </div>
-                          </div>
-                        </td>
-                        <td className="py-5 px-6 text-center align-middle">
-                          <div className="flex flex-col items-center justify-center">
-                            <span className={`font-black text-xl ${topup.status === 'approved' ? 'text-success' : 'text-gray-900'}`}>
-                               {topup.status === 'approved' && topup.verifiedAmount ? topup.verifiedAmount : topup.amount} ج.م
-                            </span>
-                            {topup.status === 'approved' && topup.amount !== topup.verifiedAmount && (
-                              <span className="inline-block text-xs text-muted line-through mt-1 bg-gray-100 px-2 py-0.5 rounded font-medium">كان: {topup.amount} ج</span>
-                            )}
-                          </div>
-                        </td>
-                        <td className="py-5 px-6 text-center align-middle">
-                          <span className={`font-bold text-xs px-3 py-1.5 rounded-full inline-block mb-2 shadow-sm ${topup.paymentMethod === 'instapay' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
-                            {topup.paymentMethod === 'instapay' ? 'إنستا باي ⚡' : 'فودافون كاش 🔴'}
-                          </span>
-                          {topup.paymentNumber && (
-                            <span className="text-sm font-mono font-bold text-gray-600 block" dir="ltr">{topup.paymentNumber.number}</span>
-                          )}
-                        </td>
-                        <td className="py-5 px-6 text-center align-middle">
-                          <div className="flex flex-col items-center gap-2">
-                            {getStatusBadge(topup.status)}
-                            <span className="text-xs text-gray-500 font-bold bg-gray-50 px-2 py-1 rounded border border-gray-100">
-                              {new Date(topup.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
-                            </span>
-                          </div>
-                        </td>
-                        <td className="py-5 px-6 align-middle">
-                          <div className="flex flex-col gap-2.5 max-w-[220px] mx-auto">
-                            {topup.proofImageUrl ? (
-                              <button 
-                                onClick={() => setLightboxImage(topup.proofImageUrl)} 
-                                className="btn btn-outline btn-sm flex items-center justify-center gap-2 border-gray-200 hover:bg-gray-50 text-gray-700 w-full rounded-xl py-2 font-bold shadow-sm transition-colors"
-                              >
-                                <ImageIcon size={16} className="text-primary" /> عرض الإيصال المرفق
-                              </button>
-                            ) : (
-                              <span className="text-xs text-muted text-center block bg-gray-50 py-2.5 rounded-xl border border-dashed border-gray-200 font-bold">لا يوجد إيصال مرفق</span>
-                            )}
-                            
-                            {topup.status === 'pending' && (
-                              <div className="flex gap-2 w-full">
-                                <button onClick={() => { setSelectedTopup(topup); setModalMode('approve'); }} className="btn btn-success flex-1 py-2 px-0 flex items-center justify-center rounded-lg shadow-sm hover:-translate-y-0.5 transition-transform" title="موافقة فورية وإضافة الرصيد"><CheckIcon size={18} /></button>
-                                <button onClick={() => { setSelectedTopup(topup); setAdjustAmount(topup.amount.toString()); setModalMode('adjust'); }} className="btn btn-warning flex-1 py-2 px-0 flex items-center justify-center text-white rounded-lg shadow-sm hover:-translate-y-0.5 transition-transform" title="تعديل المبلغ المرفق"><EditIcon size={18} /></button>
-                                <button onClick={() => { setSelectedTopup(topup); setModalMode('decline'); }} className="btn btn-danger flex-1 py-2 px-0 flex items-center justify-center rounded-lg shadow-sm hover:-translate-y-0.5 transition-transform" title="رفض الطلب نهائياً"><XIcon size={18} /></button>
-                              </div>
-                            )}
-
-                            {topup.status !== 'pending' && topup.adminNotes && (
-                              <div className="text-xs bg-yellow-50/50 p-3 rounded-xl text-gray-700 text-right border border-yellow-100/50 leading-relaxed shadow-inner">
-                                <strong className="block text-gray-900 mb-1 flex items-center gap-1"><EditIcon size={12} className="text-warning" /> ملاحظة الإدارة:</strong>
-                                {topup.adminNotes}
-                              </div>
-                            )}
-                          </div>
-                        </td>
-                      </tr>
-                    ))}
-                  </tbody>
-                </table>
-              </div>
+                  ))}
+                </tbody>
+              </table>
             </div>
 
             {totalPages > 1 && (
-              <div className="flex justify-center items-center gap-4 mt-8 bg-white p-3 rounded-full shadow-sm border border-gray-200 inline-flex mx-auto">
-                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn btn-outline rounded-full px-6 py-2 disabled:opacity-50 font-bold border-none hover:bg-gray-50 transition-colors">السابق</button>
-                <span className="font-black text-primary px-4 bg-blue-50 py-2 rounded-xl text-sm">الصفحة {currentPage} من {totalPages}</span>
-                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn btn-outline rounded-full px-6 py-2 disabled:opacity-50 font-bold border-none hover:bg-gray-50 transition-colors">التالي</button>
+              <div className="flex justify-center gap-2 mt-6">
+                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn btn-outline btn-sm">السابق</button>
+                <span className="font-bold flex items-center px-4">{currentPage} / {totalPages}</span>
+                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn btn-outline btn-sm">التالي</button>
               </div>
             )}
           </>
         )}
-      </main>
+      </div>
+
+      {lightboxImage && (
+        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={() => setLightboxImage(null)}>
+          <div className="bg-white p-2 rounded-xl max-w-3xl w-[calc(100%-32px)] relative mx-4" onClick={e => e.stopPropagation()}>
+            <button className="absolute top-2 left-4 text-2xl font-bold text-error bg-white rounded-full w-8 h-8 flex items-center justify-center shadow border-none cursor-pointer z-10" onClick={() => setLightboxImage(null)}><XIcon size={20} /></button>
+            <img src={lightboxImage.startsWith('http') ? lightboxImage : `${API_URL}/storage/${lightboxImage}`} alt="إيصال" className="w-full max-h-[85vh] object-contain rounded-lg" />
+          </div>
+        </div>
+      )}
+
+      {selectedTopup && modalMode === 'approve' && (
+        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={closeModal}>
+          <div className="card max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
+            <div className="text-success mb-2 flex justify-center">
+              <CheckCircleIcon size={48} />
+            </div>
+            <h3 className="text-xl font-bold mb-2">تأكيد الموافقة</h3>
+            <p className="text-muted text-sm mb-6">هل أنت متأكد من الموافقة على إضافة <strong className="text-success">{selectedTopup.amount} ج.م</strong> لمحفظة الطالب <strong>{selectedTopup.student.fullName}</strong>؟</p>
+            <div className="flex gap-3">
+              <button onClick={handleApprove} disabled={processing} className="btn btn-success flex-1">تأكيد</button>
+              <button onClick={closeModal} disabled={processing} className="btn btn-outline flex-1">إلغاء</button>
+            </div>
+          </div>
+        </div>
+      )}
+
+      {selectedTopup && modalMode === 'adjust' && (
+        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={closeModal}>
+          <div className="card max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
+            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><EditIcon size={20} /> تعديل المبلغ</h3>
+            <p className="text-sm text-error font-bold mb-4">المبلغ المرسل في الطلب: {selectedTopup.amount} ج.م</p>
+            <div className="form-group">
+              <label className="form-label">المبلغ الفعلي (بالجنيه)</label>
+              <input type="number" className="input-field w-full mb-4" value={adjustAmount || ''} onChange={(e) => setAdjustAmount(parseInt(e.target.value) || null)} placeholder="أدخل المبلغ..." />
+            </div>
+            <div className="form-group">
+              <label className="form-label">ملاحظات (اختياري)</label>
+              <textarea className="input-field w-full mb-4" value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} placeholder="مثال: تم خصم رسوم التحويل..." rows={2} />
+            </div>
+            <div className="flex gap-3">
+              <button onClick={handleAdjustAndApprove} disabled={processing || !adjustAmount} className="btn btn-success flex-1">تأكيد الاعتماد</button>
+              <button onClick={closeModal} disabled={processing} className="btn btn-outline flex-1">إلغاء</button>
+            </div>
+          </div>
+        </div>
+      )}
+
+      {selectedTopup && modalMode === 'decline' && (
+        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={closeModal}>
+          <div className="card max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
+            <h3 className="text-xl font-bold text-error mb-4 flex items-center gap-2"><XIcon size={20} /> رفض الطلب</h3>
+            <div className="form-group">
+              <label className="form-label">سبب الرفض (يظهر للطالب)</label>
+              <textarea className="input-field w-full mb-2" value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="الإيصال غير واضح، أو لم يتم استلام حوالة..." rows={4} />
+            </div>
+            <p className="text-xs text-muted mb-4">يجب إدخال 10 أحرف على الأقل.</p>
+            <div className="flex gap-3">
+              <button onClick={handleDecline} disabled={processing || declineReason.length < 10} className="btn btn-danger flex-1">تأكيد الرفض</button>
+              <button onClick={closeModal} disabled={processing} className="btn btn-outline flex-1">إلغاء</button>
+            </div>
+          </div>
+        </div>
+      )}
 
       <style jsx>{`
-        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
-        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
-        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
-        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
+        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
+        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
       `}</style>
-    </main>
+    </div>
   );
-}+}
```

### `app\components\AdminSidebar.tsx`
```diff
--- Current: app\components\AdminSidebar.tsx
+++ Other: app\components\AdminSidebar.tsx
@@ -9,6 +9,7 @@
   UsersIcon,
   ClockIcon,
   WalletIcon,
+  CreditCardIcon,
   BarChartIcon,
   PhoneIcon,
   KeyIcon,
@@ -62,38 +63,36 @@
 export default function AdminSidebar() {
   const pathname = usePathname();
   const [theme, setTheme] = useState<'light' | 'dark'>('light');
+  const [mounted, setMounted] = useState(false);
   const [mobileOpen, setMobileOpen] = useState(false);
   const [statsOpen, setStatsOpen] = useState(false);
 
-  // Hydration guard: defer reading browser-only state until after the
-  // initial client render. The flag itself is initialised from the
-  // rendered-environment check so we avoid a cascading re-render in
-  // useEffect (eslint react-hooks/set-state-in-effect).
-  const [mounted, setMounted] = useState(false);
-  useEffect(() => {
+  useEffect(() => {
+    setMounted(true);
     const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
     if (savedTheme) {
-      // eslint-disable-next-line react-hooks/set-state-in-effect
       setTheme(savedTheme);
     }
-     
-    setMounted(true);
   }, []);
 
-  // Auto-open the stats submenu whenever the user navigates into
-  // /admin/stats/**.
   useEffect(() => {
     if (pathname && pathname.startsWith('/admin/stats')) {
-      // eslint-disable-next-line react-hooks/set-state-in-effect
       setStatsOpen(true);
     }
   }, [pathname]);
 
-  // Close the mobile drawer on route change.
-  useEffect(() => {
-    // eslint-disable-next-line react-hooks/set-state-in-effect
+  useEffect(() => {
     setMobileOpen(false);
   }, [pathname]);
+
+  useEffect(() => {
+    if (mobileOpen) {
+      document.body.style.overflow = 'hidden';
+    } else {
+      document.body.style.overflow = '';
+    }
+    return () => { document.body.style.overflow = ''; };
+  }, [mobileOpen]);
 
   const toggleTheme = () => {
     const newTheme = theme === 'light' ? 'dark' : 'light';
```

### `app\components\Icons.tsx`
```diff
--- Current: app\components\Icons.tsx
+++ Other: app\components\Icons.tsx
@@ -1,11 +1,10 @@
-import { SVGProps, ReactNode, forwardRef } from 'react';
+import { SVGProps, ReactNode } from 'react';
 
 type IconProps = SVGProps<SVGSVGElement> & { size?: number };
 
 const createIcon = (path: ReactNode, viewBox = '0 0 24 24') => {
-  const Icon = forwardRef<SVGSVGElement, IconProps>(({ size = 20, ...props }, ref) => (
+  return ({ size = 20, ...props }: IconProps) => (
     <svg
-      ref={ref}
       xmlns="http://www.w3.org/2000/svg"
       width={size}
       height={size}
@@ -19,9 +18,7 @@
     >
       {path}
     </svg>
-  ));
-  Icon.displayName = 'Icon';
-  return Icon;
+  );
 };
 
 // Navigation
```

### `app\components\Navbar.tsx`
```diff
--- Current: app\components\Navbar.tsx
+++ Other: app\components\Navbar.tsx
@@ -4,49 +4,113 @@
 import Link from 'next/link';
 import { useRouter } from 'next/navigation';
 import { useTheme } from './ThemeProvider';
-import { useAuthStore } from '@/store/useAuthStore'; // 🚀 استدعاء العقل المدبر
-import {
-  MenuIcon, SunIcon, MoonIcon,
-  UserIcon, LogoutIcon, DashboardIcon, XIcon,
-} from './Icons';
+import { HomeIcon, MenuIcon, SunIcon, MoonIcon, UserIcon, LogoutIcon, DashboardIcon, XIcon, MessageIcon } from './Icons';
 
 interface NavbarProps {
   transparent?: boolean;
 }
 
-// ----------------------------------------------------------------
-// Top-level helper components (hoisted out of the render body so their
-// identity is stable across renders — eslint react-hooks/static-components)
-// ----------------------------------------------------------------
-
-function AuthPlaceholder() {
-  return (
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+
+export default function Navbar({ transparent = false }: NavbarProps) {
+  const router = useRouter();
+  const { theme, toggleTheme, mounted: themeMounted } = useTheme();
+  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
+  const [authReady, setAuthReady] = useState(false);
+  const [isLoggedIn, setIsLoggedIn] = useState(false);
+  const [isAdmin, setIsAdmin] = useState(false);
+  const [userName, setUserName] = useState('');
+  const [hasCourses, setHasCourses] = useState(false);
+
+  useEffect(() => {
+    const token = document.cookie
+      .split('; ')
+      .find(row => row.startsWith('token='))
+      ?.split('=')[1];
+
+    const localToken = localStorage.getItem('token');
+    const authToken = token || localToken;
+
+    if (authToken) {
+      setIsLoggedIn(true);
+      fetch(`${API_URL}/api/auth/me`, {
+        headers: { Authorization: `Bearer ${authToken}` },
+      })
+        .then(res => res.ok ? res.json() : null)
+        .then(data => {
+          if (data) {
+            const user = data.data || data;
+            setIsAdmin(user.is_admin || false);
+            setUserName(user.full_name || '');
+          }
+        })
+        .catch(() => {})
+        .finally(() => setAuthReady(true));
+
+      // جلب حالة الاشتراك في الكورسات
+      fetch(`${API_URL}/api/auth/status`, {
+        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
+      })
+        .then(res => res.ok ? res.json() : null)
+        .then(data => {
+          if (data?.data) {
+            setHasCourses(!!data.data.hasCourses);
+          }
+        })
+        .catch(() => {});
+    } else {
+      setAuthReady(true);
+    }
+  }, []);
+
+  useEffect(() => {
+    if (mobileMenuOpen) {
+      document.body.style.overflow = 'hidden';
+    } else {
+      document.body.style.overflow = '';
+    }
+    return () => { document.body.style.overflow = ''; };
+  }, [mobileMenuOpen]);
+
+  const handleLogout = async () => {
+    const token = document.cookie
+      .split('; ')
+      .find(row => row.startsWith('token='))
+      ?.split('=')[1] || localStorage.getItem('token');
+
+    if (token) {
+      try {
+        await fetch(`${API_URL}/api/auth/logout`, {
+          method: 'POST',
+          headers: {
+            'Authorization': `Bearer ${token}`,
+            'Accept': 'application/json'
+          },
+        });
+      } catch (error) {
+        console.error('Logout request failed:', error);
+      }
+    }
+
+    localStorage.removeItem('token');
+    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
+    setIsLoggedIn(false);
+    setIsAdmin(false);
+    setUserName('');
+    router.push('/login');
+  };
+
+  const AuthPlaceholder = () => (
     <div className="navbar-actions-placeholder" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
       <div className="skeleton" style={{ width: '80px', height: '36px', borderRadius: 'var(--radius-md)', opacity: 0.3 }} />
       <div className="skeleton" style={{ width: '60px', height: '36px', borderRadius: 'var(--radius-md)', opacity: 0.3 }} />
     </div>
   );
-}
-
-interface AuthButtonsProps {
-  isAuthenticated: boolean;
-  isAdmin: boolean;
-  walletBalance: number;
-  onLogout: () => void;
-}
-
-function AuthButtons({ isAuthenticated, isAdmin, walletBalance, onLogout }: AuthButtonsProps) {
-  return (
+
+  const AuthButtons = () => (
     <>
-      {isAuthenticated ? (
+      {isLoggedIn ? (
         <>
-          {!isAdmin && (
-            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[var(--soft-bg)] border border-[var(--border-light)] rounded-full text-sm font-semibold text-[var(--primary)] mx-2">
-              <span>الرصيد:</span>
-              <span>{walletBalance}</span>
-            </div>
-          )}
-
           {isAdmin ? (
             <Link href="/admin" className="btn btn-outline btn-sm">
               <DashboardIcon size={16} />
@@ -55,10 +119,9 @@
           ) : (
             <Link href="/dashboard" className="btn btn-outline btn-sm">
               <UserIcon size={16} />
-              <span>حسابي</span>
             </Link>
           )}
-          <button onClick={onLogout} className="btn btn-primary btn-sm" style={{ background: 'var(--error)' }}>
+          <button onClick={handleLogout} className="btn btn-primary btn-sm" style={{ background: 'var(--error)' }}>
             <LogoutIcon size={16} />
             <span>خروج</span>
           </button>
@@ -75,40 +138,6 @@
       )}
     </>
   );
-}
-
-export default function Navbar({ transparent = false }: NavbarProps) {
-  const router = useRouter();
-  const { theme, toggleTheme, mounted: themeMounted } = useTheme();
-  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
-
-  // 🚀 السحر هنا: جلب البيانات وحالة التحميل من الذاكرة المركزية بسطر واحد فقط!
-  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
-
-  // تحديد الصلاحيات بناءً على البيانات المخزنة
-  const isAdmin = user?.role === 'admin';
-  // ملاحظة: تأكد أن الباك إند يقوم بإرسال hasCourses أو يمكننا الاعتماد على دور الطالب فقط
-  const hasCourses = user?.hasCourses ?? false;
-
-  // إغلاق التمرير (Scroll) عند فتح قائمة الموبايل
-  useEffect(() => {
-    if (mobileMenuOpen) {
-      document.body.style.overflow = 'hidden';
-    } else {
-      document.body.style.overflow = '';
-    }
-    return () => { document.body.style.overflow = ''; };
-  }, [mobileMenuOpen]);
-
-  // تسجيل الخروج المركزي
-  const handleLogout = async () => {
-    await logout(); // 🚀 الـ Store يتكفل بالاتصال بالباك إند ومسح الكوكيز
-    setMobileMenuOpen(false);
-    router.push('/login');
-  };
-
-  // مكون التحميل الوهمي (Skeleton) أثناء جلب البيانات في الخلفية
-  // (AuthPlaceholder and AuthButtons are declared at module scope above.)
 
   return (
     <nav className={`navbar ${transparent ? 'bg-transparent border-none' : ''}`}>
@@ -121,27 +150,16 @@
         <ul className="navbar-links">
           <li><Link href="/" className="navbar-link">الرئيسية</Link></li>
           <li><Link href="/courses" className="navbar-link">الكورسات</Link></li>
-          {!isLoading && isAuthenticated && user?.status === 'active' && !isAdmin && hasCourses && (
-              <Link href="/forum" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>المنتدى</Link>
+          {authReady && isLoggedIn && !isAdmin && hasCourses && (
+            <li><Link href="/forum" className="navbar-link">المنتدى</Link></li>
           )}
-          {!isLoading && isAuthenticated && user?.status === 'active' && !isAdmin && (
-            <Link href="/wallet" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>المحفظة</Link>
-          )}
-          {!isLoading && isAuthenticated && isAdmin && (
-            <Link href="/admin" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>لوحة التحكم</Link>
+          {authReady && isLoggedIn && !isAdmin && (
+            <li><Link href="/wallet" className="navbar-link">المحفظة</Link></li>
           )}
         </ul>
 
         <div className="navbar-actions">
-          {/* 🚀 تبديل سلس بين الهيكل الوهمي والأزرار الحقيقية */}
-          {isLoading ? <AuthPlaceholder /> : (
-            <AuthButtons
-              isAuthenticated={isAuthenticated}
-              isAdmin={isAdmin}
-              walletBalance={user?.walletBalance ?? 0}
-              onLogout={handleLogout}
-            />
-          )}
+          {authReady ? <AuthButtons /> : <AuthPlaceholder />}
           <button className="theme-toggle" onClick={toggleTheme} aria-label="تبديل الوضع" suppressHydrationWarning>
             {themeMounted ? (theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />) : <SunIcon size={18} />}
           </button>
@@ -156,7 +174,6 @@
         </button>
       </div>
 
-      {/* Mobile Menu */}
       {mobileMenuOpen && (
         <div className="mobile-nav active">
           <div className="mobile-nav-header">
@@ -168,21 +185,13 @@
               <XIcon size={20} />
             </button>
           </div>
-          
           <div className="mobile-nav-links">
             <Link href="/" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>الرئيسية</Link>
             <Link href="/courses" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>الكورسات</Link>
-            {!isLoading && isAuthenticated && !isAdmin && hasCourses && (
-              <Link href="/forum" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>المنتدى</Link>
-            )}
-            {!isLoading && isAuthenticated && !isAdmin && (
-              <Link href="/wallet" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>المحفظة</Link>
-            )}
-            {!isLoading && isAuthenticated && isAdmin && (
-              <Link href="/admin" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>لوحة التحكم</Link>
-            )}
+            {authReady && isLoggedIn && !isAdmin && hasCourses && <Link href="/forum" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>المنتدى</Link>}
+            {authReady && isLoggedIn && !isAdmin && <Link href="/wallet" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>المحفظة</Link>}
+            {authReady && isLoggedIn && isAdmin && <Link href="/admin" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>لوحة التحكم</Link>}
           </div>
-
           <button
             className="mobile-theme-toggle"
             onClick={toggleTheme}
@@ -192,37 +201,36 @@
             {themeMounted ? (theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />) : <SunIcon size={18} />}
             <span>{theme === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح'}</span>
           </button>
-          
-          <div className="mobile-nav-actions mt-4">
-            {!isLoading && (
-              isAuthenticated ? (
+          <div className="mobile-nav-actions">
+            {authReady ? (
+              isLoggedIn ? (
                 <>
                   {isAdmin ? (
-                    <Link href="/admin" className="btn btn-outline w-full justify-center mb-2" onClick={() => setMobileMenuOpen(false)}>
+                    <Link href="/admin" className="btn btn-outline" onClick={() => setMobileMenuOpen(false)}>
                       <DashboardIcon size={18} />
                       <span>لوحة التحكم</span>
                     </Link>
                   ) : (
-                    <Link href="/dashboard" className="btn btn-outline w-full justify-center mb-2" onClick={() => setMobileMenuOpen(false)}>
+                    <Link href="/dashboard" className="btn btn-outline" onClick={() => setMobileMenuOpen(false)}>
                       <UserIcon size={18} />
-                      <span>حسابي</span>
+                      <span>لوحة التحكم</span>
                     </Link>
                   )}
-                  <button onClick={handleLogout} className="btn btn-danger w-full justify-center">
+                  <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="btn btn-danger">
                     <LogoutIcon size={18} />
                     <span>خروج</span>
                   </button>
                 </>
               ) : (
-                <div className="flex flex-col gap-2 w-full">
-                  <Link href="/login" className="btn btn-outline w-full justify-center" onClick={() => setMobileMenuOpen(false)}>دخول</Link>
-                  <Link href="/register" className="btn btn-primary w-full justify-center" onClick={() => setMobileMenuOpen(false)}>سجل الآن</Link>
-                </div>
+                <>
+                  <Link href="/login" className="btn btn-outline" onClick={() => setMobileMenuOpen(false)}>دخول</Link>
+                  <Link href="/register" className="btn btn-primary" onClick={() => setMobileMenuOpen(false)}>سجل الآن</Link>
+                </>
               )
-            )}
+            ) : null}
           </div>
         </div>
       )}
     </nav>
   );
-}+}
```

### `app\components\ThemeProvider.tsx`
```diff
--- Current: app\components\ThemeProvider.tsx
+++ Other: app\components\ThemeProvider.tsx
@@ -18,7 +18,6 @@
   const [mounted, setMounted] = useState(false);
 
   useEffect(() => {
-    // eslint-disable-next-line react-hooks/set-state-in-effect
     setMounted(true);
     const savedTheme = localStorage.getItem('theme') as Theme | null;
     const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
```

### `app\courses\page.tsx`
```diff
--- Current: app\courses\page.tsx
+++ Other: app\courses\page.tsx
@@ -1,12 +1,9 @@
-// app/courses/page.tsx
 'use client';
 
 import { useEffect, useState } from 'react';
 import { useRouter } from 'next/navigation';
 import CourseCard from '../components/CourseCard';
 import Navbar from '../components/Navbar';
-import api from '@/lib/axios';
-import { useAuthStore } from '@/store/useAuthStore';
 import {
   BookIcon,
   CreditCardIcon,
@@ -14,11 +11,13 @@
   SearchIcon,
   VideoIcon,
   CalendarIcon,
-  ShieldIcon, 
-  ClockIcon,  
-  AwardIcon,
-  UserIcon
 } from '../components/Icons';
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+
+const getToken = () => {
+  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
+};
 
 interface Course {
   id: number;
@@ -29,110 +28,74 @@
   lecturesCount: number;
   isPurchased: boolean;
   createdAt: string;
-  enrolledCount: number;
-}
-
-interface StandaloneExam {
-  id: number;
-  title: string;
-  courseTitle: string;
-  pricePoints: number;
-  durationMinutes: number;
-  passScore: number;
-  isPurchased: boolean;
+  enrolledCount?: number;
 }
 
 export default function CoursesPage() {
   const router = useRouter();
-  const { isAuthenticated, authLoading } = useAuthStore();
-  
-  const [activeTab, setActiveTab] = useState<'courses' | 'exams'>('courses');
   const [courses, setCourses] = useState<Course[]>([]);
-  const [standaloneExams, setStandaloneExams] = useState<StandaloneExam[]>([]);
   const [loading, setLoading] = useState(true);
   const [walletBalance, setWalletBalance] = useState<number | null>(null);
   const [searchQuery, setSearchQuery] = useState('');
 
   useEffect(() => {
-    if (!authLoading) {
-      fetchData();
-    }
-  // eslint-disable-next-line react-hooks/exhaustive-deps
-  }, [authLoading, isAuthenticated]);
-
-  const fetchData = async () => {
-    setLoading(true);
+    fetchCourses();
+    fetchWalletBalance();
+  }, []);
+
+  const fetchCourses = async () => {
     try {
-      // 1. جلب الكورسات (متاحة للجميع زواراً وطلاباً)
-      const coursesRes = await api.get('/courses').catch(() => null);
-      
-      if (coursesRes && coursesRes.data) {
-        // دعم التنسيقات المختلفة لرد الـ API (Resource Wrapping)
-        const rawCourses = coursesRes.data.data || coursesRes.data || [];
-        setCourses(rawCourses.map((c: any) => ({
-          id: c.id,
-          title: c.title,
-          description: c.description || 'لا يوجد وصف',
-          pricePoints: c.price_points ?? c.pricePoints ?? 0,
-          validityDate: c.validity_date ?? c.validityDate ?? null,
-          // ربط دقيق بأسماء المتغيرات القادمة من الباك إند
-          lecturesCount: c.lectures_count ?? c.lecturesCount ?? 0,
-          enrolledCount: c.students_count ?? c.studentsCount ?? c.enrolled_count ?? c.enrolledCount ?? 0,
-          isPurchased: !!(c.is_purchased ?? c.isPurchased),
-          createdAt: c.created_at ?? c.createdAt ?? '',
-        })));
+      const token = getToken();
+      const response = await fetch(`${API_URL}/api/courses`, {
+        headers: {
+          Accept: 'application/json',
+          ...(token ? { Authorization: `Bearer ${token}` } : {}),
+        },
+      });
+
+      if (response.ok) {
+        const data = await response.json();
+        setCourses(data.data || []);
       }
-
-      // 2. جلب الاختبارات والمحفظة (فقط إذا كان المستخدم مسجل الدخول)
-      if (isAuthenticated) {
-        const [examsRes, walletRes] = await Promise.allSettled([
-          api.get('/comprehensive-exams/available'), // المسار الصحيح
-          api.get('/wallet/balance')
-        ]);
-
-        if (examsRes.status === 'fulfilled' && examsRes.value.data) {
-          const rawExams = examsRes.value.data.data || examsRes.value.data || [];
-          setStandaloneExams(rawExams.map((ex: any) => ({
-            id: ex.id,
-            title: ex.title,
-            courseTitle: ex.course_title ?? ex.courseTitle ?? 'اختبار عام',
-            pricePoints: ex.price_points ?? ex.pricePoints ?? 0,
-            durationMinutes: ex.duration_minutes ?? ex.durationMinutes ?? 60,
-            passScore: ex.pass_score ?? ex.passScore ?? 50,
-            isPurchased: !!(ex.is_purchased ?? ex.isPurchased),
-          })));
-        }
-
-        if (walletRes.status === 'fulfilled' && walletRes.value.data) {
-          setWalletBalance(walletRes.value.data.data?.balance ?? walletRes.value.data.balance ?? 0);
-        }
-      } else {
-        // تصفير البيانات الخاصة بالمسجلين للزوار
-        setStandaloneExams([]);
-        setWalletBalance(null);
-      }
-
     } catch (error) {
-      console.error('Failed to fetch data:', error);
+      console.error('Failed to fetch courses:', error);
     } finally {
       setLoading(false);
     }
   };
 
+  const fetchWalletBalance = async () => {
+    try {
+      const token = getToken();
+      if (!token) {
+        setWalletBalance(null);
+        return;
+      }
+
+      const response = await fetch(`${API_URL}/api/wallet/balance`, {
+        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
+      });
+
+      if (response.ok) {
+        const data = await response.json();
+        setWalletBalance(data.data?.balance ?? 0);
+      } else {
+        setWalletBalance(null);
+      }
+    } catch (error) {
+      setWalletBalance(null);
+    }
+  };
+
   const filteredCourses = courses.filter(course =>
     course.title.toLowerCase().includes(searchQuery.toLowerCase())
   );
 
-  const filteredExams = standaloneExams.filter(exam =>
-    exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
-    exam.courseTitle.toLowerCase().includes(searchQuery.toLowerCase())
-  );
-
-  if (loading || authLoading) return (
+  if (loading) return (
     <div className="page-container">
       <Navbar />
-      <div className="flex justify-center items-center h-64">
-        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
+      <div className="loading-state">
+        <div className="spinner spinner-lg"></div>
       </div>
     </div>
   );
@@ -141,165 +104,105 @@
     <div className="page-container">
       <Navbar />
 
-      <div className="page-content animate-fade-in max-w-7xl mx-auto px-4 py-8">
-        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
+      <div className="page-content animate-fade-in">
+        <div className="page-header">
           <div>
-            <h1 className="text-3xl font-bold text-gray-900">استكشف الكورسات</h1>
-            <p className="text-gray-500 mt-1">اختر الكورس المناسب وابدأ رحلة التعلم</p>
-          </div>
-          
-          {isAuthenticated && walletBalance !== null ? (
-            <div className="card border border-blue-100 bg-blue-50/50 p-4 rounded-xl min-w-[160px] text-center">
-              <div className="flex items-center gap-2 justify-center mb-1 text-blue-700">
+            <h1 className="page-title">استكشف الكورسات</h1>
+            <p className="page-subtitle">اختر الكورس المناسب وابدأ رحلة التعلم</p>
+          </div>
+          {walletBalance !== null && (
+            <div className="card" style={{ padding: '1rem 1.5rem', minWidth: 160, textAlign: 'center', borderColor: 'var(--accent)', background: 'rgba(27, 189, 212, 0.05)' }}>
+              <div className="flex items-center gap-2 justify-center mb-2">
                 <CreditCardIcon size={18} />
-                <span className="font-bold text-sm">رصيد محفظتك</span>
+                <span className="font-bold text-sm text-primary">رصيد محفظتك</span>
               </div>
-              <div className="font-bold text-2xl text-green-600" dir="ltr">
-                {walletBalance} <span className="text-sm font-normal text-gray-500">EGP</span>
+              <div className="font-bold text-success" style={{ fontSize: '1.5rem' }} dir="ltr">
+                {walletBalance} <span className="text-sm text-muted">EGP</span>
               </div>
-            </div>
-          ) : (
-            <div className="card border border-gray-200 bg-white p-4 rounded-xl min-w-[160px] text-center">
-              <div className="flex items-center gap-2 justify-center mb-2 text-gray-600">
-                <UserIcon size={18} />
-                <span className="font-bold text-sm">لست مسجلاً؟</span>
-              </div>
-              <button onClick={() => router.push('/login')} className="btn btn-primary w-full text-sm py-2">
-                سجل الدخول الآن
-              </button>
             </div>
           )}
         </div>
 
-        <div className="flex flex-wrap gap-4 mb-8 items-center justify-between">
-          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
-            <button
-              onClick={() => setActiveTab('courses')}
-              className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === 'courses' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
-            >
-              <BookIcon size={18} /> الكورسات
-            </button>
-            <button
-              onClick={() => setActiveTab('exams')}
-              className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === 'exams' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
-            >
-              <ShieldIcon size={18} /> الاختبارات الشاملة
-            </button>
-          </div>
-
-          <div className="relative w-full max-w-md">
-            <span className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400">
+        {courses.length > 0 && (
+          <div className="relative mb-6" style={{ maxWidth: 400 }}>
+            <span className="absolute" style={{ top: '50%', right: '0.75rem', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
               <SearchIcon size={18} />
             </span>
             <input
               type="text"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
-              placeholder={activeTab === 'courses' ? "ابحث عن كورس..." : "ابحث عن اختبار..."}
-              className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
+              placeholder="ابحث عن كورس..."
+              className="input-field"
+              style={{ paddingRight: '2.5rem' }}
             />
           </div>
-        </div>
-
-        {activeTab === 'courses' ? (
-          filteredCourses.length === 0 ? (
-            <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-center">
-              <BookIcon size={48} className="text-gray-400 mb-4" />
-              <h3 className="text-lg font-bold text-gray-900 mb-1">{searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد كورسات متاحة حالياً'}</h3>
-              <p className="text-gray-500">{searchQuery ? 'حاول استخدام كلمات بحث مختلفة' : 'يرجى العودة لاحقاً لاستكشاف الكورسات الجديدة'}</p>
+        )}
+
+        {filteredCourses.length === 0 ? (
+          <div className="empty-state">
+            <div className="empty-state-icon">
+              <BookIcon size={32} />
             </div>
-          ) : (
-            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
-              {filteredCourses.map((course) => (
-                <div key={course.id} className="flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
-                  <CourseCard
-                    id={course.id}
-                    title={course.title}
-                    description={course.description}
-                    pricePoints={course.pricePoints}
-                    isPurchased={course.isPurchased}
-                    enrolledCount={course.enrolledCount}
-                  />
-
-                  <div className="p-4 border-t border-gray-100 bg-gray-50 mt-auto">
-                    {course.isPurchased && (
-                      <div className="flex items-center justify-center gap-2 py-2 px-3 mb-3 bg-green-100/50 border border-green-200 text-green-700 rounded-md text-sm font-bold">
-                        <CheckCircleIcon size={16} />
-                        أنت مشترك في هذا الكورس
-                      </div>
-                    )}
-                    <div className="flex justify-between items-center text-sm text-gray-500">
-                      <span className="flex items-center gap-1.5 font-medium">
-                        <VideoIcon size={16} className="text-blue-500"/>
-                        {course.lecturesCount} محاضرة
-                      </span>
-                      <span className="flex items-center gap-1.5 font-medium">
-                        <UserIcon size={16} className="text-indigo-500"/>
-                        {course.enrolledCount} طالب
-                      </span>
-                    </div>
+            <h3>{searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد كورسات متاحة حالياً'}</h3>
+            <p>{searchQuery ? 'حاول استخدام كلمات بحث مختلفة' : 'يرجى العودة لاحقاً لاستكشاف الكورسات الجديدة'}</p>
+          </div>
+        ) : (
+          <div className="courses-grid-container">
+            {filteredCourses.map((course) => (
+              <div key={course.id} className="relative">
+                <CourseCard
+                  id={course.id}
+                  title={course.title}
+                  description={course.description || 'لا يوجد وصف'}
+                  pricePoints={course.pricePoints}
+                  isPurchased={course.isPurchased}
+                  enrolledCount={course.enrolledCount}
+                />
+
+                {course.isPurchased && (
+                  <div className="mt-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0.5rem 0.75rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid var(--success)', color: 'var(--success-dark)', fontSize: '0.8125rem', fontWeight: 700 }}>
+                    <CheckCircleIcon size={16} />
+                    أنت مشترك في هذا الكورس
                   </div>
+                )}
+
+                <div className="flex justify-between mt-3 text-sm text-muted">
+                  <span className="flex items-center gap-1">
+                    <VideoIcon size={16} />
+                    {course.lecturesCount} محاضرة
+                  </span>
+                  {course.validityDate && (
+                    <span className="flex items-center gap-1">
+                      <CalendarIcon size={16} />
+                      صلاحية: {new Date(course.validityDate).toLocaleDateString('ar-EG')}
+                    </span>
+                  )}
                 </div>
-              ))}
-            </div>
-          )
-        ) : (
-          !isAuthenticated ? (
-            <div className="flex flex-col items-center justify-center p-12 bg-blue-50/30 rounded-2xl border border-blue-100 text-center">
-              <ShieldIcon size={56} className="text-blue-300 mb-4" />
-              <h3 className="text-xl font-bold text-gray-900 mb-2">تسجيل الدخول مطلوب</h3>
-              <p className="text-gray-500 mb-6 max-w-md">يرجى تسجيل الدخول لتتمكن من استعراض وشراء الاختبارات الشاملة المتاحة لحسابك.</p>
-              <button onClick={() => router.push('/login')} className="btn btn-primary px-8 py-2.5">
-                سجل الدخول للمتابعة
-              </button>
-            </div>
-          ) : filteredExams.length === 0 ? (
-            <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-center">
-              <ShieldIcon size={48} className="text-gray-400 mb-4" />
-              <h3 className="text-lg font-bold text-gray-900 mb-1">{searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد اختبارات متاحة حالياً'}</h3>
-              <p className="text-gray-500">لم يتم العثور على أي اختبارات شاملة متاحة لك في الوقت الحالي.</p>
-            </div>
-          ) : (
-            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
-              {filteredExams.map((exam) => (
-                <div key={exam.id} className="card flex flex-col p-6 border border-gray-200 rounded-xl bg-white hover:shadow-md transition-all h-full">
-                  <div className="mb-4">
-                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold mb-3 border border-blue-100">
-                      كورس: {exam.courseTitle}
-                    </span>
-                    <h3 className="text-xl font-bold text-gray-900 mb-2">{exam.title}</h3>
-                  </div>
-
-                  <div className="flex gap-4 mb-6 text-sm text-gray-500 font-medium">
-                    <span className="flex items-center gap-1.5"><ClockIcon size={16} className="text-gray-400"/> {exam.durationMinutes} دقيقة</span>
-                    <span className="flex items-center gap-1.5"><AwardIcon size={16} className="text-gray-400"/> نجاح: {exam.passScore}%</span>
-                  </div>
-
-                  <div className="mt-auto pt-4 border-t border-gray-100">
-                    {exam.isPurchased ? (
-                      <button onClick={() => router.push(`/student/exams/${exam.id}`)} className="w-full flex justify-center items-center gap-2 py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-lg font-bold hover:bg-green-100 transition-colors">
-                        <CheckCircleIcon size={18} /> الدخول للاختبار
-                      </button>
-                    ) : (
-                      <div className="flex justify-between items-center">
-                        <span className="text-xl font-black text-blue-600">
-                          {exam.pricePoints > 0 ? `${exam.pricePoints} EGP` : 'مجاني'}
-                        </span>
-                        <button 
-                          onClick={() => router.push(`/student/checkout/exam/${exam.id}`)} 
-                          className="btn btn-primary px-6 py-2"
-                        >
-                          شراء الاختبار
-                        </button>
-                      </div>
-                    )}
-                  </div>
-                </div>
-              ))}
-            </div>
-          )
+              </div>
+            ))}
+          </div>
         )}
       </div>
+
+      <style jsx>{`
+        .courses-grid-container {
+          display: grid;
+          grid-template-columns: repeat(3, 1fr);
+          gap: 1.5rem;
+          width: 100%;
+        }
+        @media (max-width: 992px) {
+          .courses-grid-container {
+            grid-template-columns: repeat(2, 1fr);
+          }
+        }
+        @media (max-width: 576px) {
+          .courses-grid-container {
+            grid-template-columns: 1fr;
+          }
+        }
+      `}</style>
     </div>
   );
-}+}
```

### `app\courses\[id]\page.tsx`
```diff
--- Current: app\courses\[id]\page.tsx
+++ Other: app\courses\[id]\page.tsx
@@ -1,210 +1,166 @@
 'use client';
 
-import { useEffect, useState, useCallback } from 'react';
+import { useEffect, useState } from 'react';
 import { useRouter, useParams } from 'next/navigation';
-import Navbar from '@/app/components/Navbar';
-import api from '@/lib/axios'; 
-import { useAuthStore } from '@/store/useAuthStore'; 
+import Navbar from '../../components/Navbar';
 import {
   BookIcon, PlayIcon, LockIcon, ClockIcon,
-  AlertTriangleIcon, CheckCircleIcon, ShieldIcon,
-  AwardIcon, VideoIcon
-} from '@/app/components/Icons';
+  AlertTriangleIcon, CheckCircleIcon, XIcon
+} from '../../components/Icons';
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+
+const getToken = () => {
+  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
+};
 
 interface Lecture {
   id: number;
   title: string;
   description: string;
-  orderIndex: number;
-  isLocked: boolean;
-  videoStatus: string;
-}
-
-interface Exam {
-  id: number;
-  title: string;
-  durationMinutes: number;
-  passScore: number;
-  startTime: string;
-  endTime: string;
-  isPurchased: boolean;
+  orderIndex?: number;
+  order_index?: number;
+  isLocked?: boolean;
+  is_locked?: boolean;
+  encodingStatus?: string | null;
+  video_status?: string | null;
+  encodingProgress?: number;
 }
 
 interface Course {
   id: number;
   title: string;
   description: string;
-  pricePoints: number;
-  validityDate: string | null;
-  lecturesCount: number;
-  isPurchased: boolean;
+  pricePoints?: number;
+  price_points?: number;
+  validityDate?: string | null;
+  validity_date?: string | null;
+  lecturesCount?: number;
+  lectures_count?: number;
+  isPurchased?: boolean;
+  is_purchased?: boolean;
   lectures: Lecture[];
+  createdAt?: string;
+  created_at?: string;
 }
 
-export default function CourseDetailsPage() {
+export default function CoursePage() {
   const router = useRouter();
   const params = useParams();
   const courseId = params.id;
 
-  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
-
   const [course, setCourse] = useState<Course | null>(null);
-  const [courseExams, setCourseExams] = useState<Exam[]>([]); 
-  
   const [loading, setLoading] = useState(true);
   const [purchasing, setPurchasing] = useState(false);
   const [walletBalance, setWalletBalance] = useState<number | null>(null);
-
+  const [isLoggedIn, setIsLoggedIn] = useState(false);
+
+  // نظام الإشعارات
   const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
-  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; message: string; onConfirm: () => void } | null>(null);
-
-  const showToast = useCallback((message: string, type: 'success' | 'error') => {
+  const showToast = (message: string, type: 'success' | 'error') => {
     setToast({ visible: true, message, type });
     setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
-  }, []);
+  };
 
   useEffect(() => {
-    if (confirmDialog) document.body.style.overflow = 'hidden';
-    else document.body.style.overflow = '';
-    return () => { document.body.style.overflow = ''; };
-  }, [confirmDialog]);
-
-  useEffect(() => {
-    if (courseId && !authLoading) {
-      fetchCourseData();
-    }
-  // eslint-disable-next-line react-hooks/exhaustive-deps
-  }, [courseId, authLoading, isAuthenticated]);
-
-  const fetchCourseData = async () => {
-    setLoading(true);
+    const token = getToken();
+    setIsLoggedIn(!!token);
+    fetchCourse();
+    if (token) fetchWalletBalance();
+  }, [courseId]);
+
+  const fetchCourse = async () => {
     try {
-      const courseRes = await api.get(`/courses/${courseId}`);
-      const cData = courseRes.data?.data || courseRes.data;
-      
-      const rawLectures = Array.isArray(cData.lectures) ? cData.lectures : [];
-      
-      // 🚀 إصلاح مشكلة حالة الشراء: التأكد التام من تقييم الحالة
-      const isCoursePurchased = cData.is_purchased === true || cData.isPurchased === true;
-
-      setCourse({
-        id: cData.id,
-        title: cData.title || 'بدون عنوان',
-        description: cData.description || '',
-        pricePoints: Number(cData.price_points ?? cData.pricePoints ?? 0),
-        validityDate: cData.validity_date ?? cData.validityDate ?? null,
-        // 🚀 إصلاح مشكلة عدد المحاضرات: استخدام طول المصفوفة كخطة بديلة أكيدة
-        lecturesCount: Number(cData.lectures_count ?? cData.lecturesCount ?? rawLectures.length),
-        isPurchased: isCoursePurchased,
-        lectures: rawLectures.map((l: any) => ({
-          id: l.id,
-          title: l.title || 'محاضرة',
-          description: l.description || '',
-          orderIndex: Number(l.order_index ?? l.orderIndex ?? 0),
-          // 🚀 إذا كان الكورس مشترى، فك القفل ظاهرياً عن جميع المحاضرات فوراً
-          isLocked: isCoursePurchased ? false : !!(l.is_locked ?? l.isLocked ?? true),
-          videoStatus: l.video_status ?? l.videoStatus ?? 'completed',
-        })).sort((a: Lecture, b: Lecture) => a.orderIndex - b.orderIndex)
-      });
-
-      if (isAuthenticated) {
-        const [walletRes, examsRes] = await Promise.allSettled([
-          api.get('/wallet/balance'),
-          api.get('/comprehensive-exams/available')
-        ]);
-
-        if (walletRes.status === 'fulfilled') {
-          setWalletBalance(Number(walletRes.value.data?.data?.balance ?? walletRes.value.data?.balance ?? 0));
-        }
-
-        if (examsRes.status === 'fulfilled') {
-          const rawExams = examsRes.value.data?.data || examsRes.value.data || [];
-          const validExams = Array.isArray(rawExams) ? rawExams : [];
-          
-          const filteredExams = validExams.filter((ex: any) => String(ex.course_id ?? ex.courseId) === String(courseId) || ex.course_title === cData.title);
-          
-          setCourseExams(filteredExams.map((ex: any) => ({
-            id: ex.id,
-            title: ex.title || 'اختبار شامل',
-            durationMinutes: Number(ex.duration_minutes ?? ex.durationMinutes ?? 60),
-            passScore: Number(ex.pass_score ?? ex.passScore ?? 50),
-            startTime: ex.start_time ?? ex.startTime,
-            endTime: ex.end_time ?? ex.endTime,
-            isPurchased: !!(ex.is_purchased ?? ex.isPurchased),
-          })));
-        }
+      const token = getToken();
+      const headers: Record<string, string> = { Accept: 'application/json' };
+      if (token) headers.Authorization = `Bearer ${token}`;
+
+      const response = await fetch(`${API_URL}/api/courses/${courseId}`, { headers });
+
+      if (response.ok) {
+        const data = await response.json();
+        setCourse(data.data);
+      } else {
+        showToast('الكورس غير موجود أو غير متاح', 'error');
       }
-    } catch (err: any) {
-      if (err.response?.status === 404) {
-        showToast('هذا الكورس غير متاح حالياً أو أنه لا يزال قيد التجهيز (مسودة)', 'error');
-      } else {
-        showToast(err?.message || 'فشل تحميل بيانات الكورس', 'error');
-      }
-      setTimeout(() => router.push('/courses'), 2500);
+    } catch (err) {
+      showToast('خطأ في الاتصال بالخادم', 'error');
     } finally {
       setLoading(false);
     }
   };
 
-  const handlePurchaseClick = () => {
+  const fetchWalletBalance = async () => {
+    try {
+      const token = getToken();
+      if (!token) return;
+
+      const response = await fetch(`${API_URL}/api/wallet/balance`, {
+        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
+      });
+
+      if (response.ok) {
+        const data = await response.json();
+        setWalletBalance(data.data?.balance ?? 0);
+      }
+    } catch (err) {
+      console.error(err);
+    }
+  };
+
+  const handlePurchase = async () => {
     if (!course) return;
-
-    if (!isAuthenticated) {
+    const price = course.pricePoints ?? course.price_points ?? 0;
+
+    if (!isLoggedIn) {
       showToast('يجب تسجيل الدخول أولاً لشراء الكورس', 'error');
-      router.push('/login');
       return;
     }
 
-    if (walletBalance === null || walletBalance < course.pricePoints) {
+    if (walletBalance === null || walletBalance < price) {
       showToast('رصيدك غير كافٍ. يرجى شحن محفظتك أولاً.', 'error');
-      router.push('/wallet');
       return;
     }
 
-    setConfirmDialog({
-      visible: true,
-      message: `هل أنت متأكد من الاشتراك في هذا الكورس؟ سيتم خصم ${course.pricePoints} ج.م من محفظتك.`,
-      onConfirm: executePurchase
-    });
-  };
-
-  const executePurchase = async () => {
-    setConfirmDialog(null);
+    if (!confirm('هل أنت متأكد من شراء هذا الكورس؟ سيتم خصم المبلغ من محفظتك.')) return;
+
     setPurchasing(true);
     try {
-      const response = await api.post(`/courses/${courseId}/purchase`);
-      
-      showToast('🎉 مبروك! تم الاشتراك في الكورس بنجاح.', 'success');
-      
-      const newBalance = Number(response.data?.data?.newBalance ?? response.data?.new_balance ?? (walletBalance! - course!.pricePoints));
-      setWalletBalance(newBalance);
-      
-      // 🚀 تحديث حالة الكورس والمحاضرات فوراً بعد الشراء الناجح بدون إعادة تحميل
-      setCourse(prev => prev ? { 
-        ...prev, 
-        isPurchased: true, 
-        lectures: prev.lectures.map(l => ({ ...l, isLocked: false })) 
-      } : null);
-      
-      setCourseExams(prev => prev.map(ex => ({ ...ex, isPurchased: true })));
-
-    } catch (err: any) {
-      showToast(err?.response?.data?.message || err?.message || 'فشل شراء الكورس، يرجى المحاولة لاحقاً', 'error');
+      const token = getToken();
+      const response = await fetch(`${API_URL}/api/courses/${courseId}/purchase`, {
+        method: 'POST',
+        headers: {
+          Authorization: `Bearer ${token}`,
+          Accept: 'application/json',
+          'Content-Type': 'application/json'
+        },
+      });
+
+      const data = await response.json();
+
+      if (response.ok) {
+        showToast('🎉 مبروك! تم الاشتراك في الكورس بنجاح.', 'success');
+        
+        setWalletBalance(data.data?.newBalance ?? (walletBalance - price));
+        setCourse(prev => prev ? { 
+          ...prev, 
+          isPurchased: true, 
+          is_purchased: true,
+          lectures: prev.lectures.map(l => ({ ...l, isLocked: false, is_locked: false })) 
+        } : null);
+        
+      } else {
+        showToast(data.error || data.message || 'فشل شراء الكورس', 'error');
+      }
+    } catch (err) {
+      showToast('خطأ في الاتصال بالخادم أثناء الشراء', 'error');
     } finally {
       setPurchasing(false);
     }
   };
 
-  const handleStartLearning = () => {
-    if (course?.lectures && course.lectures.length > 0) {
-      router.push(`/lectures/${course.lectures[0].id}`);
-    } else {
-      showToast('لا توجد محاضرات في هذا الكورس بعد.', 'error');
-    }
-  };
-
   const handleLectureClick = (lectureId: number, isPurchased: boolean, isLocked: boolean) => {
-    if (!isAuthenticated) {
+    if (!isLoggedIn) {
       showToast('يجب تسجيل الدخول لفتح المحاضرات', 'error');
       router.push('/login');
       return;
@@ -216,120 +172,96 @@
     router.push(`/lectures/${lectureId}`);
   };
 
-  if (loading || authLoading) return (
-    <div className="min-h-screen bg-gray-50 flex flex-col">
+  if (loading) return (
+    <div className="min-h-screen bg-background">
       <Navbar />
-      <div className="flex-1 flex justify-center items-center">
-        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
+      <div className="flex justify-center items-center h-[60vh]">
+        <div className="spinner spinner-dark" style={{ width: 48, height: 48, borderWidth: 4 }}></div>
       </div>
     </div>
   );
 
-  if (!course) return null;
+  if (!course) return (
+    <div className="min-h-screen bg-background">
+      <Navbar />
+      <div className="container py-12 text-center">
+        <h2 className="text-2xl font-bold text-error">الكورس غير موجود</h2>
+        <button onClick={() => router.push('/courses')} className="btn btn-primary mt-4">العودة للكورسات</button>
+      </div>
+    </div>
+  );
+
+  const price = course.pricePoints ?? course.price_points ?? 0;
+  const lecturesCount = course.lecturesCount ?? course.lectures_count ?? 0;
+  const validityDate = course.validityDate ?? course.validity_date;
+  const isPurchased = course.isPurchased ?? course.is_purchased ?? false;
 
   return (
-    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 relative font-sans">
+    <div className="min-h-screen bg-background relative">
       <Navbar />
 
-      {/* نظام الإشعارات */}
-      <div className="toast-container" style={{ position: 'fixed', top: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, transition: 'all 0.3s', opacity: toast.visible ? 1 : 0, pointerEvents: toast.visible ? 'auto' : 'none', width: 'max-content', maxWidth: '90vw' }}>
-        <div className={`flex items-center gap-2 px-6 py-3 rounded-lg shadow-lg text-white font-bold text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
-          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertTriangleIcon size={20} />}
+      {/* Toast UI */}
+      <div style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, transition: 'all 0.3s', opacity: toast.visible ? 1 : 0, pointerEvents: toast.visible ? 'auto' : 'none' }}>
+        <div style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
           {toast.message}
         </div>
       </div>
 
-      {/* نافذة تأكيد الدفع */}
-      {confirmDialog && (
-        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }} onClick={() => setConfirmDialog(null)}>
-          <div className="bg-white shadow-2xl max-w-sm w-full text-center p-8 rounded-3xl animate-scale-up border border-gray-100" onClick={e => e.stopPropagation()}>
-            <div className="flex justify-center mb-5 text-blue-600"><BookIcon size={56} /></div>
-            <h3 className="text-2xl font-black text-gray-900 mb-4">تأكيد الاشتراك</h3>
-            <p className="text-gray-600 mb-8 leading-relaxed font-bold">{confirmDialog.message}</p>
-            <div className="flex gap-4">
-              <button onClick={() => setConfirmDialog(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">إلغاء</button>
-              <button onClick={confirmDialog.onConfirm} className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors">تأكيد الدفع</button>
-            </div>
+      <div className="container py-8 animate-fade-in">
+        <div className="card mb-8 overflow-hidden" style={{ padding: 0 }}>
+          <div style={{
+            height: '200px',
+            background: 'var(--gradient-primary)',
+            display: 'flex',
+            alignItems: 'center',
+            justifyContent: 'center',
+            color: 'white'
+          }}>
+            <BookIcon size={64} />
           </div>
-        </div>
-      )}
-
-      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 animate-fade-in">
-        <button onClick={() => router.push('/courses')} className="text-sm font-bold text-gray-400 hover:text-blue-600 mb-6 flex items-center gap-1 transition-colors">
-          &rarr; العودة لمتجر الكورسات
-        </button>
-
-        {/* 🎨 كارت تعريف الكورس (الرئيسي) */}
-        <div className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden mb-10 relative">
-          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-cyan-400"></div>
-          
-          <div className="flex flex-col lg:flex-row">
-            <div className="lg:w-2/3 p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start">
-              <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 bg-blue-50/50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner border border-blue-100 mx-auto md:mx-0">
-                <BookIcon size={48} className="md:w-16 md:h-16" />
-              </div>
-              <div className="text-center md:text-right w-full">
-                <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-4">{course.title}</h1>
-                <p className="text-gray-600 font-medium leading-relaxed mb-6">
-                  {course.description || 'لا يوجد وصف لهذا الكورس حتى الآن.'}
-                </p>
-                <div className="flex flex-wrap justify-center md:justify-start gap-3 text-sm font-bold text-gray-600">
-                  <span className="flex items-center gap-1.5 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
-                    <VideoIcon size={18} className="text-blue-600"/> {course.lecturesCount} محاضرة
-                  </span>
-                  {course.validityDate ? (
-                    <span className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-4 py-2 rounded-xl border border-orange-200">
-                      <ClockIcon size={18}/> متاح حتى: {new Date(course.validityDate).toLocaleDateString('ar-EG')}
-                    </span>
-                  ) : (
-                    <span className="flex items-center gap-1.5 bg-green-50 text-green-700 px-4 py-2 rounded-xl border border-green-200">
-                      <CheckCircleIcon size={18}/> وصول مدى الحياة
-                    </span>
-                  )}
-                </div>
+          <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
+            <div>
+              <h1 className="text-3xl font-bold text-primary mb-2">{course.title}</h1>
+              <p className="text-secondary max-w-2xl leading-relaxed">
+                {course.description || 'لا يوجد وصف لهذا الكورس'}
+              </p>
+              <div className="flex gap-4 mt-4 text-sm text-muted">
+                <span className="flex items-center gap-1"><BookIcon size={16} /> {lecturesCount} محاضرة</span>
+                {validityDate && (
+                  <span className="flex items-center gap-1"><ClockIcon size={16} /> متاح حتى: {new Date(validityDate).toLocaleDateString('ar-EG')}</span>
+                )}
               </div>
             </div>
 
-            {/* 🎨 قسم الدفع أو بدء التعلم (Status Panel) */}
-            <div className="lg:w-1/3 bg-gray-50 p-8 md:p-10 flex flex-col justify-center border-t lg:border-t-0 lg:border-r border-gray-200 shadow-inner">
-              {course.isPurchased ? (
-                <div className="text-center animate-fade-in">
-                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-green-200">
-                    <CheckCircleIcon size={40} className="text-green-600" />
-                  </div>
-                  <h3 className="font-black text-green-600 text-2xl mb-2">أنت مشترك بالفعل!</h3>
-                  <p className="text-gray-500 font-bold text-sm mb-6">جاهز لبدء رحلة التعلم؟</p>
-                  
-                  {/* 🚀 الزر الجديد: بدء مشاهدة الكورس */}
-                  <button onClick={handleStartLearning} className="w-full py-4 bg-blue-600 text-white text-lg font-black rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 flex items-center justify-center gap-2 transition-transform hover:-translate-y-1">
-                    <PlayIcon size={20} /> ابدأ التعلم الآن
-                  </button>
+            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 min-w-[250px] text-center shadow-sm">
+              {isPurchased ? (
+                <div>
+                  <CheckCircleIcon size={40} className="mb-2" style={{ color: 'var(--success)', margin: '0 auto 0.5rem' }} />
+                  <h3 className="font-bold text-success text-xl">أنت مشترك</h3>
+                  <p className="text-sm text-muted mt-2">يمكنك البدء في مشاهدة المحاضرات فوراً</p>
                 </div>
               ) : (
-                <div className="text-center animate-fade-in">
-                  <span className="text-sm font-bold text-gray-500 block mb-2">سعر الاشتراك في الكورس</span>
-                  <div className="text-4xl font-black text-blue-600 font-mono mb-6 flex justify-center items-end gap-2">
-                    {course.pricePoints} <span className="text-lg text-gray-400 font-bold mb-1">ج.م</span>
+                <div>
+                  <p className="text-sm text-muted font-bold mb-1">سعر الكورس</p>
+                  <div className="text-3xl font-black text-primary mb-4" dir="ltr">
+                    {price} <span className="text-sm">EGP</span>
                   </div>
-                  
-                  {isAuthenticated && walletBalance !== null && (
-                    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex justify-between items-center shadow-sm">
-                      <span className="text-sm font-bold text-gray-500">رصيد محفظتك:</span>
-                      <span className={`font-black text-lg ${walletBalance >= course.pricePoints ? 'text-green-600' : 'text-red-600'}`} dir="ltr">{walletBalance} ج.م</span>
-                    </div>
-                  )}
-
-                  {!isAuthenticated ? (
-                    <button onClick={() => router.push('/login')} className="w-full py-4 bg-blue-600 text-white text-lg font-black rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700">
+                  {walletBalance !== null && (
+                    <p className="text-xs text-muted mb-4 border-t pt-2">
+                      رصيدك الحالي: <span className="font-bold text-success">{walletBalance} EGP</span>
+                    </p>
+                  )}
+                  {!isLoggedIn ? (
+                    <button onClick={() => router.push('/login')} className="btn btn-primary w-full">
                       سجل الدخول للشراء
                     </button>
-                  ) : walletBalance !== null && walletBalance < course.pricePoints ? (
-                    <button onClick={() => router.push('/wallet')} className="w-full py-4 bg-white border-2 border-yellow-500 text-yellow-600 text-lg font-black rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-50 transition-colors">
-                      <AlertTriangleIcon size={20} /> اشحن محفظتك للمتابعة
+                  ) : walletBalance !== null && walletBalance < price ? (
+                    <button onClick={() => router.push('/wallet')} className="btn btn-warning w-full">
+                      رصيدك لا يكفي - اشحن محفظتك
                     </button>
                   ) : (
-                    <button onClick={handlePurchaseClick} disabled={purchasing} className="w-full py-4 bg-green-600 text-white text-lg font-black rounded-xl shadow-lg shadow-green-200 flex items-center justify-center gap-2 transition-transform hover:-translate-y-1 hover:bg-green-700">
-                      {purchasing ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"></div> : <><LockIcon size={20} /> تأكيد الشراء الآن</>}
+                    <button onClick={handlePurchase} disabled={purchasing} className="btn btn-primary w-full">
+                      {purchasing ? 'جاري الشراء...' : 'شراء الآن'}
                     </button>
                   )}
                 </div>
@@ -338,50 +270,20 @@
           </div>
         </div>
 
-        {/* 🎨 قسم الاختبارات الشاملة */}
-        {isAuthenticated && courseExams.length > 0 && (
-          <div className="mb-12 animate-fade-in">
-            <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
-              <ShieldIcon size={28} className="text-blue-600" />
-              الاختبارات الشاملة (ميدتيرم / نهائي)
-            </h2>
-            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
-              {courseExams.map(exam => (
-                <div key={exam.id} onClick={() => router.push(`/exams/${exam.id}`)} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between group">
-                  <div>
-                    <h3 className="font-black text-lg text-gray-900 group-hover:text-blue-600 transition-colors mb-2">{exam.title}</h3>
-                    <div className="flex gap-4 text-sm font-bold text-gray-500">
-                      <span className="flex items-center gap-1.5"><ClockIcon size={16} className="text-gray-400"/> {exam.durationMinutes} دقيقة</span>
-                      <span className="flex items-center gap-1.5 text-green-600"><AwardIcon size={16}/> نجاح: {exam.passScore}%</span>
-                    </div>
-                  </div>
-                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
-                    &larr;
-                  </div>
-                </div>
-              ))}
-            </div>
-          </div>
-        )}
-
-        {/* 🎨 قسم قائمة المحاضرات (المنهج) */}
         <div>
-          <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
-            <PlayIcon size={28} className="text-blue-600" />
-            محتوى المنهج
-          </h2>
+          <h2 className="text-2xl font-bold mb-6">محتوى الكورس</h2>
           
-          <div className="flex flex-col gap-4">
+          <div className="flex flex-col gap-3">
             {course.lectures.length === 0 ? (
-              <div className="bg-white border-2 border-gray-200 border-dashed rounded-3xl p-16 text-center">
-                <BookIcon size={56} className="text-gray-300 mx-auto mb-4" />
-                <p className="font-bold text-gray-500 text-lg">جاري تجهيز محتوى هذا الكورس، سيتم إضافة المحاضرات قريباً.</p>
-              </div>
+              <div className="card text-center p-8 text-muted">لا توجد محاضرات في هذا الكورس بعد</div>
             ) : course.lectures.map((lecture, index) => {
               
-              const isAvailable = course.isPurchased || !lecture.isLocked;
-              const isProcessing = lecture.videoStatus === 'processing' || lecture.videoStatus === 'uploading';
-              const isFailed = lecture.videoStatus === 'failed';
+              const isLocked = lecture.isLocked ?? lecture.is_locked ?? true;
+              const isAvailable = isPurchased || !isLocked;
+              
+              const vStatus = lecture.video_status ?? lecture.encodingStatus ?? 'completed';
+              const isProcessing = vStatus === 'processing';
+              const isFailed = vStatus === 'failed';
               const isReady = !isProcessing && !isFailed;
               
               return (
@@ -389,60 +291,69 @@
                   key={lecture.id}
                   onClick={() => {
                     if (isAvailable && isReady) {
-                      handleLectureClick(lecture.id, course.isPurchased, lecture.isLocked);
+                      handleLectureClick(lecture.id, isPurchased, isLocked);
                     }
                   }}
-                  className={`bg-white rounded-2xl p-5 border transition-all duration-300 flex items-center justify-between group
-                    ${isAvailable && isReady ? 'cursor-pointer border-gray-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-1' : 'opacity-80 border-gray-100 bg-gray-50'}
-                  `}
+                  className="card flex items-center justify-between p-4 transition-all"
+                  style={{
+                    cursor: (isAvailable && isReady) ? 'pointer' : 'default',
+                    opacity: isAvailable ? 1 : 0.7,
+                    border: '1px solid var(--border)',
+                    borderInlineStart: isAvailable ? '4px solid var(--success)' : '4px solid var(--text-muted)',
+                  }}
+                  onMouseEnter={(e) => {
+                    if (isAvailable && isReady) {
+                      e.currentTarget.style.transform = 'translateX(-4px)';
+                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
+                    }
+                  }}
+                  onMouseLeave={(e) => {
+                    e.currentTarget.style.transform = 'none';
+                    e.currentTarget.style.boxShadow = 'none';
+                  }}
                 >
-                  <div className="flex items-center gap-5 flex-1">
-                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 border ${isAvailable ? 'bg-blue-50/50 text-blue-600 border-blue-100' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
+                  <div className="flex items-center gap-4 flex-1">
+                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 shrink-0">
                       {index + 1}
                     </div>
                     <div>
-                      <h3 className={`text-lg font-black mb-1 ${isAvailable ? 'text-gray-900 group-hover:text-blue-600 transition-colors' : 'text-gray-500'}`}>
+                      <h3 className={`font-bold ${isAvailable ? 'text-primary' : 'text-gray-600'}`}>
                         {lecture.title}
                       </h3>
                       {lecture.description && (
-                        <p className="text-sm text-gray-500 font-medium line-clamp-1 max-w-2xl">{lecture.description}</p>
+                        <p className="text-sm text-muted mt-1 line-clamp-1">{lecture.description}</p>
                       )}
                     </div>
                   </div>
 
-                  <div className="mx-4 flex-shrink-0 flex items-center gap-3">
-                    {isAvailable && isProcessing && (
-                      <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 animate-pulse"><ClockIcon size={16} /> جاري المعالجة...</span>
-                    )}
-                    {isAvailable && isFailed && (
-                      <span className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"><AlertTriangleIcon size={16} /> خطأ في الفيديو</span>
-                    )}
-                    
-                    {isAvailable && isReady && (
-                      <button className="flex items-center gap-2 bg-blue-50 text-blue-600 px-5 py-2.5 rounded-xl font-bold border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
-                        <PlayIcon size={18} /> <span>تشغيل</span>
-                      </button>
-                    )}
-                    
-                    {(!isAvailable || lecture.isLocked) && !course.isPurchased && (
-                      <div className="flex items-center gap-2 bg-gray-100 text-gray-500 px-5 py-2.5 rounded-xl font-bold border border-gray-200">
-                        <LockIcon size={18} /> <span>مقفلة</span>
-                      </div>
-                    )}
-                  </div>
+                  {isAvailable && (
+                    <div className="mx-4 flex-shrink-0">
+                      {isProcessing && (
+                        <span className="badge badge-warning text-xs flex items-center gap-1"><ClockIcon size={12} /> جاري التجهيز...</span>
+                      )}
+                      {isFailed && (
+                        <span className="badge badge-error text-xs flex items-center gap-1"><AlertTriangleIcon size={12} /> الفيديو غير متاح</span>
+                      )}
+                    </div>
+                  )}
+                  
+                  {isAvailable && isReady && (
+                    <span className="shrink-0" style={{ color: 'var(--success)' }}>
+                      <PlayIcon size={24} />
+                    </span>
+                  )}
+                  
+                  {(!isAvailable || isLocked) && !isPurchased && (
+                    <div className="text-muted shrink-0">
+                      <LockIcon size={22} />
+                    </div>
+                  )}
                 </div>
               );
             })}
           </div>
         </div>
-      </main>
-
-      <style jsx global>{`
-        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
-        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
-        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
-        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
-      `}</style>
+      </div>
     </div>
   );
-}+}
```

### `app\dashboard\page.tsx`
```diff
--- Current: app\dashboard\page.tsx
+++ Other: app\dashboard\page.tsx
@@ -65,7 +65,7 @@
 
 export default function StudentDashboard() {
   const router = useRouter();
-  const { isChecking } = useAuthGuard(['student']);
+  const { isChecking } = useAuthGuard();
 
   const [activeSection, setActiveSection] = useState<Section>('profile');
   const [userData, setUserData] = useState<UserData | null>(null);
@@ -90,7 +90,7 @@
         try {
           const token = getToken();
           if (!token) return;
-          const res = await fetch(`${API_URL}/notifications/mark-all-read`, {
+          const res = await fetch(`${API_URL}/api/notifications/mark-all-read`, {
             method: 'POST',
             headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
           });
@@ -114,7 +114,7 @@
       const token = getToken();
       if (!token) return;
 
-      const userRes = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
+      const userRes = await fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
       if (userRes.ok) {
         const userDataJson = await userRes.json();
         const data = userDataJson.data || userDataJson;
@@ -133,7 +133,7 @@
         });
       }
 
-      const progressRes = await fetch(`${API_URL}/courses/my-courses`, { headers: { Authorization: `Bearer ${token}` } });
+      const progressRes = await fetch(`${API_URL}/api/courses/my-courses`, { headers: { Authorization: `Bearer ${token}` } });
       if (progressRes.ok) {
         const progData = await progressRes.json();
         const coursesArray = progData.data?.courses || progData.data || [];
@@ -150,14 +150,14 @@
         }));
       }
 
-      const notifRes = await fetch(`${API_URL}/notifications`, { headers: { Authorization: `Bearer ${token}` } });
+      const notifRes = await fetch(`${API_URL}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } });
       if (notifRes.ok) {
         const notifData = await notifRes.json();
         setNotifications(notifData.data?.notifications || notifData.data || []);
         setUnreadCount(notifData.data?.unreadCount || 0);
       }
 
-      const examsRes = await fetch(`${API_URL}/exams/my-results`, { headers: { Authorization: `Bearer ${token}` } });
+      const examsRes = await fetch(`${API_URL}/api/exams/my-results`, { headers: { Authorization: `Bearer ${token}` } });
       if (examsRes.ok) {
         const examsData = await examsRes.json();
         setExamAttempts(examsData.data || []);
@@ -172,7 +172,7 @@
     setProcessing(true);
     try {
       const token = getToken();
-      const res = await fetch(`${API_URL}/center-codes/redeem`, {
+      const res = await fetch(`${API_URL}/api/center-codes/redeem`, {
         method: 'POST',
         headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
         body: JSON.stringify({ code: redeemCode }),
```

### `app\hooks\useAuthGuard.ts`
```diff
--- Current: app\hooks\useAuthGuard.ts
+++ Other: app\hooks\useAuthGuard.ts
@@ -1,81 +1,27 @@
-// frontend/app/hooks/useAuthGuard.ts
 'use client';
 
 import { useEffect, useState } from 'react';
-import { useRouter, usePathname } from 'next/navigation';
-import { useAuthStore } from '@/store/useAuthStore';
-import Cookies from 'js-cookie';
+import { useRouter } from 'next/navigation';
 
-export function useAuthGuard(allowedRoles?: string[]) {
+export function useAuthGuard() {
   const router = useRouter();
-  const pathname = usePathname();
-  
-  // 1. استدعاء الذاكرة المركزية
-  const { user, isAuthenticated, isLoading, fetchUser } = useAuthStore();
-  
-  // 2. حالة الترطيب: تمنع أي طرد متسرع حتى نتحقق من التوكن
-  const [isHydrating, setIsHydrating] = useState(true);
+  const [isChecking, setIsChecking] = useState(true);
 
   useEffect(() => {
-    const initGuard = async () => {
-      const token = Cookies.get('token') || localStorage.getItem('token');
+    // دالة جلب التوكن
+    const token = document.cookie
+      .split('; ')
+      .find(row => row.startsWith('token='))
+      ?.split('=')[1] || localStorage.getItem('token');
 
-      // إذا لا يوجد توكن إطلاقاً، أنهي الترطيب ليتم الطرد
-      if (!token) {
-        setIsHydrating(false);
-        return;
-      }
+    if (!token) {
+      // ❌ هنا كان يوجد الـ alert المزعج! قمنا بإزالته.
+      // توجيه صامت وفوري لصفحة الدخول
+      router.replace('/login'); 
+    } else {
+      setIsChecking(false); // التوكن موجود، اسمح بعرض الصفحة
+    }
+  }, [router]);
 
-      // إذا كان هناك توكن، لكن الذاكرة فارغة (حدث ريفريش أو انتقال)
-      if (!isAuthenticated) {
-        try {
-          await fetchUser(); // السحر هنا: نجبر النظام على جلب البيانات
-        } catch (error) {
-          Cookies.remove('token');
-          localStorage.removeItem('token');
-        }
-      }
-      
-      // انتهت عملية التحقق بنجاح
-      setIsHydrating(false);
-    };
-
-    initGuard();
-  }, []); // تعمل مرة واحدة فقط عند فتح الصفحة
-
-  // حماية ذكية لمنع مشكلة (Infinite Loop) إذا تم تمرير المصفوفة مباشرة
-  const rolesString = allowedRoles ? allowedRoles.join(',') : '';
-
-  // 3. درع التوجيه الصارم (لا يتدخل إلا بعد انتهاء الترطيب)
-  useEffect(() => {
-    if (isHydrating || isLoading) return;
-
-    // إذا لم ينجح الدخول، اطرده لصفحة التسجيل
-    if (!isAuthenticated) {
-      router.replace(`/login?redirect=${pathname}`);
-      return;
-    }
-
-    // التوجيه الإجباري حسب نوع الحساب (الفصل بين الإدارة والطلاب)
-    if (user) {
-      // منع الطالب من دخول الإدارة
-      if (user.role !== 'admin' && pathname.startsWith('/admin')) {
-        router.replace('/dashboard');
-        return;
-      }
-      
-      // توجيه الأدمن للإدارة فقط إذا حاول الدخول للوحة الطالب الخاصة (مثال: /dashboard)
-      if (user.role === 'admin' && pathname.startsWith('/dashboard')) {
-        router.replace('/admin');
-        return;
-      }
-
-      // if (allowedRoles && !allowedRoles.includes(user.role)) {
-      //   const redirectPath = user.role === 'admin' ? '/admin' : '/dashboard';
-      //   router.replace(redirectPath);
-      // }
-    }
-  }, [isHydrating, isLoading, isAuthenticated, user, pathname, rolesString, router]);
-
-  return { isChecking: isHydrating || isLoading, user, isAuthenticated };
+  return { isChecking };
 }```

### `app\lectures\[id]\page.tsx`
```diff
--- Current: app\lectures\[id]\page.tsx
+++ Other: app\lectures\[id]\page.tsx
@@ -1,17 +1,21 @@
-// app/lectures/[id]/page.tsx
 'use client';
 
 import { useEffect, useState, useRef } from 'react';
 import { useRouter, useParams } from 'next/navigation';
-import Navbar from '@/app/components/Navbar';
-import { useAuthGuard } from '@/app/hooks/useAuthGuard';
+import Navbar from '../../components/Navbar';
+import { useAuthGuard } from '../../hooks/useAuthGuard';
 import SecureVideoPlayer from '@/components/SecureVideoPlayer';
-import api from '@/lib/axios'; // 🚀 الاعتماد الكلي على Axios
 import {
   ArrowRightIcon, ArrowLeftIcon, BookIcon, FileTextIcon,
   ShieldIcon, CheckIcon, AlertTriangleIcon, LockIcon,
-  MonitorIcon, UploadIcon, DownloadIcon, CheckCircleIcon
-} from '@/app/components/Icons';
+  MonitorIcon, UploadIcon, DownloadIcon
+} from '../../components/Icons';
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+
+const getToken = () => {
+  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
+};
 
 interface Lecture {
   id: number;
@@ -43,17 +47,14 @@
   const [courseLectures, setCourseLectures] = useState<CourseLecture[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');
-  
   const [violationCount, setViolationCount] = useState(0);
   const [token, setToken] = useState<string>('');
-  
-  const [streamId] = useState(() => Math.random().toString(36).substring(2, 15) + Date.now().toString(36));
-  
   const [initialTime, setInitialTime] = useState<number>(0);
   const [isLectureCompleted, setIsLectureCompleted] = useState<boolean>(false);
   const [viewsCount, setViewsCount] = useState<number>(0);
   const [maxViews, setMaxViews] = useState<number | null>(null);
   
+  // Homework state
   const [homeworkData, setHomeworkData] = useState<any>(null);
   const [submittingHomework, setSubmittingHomework] = useState(false);
   const [homeworkError, setHomeworkError] = useState('');
@@ -61,43 +62,74 @@
   const lastSyncTimeRef = useRef<number>(0);
   const latestProgressRef = useRef<{time: number, duration: number} | null>(null);
 
-  // تحديث التقدم عند مغادرة الصفحة
   useEffect(() => {
     return () => {
-      if (latestProgressRef.current) {
+      if (latestProgressRef.current && token) {
         const { time, duration } = latestProgressRef.current;
-        api.post(`/lectures/${lectureId}/progress`, { 
-          watch_time: time, 
-          total_duration: duration, 
-          stream_id: streamId 
-        }).catch(() => {});
+        fetch(`${API_URL}/api/lectures/${lectureId}/progress`, {
+          method: 'POST',
+          headers: {
+            'Authorization': `Bearer ${token}`,
+            'Content-Type': 'application/json',
+            'Accept': 'application/json',
+          },
+          body: JSON.stringify({ watch_time: time, total_duration: duration }),
+          keepalive: true
+        }).catch(console.error);
       }
     };
-  }, [lectureId, streamId]);
+  }, [token, lectureId]);
 
   useEffect(() => {
-    // 🚀 استخراج التوكن لتمريره إلى مشغل الفيديو الذي يعتمد على XHR داخلي
-    const currentToken = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
-    
+    const currentToken = getToken();
+
     if (!currentToken) {
       router.push('/login');
       return;
     }
+
     setToken(currentToken);
 
+    const checkPendingStatus = async () => {
+      try {
+        const statusRes = await fetch(`${API_URL}/api/auth/status`, {
+          headers: { Authorization: `Bearer ${currentToken}`, Accept: 'application/json' },
+        });
+        if (statusRes.status === 401) {
+          document.cookie = "token=; Max-Age=0";
+          localStorage.removeItem('token');
+          router.replace('/login');
+          return true;
+        }
+        if (statusRes.ok) {
+          const statusData = await statusRes.json();
+          if (statusData.data?.status === 'pending') {
+            router.replace('/waiting-room');
+            return true;
+          }
+        }
+      } catch (e) {
+        console.error('Status check failed:', e);
+      }
+      return false;
+    };
+
     const loadData = async () => {
+      const isPending = await checkPendingStatus();
+      if (isPending) return;
+
       try {
-        // 🚀 كل الاستدعاءات أصبحت بـ Axios بدون إضافة /api وبدون Header يدوي
-        const courseId = await fetchLectureDetails();
-        const promises = [
-          fetchViolationCount(),
-          fetchProgress(),
-          fetchLecturePlayback(),
-          fetchHomeworkStatus()
+        const courseId = await fetchLectureDetails(currentToken);
+
+        const promises: Promise<any>[] = [
+          fetchViolationCount(currentToken),
+          fetchProgress(currentToken),
+          fetchLecturePlayback(currentToken),
+          fetchHomeworkStatus(currentToken)
         ];
 
         if (courseId) {
-          promises.push(fetchCourseLectures(courseId));
+          promises.push(fetchCourseLectures(currentToken, courseId));
         }
 
         await Promise.all(promises);
@@ -108,82 +140,167 @@
       }
     };
 
-    if (!isChecking) loadData();
+    loadData();
   // eslint-disable-next-line react-hooks/exhaustive-deps
-  }, [lectureId, isChecking]);
-
-  const fetchProgress = async () => {
+  }, [lectureId]);
+
+  const fetchProgress = async (authToken: string) => {
     try {
-      const response = await api.get(`/lectures/${lectureId}/progress`);
-      const data = response.data?.data || response.data;
-      setInitialTime(data?.watchTime ?? data?.watch_time ?? 0);
-      setIsLectureCompleted(data?.isCompleted ?? data?.is_completed ?? false);
-      setViewsCount(data?.viewsCount ?? data?.views_count ?? 0);
-      setMaxViews(data?.maxViews ?? data?.max_views ?? null);
-    } catch (error) {}
-  };
-
-  const fetchLecturePlayback = async () => {
+      const response = await fetch(`${API_URL}/api/lectures/${lectureId}/progress`, {
+        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
+      });
+      if (response.ok) {
+        const res = await response.json();
+        const data = res.data || res;
+        setInitialTime(data.watch_time || data.watchTime || 0);
+        setIsLectureCompleted(data.is_completed || data.isCompleted || false);
+        setViewsCount(data.views_count || 0);
+        setMaxViews(data.max_views || null);
+      }
+    } catch (error) {
+      console.error('Failed to fetch progress:', error);
+    }
+  };
+
+  const fetchLecturePlayback = async (authToken: string) => {
     try {
-      const response = await api.get(`/video/playback/${lectureId}`);
-      const data = response.data;
-      setPlayback({
-        url: data.data?.playbackUrl || data.playbackUrl || data.playback_url,
-        watermark: data.data?.watermark || data.watermark
-      });
-    } catch (error: any) {
-      if (error.response?.status === 401) router.replace('/login');
-      else setError(error.response?.data?.message || error.response?.data?.error || 'الفيديو غير متاح أو قيد المعالجة.');
-    }
-  };
-
-  const fetchLectureDetails = async () => {
+      const response = await fetch(`${API_URL}/api/video/playback/${lectureId}`, {
+        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
+      });
+
+      if (response.status === 401) {
+        document.cookie = "token=; Max-Age=0";
+        localStorage.removeItem('token');
+        router.replace('/login');
+        return;
+      }
+      if (response.status === 403) {
+        router.replace('/dashboard');
+        return;
+      }
+
+      if (response.ok) {
+        const data = await response.json();
+        setPlayback({
+          url: data.playback_url || data.playbackUrl,
+          watermark: data.watermark
+        });
+      } else {
+        let errorMsg = 'الفيديو غير متاح أو قيد المعالجة حالياً.';
+        try {
+            const errorData = await response.json();
+            errorMsg = errorData.message || errorData.error || errorMsg;
+        } catch (e) {
+            if (response.status === 403) {
+                errorMsg = 'غير مصرح لك بمشاهدة هذا الفيديو. يرجى التأكد من اشتراكك في الكورس.';
+            }
+        }
+        setError(errorMsg);
+      }
+    } catch (error) {
+      console.error('Failed to fetch lecture playback:', error);
+      setError('حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة لاحقاً.');
+    }
+  };
+
+  const fetchLectureDetails = async (authToken: string) => {
      try {
-      const response = await api.get(`/lectures/${lectureId}`);
-      const data = response.data?.data || response.data;
-      const extractedCourseId = data.courseId || data.course_id || data.course?.id;
-      setLecture({
-        id: data.id,
-        title: data.title,
-        description: data.description,
-        courseId: extractedCourseId,
-      });
-      return extractedCourseId;
-    } catch (error) {}
+      const response = await fetch(`${API_URL}/api/lectures/${lectureId}`, {
+        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
+      });
+
+      if (response.status === 401) {
+        document.cookie = "token=; Max-Age=0";
+        localStorage.removeItem('token');
+        router.replace('/login');
+        return null;
+      }
+      if (response.status === 403) {
+        router.replace('/dashboard');
+        return null;
+      }
+
+      if (response.ok) {
+        const data = await response.json();
+        const d = data.data || data;
+
+        const extractedCourseId = d.course_id || d.courseId || d.course?.id;
+
+        setLecture({
+          id: d.id,
+          title: d.title,
+          description: d.description,
+          courseId: extractedCourseId,
+        });
+        return extractedCourseId;
+      }
+    } catch (error) {
+      console.error('Failed to fetch lecture details:', error);
+    }
     return null;
   };
 
-  const fetchViolationCount = async () => {
+  const fetchViolationCount = async (authToken: string) => {
     try {
-      const response = await api.get(`/violations/count`);
-      const data = response.data?.data || response.data;
-      setViolationCount(data?.fatalStrikes ?? data?.fatal_strikes ?? 0);
-    } catch (error) {}
-  };
-
-  const fetchCourseLectures = async (courseId: number | string) => {
+      const response = await fetch(`${API_URL}/api/violations/count`, {
+        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
+      });
+
+      if (response.ok) {
+        const res = await response.json();
+        const data = res.data || res;
+        setViolationCount(data.fatalStrikes || data.fatal_strikes || 0);
+      }
+    } catch (error) {
+      console.error('Failed to fetch violation count:', error);
+    }
+  };
+
+  const fetchCourseLectures = async (authToken: string, courseId: number | string) => {
     try {
-      const response = await api.get(`/courses/${courseId}`);
-      const data = response.data?.data || response.data;
-      const list = Array.isArray(data.lectures) ? data.lectures : [];
-      setCourseLectures(list.map((l: any) => ({
-        id: l.id,
-        title: l.title,
-        isCompleted: l.isCompleted ?? l.is_completed ?? false,
-        hasExam: l.hasExam ?? l.has_exam ?? false,
-      })));
-    } catch (error) {}
-  };
-
-  const fetchHomeworkStatus = async () => {
+      const url = `${API_URL}/api/courses/lectures?course_id=${courseId}`;
+      const response = await fetch(url, {
+        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
+      });
+
+      if (response.ok) {
+        const res = await response.json();
+
+        const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data?.lectures) ? res.data.lectures : Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
+
+        const mappedList = list.map((l: any) => ({
+          id: l.id,
+          title: l.title,
+          isCompleted: l.is_completed ?? l.isCompleted ?? false,
+          hasExam: l.has_exam ?? l.hasExam ?? false,
+        }));
+
+        setCourseLectures(mappedList);
+      } else {
+        console.error('Server rejected the request with status:', response.status);
+      }
+    } catch (error) {
+      console.error('Failed to fetch course lectures:', error);
+    }
+  };
+
+  const fetchHomeworkStatus = async (authToken: string) => {
     try {
-      const response = await api.get(`/lectures/${lectureId}/homework/status`);
-      setHomeworkData(response.data?.data || response.data);
-    } catch (error) {}
+      const response = await fetch(`${API_URL}/api/lectures/${lectureId}/homework/status`, {
+        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
+      });
+      if (response.ok) {
+        const data = await response.json();
+        setHomeworkData(data.data);
+      }
+    } catch (error) {
+      console.error('Failed to fetch homework status:', error);
+    }
   };
 
   const handleHomeworkSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
+    if (!token) return;
     const fileInput = document.getElementById('homework-file') as HTMLInputElement;
     const file = fileInput?.files?.[0];
     if (!file) {
@@ -198,41 +315,81 @@
       const formData = new FormData();
       formData.append('file', file);
 
-      await api.post(`/lectures/${lectureId}/homework/submit`, formData, {
-        headers: { 'Content-Type': 'multipart/form-data' }
-      });
-
-      alert('تم تسليم الواجب بنجاح!');
-      fetchHomeworkStatus();
-    } catch (err: any) {
-      setHomeworkError(err.response?.data?.message || err.response?.data?.error || 'فشل رفع الواجب');
+      const response = await fetch(`${API_URL}/api/lectures/${lectureId}/homework/submit`, {
+        method: 'POST',
+        headers: {
+          'Authorization': `Bearer ${token}`,
+          'Accept': 'application/json'
+        },
+        body: formData
+      });
+
+      if (response.ok) {
+        alert('تم تسليم الواجب بنجاح!');
+        fetchHomeworkStatus(token);
+      } else {
+        const data = await response.json();
+        setHomeworkError(data.message || data.error || 'فشل رفع الواجب');
+      }
+    } catch (err) {
+      setHomeworkError('حدث خطأ أثناء الاتصال بالخادم.');
     } finally {
       setSubmittingHomework(false);
     }
   };
 
   const handleViolation = async (violationType: string) => {
+    if (!token) return;
     try {
-      const response = await api.post(`/lectures/${lectureId}/violation`, { violation_type: violationType });
-      const data = response.data?.data || response.data;
-      setViolationCount(data?.fatalStrikes ?? data?.fatal_strikes ?? violationCount);
-    } catch (error) {}
+      const response = await fetch(`${API_URL}/api/lectures/${lectureId}/violation`, {
+        method: 'POST',
+        headers: {
+          'Authorization': `Bearer ${token}`,
+          'Content-Type': 'application/json',
+          'Accept': 'application/json',
+        },
+        body: JSON.stringify({ violation_type: violationType }),
+      });
+
+      if (response.ok) {
+        const res = await response.json();
+        const data = res.data || res;
+        if (data.fatalStrikes !== undefined) setViolationCount(data.fatalStrikes);
+        if (data.fatal_strikes !== undefined) setViolationCount(data.fatal_strikes);
+      }
+    } catch (error) {
+      console.error('Failed to log violation:', error);
+    }
   };
 
   const saveProgressToBackend = async (currentTime: number, totalDuration: number) => {
+    if (!token) return;
     try {
-      const response = await api.post(`/lectures/${lectureId}/progress`, { 
-        watch_time: currentTime, 
-        total_duration: totalDuration, 
-        stream_id: streamId 
-      });
-
-      const data = response.data?.data || response.data;
-      if (data?.isCompleted || data?.is_completed) {
-        setIsLectureCompleted(true);
-        setCourseLectures(prev => prev.map(l => l.id.toString() === lectureId ? { ...l, isCompleted: true } : l));
-      }
-    } catch (error) {}
+      const response = await fetch(`${API_URL}/api/lectures/${lectureId}/progress`, {
+        method: 'POST',
+        headers: {
+          'Authorization': `Bearer ${token}`,
+          'Content-Type': 'application/json',
+          'Accept': 'application/json',
+        },
+        body: JSON.stringify({
+          watch_time: currentTime,
+          total_duration: totalDuration
+        }),
+      });
+
+      if (response.ok) {
+        const res = await response.json();
+        const data = res.data || res;
+
+        if (data.is_completed) {
+          setIsLectureCompleted(true);
+          setCourseLectures(prev => prev.map(l => l.id.toString() === lectureId ? { ...l, isCompleted: true } : l));
+        }
+      }
+    } catch (error) {
+      console.error('فشل حفظ التقدم في السيرفر:', error);
+    }
   };
 
   const handleVideoProgress = (currentTime: number, totalDuration: number) => {
@@ -246,219 +403,270 @@
 
   if (isChecking || loading) {
     return (
-      <div className="min-h-screen bg-gray-50 flex flex-col">
-        <Navbar />
-        <div className="flex-1 flex justify-center items-center">
-          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
+      <div className="loading-state" style={{ minHeight: '100vh' }}>
+        <div className="spinner spinner-lg"></div>
+      </div>
+    );
+  }
+
+  if (error) {
+    return (
+      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)', padding: '2rem' }}>
+        <div className="card" style={{ textAlign: 'center', maxWidth: 500 }}>
+          <div className="empty-state-icon" style={{ margin: '0 auto 1rem' }}>
+            <AlertTriangleIcon size={32} />
+          </div>
+          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--error)', marginBottom: '1rem' }}>
+            تنبيه
+          </h2>
+          <div className="banner banner-error" style={{ marginBottom: '1.5rem' }}>
+            <AlertTriangleIcon size={16} />
+            {error}
+          </div>
+          <button onClick={() => router.back()} className="btn btn-primary">
+            <ArrowRightIcon size={16} style={{ marginInlineEnd: '0.5rem' }} />
+            العودة
+          </button>
         </div>
       </div>
     );
   }
 
-  if (error) {
-    return (
-      <div className="min-h-screen bg-gray-50 flex flex-col">
-        <Navbar />
-        <div className="flex-1 flex items-center justify-center p-4">
-          <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-xl border border-gray-100">
-            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
-              <AlertTriangleIcon size={40} />
-            </div>
-            <h2 className="text-2xl font-black text-gray-900 mb-4">تنبيه</h2>
-            <p className="text-gray-600 font-bold mb-8 leading-relaxed">{error}</p>
-            <button onClick={() => router.back()} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-colors">
-              العودة للخلف
-            </button>
-          </div>
-        </div>
-      </div>
-    );
-  }
-
   if (!playback) return null;
 
   const completedLecturesCount = courseLectures.filter(l => l.isCompleted).length;
   const progressPercentage = courseLectures.length > 0 ? (completedLecturesCount / courseLectures.length) * 100 : 0;
-  const currentIdx = courseLectures.findIndex(l => l.id.toString() === lectureId);
-  const currentLectureData = currentIdx !== -1 ? courseLectures[currentIdx] : null;
-  const nextLecture = currentIdx !== -1 && currentIdx < courseLectures.length - 1 ? courseLectures[currentIdx + 1] : null;
 
   return (
-    <div className="min-h-screen bg-gray-50 font-sans pb-16">
+    <div style={{
+      minHeight: '100vh',
+      backgroundColor: 'var(--background)',
+      fontFamily: 'var(--font-body)',
+    }}>
       <Navbar />
-      
-      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8">
-        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
+      <div style={{
+        maxWidth: 1400,
+        margin: '0 auto',
+        padding: '1.5rem',
+      }}>
+        <header className="flex items-center justify-between mb-6">
           <button
             onClick={() => lecture?.courseId ? router.push(`/courses/${lecture.courseId}`) : router.back()}
-            className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition-colors"
+            className="btn btn-outline"
+            style={{ gap: '0.5rem', display: 'inline-flex', alignItems: 'center' }}
           >
-            <ArrowRightIcon size={20} />
-            العودة لمحتويات الكورس
+            <ArrowRightIcon size={16} />
+            العودة للكورس
           </button>
 
-          <div className="flex gap-3">
+          <div style={{ display: 'flex', gap: '0.75rem' }}>
             {maxViews !== null && (
-              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-100 font-bold text-sm shadow-sm">
-                <MonitorIcon size={16} />
-                <span>مشاهداتك: {viewsCount} / {maxViews}</span>
+              <div className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
+                <MonitorIcon size={14} />
+                مشاهداتك: {viewsCount} / {maxViews}
               </div>
             )}
+
             {violationCount > 0 && (
-              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm shadow-sm ${violationCount >= 3 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
-                <LockIcon size={16} />
-                <span>مخالفات أمنية: {violationCount}/3</span>
+              <div className={`badge ${violationCount >= 3 ? 'badge-error' : 'badge-warning'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
+                <LockIcon size={14} />
+                تحذيرات أمنية: {violationCount}/3
               </div>
             )}
           </div>
         </header>
 
-        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
-          <div className="lg:col-span-2 flex flex-col gap-6">
-            <div className="bg-black rounded-3xl overflow-hidden shadow-2xl ring-1 ring-gray-900/5">
-              <SecureVideoPlayer
-                lectureId={lectureId}
-                videoUrl={playback.url}
-                token={token}
-                watermarkText={playback.watermark}
-                onViolation={handleViolation}
-                initialTime={initialTime}
-                streamId={streamId}
-                onCompleted={() => {
-                  setIsLectureCompleted(true);
-                  setCourseLectures(prev => prev.map(l => l.id.toString() === lectureId ? { ...l, isCompleted: true } : l));
-                }}
-                onProgress={handleVideoProgress}
-              />
+        <div style={{
+          display: 'grid',
+          gridTemplateColumns: '1fr 340px',
+          gap: '1.5rem',
+        }}>
+          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
+
+            <div className="card" style={{ padding: 0, overflow: 'hidden', background: '#000' }}>
+              <div className="video-player-container">
+                <SecureVideoPlayer
+                  lectureId={lectureId}
+                  videoUrl={playback.url}
+                  token={token}
+                  watermarkText={playback.watermark}
+                  onViolation={handleViolation}
+                  initialTime={initialTime}
+                  onCompleted={() => {
+                    setIsLectureCompleted(true);
+                    setCourseLectures(prev => prev.map(l => l.id.toString() === lectureId ? { ...l, isCompleted: true } : l));
+                  }}
+                  onProgress={handleVideoProgress}
+                  streamId={''}                />
+              </div>
             </div>
 
-            <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-center">
-              <div className="flex-1 w-full text-center md:text-right">
-                <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-3 flex items-center justify-center md:justify-start gap-3">
-                  <BookIcon size={32} className="text-blue-600" />
+            <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
+              <div style={{ flex: 1, minWidth: '250px' }}>
+                <h1 style={{
+                  fontSize: '1.5rem',
+                  fontWeight: 700,
+                  color: 'var(--text-primary)',
+                  marginBottom: '0.5rem',
+                  fontFamily: 'var(--font-display)',
+                  display: 'flex',
+                  alignItems: 'center',
+                  gap: '0.5rem',
+                }}>
+                  <BookIcon size={24} />
                   {lecture?.title || 'جاري التحميل...'}
                 </h1>
+
                 {lecture?.description && (
-                  <p className="text-gray-500 font-medium leading-relaxed max-w-2xl">
+                  <p style={{
+                    color: 'var(--text-secondary)',
+                    fontSize: '1rem',
+                    lineHeight: 1.7,
+                  }}>
                     {lecture.description}
                   </p>
                 )}
               </div>
 
-              <div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
-                {currentLectureData?.hasExam && (
-                  <button onClick={() => router.push(`/exams/${lectureId}`)} className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200">
-                    <FileTextIcon size={20} />
-                    اختبار المحاضرة
-                  </button>
-                )}
-                {nextLecture && (
-                  <button onClick={() => router.push(`/lectures/${nextLecture.id}`)} className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-100 hover:border-blue-600 px-8 py-3.5 rounded-xl font-bold transition-all">
-                    <ArrowLeftIcon size={20} />
-                    المحاضرة التالية
-                  </button>
-                )}
+              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '200px' }}>
+
+                 {(() => {
+                   const currentIdx = courseLectures.findIndex(l => l.id.toString() === lectureId);
+                   const currentLectureData = currentIdx !== -1 ? courseLectures[currentIdx] : null;
+                   const nextLecture = currentIdx !== -1 && currentIdx < courseLectures.length - 1 ? courseLectures[currentIdx + 1] : null;
+
+                   if (currentLectureData?.hasExam) {
+                     return (
+                       <button
+                         onClick={() => router.push(`/exams/${lectureId}`)}
+                         className="btn btn-primary"
+                         style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
+                       >
+                         <FileTextIcon size={16} />
+                         الانتقال لاختبار المحاضرة
+                       </button>
+                     );
+                   }
+
+                   if (nextLecture) {
+                     return (
+                       <button
+                         onClick={() => router.push(`/lectures/${nextLecture.id}`)}
+                         className="btn btn-outline"
+                         style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
+                       >
+                         <ArrowLeftIcon size={16} />
+                         المحاضرة التالية
+                       </button>
+                     );
+                   }
+
+                   return null;
+                 })()}
+
               </div>
             </div>
 
-            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start md:items-center gap-4 shadow-sm">
-              <div className="text-blue-600 shrink-0 bg-white p-2 rounded-full shadow-sm"><ShieldIcon size={24} /></div>
-              <p className="text-sm md:text-base text-blue-900 font-medium leading-relaxed">
-                <strong className="font-black block md:inline mb-1 md:mb-0 ml-1">سياسة الحماية الصارمة:</strong> 
-                هذا المحتوى محمي بأنظمة تتبع رقمية. محاولة استخدام أدوات المطور، أو إضافات التحميل، أو مشاركة الحساب ستؤدي للحظر النهائي مباشرة.
-              </p>
+            <div className="banner banner-warning" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
+              <ShieldIcon size={20} />
+              <span>
+                <strong>سياسة الاستخدام الصارم:</strong> هذا الفيديو محمي بأنظمة متطورة. محاولة استخدام أدوات المطور (F12)، أو إضافات تحميل الفيديو، أو تسجيل الشاشة ستؤدي إلى إغلاق حسابك نهائياً وحظر الـ IP الخاص بك.
+              </span>
             </div>
 
+            {/* Homework Card */}
             {homeworkData && homeworkData.homework && (
-              <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm mt-4 relative overflow-hidden">
-                <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500"></div>
-                
-                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-100 mb-6">
-                  <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
-                    <BookIcon size={24} className="text-indigo-500" />
+              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem', background: '#1a1b26/30', border: '1px solid rgba(255,255,255,0.05)' }}>
+                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
+                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
+                    <BookIcon size={20} />
                     الواجب الدراسي: {homeworkData.homework.title}
                   </h3>
-                  <a href={homeworkData.homework.filePath} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 px-5 py-2.5 rounded-xl font-bold transition-colors text-sm">
-                    <DownloadIcon size={18} />
-                    تحميل ملف الأسئلة
+                  <a
+                    href={homeworkData.homework.filePath}
+                    target="_blank"
+                    rel="noreferrer"
+                    className="btn btn-sm btn-outline"
+                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
+                  >
+                    <DownloadIcon size={14} />
+                    تحميل ملف الواجب
                   </a>
                 </div>
 
                 {homeworkData.submission ? (
-                  <div className="flex flex-col gap-5">
-                    <div className="flex items-center gap-3">
-                      <span className="font-bold text-gray-700">حالة الواجب:</span>
+                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
+                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
+                      <span className="font-bold">حالة تسليم الواجب:</span>
                       {homeworkData.submission.status === 'approved' && (
-                        <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5">
-                          <CheckCircleIcon size={16} /> مقبول {homeworkData.submission.score !== null && `(${homeworkData.submission.score}%)`}
+                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
+                          <CheckIcon size={14} />
+                          مقبول {homeworkData.submission.score !== null && `(${homeworkData.submission.score}%)`}
                         </span>
                       )}
                       {homeworkData.submission.status === 'pending' && (
-                        <span className="bg-yellow-100 text-yellow-700 px-4 py-1.5 rounded-lg text-sm font-bold">قيد المراجعة</span>
+                        <span className="badge badge-warning">قيد المراجعة</span>
                       )}
                       {homeworkData.submission.status === 'rejected' && (
-                        <span className="bg-red-100 text-red-700 px-4 py-1.5 rounded-lg text-sm font-bold">مرفوض</span>
+                        <span className="badge badge-error">مرفوض</span>
                       )}
                     </div>
 
                     {homeworkData.submission.status === 'rejected' && homeworkData.submission.rejectionReason && (
-                      <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-100 text-sm font-bold">
-                        <span className="text-red-600 block mb-1">سبب الرفض:</span>
-                        {homeworkData.submission.rejectionReason}
+                      <div className="banner banner-error" style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
+                        <strong>سبب الرفض:</strong> {homeworkData.submission.rejectionReason}
                       </div>
                     )}
 
                     {homeworkData.submission.status === 'rejected' && (
-                      <form onSubmit={handleHomeworkSubmit} className="mt-2 bg-gray-50 p-5 rounded-2xl border border-gray-100">
-                        <label className="block font-bold text-gray-700 mb-3">أعد إرسال الحل بعد التصحيح:</label>
-                        <div className="flex flex-col sm:flex-row gap-3 items-center">
-                          <input type="file" id="homework-file" accept="image/*,application/pdf" className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none" required />
-                          <button type="submit" disabled={submittingHomework} className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-70">
-                            <UploadIcon size={18} />
-                            {submittingHomework ? 'جاري الرفع...' : 'إعادة التسليم'}
+                      <form onSubmit={handleHomeworkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
+                        <label className="form-label" style={{ fontWeight: 'bold' }}>أعد رفع ملف الواجب الجديد:</label>
+                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
+                          <input type="file" id="homework-file" accept="image/*,application/pdf" className="input-field" required />
+                          <button type="submit" disabled={submittingHomework} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
+                            <UploadIcon size={16} />
+                            {submittingHomework ? 'جاري الرفع...' : 'إعادة إرسال'}
                           </button>
                         </div>
-                        {homeworkError && <p className="text-red-500 text-sm font-bold mt-2">{homeworkError}</p>}
+                        {homeworkError && <p style={{ color: 'var(--error)', fontSize: '0.85rem', margin: 0 }}>{homeworkError}</p>}
                       </form>
                     )}
                   </div>
                 ) : (
-                  <form onSubmit={handleHomeworkSubmit} className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
-                    <label className="block font-bold text-gray-900 mb-4">أرفق ملف إجابتك (صورة واضحة أو PDF):</label>
-                    <div className="flex flex-col sm:flex-row gap-3 items-center">
-                      <input type="file" id="homework-file" accept="image/*,application/pdf" className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none" required />
-                      <button type="submit" disabled={submittingHomework} className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-70 shadow-lg shadow-indigo-200">
-                        <UploadIcon size={20} />
+                  <form onSubmit={handleHomeworkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
+                    <label className="form-label" style={{ fontWeight: 'bold' }}>قم برفع حل الواجب (صورة أو ملف PDF):</label>
+                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
+                      <input type="file" id="homework-file" accept="image/*,application/pdf" className="input-field" required />
+                      <button type="submit" disabled={submittingHomework} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
+                        <UploadIcon size={16} />
                         {submittingHomework ? 'جاري الرفع...' : 'تسليم الواجب'}
                       </button>
                     </div>
-                    {homeworkError && <p className="text-red-500 text-sm font-bold mt-3">{homeworkError}</p>}
+                    {homeworkError && <p style={{ color: 'var(--error)', fontSize: '0.85rem', margin: 0 }}>{homeworkError}</p>}
                   </form>
                 )}
               </div>
             )}
           </div>
 
-          <aside className="lg:col-span-1">
-            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm sticky top-6">
-              <div className="p-6 border-b border-gray-100 bg-gray-50 rounded-t-3xl">
-                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-4">
-                  <FileTextIcon size={22} className="text-blue-600" />
-                  محتويات المنهج
+          <aside>
+            <div className="card" style={{ position: 'sticky', top: '2rem' }}>
+              <div className="card-header" style={{ border: 'none', padding: 0, marginBottom: '1rem' }}>
+                <h3 style={{
+                  fontSize: '1.125rem',
+                  fontWeight: 700,
+                  color: 'var(--text-primary)',
+                  fontFamily: 'var(--font-display)',
+                  display: 'flex',
+                  alignItems: 'center',
+                  gap: '0.5rem',
+                }}>
+                  <FileTextIcon size={18} />
+                  محتويات الكورس
                 </h3>
-                
-                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
-                  <div className="flex justify-between items-center mb-2">
-                    <span className="text-sm font-bold text-gray-500">نسبة الإنجاز</span>
-                    <span className="text-sm font-black text-green-600">{Math.round(progressPercentage)}%</span>
-                  </div>
-                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
-                    <div className="h-full bg-green-500 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div>
-                  </div>
-                </div>
-              </div>
-
-              <div className="p-4 flex flex-col gap-2 max-h-[60vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
+              </div>
+
+              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                 {courseLectures.length > 0 ? (
                   courseLectures.map((lec, index) => {
                     const isCurrent = lec.id.toString() === lectureId;
@@ -467,45 +675,111 @@
                     return (
                       <button
                         key={lec.id}
-                        onClick={() => { if (!isCurrent) router.push(`/lectures/${lec.id}`); }}
-                        className={`flex items-center gap-4 w-full p-3.5 rounded-2xl transition-all border text-right
-                          ${isCurrent ? 'bg-blue-600 border-blue-600 text-white shadow-md transform scale-[1.02]' : 
-                            isCompleted ? 'bg-green-50 border-green-100 text-gray-700 hover:bg-green-100' : 
-                            'bg-white border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-200'}
-                        `}
+                        onClick={() => {
+                          if (!isCurrent) {
+                             router.push(`/lectures/${lec.id}`);
+                          }
+                        }}
+                        style={{
+                          display: 'flex',
+                          alignItems: 'center',
+                          gap: '0.75rem',
+                          padding: '0.875rem',
+                          background: isCurrent
+                                      ? 'var(--primary)'
+                                      : isCompleted
+                                          ? 'rgba(16, 185, 129, 0.05)'
+                                          : 'var(--background)',
+                          color: isCurrent ? 'white' : 'var(--text-secondary)',
+                          border: isCurrent
+                                  ? 'none'
+                                  : isCompleted
+                                      ? '1px solid rgba(16, 185, 129, 0.3)'
+                                      : '1px solid var(--border)',
+                          borderRadius: 'var(--radius-md)',
+                          cursor: isCurrent ? 'default' : 'pointer',
+                          textAlign: 'start',
+                          transition: 'all 0.2s ease',
+                          width: '100%',
+                        }}
                       >
-                        <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-black text-sm
-                          ${isCurrent ? 'bg-white/20 text-white' : 
-                            isCompleted ? 'bg-green-100 text-green-600' : 
-                            'bg-gray-100 text-gray-400'}
-                        `}>
-                          {isCompleted && !isCurrent ? <CheckIcon size={16} /> : index + 1}
-                        </div>
-                        
-                        <div className="flex-1 min-w-0">
-                          <p className={`text-sm truncate ${isCurrent || isCompleted ? 'font-black' : 'font-bold'}`}>
+                        <span style={{
+                          width: 28,
+                          height: 28,
+                          borderRadius: '50%',
+                          background: isCurrent
+                              ? 'rgba(255,255,255,0.2)'
+                              : isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'var(--border)',
+                          color: isCurrent
+                              ? 'white'
+                              : isCompleted ? 'var(--success)' : 'var(--text-muted)',
+                          display: 'flex',
+                          alignItems: 'center',
+                          justifyContent: 'center',
+                          fontSize: '0.875rem',
+                          fontWeight: 700,
+                          flexShrink: 0,
+                        }}>
+                          {isCompleted && !isCurrent ? <CheckIcon size={14} /> : index + 1}
+                        </span>
+                        <div style={{ flex: 1, minWidth: 0 }}>
+                          <div style={{
+                            fontSize: '0.875rem',
+                            fontWeight: isCurrent || isCompleted ? 700 : 500,
+                            whiteSpace: 'nowrap',
+                            overflow: 'hidden',
+                            textOverflow: 'ellipsis',
+                          }}>
                             {lec.title}
-                          </p>
+                          </div>
                         </div>
                       </button>
                     );
                   })
                 ) : (
-                  <p className="text-gray-400 text-center font-bold py-8">جاري تحميل المحاضرات...</p>
+                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.875rem' }}>
+                    جاري تحميل المحاضرات...
+                  </p>
                 )}
+              </div>
+
+              <div style={{
+                marginTop: '1.5rem',
+                padding: '1rem',
+                backgroundColor: 'var(--background)',
+                borderRadius: 'var(--radius-md)',
+                textAlign: 'center',
+              }}>
+                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
+                 نسبة إنجازك في الكورس
+                </p>
+                <div className="progress-bar" style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
+                  <div className="progress-bar-fill" style={{
+                    width: `${progressPercentage}%`,
+                    background: 'var(--success)',
+                    height: '100%',
+                    transition: 'width 0.3s ease'
+                  }}></div>
+                </div>
+                <p style={{ color: 'var(--success)', fontSize: '0.875rem', marginTop: '0.5rem', fontWeight: 'bold' }}>
+                  {Math.round(progressPercentage)}%
+                </p>
               </div>
             </div>
           </aside>
         </div>
       </div>
 
-      <style jsx global>{`
-        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
-        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
-        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
-        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
-        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
+      <style jsx>{`
+        @media (max-width: 1024px) {
+          div[style*="grid-template-columns"] {
+            grid-template-columns: 1fr !important;
+          }
+          aside > div {
+            position: static !important;
+          }
+        }
       `}</style>
     </div>
   );
-}+}
```

### `app\login\page.tsx`
```diff
--- Current: app\login\page.tsx
+++ Other: app\login\page.tsx
@@ -3,12 +3,14 @@
 import { useState, useEffect } from "react";
 import { useRouter } from "next/navigation";
 import Link from "next/link";
-import Cookies from "js-cookie"; // 🚀 مكتبة التعامل الآمن مع الكوكيز
 import Navbar from '../components/Navbar';
 import { LockIcon, BookIcon } from '../components/Icons';
-import api from "@/lib/axios"; // 🚀 العميل المركزي
-import { useAuthStore } from "@/store/useAuthStore"; // 🚀 الذاكرة المركزية
-import { useSearchParams } from "next/navigation";
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+
+const getToken = () => {
+  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
+};
 
 const EyeIcon = ({ size = 20 }: { size?: number }) => (
   <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
@@ -28,99 +30,97 @@
 
 export default function LoginPage() {
   const router = useRouter();
-  
-  // 🚀 استدعاء الحالة المركزية لمنع الطالب المسجل من رؤية صفحة الدخول
-  const { isAuthenticated, isLoading: authLoading, fetchUser } = useAuthStore();
-
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [showPassword, setShowPassword] = useState(false);
   const [loading, setLoading] = useState(false);
-  const searchParams = useSearchParams();
-  const redirectUrl = searchParams.get('redirect');
 
   const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
-  
   const showToast = (message: string, type: 'success' | 'error') => {
     setToast({ visible: true, message, type });
     setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
   };
 
+  useEffect(() => {
+    const token = getToken();
+    if (token) {
+      router.push("/dashboard");
+    }
+  }, [router]);
+
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setLoading(true);
 
     try {
-        let deviceId = localStorage.getItem("device_id");
-        if (!deviceId) {
-            deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
-            localStorage.setItem("device_id", deviceId);
-        }
-
-        const response: any = await api.post("/auth/login", { 
-          email, 
-          password, 
-          device_id: deviceId
-        });
-
-        // 1. استخراج التوكن بشكل آمن تماماً أياً كانت طريقة تغليف الاستجابة من Laravel
-        // const payload = response.data || response;
-        const token = response.data?.token;
-        const user = response.data?.user;
-
-        if (token) {
-            // 2. السر هنا: إزالة secure مؤقتاً وتحديد المسار (path) لإجبار المتصفح على الحفظ
-            Cookies.set('token', token, {
-              expires: 30, 
-              path: '/',
-              secure: process.env.NODE_ENV === 'production', // يعمل Secure في الإنتاج فقط
-              sameSite: 'lax' 
-            });
-            
-            await fetchUser();
-            showToast("تم تسجيل الدخول بنجاح! جاري التوجيه...", "success");
-            
-            setTimeout(() => {
-              const status = user?.status;
-              const isAdmin = user?.role === 'admin';
-              
-              if (isAdmin) {
-                  router.push("/admin");
-                } else if (status === 'pending') {
-                  router.push("/waiting-room");
-                } else if (status === 'rejected') {
-                  if (user?.rejection_reason) {
-                    localStorage.setItem('rejection_reason', user.rejection_reason);
-                  }
-                  router.push("/resubmit");
-                } else {
-                  router.push(redirectUrl ? redirectUrl : "/dashboard");
-                }
-            }, 500);
-        }
-
-    } catch (err: any) {
-        const errorCode = err?.code;
-        const errorMessage = err?.message || "فشل تسجيل الدخول. تأكد من صحة البريد أو كلمة المرور.";
-
-        if (errorCode === 'ERR_ACCOUNT_PENDING') {
-            router.push("/waiting-room");
-        } else if (errorCode === 'ERR_ACCOUNT_REJECTED') {
-            if (err?.data?.rejection_reason) {
-                localStorage.setItem('rejection_reason', err.data.rejection_reason);
-            }
-            router.push("/resubmit");
-        } else {
-            showToast(errorMessage, "error");
-        }
+      let deviceId = localStorage.getItem("device_id");
+      if (!deviceId) {
+        deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
+        localStorage.setItem("device_id", deviceId);
+      }
+
+      const response = await fetch(`${API_URL}/api/auth/login`, {
+        method: "POST",
+        headers: { 
+          "Content-Type": "application/json",
+          "Accept": "application/json"
+        },
+        body: JSON.stringify({ email, password, device_id: deviceId }),
+      });
+
+      const data = await response.json();
+
+      if (!response.ok) {
+        if (data.code === 'ERR_ACCOUNT_PENDING') {
+          router.push("/waiting-room");
+          return;
+        }
+        if (data.code === 'ERR_ACCOUNT_REJECTED') {
+          router.push("/resubmit");
+          return;
+        }
+        if (data.error === 'account_blocked' || data.error === 'limit_reached') {
+          throw new Error(data.message || data.error);
+        }
+        throw new Error(data.message || data.error || "فشل تسجيل الدخول. تأكد من صحة البريد أو كلمة المرور.");
+      }
+
+      if (data.data?.token) {
+        const token = data.data.token;
+        localStorage.setItem("token", token);
+        
+        const expiryDate = new Date();
+        expiryDate.setDate(expiryDate.getDate() + 30);
+        document.cookie = `token=${token}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax`;
+        
+        showToast("تم تسجيل الدخول بنجاح! جاري التوجيه...", "success");
+        await new Promise(resolve => setTimeout(resolve, 500));
+      }
+
+      const user = data.data?.user;
+      const status = user?.status;
+      const isAdmin = user?.isAdmin || user?.is_admin;
+      
+      if (isAdmin) {
+        router.push("/admin");
+      } else if (status === 'pending') {
+        router.push("/waiting-room");
+      } else if (status === 'rejected') {
+        if(user?.rejectionReason) {
+          localStorage.setItem('rejection_reason', user.rejectionReason);
+        }
+        router.push("/resubmit");
+      } else {
+        router.push("/dashboard"); 
+      }
+
+    } catch (err: unknown) {
+      const message = err instanceof Error ? err.message : "فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.";
+      showToast(message, "error");
     } finally {
-        setLoading(false);
+      setLoading(false);
     }
   };
-
-  if (authLoading || isAuthenticated) {
-    return <div className="min-h-screen bg-[var(--background)] flex items-center justify-center"><div className="spinner spinner-lg"></div></div>;
-  }
 
   return (
     <>
@@ -216,7 +216,6 @@
         </div>
 
         <style jsx>{`
-          /* كافة أكواد الـ CSS الخاصة بك محفوظة كما هي لضمان عدم كسر التصميم */
           .icon-circle {
             width: 64px;
             height: 64px;
@@ -293,4 +292,4 @@
       </div>
     </>
   );
-}+}
```

### `app\otp\page.tsx`
```diff
--- Current: app\otp\page.tsx
+++ Other: app\otp\page.tsx
@@ -1,128 +1,73 @@
-// app/otp/page.tsx (أو المسار الخاص بك)
 "use client";
 
 import { useState, useEffect, useRef, Suspense } from "react";
 import { useRouter, useSearchParams } from "next/navigation";
 import Link from "next/link";
-import Cookies from "js-cookie";
-import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
-import { auth } from "@/lib/firebase"; // استدعاء فايربيز الذي أنشأناه
 import Navbar from '../components/Navbar';
 import { PhoneIcon, CheckCircleIcon, XIcon } from '../components/Icons';
-import api from "@/lib/axios";
-import { useAuthStore } from "@/store/useAuthStore";
-import type { VerifyOtpResponse } from "@/types/models";
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+
+const getToken = () => {
+  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
+};
 
 function OTPContent() {
   const router = useRouter();
   const searchParams = useSearchParams();
   const tempUserId = searchParams.get("tempUserId");
 
-  const { isAuthenticated, fetchUser } = useAuthStore();
+  useEffect(() => {
+    const token = getToken();
+    if (token) {
+      router.push('/dashboard');
+    }
+  }, [router]);
 
   const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
   const [countdown, setCountdown] = useState(60);
   const [canResend, setCanResend] = useState(false);
   const [loading, setLoading] = useState(false);
-  const initialized = useRef(false);
-  
-  // 🚀 حالة جديدة لحفظ مرجع فايربيز بعد إرسال الرسالة
-  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
+  const [devOtp, setDevOtp] = useState<string | null>(null);
   const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
 
   const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
-  
   const showToast = (message: string, type: 'success' | 'error') => {
     setToast({ visible: true, message, type });
     setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
   };
 
   useEffect(() => {
-    if (isAuthenticated || Cookies.get('token')) {
-      router.replace('/dashboard');
-    }
-  }, [isAuthenticated, router]);
-
-  // ==========================================
-  // 🚀 المحرك 1: تهيئة الكابتشا وإرسال الرسالة
-  // ==========================================
-  const setupRecaptchaAndSendOTP = async () => {
-    const phone = sessionStorage.getItem('pending_phone');
-    
-    if (!phone) {
-      showToast("رقم الهاتف مفقود، يرجى التسجيل من جديد", "error");
-      setTimeout(() => router.push('/register'), 2000);
+    if (!tempUserId) {
+      showToast("رابط التحقق غير صالح", "error");
       return;
     }
 
-    try {
-      setLoading(true);
-
-      // تنظيف الكابتشا القديمة إن وجدت (لمنع مشاكل إعادة الإرسال)
-      if (!window.recaptchaVerifier) {
-        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
-          size: 'invisible', // مخفي لكي لا يزعج الطالب
-          callback: () => { console.log("reCAPTCHA solved"); }
-        });
-      }
-
-      // تحويل الرقم للصيغة الدولية التي تفهمها جوجل (مهم جداً)
-      const formattedPhone = phone.startsWith('0') ? `+2${phone}` : phone;
-
-      // إطلاق أمر الإرسال من خوادم جوجل
-      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
-      
-      setConfirmationResult(confirmation);
-      showToast("تم إرسال كود التحقق إلى هاتفك", "success");
-      
-      // بدء العداد
-      setCountdown(60);
-      setCanResend(false);
-
-    } catch (error: any) {
-      console.error("Firebase Error:", error);
-      showToast("فشل إرسال الرسالة، يرجى المحاولة لاحقاً", "error");
-      
-      // إعادة ضبط الكابتشا في حالة الفشل
-      if (window.recaptchaVerifier && document.getElementById('recaptcha-container')) {
-        try {
-          window.recaptchaVerifier.render().then((widgetId: any) => {
-            grecaptcha.reset(widgetId);
-          });
-        } catch (e) {
-          console.warn("Recaptcha reset skipped");
-        }
-      }
-    } finally {
-      setLoading(false);
-    }
-  };
-
-  // إرسال الرسالة فور دخول الطالب للصفحة
+    const storedDevOtp = sessionStorage.getItem('dev_otp');
+    if (storedDevOtp) {
+      setDevOtp(storedDevOtp);
+    }
+  }, [tempUserId]);
+
   useEffect(() => {
-    // التأكد من وجود الـ ID وأن الكود لم يعمل من قبل
-    if (tempUserId && !initialized.current) {
-      initialized.current = true; // نغلق الباب فوراً لمنع التكرار
-      setupRecaptchaAndSendOTP();
-    }
-  }, [tempUserId]);
-
-  // إدارة عداد الوقت
-  useEffect(() => {
-    if (countdown > 0 && !canResend) {
+    if (countdown > 0) {
       const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
       return () => clearTimeout(timer);
-    } else if (countdown === 0) {
+    } else {
       setCanResend(true);
     }
-  }, [countdown, canResend]);
+  }, [countdown]);
 
   const handleChange = (index: number, value: string) => {
     if (!/^\d*$/.test(value)) return;
+
     const newOtp = [...otp];
     newOtp[index] = value.slice(-1);
     setOtp(newOtp);
-    if (value && index < 5) inputRefs.current[index + 1]?.focus();
+
+    if (value && index < 5) {
+      inputRefs.current[index + 1]?.focus();
+    }
   };
 
   const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
@@ -135,82 +80,92 @@
     e.preventDefault();
     const pastedData = e.clipboardData.getData("text").slice(0, 6);
     if (!/^\d+$/.test(pastedData)) return;
+
     const newOtp = pastedData.split("").concat(Array(6).fill("")).slice(0, 6);
     setOtp(newOtp);
     inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
   };
 
-  // ==========================================
-  // 🚀 المحرك 2: التحقق من الكود وإصدار التوكن
-  // ==========================================
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     const otpCode = otp.join("");
-    
-    if (otpCode.length !== 6 || !tempUserId || !confirmationResult) {
+    if (otpCode.length !== 6) {
       showToast("يرجى إدخال الكود كاملاً", "error");
       return;
     }
+    if (!tempUserId) {
+      showToast("رابط التحقق غير صالح", "error");
+      return;
+    }
 
     setLoading(true);
 
     try {
-      // 1. إرسال الكود لجوجل للتأكد منه
-      const result = await confirmationResult.confirm(otpCode);
-      
-      // 2. إذا نجح، نستخرج التوكن السري العالي التشفير
-      const firebaseToken = await result.user.getIdToken();
-
-      // 3. إرسال التوكن للباك إند الخاص بك (Laravel) ليفحصه ويفعل الحساب
-      // The axios response interceptor unwraps the ApiResponse envelope, so the
-      // result already contains { token, user } at the top level. We still
-      // type-cast the response because the TypeScript signature of
-      // axios.post<T>(...) returns Promise<AxiosResponse<T>>, and TS does not
-      // narrow the return type through the response interceptor declaration.
-      const response = (await api.post<VerifyOtpResponse>('/auth/verify-otp', {
-        temp_user_id: tempUserId,
-        firebase_token: firebaseToken,
-      })) as unknown as VerifyOtpResponse;
-
-      if (response?.token) {
-        const backendToken = response.token;
-        const user = response.user;
-
-        Cookies.set('token', backendToken, { 
-          expires: 30, 
-          path: '/',
-          secure: process.env.NODE_ENV === 'production',
-          sameSite: 'lax' 
-        });
-        await fetchUser();
-        
-        // تنظيف البيانات المؤقتة
-        sessionStorage.removeItem('pending_phone');
-        
-        showToast("تم التحقق بنجاح! جاري توجيهك...", "success");
-
-        setTimeout(() => {
-            if (user?.status === 'pending') {
-              router.replace("/waiting-room");
-            } else {
-              router.replace("/dashboard");
-            }
-        }, 500);
+      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
+        method: "POST",
+        headers: {
+          "Content-Type": "application/json",
+          "Accept": "application/json"
+        },
+        body: JSON.stringify({ temp_user_id: tempUserId, otp: otpCode }),
+      });
+
+      const data = await response.json();
+
+      if (!response.ok) {
+        throw new Error(data.error || data.message || "فشل التحقق من الكود");
       }
 
-    } catch (err: any) {
-      console.error(err);
-      console.log("Laravel Validation Errors:", err.errors || err);
-      // معالجة أخطاء فايربيز (كود خاطئ) أو أخطاء الباك إند
-      const message = err.code === 'auth/invalid-verification-code' 
-        ? "الكود الذي أدخلته غير صحيح." 
-        : err.code === 'auth/code-expired'
-        ? "انتهت صلاحية الكود، يرجى طلب كود جديد."
-        : err?.message || "حدث خطأ أثناء التحقق.";
-        
+      if (data.data?.token) {
+        localStorage.setItem("token", data.data.token);
+        document.cookie = `token=${data.data.token}; path=/; max-age=2592000`;
+        sessionStorage.removeItem('dev_otp');
+      }
+
+      showToast("تم التحقق بنجاح!", "success");
+      router.push("/waiting-room");
+    } catch (err: unknown) {
+      const message = err instanceof Error ? err.message : "فشل التحقق من الكود";
       showToast(message, "error");
       setOtp(["", "", "", "", "", ""]);
       inputRefs.current[0]?.focus();
+    } finally {
+      setLoading(false);
+    }
+  };
+
+  const handleResend = async () => {
+    if (!tempUserId || !canResend) return;
+
+    setLoading(true);
+    try {
+      const response = await fetch(`${API_URL}/api/auth/resend-otp`, {
+        method: "POST",
+        headers: {
+          "Content-Type": "application/json",
+          "Accept": "application/json"
+        },
+        body: JSON.stringify({ temp_user_id: tempUserId }),
+      });
+
+      const data = await response.json();
+
+      if (!response.ok) {
+        throw new Error(data.error || data.message || "فشل إرسال الكود الجديد");
+      }
+
+      if (data.data?.dev_otp) {
+        setDevOtp(data.data.dev_otp);
+        sessionStorage.setItem('dev_otp', data.data.dev_otp);
+        console.log('Development OTP Code (Resent):', data.data.dev_otp);
+      }
+
+      showToast("تم إرسال كود جديد إلى هاتفك بنجاح", "success");
+      setCountdown(60);
+      setCanResend(false);
+    } catch (err: unknown) {
+      const message = err instanceof Error ? err.message : "فشل إرسال الكود الجديد";
+      showToast(message, "error");
     } finally {
       setLoading(false);
     }
@@ -229,30 +184,49 @@
 
       <div className="split-layout">
         <div className="split-branding">
-           {/* ... نفس تصميمك السابق للـ Branding ... */}
+          <div className="branding-content">
+            <Link href="/" className="branding-logo">
+              <span className="logo-icon" style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: '800' }}>M</span>
+              <span className="logo-text">
+                Minassati<span>.</span>
+              </span>
+            </Link>
+            <h1 className="branding-title">منصاتي</h1>
+            <p className="branding-subtitle">منصتك التعليمية الذكية</p>
+          </div>
         </div>
 
         <div className="split-form">
           <div className="split-card">
             <div className="split-card-header">
               <div className="icon-circle">
-                <PhoneIcon size={28} />
+                <PhoneIcon size={24} />
               </div>
-              <h2 className="split-card-title">تأكيد رقم الهاتف</h2>
+              <h2 className="split-card-title">تحقق من رقم الهاتف</h2>
               <p className="split-card-subtitle">
                 أدخل الكود المكون من 6 أرقام المرسل إلى هاتفك
               </p>
             </div>
 
             <form onSubmit={handleSubmit} className="split-card-form">
-              {/* 🚀 حاوية الكابتشا المخفية (ضرورية لعمل فايربيز) */}
-              <div id="recaptcha-container"></div>
+
+              {devOtp && (
+                <div className="dev-otp-banner">
+                  <div className="dev-otp-header">
+                    <span>Development Mode</span>
+                  </div>
+                  <div className="dev-otp-code">{devOtp}</div>
+                  <div className="dev-otp-note">This is only visible in development mode</div>
+                </div>
+              )}
 
               <div className="otp-inputs" onPaste={handlePaste} dir="ltr">
                 {otp.map((digit, index) => (
                   <input
                     key={index}
-                    ref={(el) => { if (el) inputRefs.current[index] = el; }}
+                    ref={(el) => {
+                      if (el) inputRefs.current[index] = el;
+                    }}
                     type="text"
                     inputMode="numeric"
                     maxLength={1}
@@ -268,57 +242,40 @@
               <button
                 type="submit"
                 disabled={loading || otp.join("").length !== 6}
-                className="btn btn-primary btn-block btn-lg mt-6"
+                className="btn btn-primary btn-block"
               >
-                {loading ? <span className="spinner spinner-white"></span> : "تأكيد الحساب"}
+                {loading ? <span className="spinner spinner-white"></span> : "تحقق من الكود"}
               </button>
             </form>
 
             <div className="otp-resend">
               {canResend ? (
-                <button type="button" onClick={setupRecaptchaAndSendOTP} disabled={loading} className="resend-link">
+                <button
+                  type="button"
+                  onClick={handleResend}
+                  disabled={loading}
+                  className="resend-link"
+                >
                   إرسال كود جديد
                 </button>
               ) : (
                 <p className="resend-text">
-                  يمكنك إعادة إرسال الكود خلال <span className="countdown" dir="ltr">{countdown}</span> ثانية
+                  يمكنك إعادة إرسال الكود خلال{" "}
+                  <span className="countdown" dir="ltr">{countdown}</span>
+                  {" "}ثانية
                 </p>
               )}
             </div>
 
+            <div className="text-center mt-6">
+              <Link href="/register" className="back-link" style={{ fontSize: '0.875rem' }}>
+                → العودة لصفحة التسجيل
+              </Link>
+            </div>
           </div>
         </div>
+
         <style jsx>{`
-          .split-layout {
-            display: flex;
-            min-height: 100vh;
-            background-color: var(--background);
-          }
-          .split-branding {
-            flex: 1;
-            background: var(--gradient-primary);
-            display: flex;
-            align-items: center;
-            justify-content: center;
-            padding: 2rem;
-          }
-          .split-form {
-            flex: 1;
-            display: flex;
-            align-items: center;
-            justify-content: center;
-            padding: 2rem;
-            background-color: var(--background);
-          }
-          .split-card {
-            width: 100%;
-            max-width: 420px;
-            background: var(--surface);
-            padding: 2.5rem;
-            border-radius: 1.5rem;
-            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
-            border: 1px solid rgba(255, 255, 255, 0.05);
-          }
           .icon-circle {
             width: 64px;
             height: 64px;
@@ -333,7 +290,7 @@
           }
           .split-card-header {
             text-align: center;
-            margin-bottom: 2rem;
+            margin-bottom: 1.5rem;
           }
           .split-card-title {
             font-family: var(--font-display);
@@ -347,72 +304,118 @@
             font-size: 0.9375rem;
             color: var(--text-secondary);
           }
-          
-          /* 🚀 أكواد الـ OTP السحرية */
+          .split-card-form {
+            display: flex;
+            flex-direction: column;
+            gap: 1.25rem;
+          }
+          .dev-otp-banner {
+            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
+            border: 2px solid #f59e0b;
+            border-radius: 1rem;
+            padding: 1.25rem;
+            text-align: center;
+          }
+          .dev-otp-header {
+            display: flex;
+            align-items: center;
+            justify-content: center;
+            gap: 0.5rem;
+            font-size: 0.875rem;
+            color: #92400e;
+            font-weight: 700;
+            margin-bottom: 0.75rem;
+          }
+          .dev-otp-code {
+            font-size: 2.5rem;
+            font-weight: 900;
+            color: var(--primary);
+            letter-spacing: 0.5rem;
+            font-family: monospace;
+          }
+          .dev-otp-note {
+            font-size: 0.75rem;
+            color: #92400e;
+            margin-top: 0.5rem;
+          }
           .otp-inputs {
             display: flex;
             justify-content: center;
             gap: 0.75rem;
-            margin-bottom: 1.5rem;
-            direction: ltr; /* ضروري جداً لكي تبدأ الأرقام من اليسار لليمين */
           }
           .otp-input {
-            width: 3.5rem;
-            height: 4rem;
+            width: 55px;
+            height: 65px;
             text-align: center;
-            font-size: 1.5rem;
+            font-size: 1.75rem;
             font-weight: 800;
-            border-radius: 0.75rem;
-            border: 2px solid rgba(255, 255, 255, 0.1);
-            background: rgba(255, 255, 255, 0.03);
+            font-family: var(--font-display);
+            border: 2px solid var(--border);
+            border-radius: 1rem;
+            background: var(--surface);
             color: var(--text-primary);
-            transition: all 0.3s ease;
+            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
           }
           .otp-input:focus {
             outline: none;
-            border-color: var(--primary);
-            box-shadow: 0 0 0 4px rgba(11, 79, 108, 0.2);
-            background: rgba(11, 79, 108, 0.05);
-            transform: translateY(-2px);
-          }
-          .otp-input:disabled {
+            border-color: var(--accent);
+            box-shadow: 0 0 0 4px rgba(27, 189, 212, 0.15);
+            transform: scale(1.05);
+          }
+          .otp-resend {
+            text-align: center;
+            margin-top: 1.5rem;
+          }
+          .resend-text {
+            color: var(--text-secondary);
+            font-size: 0.9375rem;
+          }
+          .countdown {
+            display: inline-flex;
+            align-items: center;
+            justify-content: center;
+            min-width: 2rem;
+            background: var(--primary);
+            color: white;
+            border-radius: 0.5rem;
+            font-weight: 700;
+            padding: 0.25rem 0.5rem;
+            font-family: monospace;
+            font-size: 1rem;
+          }
+          .resend-link {
+            background: none;
+            border: none;
+            color: var(--primary);
+            font-size: 1rem;
+            font-weight: 700;
+            cursor: pointer;
+            padding: 0.5rem 1rem;
+            border-radius: 0.5rem;
+            transition: all 0.3s;
+          }
+          .resend-link:hover {
+            background: rgba(11, 79, 108, 0.1);
+            transform: scale(1.05);
+          }
+          .resend-link:disabled {
             opacity: 0.5;
             cursor: not-allowed;
           }
-
-          .otp-resend { text-align: center; margin-top: 2rem; }
-          .resend-text { color: var(--text-secondary); font-size: 0.9375rem; }
-          .countdown { 
-            display: inline-flex; 
-            align-items: center; 
-            justify-content: center; 
-            min-width: 2.5rem; 
-            background: rgba(11, 79, 108, 0.15); 
-            color: var(--primary-light, #1bb0ce); 
-            border-radius: 0.5rem; 
-            font-weight: 800; 
-            padding: 0.25rem 0.5rem; 
-            font-family: monospace; 
-            font-size: 1rem; 
-            margin: 0 0.25rem; 
-          }
-          .resend-link { 
-            background: none; 
-            border: none; 
-            color: var(--primary-light, #1bb0ce); 
-            font-size: 1rem; 
-            font-weight: 700; 
-            cursor: pointer; 
-            padding: 0.5rem 1rem; 
-            border-radius: 0.5rem; 
-            transition: all 0.3s; 
-          }
-          .resend-link:hover { background: rgba(11, 79, 108, 0.1); }
-          .resend-link:disabled { opacity: 0.5; cursor: not-allowed; }
-
+          .btn-block {
+            width: 100%;
+            padding: 1rem;
+            font-size: 1.1rem;
+          }
           @media (max-width: 768px) {
-            .split-branding { display: none; }
-            .otp-input { width: 2.75rem; height: 3.25rem; font-size: 1.25rem; gap: 0.5rem; }
+            .split-branding {
+              display: none;
+            }
+            .otp-input {
+              width: 45px;
+              height: 55px;
+              font-size: 1.5rem;
+            }
           }
         `}</style>
       </div>
@@ -420,17 +423,14 @@
   );
 }
 
-// Global Declaration for reCAPTCHA
-declare global {
-  interface Window {
-    recaptchaVerifier: any;
-  }
-}
-
 export default function OTPPage() {
   return (
-    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="spinner spinner-lg"></div></div>}>
+    <Suspense fallback={
+      <div className="min-h-screen flex items-center justify-center bg-background">
+        <div className="spinner spinner-lg"></div>
+      </div>
+    }>
       <OTPContent />
     </Suspense>
   );
-}+}
```

### `app\register\page.tsx`
```diff
--- Current: app\register\page.tsx
+++ Other: app\register\page.tsx
@@ -3,10 +3,7 @@
 import { useState, useEffect } from 'react';
 import { useRouter } from 'next/navigation';
 import Link from 'next/link';
-import Cookies from 'js-cookie';
 import Navbar from '../components/Navbar';
-import api from '@/lib/axios'; // 🚀 عميل الشبكة المركزي
-import { useAuthStore } from '@/store/useAuthStore'; // 🚀 محرك الحالة
 import {
   BookIcon,
   UserIcon,
@@ -16,6 +13,12 @@
   ArrowRightIcon,
   AlertCircleIcon,
 } from '../components/Icons';
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+
+const getToken = () => {
+  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
+};
 
 interface FormData {
   full_name: string;
@@ -46,24 +49,17 @@
 
 export default function RegisterPage() {
   const router = useRouter();
-  const { isAuthenticated } = useAuthStore();
-  
-  // 🚀 التوجيه الذكي: منع المسجلين من رؤية صفحة التسجيل
+
   useEffect(() => {
-    if (isAuthenticated || Cookies.get('token')) {
-      router.replace('/dashboard');
-    }
-  }, [isAuthenticated, router]);
-  
+    const token = getToken();
+    if (token) {
+      router.push('/dashboard');
+    }
+  }, [router]);
+
   const [step, setStep] = useState(1);
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState('');
-  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
-
-  const showToast = (message: string, type: 'success' | 'error') => {
-    setToast({ visible: true, message, type });
-    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
-  };
 
   const [formData, setFormData] = useState<FormData>({
     full_name: '',
@@ -79,7 +75,6 @@
     confirmPassword: '',
     id_image: null,
   });
-  
   const [errors, setErrors] = useState<FormErrors>({});
   const [imagePreview, setImagePreview] = useState<string | null>(null);
 
@@ -194,47 +189,30 @@
         formDataToSend.append('id_image', formData.id_image);
       }
 
-      const response: any = await api.post('/auth/register', formDataToSend, {
-        headers: {
-          'Content-Type': 'multipart/form-data',
-        },
+      const response = await fetch(`${API_URL}/api/auth/register`, {
+        method: 'POST',
+        headers: { Accept: 'application/json' },
+        body: formDataToSend,
       });
 
-      // 🚀 استخراج ذكي جداً يبحث في كل الطبقات المحتملة للاستجابة
-      const tempId = response?.data?.data?.tempUserId || response?.data?.tempUserId || response?.tempUserId || response?.data?.temp_user_id;
-
-      if (tempId) {
-        // 1. تخزين الرقم لاستخدامه في صفحة الـ OTP لإرسال الرسالة
-        sessionStorage.setItem('pending_phone', `+2${formData.phone}`);
-          
-        showToast("تم التسجيل مبدئياً بنجاح، جاري التوجيه للتحقق...", "success");
-        
-        // توجيه الطالب بعد 1.5 ثانية لكي يرى رسالة النجاح
-        setTimeout(() => {
-            router.push(`/otp?tempUserId=${tempId}`);
-        }, 1500);
-      } else {
-        // 🚀 إضافة هذا الشرط لمنع الفشل الصامت مجدداً
-        console.error("استجابة السيرفر:", response);
-        setError("تم إنشاء الحساب لكن السيرفر لم يُرجع كود التحقق. يرجى تسجيل الدخول.");
+      const data = await response.json();
+
+      if (!response.ok) {
+        throw new Error(data.error || data.message || 'حدث خطأ أثناء التسجيل، تأكد من صحة البيانات');
       }
 
-    } catch (err: any) {
-      if (err.errors) {
-        const serverErrors: FormErrors = {};
-        Object.keys(err.errors).forEach(key => {
-          serverErrors[key] = err.errors[key][0];
-        });
-        
-        setErrors(serverErrors);
-        setError('يرجى مراجعة الحقول باللون الأحمر وتصحيحها');
-
-        if (serverErrors.full_name || serverErrors.email || serverErrors.password) {
-          setStep(1);
-        }
-      } else {
-        setError(err.message || 'حدث خطأ غير متوقع أثناء التسجيل');
+      const result = data.data || data;
+
+      if (result.dev_otp) {
+        sessionStorage.setItem('dev_otp', result.dev_otp);
+        console.log('Development OTP Code:', result.dev_otp);
       }
+
+      const tempId = result.temp_user_id || result.tempUserId;
+      router.push(`/otp?tempUserId=${encodeURIComponent(tempId)}`);
+
+    } catch (err) {
+      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
     } finally {
       setIsLoading(false);
     }
@@ -246,18 +224,9 @@
 
       {error && (
         <div className="toast-container show">
-          <div className="toast-content error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
+          <div className="toast-content error">
             <AlertCircleIcon size={18} />
             <span>{error}</span>
-          </div>
-        </div>
-      )}
-
-      {toast.visible && (
-        <div className="toast-container show">
-          <div className={`toast-content ${toast.type}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
-            <CheckIcon size={18} />
-            <span>{toast.message}</span>
           </div>
         </div>
       )}
@@ -515,22 +484,95 @@
       </div>
 
       <style jsx>{`
-        /* ... جميع تأثيراتك وتصميمك الجميل محتفظ به كما هو دون أي حذف ... */
-        .icon-circle { width: 64px; height: 64px; border-radius: 1rem; background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; color: white; box-shadow: 0 10px 15px -3px rgba(11, 79, 108, 0.3); }
-        .split-card-header { text-align: center; margin-bottom: 2rem; }
-        .split-card-title { font-family: var(--font-display); font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.5rem; }
-        .split-card-subtitle { font-family: var(--font-body); font-size: 0.9375rem; color: var(--text-secondary); }
-        .split-card-form { display: flex; flex-direction: column; gap: 1.25rem; }
-        .split-card-footer { text-align: center; margin-top: 1.5rem; color: var(--text-secondary); font-size: 0.9375rem; display: flex; align-items: center; justify-content: center; gap: 0.375rem; }
-        .link-primary { color: var(--primary); text-decoration: none; font-weight: 700; transition: color 0.3s; display: inline-block; }
-        .link-primary:hover { color: var(--primary-dark); }
-        .btn-submit { flex: 2; }
-        .preview-thumb { width: 48px; height: 48px; object-fit: cover; border-radius: var(--radius-sm); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12); }
-        .file-name { color: var(--primary); font-weight: 700; font-size: 0.875rem; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
-        .upload-icon { color: var(--text-muted); }
-        .upload-text { font-weight: 700; font-size: 0.875rem; color: var(--text-primary); }
-        .upload-hint { font-size: 0.75rem; color: var(--text-muted); }
-        @media (max-width: 768px) { .split-branding { display: none; } }
+        .icon-circle {
+          width: 64px;
+          height: 64px;
+          border-radius: 1rem;
+          background: var(--gradient-primary);
+          display: flex;
+          align-items: center;
+          justify-content: center;
+          margin: 0 auto 1rem;
+          color: white;
+          box-shadow: 0 10px 15px -3px rgba(11, 79, 108, 0.3);
+        }
+        .split-card-header {
+          text-align: center;
+          margin-bottom: 2rem;
+        }
+        .split-card-title {
+          font-family: var(--font-display);
+          font-size: 1.75rem;
+          font-weight: 800;
+          color: var(--text-primary);
+          margin-bottom: 0.5rem;
+        }
+        .split-card-subtitle {
+          font-family: var(--font-body);
+          font-size: 0.9375rem;
+          color: var(--text-secondary);
+        }
+        .split-card-form {
+          display: flex;
+          flex-direction: column;
+          gap: 1.25rem;
+        }
+        .split-card-footer {
+          text-align: center;
+          margin-top: 1.5rem;
+          color: var(--text-secondary);
+          font-size: 0.9375rem;
+          display: flex;
+          align-items: center;
+          justify-content: center;
+          gap: 0.375rem;
+        }
+        .link-primary {
+          color: var(--primary);
+          text-decoration: none;
+          font-weight: 700;
+          transition: color 0.3s;
+          display: inline-block;
+        }
+        .link-primary:hover {
+          color: var(--primary-dark);
+        }
+        .btn-submit {
+          flex: 2;
+        }
+        .preview-thumb {
+          width: 48px;
+          height: 48px;
+          object-fit: cover;
+          border-radius: var(--radius-sm);
+          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
+        }
+        .file-name {
+          color: var(--primary);
+          font-weight: 700;
+          font-size: 0.875rem;
+          max-width: 150px;
+          overflow: hidden;
+          text-overflow: ellipsis;
+          white-space: nowrap;
+        }
+        .upload-icon {
+          color: var(--text-muted);
+        }
+        .upload-text {
+          font-weight: 700;
+          font-size: 0.875rem;
+          color: var(--text-primary);
+        }
+        .upload-hint {
+          font-size: 0.75rem;
+          color: var(--text-muted);
+        }
+        @media (max-width: 768px) {
+          .split-branding {
+            display: none;
+          }
+        }
       `}</style>
     </>
   );
```

### `app\resubmit\page.tsx`
```diff
--- Current: app\resubmit\page.tsx
+++ Other: app\resubmit\page.tsx
@@ -4,15 +4,16 @@
 import { useRouter } from "next/navigation";
 import Navbar from "../components/Navbar";
 import { XIcon, FileTextIcon, ImageIcon, AlertTriangleIcon } from "../components/Icons";
-import api from "@/lib/axios"; // 🚀 عميل الشبكة المركزي
-import { useAuthStore } from "@/store/useAuthStore"; // 🚀 العقل المدبر
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+
+const getToken = () => {
+  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
+};
 
 export default function ResubmitPage() {
   const router = useRouter();
-  
-  // 🚀 جلب البيانات ودالة تسجيل الخروج وتحديث الحالة من Zustand
-  const { user, isAuthenticated, isLoading, logout, fetchUser } = useAuthStore();
-  
+  const [loading, setLoading] = useState(true);
   const [processing, setProcessing] = useState(false);
   const [reason, setReason] = useState<string>('');
   const [image, setImage] = useState<File | null>(null);
@@ -24,21 +25,17 @@
     setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
   };
 
-  // 🚀 حارس البوابة الذكي: التحقق من حالة الطالب
   useEffect(() => {
-    if (!isLoading) {
-      if (!isAuthenticated) {
-        router.replace("/login");
-      } else if (user?.status !== 'rejected') {
-        // إذا كان حسابه معلقاً (pending) أو مفعلاً (active)، يتم طرده من هذه الصفحة
-        router.replace("/dashboard");
-      } else {
-        // جلب سبب الرفض من بيانات المستخدم (إن وُجدت) أو من التخزين المحلي كاحتياطي
-        const storedReason = user?.rejectionReason || localStorage.getItem('rejection_reason');
-        if (storedReason) setReason(storedReason);
-      }
-    }
-  }, [isLoading, isAuthenticated, user, router]);
+    const token = getToken();
+    if (!token) {
+      router.push("/login");
+      return;
+    }
+    const storedReason = localStorage.getItem('rejection_reason');
+    if (storedReason) setReason(storedReason);
+
+    setLoading(false);
+  }, [router]);
 
   const handleResubmit = async () => {
     if (!image) {
@@ -47,56 +44,61 @@
     }
 
     setProcessing(true);
+    const token = getToken();
 
     try {
       const formData = new FormData();
       formData.append('id_image', image);
 
-      // 🚀 إرسال الطلب عبر Axios (يتكفل بالتوكن والـ Headers تلقائياً)
-      await api.post('/auth/resubmit-documents', formData);
-
-      // تنظيف السبب من التخزين المحلي بعد النجاح
-      localStorage.removeItem('rejection_reason');
-      
-      // 🚀 تحديث حالة المستخدم في الذاكرة لتتحول من rejected إلى pending
-      await fetchUser(); 
-
-      showToast("تم إرسال الصورة بنجاح! جاري تحويلك...", "success");
-      
-      setTimeout(() => {
-          router.replace("/waiting-room");
-      }, 1500);
-
-    } catch (e: any) {
-      // اصطياد الأخطاء من الباك إند بذكاء
+      const response = await fetch(`${API_URL}/api/auth/resubmit-documents`, {
+        method: 'POST',
+        headers: { Authorization: `Bearer ${token}` },
+        body: formData,
+      });
+
+      if (response.ok) {
+        localStorage.removeItem('rejection_reason');
+        showToast("تم إرسال الصورة بنجاح! جاري تحويلك...", "success");
+        setTimeout(() => {
+            router.push("/waiting-room");
+        }, 1500);
+      } else {
+        const errorData = await response.json();
+        showToast(errorData.message || "حدث خطأ أثناء رفع الصورة", "error");
+        setProcessing(false);
+      }
+    } catch (e) {
       console.error("Resubmit failed", e);
-      showToast(e?.message || e?.error || "حدث خطأ أثناء رفع الصورة", "error");
-    } finally {
+      showToast("خطأ في الاتصال بالخادم", "error");
       setProcessing(false);
     }
   };
 
   const handleLogout = async () => {
+    const token = getToken();
+    if (token) {
+      try {
+        await fetch(`${API_URL}/api/auth/logout`, {
+          method: 'POST',
+          headers: { Authorization: `Bearer ${token}` }
+        });
+      } catch (e) {}
+    }
+    localStorage.removeItem("token");
     localStorage.removeItem("rejection_reason");
-    await logout(); // 🚀 استخدام الدالة المركزية لضمان تنظيف كل شيء
+    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
     router.push("/login");
   };
 
-  // عرض شاشة التحميل أثناء فحص الحالة
-  if (isLoading) {
+  if (loading) {
     return (
       <>
         <Navbar />
-        <div className="loading-state" style={{ minHeight: "100vh", backgroundColor: "var(--background)" }}>
+        <div className="loading-state" style={{ minHeight: "100vh" }}>
           <div className="spinner spinner-lg"></div>
         </div>
       </>
     );
-  }
-
-  // إذا لم يكن مرفوضاً (rejected)، لا تعرض الـ UI وتجنب وميض الشاشة
-  if (user?.status !== 'rejected') {
-    return null;
   }
 
   return (
@@ -141,9 +143,9 @@
           </h1>
 
           {reason && (
-            <div className="banner banner-error" style={{ marginBottom: '1rem', textAlign: 'right' }}>
+            <div className="banner banner-error" style={{ marginBottom: '1rem' }}>
               <AlertTriangleIcon size={16} />
-              <strong>سبب الرفض:</strong> {reason}
+              السبب: {reason}
             </div>
           )}
 
@@ -151,28 +153,25 @@
             لقد تمت مراجعة طلب التسجيل الخاص بك. يرجى إرفاق صورة هوية جديدة وواضحة ليتمكن فريق الدعم من تفعيل حسابك.
           </p>
 
-          <div className={`file-upload-zone ${image ? 'has-file' : ''}`} style={{ marginBottom: '1.5rem' }}>
-            {/* 🚀 إضافة الـ label لجعل المنطقة بالكامل قابلة للنقر */}
-            <label style={{ display: 'block', width: '100%', cursor: 'pointer' }}>
-              <input
-                type="file"
-                accept="image/jpeg, image/png, image/jpg"
-                style={{ display: 'none' }}
-                onChange={(e) => setImage(e.target.files?.[0] || null)}
-              />
-              {image ? (
-                <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
-                  <FileTextIcon size={32} style={{ display: 'block', margin: '0 auto 0.5rem' }} />
-                  {image.name}
-                </div>
-              ) : (
-                <div>
-                  <ImageIcon size={40} style={{ display: 'block', margin: '0 auto 0.5rem', color: 'var(--text-muted)' }} />
-                  <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>اضغط لاختيار صورة الهوية الجديدة</p>
-                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>JPG, PNG (الحد الأقصى 5MB)</p>
-                </div>
-              )}
-            </label>
+          <div className="file-upload-zone" style={{ marginBottom: '1.5rem' }}>
+            <input
+              type="file"
+              accept="image/jpeg, image/png, image/jpg"
+              style={{ display: 'none' }}
+              onChange={(e) => setImage(e.target.files?.[0] || null)}
+            />
+            {image ? (
+              <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
+                <FileTextIcon size={32} style={{ display: 'block', margin: '0 auto 0.5rem' }} />
+                {image.name}
+              </div>
+            ) : (
+              <div>
+                <ImageIcon size={40} style={{ display: 'block', margin: '0 auto 0.5rem', color: 'var(--text-muted)' }} />
+                <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>اضغط لاختيار صورة الهوية الجديدة</p>
+                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>JPG, PNG (الحد الأقصى 5MB)</p>
+              </div>
+            )}
           </div>
 
           <button
@@ -202,4 +201,4 @@
       </div>
     </>
   );
-}+}
```

### `app\waiting-room\page.tsx`
```diff
--- Current: app\waiting-room\page.tsx
+++ Other: app\waiting-room\page.tsx
@@ -1,82 +1,94 @@
 "use client";
 
-import { useEffect } from "react";
+import { useState, useEffect } from "react";
 import { useRouter } from "next/navigation";
 import Navbar from '../components/Navbar';
-import { ClockIcon, LogoutIcon, AlertCircleIcon } from '../components/Icons';
-import { useAuthStore } from "@/store/useAuthStore"; // 🚀 العقل المدبر للحالة
+import { ClockIcon, LogoutIcon, CheckIcon, AlertCircleIcon } from '../components/Icons';
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+
+const getToken = () => {
+  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
+};
 
 export default function WaitingRoomPage() {
   const router = useRouter();
-  
-  // 🚀 جلب البيانات والدوال المركزية من Zustand
-  const { user, isAuthenticated, isLoading, logout, fetchUser } = useAuthStore();
-
-  // 1. حارس البوابة الذكي (Smart Routing Guard)
+  const [loading, setLoading] = useState(true);
+
+  const handleLogout = async () => {
+    const token = getToken();
+    if (token) {
+      try {
+        await fetch(`${API_URL}/api/auth/logout`, {
+          method: 'POST',
+          headers: { Authorization: `Bearer ${token}` }
+        });
+      } catch (e) {
+        console.error("Logout failed on server", e);
+      }
+    }
+
+    localStorage.removeItem("token");
+    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
+    router.push("/login");
+  };
+
   useEffect(() => {
-    if (!isLoading) {
-      if (!isAuthenticated) {
-        router.replace("/login");
-      } else if (user?.status === "active") {
-        router.replace("/dashboard");
-      } else if (user?.status === "rejected") {
-        router.replace("/resubmit");
-      }
-      // إذا كان معلقاً (pending)، يبقى هنا
-    }
-  }, [isLoading, isAuthenticated, user, router]);
-
-  // 2. الاستعلام الذكي (Reactive Polling) في الخلفية
-  useEffect(() => {
-    // لا نستعلم إذا لم يكن الطالب مسجلاً ومعلقاً
-    if (!isAuthenticated || user?.status !== 'pending') return;
-
-    // تحديث بيانات المستخدم كل 15 ثانية بصمت
-    const interval = setInterval(() => {
-      fetchUser(); 
-    }, 15000);
-
-    // تحديث البيانات فوراً عندما يعود الطالب للمتصفح (Tab Active)
+    const checkStatus = async () => {
+      const token = getToken();
+      if (!token) {
+        router.push("/login");
+        return;
+      }
+
+      try {
+        const response = await fetch(`${API_URL}/api/auth/status`, {
+          headers: { Authorization: `Bearer ${token}` }
+        });
+        const data = await response.json();
+
+        if (data.data?.status === "active") {
+          router.push("/dashboard");
+        } else if (data.data?.status === "rejected") {
+          router.push("/resubmit");
+        }
+      } catch (e) {
+        console.error("Status check error", e);
+      } finally {
+        setLoading(false);
+      }
+    };
+
+    checkStatus();
+    const interval = setInterval(checkStatus, 10000);
+
     const handleVisibility = () => {
       if (document.visibilityState === "visible") {
-        fetchUser();
+        checkStatus();
       }
     };
-    
     document.addEventListener("visibilitychange", handleVisibility);
 
     return () => {
       clearInterval(interval);
       document.removeEventListener("visibilitychange", handleVisibility);
     };
-  }, [isAuthenticated, user?.status, fetchUser]);
-
-  const handleLogout = async () => {
-    await logout(); // 🚀 الدالة المركزية تتكفل بتنظيف كل شيء (Cookies + API)
-    router.push("/login");
-  };
-
-  // 🚀 منع وميض الشاشة (FOUC) وعرض التحميل أثناء الفحص
-  if (isLoading || (isAuthenticated && user?.status !== 'pending')) {
+  }, [router]);
+
+  if (loading) {
     return (
       <>
         <Navbar />
         <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--gradient-surface)' }}>
           <div className="blob blob-1"></div>
           <div className="blob blob-2"></div>
-          <div className="card flex flex-col items-center gap-6 p-12 relative z-10">
+          <div className="card flex flex-col items-center gap-6 p-12">
             <div className="spinner spinner-lg"></div>
             <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
               جارٍ التحقق...
             </p>
           </div>
         </div>
-        <style jsx>{`
-          .blob { position: absolute; border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; animation: blob 8s ease-in-out infinite; }
-          .blob-1 { width: 400px; height: 400px; background: linear-gradient(135deg, rgba(11, 79, 108, 0.15), rgba(11, 122, 138, 0.15)); top: -10%; inset-inline-start: -10%; }
-          .blob-2 { width: 300px; height: 300px; background: linear-gradient(135deg, rgba(27, 189, 212, 0.15), rgba(16, 185, 129, 0.15)); bottom: 10%; inset-inline-end: -5%; animation-delay: -2s; }
-          @keyframes blob { 0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; } 50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; } }
-        `}</style>
       </>
     );
   }
@@ -95,7 +107,7 @@
           <AlertCircleIcon size={40} />
         </div>        
 
-        <div className="card animate-fade-in-scale text-center relative z-10" style={{ maxWidth: '420px', width: '100%', padding: '3rem' }}>
+        <div className="card animate-fade-in-scale text-center" style={{ maxWidth: '420px', width: '100%', padding: '3rem' }}>
           <div className="waiting-icon-wrapper">
             <ClockIcon size={44} />
           </div>
@@ -129,7 +141,7 @@
 
           <div className="banner banner-info mb-6 justify-center" style={{ borderStyle: 'dashed' }}>
             <AlertCircleIcon size={18} />
-            سيتم تحويلك تلقائياً للوحة التحكم عند الموافقة
+            سيُحولك تلقائياً للوحة التحكم عند الموافقة
           </div>
 
           <button
@@ -141,7 +153,7 @@
           </button>
         </div>
 
-        <style jsx>{`
+        <style>{`
           .blob {
             position: absolute;
             border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
@@ -153,6 +165,14 @@
             background: linear-gradient(135deg, rgba(11, 79, 108, 0.15), rgba(11, 122, 138, 0.15));
             top: -10%;
             inset-inline-start: -10%;
+          }
+          .blob-2 {
+            width: 300px;
+            height: 300px;
+            background: linear-gradient(135deg, rgba(27, 189, 212, 0.15), rgba(16, 185, 129, 0.15));
+            bottom: 10%;
+            inset-inline-end: -5%;
+            animation-delay: -2s;
           }
           .blob-3 {
             width: 300px;
@@ -198,12 +218,8 @@
             0%, 100% { transform: translateY(0); }
             50% { transform: translateY(-8px); }
           }
-          @keyframes floatSoft {
-            0%, 100% { transform: translateY(0); }
-            50% { transform: translateY(-15px); }
-          }
         `}</style>
       </div>
     </>
   );
-}+}
```

### `app\wallet\page.tsx`
```diff
--- Current: app\wallet\page.tsx
+++ Other: app\wallet\page.tsx
@@ -1,11 +1,11 @@
 'use client';
 
-import { useState, useEffect, useRef, useCallback } from 'react';
+import { useState, useEffect, useRef } from 'react';
 import { useRouter } from 'next/navigation';
 import Link from 'next/link';
 import Navbar from '../components/Navbar';
 import { useAuthGuard } from '../hooks/useAuthGuard';
-import api from '@/lib/axios';
+import StatCard from '../components/StatCard';
 import {
   CreditCardIcon,
   PhoneIcon,
@@ -20,8 +20,15 @@
   FileTextIcon,
   ImageIcon,
   UploadIcon,
+  AwardIcon,
   TrendingUpIcon,
 } from '../components/Icons';
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+
+const getToken = () => {
+  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
+};
 
 interface Transaction {
   id: number;
@@ -49,10 +56,8 @@
 
 interface PaymentNumberData {
   provider: string;
-  payment_number?: string;
-  paymentNumber?: string;
-  number?: string;
-  display_order?: number;
+  payment_number: string;
+  display_order: number;
   instructions: string[];
 }
 
@@ -69,10 +74,9 @@
 ];
 
 export default function WalletPage() {
+  const { isChecking } = useAuthGuard();
   const router = useRouter();
   const fileInputRef = useRef<HTMLInputElement>(null);
-
-  const { isChecking, user } = useAuthGuard();
 
   const [activeTab, setActiveTab] = useState<TabKey>('transactions');
 
@@ -90,66 +94,67 @@
   const [amount, setAmount] = useState<string>('');
   const [topupLoading, setTopupLoading] = useState(false);
   const [topupError, setTopupError] = useState('');
+  const [topupSuccess, setTopupSuccess] = useState(false);
 
   const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
-  const showToast = useCallback((message: string, type: 'success' | 'error') => {
+  const showToast = (message: string, type: 'success' | 'error') => {
     setToast({ visible: true, message, type });
     setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
+  };
+
+  useEffect(() => {
+    fetchWalletData();
+    fetchTopupHistory();
+  // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);
-
-  useEffect(() => {
-    if (!isChecking && user?.status === 'pending') {
-      router.replace('/waiting-room');
-    }
-  }, [isChecking, user, router]);
-
-  useEffect(() => {
-    if (!isChecking && user?.status !== 'pending') {
-      fetchWalletData();
-      fetchTopupHistory();
-    }
-  // eslint-disable-next-line react-hooks/exhaustive-deps
-  }, [isChecking, user]);
 
   const fetchWalletData = async () => {
     try {
-      const [balanceRes, transactionsRes] = await Promise.allSettled([
-        api.get('/wallet/balance'),
-        api.get('/wallet/transactions?limit=10'),
+      const token = getToken();
+      if (!token) {
+        router.push('/login');
+        return;
+      }
+
+      const [balanceRes, transactionsRes] = await Promise.all([
+        fetch(`${API_URL}/api/wallet/balance`, {
+          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
+        }),
+        fetch(`${API_URL}/api/wallet/transactions?limit=10`, {
+          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
+        }),
       ]);
 
-      if (balanceRes.status === 'fulfilled') {
-        setBalance(balanceRes.value.data?.data?.balance ?? balanceRes.value.data?.balance ?? 0);
+      if (balanceRes.ok) {
+        const balanceData = await balanceRes.json();
+        setBalance(balanceData.data?.balance || 0);
+
+        const statusRes = await fetch(`${API_URL}/api/auth/status`, {
+          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
+        });
+        if (statusRes.ok) {
+          const statusData = await statusRes.json();
+          if (statusData.data?.status === 'pending') {
+            router.replace('/waiting-room');
+            return;
+          }
+        }
       }
 
-      if (transactionsRes.status === 'fulfilled') {
-        const resData = transactionsRes.value.data;
-        
-        // 🚀 استخراج ذكي وآمن للبيانات للوصول لمصفوفة المعاملات أياً كان عمقها
-        let rawTransactions: any[] = [];
-        if (Array.isArray(resData)) {
-          rawTransactions = resData;
-        } else if (Array.isArray(resData?.data)) {
-          rawTransactions = resData.data;
-        } else if (Array.isArray(resData?.data?.data)) {
-          rawTransactions = resData.data.data;
-        } else if (resData?.data?.transactions && Array.isArray(resData.data.transactions)) {
-          rawTransactions = resData.data.transactions;
-        } else if (resData?.transactions && Array.isArray(resData.transactions)) {
-          rawTransactions = resData.transactions;
-        }
-
+      if (transactionsRes.ok) {
+        const transactionsData = await transactionsRes.json();
+        const rawTransactions = transactionsData.data?.data || transactionsData.data || [];
         const mappedTransactions = rawTransactions.map((t: any) => ({
           id: t.id,
-          type: t.type || t.transaction_type || 'top_up',
-          amount: Number(t.amount) || 0,
-          balanceBefore: Number(t.balance_before ?? t.balanceBefore ?? 0),
-          balanceAfter: Number(t.balance_after ?? t.balanceAfter ?? 0),
+          type: t.type,
+          amount: t.amount,
+          balanceBefore: t.balance_before ?? t.balanceBefore ?? 0,
+          balanceAfter: t.balance_after ?? t.balanceAfter ?? 0,
           reference: t.reference || '',
           paymentMethod: t.payment_method ?? t.paymentMethod ?? '',
           description: t.description || '',
-          status: t.status || 'completed',
-          createdAt: t.created_at ?? t.createdAt ?? new Date().toISOString(),
+          status: t.status,
+          createdAt: t.created_at ?? t.createdAt,
         }));
         setTransactions(mappedTransactions);
       }
@@ -162,29 +167,28 @@
 
   const fetchTopupHistory = async () => {
     try {
-      const response = await api.get('/wallet/topup/history?limit=10');
-      const resData = response.data;
-      
-      let rawTopups: any[] = [];
-      if (Array.isArray(resData)) {
-        rawTopups = resData;
-      } else if (Array.isArray(resData?.data)) {
-        rawTopups = resData.data;
-      } else if (Array.isArray(resData?.data?.data)) {
-        rawTopups = resData.data.data;
+      const token = getToken();
+      if (!token) return;
+
+      const response = await fetch(`${API_URL}/api/wallet/topup/history?limit=10`, {
+        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
+      });
+
+      if (response.ok) {
+        const data = await response.json();
+        const rawTopups = data.data?.data || data.data || [];
+        const mappedTopups = rawTopups.map((req: any) => ({
+          id: req.id,
+          amount: req.amount,
+          verifiedAmount: req.verified_amount ?? req.verifiedAmount ?? null,
+          paymentMethod: req.payment_method ?? req.paymentMethod ?? '',
+          status: req.status,
+          adminNotes: req.admin_notes ?? req.adminNotes ?? null,
+          createdAt: req.created_at ?? req.createdAt,
+          reviewedAt: req.reviewed_at ?? req.reviewedAt ?? null,
+        }));
+        setTopupHistory(mappedTopups);
       }
-
-      const mappedTopups = rawTopups.map((req: any) => ({
-        id: req.id,
-        amount: req.amount,
-        verifiedAmount: req.verified_amount ?? req.verifiedAmount ?? null,
-        paymentMethod: req.payment_method ?? req.paymentMethod ?? '',
-        status: req.status,
-        adminNotes: req.admin_notes ?? req.adminNotes ?? null,
-        createdAt: req.created_at ?? req.createdAt,
-        reviewedAt: req.reviewed_at ?? req.reviewedAt ?? null,
-      }));
-      setTopupHistory(mappedTopups);
     } catch (err) {
       console.error('Error fetching topup history:', err);
     }
@@ -196,16 +200,25 @@
     setTopupError('');
 
     try {
-      const response = await api.post(`/wallet/topup/initiate?provider=${method}`);
-      setPaymentNumberData(response.data?.data || response.data);
+      const token = getToken();
+      const response = await fetch(`${API_URL}/api/wallet/topup/initiate?provider=${method}`, {
+        method: 'POST',
+        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
+      });
+
+      const data = await response.json();
+
+      if (!response.ok) {
+        if (data.code === 'ERR_NO_PAYMENT_NUMBER') {
+          throw new Error('عذراً، لا تتوفر أرقام تحويل حالياً لهذه الوسيلة. يرجى تجربة وسيلة أخرى أو التواصل مع الدعم.');
+        }
+        throw new Error(data.error || data.message || 'فشل في جلب رقم الدفع');
+      }
+
+      setPaymentNumberData(data.data);
       setTopupStep('show-number');
-    } catch (err: any) {
-      let errorMsg = 'حدث خطأ غير متوقع';
-      if (err?.code === 'ERR_NO_PAYMENT_NUMBER' || err?.response?.data?.code === 'ERR_NO_PAYMENT_NUMBER') {
-        errorMsg = 'عذراً، لا تتوفر أرقام تحويل حالياً لهذه الوسيلة. يرجى تجربة وسيلة أخرى أو التواصل مع الدعم.';
-      } else {
-        errorMsg = err?.message || err?.error || errorMsg;
-      }
+    } catch (err) {
+      const errorMsg = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
       setTopupError(errorMsg);
       showToast(errorMsg, 'error');
     } finally {
@@ -216,10 +229,6 @@
   const handleProofSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) {
-      if (!file.type.startsWith('image/')) {
-        showToast('يجب اختيار ملف صورة فقط لإيصال الدفع', 'error');
-        return;
-      }
       setProofImage(file);
       const reader = new FileReader();
       reader.onloadend = () => {
@@ -231,7 +240,7 @@
 
   const submitProof = async () => {
     if (!proofImage || !amount || !selectedMethod) {
-      setTopupError('الرجاء إكمال جميع البيانات وإرفاق الصورة بوضوح');
+      setTopupError('الرجاء إكمال جميع البيانات والصورة');
       return;
     }
 
@@ -239,22 +248,31 @@
     setTopupError('');
 
     try {
+      const token = getToken();
       const formData = new FormData();
       formData.append('provider', selectedMethod);
       formData.append('amount', amount);
       formData.append('proof_image', proofImage);
 
-      await api.post('/wallet/topup/submit', formData, {
-        headers: { 'Content-Type': 'multipart/form-data' },
+      const response = await fetch(`${API_URL}/api/wallet/topup/submit`, {
+        method: 'POST',
+        headers: { Authorization: `Bearer ${token}` },
+        body: formData,
       });
 
+      const data = await response.json();
+
+      if (!response.ok) {
+        throw new Error(data.error || data.message || 'فشل في إرسال إثبات الدفع');
+      }
+
+      setTopupSuccess(true);
       setTopupStep('success');
-      showToast('تم إرسال طلب الشحن بنجاح! جاري المراجعة.', 'success');
-      
+      showToast('تم إرسال طلب الشحن بنجاح!', 'success');
       fetchWalletData();
       fetchTopupHistory();
-    } catch (err: any) {
-      setTopupError(err?.response?.data?.message || err?.message || err?.error || 'فشل في إرسال إثبات الدفع');
+    } catch (err) {
+      setTopupError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
     } finally {
       setTopupLoading(false);
     }
@@ -268,6 +286,7 @@
     setProofPreview(null);
     setAmount('');
     setTopupError('');
+    setTopupSuccess(false);
   };
 
   const getStatusBadgeClass = (status: string) => {
@@ -305,8 +324,7 @@
     switch (type) {
       case 'top_up':
       case 'topup': return 'شحن';
-      case 'purchase': return 'شراء (كورس)';
-      case 'comprehensive_exam': return 'شراء (امتحان مستقل)';
+      case 'purchase': return 'شراء';
       case 'refund': return 'استرجاع';
       default: return type;
     }
@@ -332,10 +350,9 @@
     return (
       <div className="page-container">
         <Navbar />
-        <div className="page-content flex items-center justify-center min-h-[60vh]">
-          <div className="loading-state text-center">
-            <div className="spinner spinner-lg mb-4 mx-auto" />
-            <p className="font-bold text-gray-500">جاري تحميل بيانات محفظتك...</p>
+        <div className="page-content">
+          <div className="loading-state">
+            <div className="spinner spinner-lg" />
           </div>
         </div>
       </div>
@@ -346,8 +363,8 @@
     <div className="page-container relative">
       <Navbar />
 
-      <div className={`toast-container ${toast.visible ? 'show' : ''}`} style={{ position: 'fixed', top: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: 'max-content', maxWidth: '90vw' }}>
-        <div className={`toast-content ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
+      <div className={`toast-container ${toast.visible ? 'show' : ''}`}>
+        <div className={`toast-content ${toast.type}`}>
           {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertTriangleIcon size={20} />}
           {toast.message}
         </div>
@@ -359,8 +376,9 @@
             <h1 className="page-title">محفظتي</h1>
             <p className="page-subtitle">إدارة رصيدك وطلبات الشحن</p>
           </div>
-          <Link href="/student" className="btn btn-outline">
-            <ArrowLeftIcon size={18} /> العودة للوحة
+          <Link href="/dashboard" className="btn btn-outline">
+            <ArrowLeftIcon size={18} />
+            العودة للوحة
           </Link>
         </div>
 
@@ -386,28 +404,34 @@
             <div className="card balance-card mb-6">
               <div className="balance-card-bg" />
               <div className="balance-card-content">
-                <p className="balance-label">الرصيد المتاح حالياً</p>
-                <h2 className="balance-value" dir="ltr">
-                  {balance.toLocaleString()} <span className="balance-unit">ج.م</span>
+                <p className="balance-label">الرصيد المتاح</p>
+                <h2 className="balance-value">
+                  {balance.toLocaleString()} <span className="balance-unit">نقطة</span>
                 </h2>
-                <button onClick={() => handleTabChange('topup')} className="btn balance-cta">
-                  <PlusIcon size={18} /> شحن رصيد
+                <button
+                  onClick={() => handleTabChange('topup')}
+                  className="btn balance-cta"
+                >
+                  <PlusIcon size={18} />
+                  شحن رصيد
                 </button>
               </div>
             </div>
 
+
+
             {topupHistory.length > 0 && (
-              <div className="card mb-6 animate-fade-in">
+              <div className="card mb-6">
                 <div className="card-header">
-                  <h3 className="card-title">سجل طلبات الشحن</h3>
+                  <h3 className="card-title">طلبات الشحن</h3>
                 </div>
                 <div className="table-container">
                   <table className="table">
                     <thead>
                       <tr>
-                        <th>المبلغ المضاف</th>
+                        <th>المبلغ</th>
                         <th>الطريقة</th>
-                        <th>حالة الطلب</th>
+                        <th>الحالة</th>
                         <th>التاريخ</th>
                       </tr>
                     </thead>
@@ -415,12 +439,12 @@
                       {topupHistory.map(req => (
                         <tr key={req.id}>
                           <td>
-                            <span className="font-bold" dir="ltr">
-                              {req.verifiedAmount || req.amount} ج.م
+                            <span className="font-bold">
+                              {req.verifiedAmount || req.amount} نقطة
                             </span>
                             {req.verifiedAmount && req.verifiedAmount !== req.amount && (
                               <span className="text-muted" style={{ display: 'block', fontSize: '0.75rem' }}>
-                                (المرسل الفعلي: {req.amount})
+                                (المطلوب: {req.amount})
                               </span>
                             )}
                           </td>
@@ -434,8 +458,8 @@
                               {getStatusLabel(req.status)}
                             </span>
                           </td>
-                          <td style={{ whiteSpace: 'nowrap' }} dir="ltr">
-                            {new Date(req.createdAt).toLocaleDateString('ar-EG', { dateStyle: 'medium' })}
+                          <td style={{ whiteSpace: 'nowrap' }}>
+                            {new Date(req.createdAt).toLocaleDateString('ar-EG')}
                           </td>
                         </tr>
                       ))}
@@ -445,23 +469,25 @@
               </div>
             )}
 
-            <div className="card animate-fade-in">
+            <div className="card">
               <div className="card-header">
-                <h3 className="card-title">سجل المعاملات المالية (Ledger)</h3>
+                <h3 className="card-title">أخر المعاملات</h3>
               </div>
               {transactions.length === 0 ? (
                 <div className="empty-state">
-                  <div className="empty-state-icon"><FileTextIcon size={28} /></div>
-                  <p>لا توجد معاملات مسجلة حتى الآن</p>
+                  <div className="empty-state-icon">
+                    <FileTextIcon size={28} />
+                  </div>
+                  <p>لا توجد معاملات بعد</p>
                 </div>
               ) : (
                 <div className="table-container">
                   <table className="table">
                     <thead>
                       <tr>
-                        <th>النوع والبيان</th>
+                        <th>النوع</th>
                         <th>المبلغ</th>
-                        <th>الرصيد النهائي</th>
+                        <th>الحالة</th>
                         <th>التاريخ</th>
                       </tr>
                     </thead>
@@ -469,28 +495,32 @@
                       {transactions.map(transaction => (
                         <tr key={transaction.id}>
                           <td>
-                            <span className="font-bold flex items-center gap-1.5 mb-1">
+                            <span className="font-semibold">
                               {transaction.type === 'top_up' || transaction.type === 'topup' ? (
-                                <TrendingUpIcon size={16} className="text-success" />
-                              ) : transaction.type === 'purchase' || transaction.type === 'comprehensive_exam' ? (
-                                <CreditCardIcon size={16} className="text-primary" />
+                                <TrendingUpIcon size={16} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
+                              ) : transaction.type === 'purchase' ? (
+                                <CreditCardIcon size={16} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                               ) : (
-                                <ArrowLeftIcon size={16} className="text-warning" />
+                                <ArrowLeftIcon size={16} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                               )}
                               {getTypeLabel(transaction.type)}
                             </span>
-                            <span className="text-xs text-muted block max-w-[200px] truncate" title={transaction.description}>{transaction.description}</span>
                           </td>
-                          <td dir="ltr">
-                            <span className={`font-black ${['purchase', 'comprehensive_exam', 'withdrawal'].includes(transaction.type) ? 'text-error' : 'text-success'}`}>
-                              {['purchase', 'comprehensive_exam', 'withdrawal'].includes(transaction.type) ? '-' : '+'}{transaction.amount}
+                          <td>
+                            <span className={`font-bold ${transaction.amount > 0 ? 'text-success' : 'text-error'}`}>
+                              {transaction.amount > 0 ? '+' : ''}{transaction.amount} نقطة
                             </span>
                           </td>
                           <td>
-                            <span className="font-bold text-gray-700" dir="ltr">{transaction.balanceAfter} ج.م</span>
+                            <span className={getStatusBadgeClass(transaction.status)}>
+                              {transaction.status === 'completed' && <CheckIcon size={12} />}
+                              {transaction.status === 'pending' && <ClockIcon size={12} />}
+                              {transaction.status === 'failed' && <XIcon size={12} />}
+                              {getStatusLabel(transaction.status)}
+                            </span>
                           </td>
-                          <td style={{ whiteSpace: 'nowrap' }} dir="ltr" className="text-sm">
-                            {new Date(transaction.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
+                          <td style={{ whiteSpace: 'nowrap' }}>
+                            {new Date(transaction.createdAt).toLocaleDateString('ar-EG')}
                           </td>
                         </tr>
                       ))}
@@ -503,22 +533,24 @@
         )}
 
         {activeTab === 'topup' && (
-          <div className="card animate-fade-in">
+          <div className="card">
             <div className="card-header">
               <h3 className="card-title">
-                {topupStep === 'select-method' && 'اختر وسيلة الشحن المناسبة'}
-                {topupStep === 'show-number' && 'أرسل المبلغ المطلوب'}
-                {topupStep === 'upload-proof' && 'ارفع إيصال التحويل (Screen)'}
-                {topupStep === 'success' && 'تم استلام طلبك'}
+                {topupStep === 'select-method' && 'اختر طريقة الدفع'}
+                {topupStep === 'show-number' && 'أرسل المبلغ'}
+                {topupStep === 'upload-proof' && 'ارفع الإيصال'}
+                {topupStep === 'success' && 'تم الاستلام'}
               </h3>
               <button onClick={resetTopup} className="btn btn-outline btn-sm">
-                <XIcon size={16} /> إلغاء الشحن
+                <XIcon size={16} />
+                إلغاء
               </button>
             </div>
 
             {topupError && (
-              <div className="banner banner-error mb-6 font-bold flex items-center gap-2">
-                <AlertTriangleIcon size={20} /> {topupError}
+              <div className="banner banner-error mb-6">
+                <AlertTriangleIcon size={20} />
+                {topupError}
               </div>
             )}
 
@@ -543,7 +575,7 @@
             </div>
 
             {topupStep === 'select-method' && (
-              <div className="payment-methods-grid animate-fade-in">
+              <div className="payment-methods-grid">
                 {PAYMENT_METHODS.map(method => {
                   const Icon = method.icon;
                   return (
@@ -552,7 +584,9 @@
                       onClick={() => initiateTopup(method.id)}
                       className="card payment-method-card"
                     >
-                      <div className="payment-method-icon"><Icon size={40} /></div>
+                      <div className="payment-method-icon">
+                        <Icon size={40} />
+                      </div>
                       <h4 className="payment-method-name">{method.name}</h4>
                       <p className="payment-method-desc">{method.description}</p>
                     </div>
@@ -564,30 +598,40 @@
             {topupStep === 'show-number' && paymentNumberData && (
               <div className="animate-fade-in">
                 <div className="payment-number-display">
-                  <p className="payment-number-label">قم بتحويل المبلغ إلى الرقم الآتي:</p>
-                  
-                  <h3 className="payment-number-value select-all">
-                    {paymentNumberData.payment_number || paymentNumberData.paymentNumber || paymentNumberData.number || 'الرقم غير متاح'}
+                  <p className="payment-number-label">أرسل المبلغ إلى:</p>
+                  <h3 className="payment-number-value">
+                    {paymentNumberData.payment_number}
                   </h3>
-
                   <p className="payment-number-provider">
-                    {paymentNumberData.provider === 'instapay' ? <><CreditCardIcon size={16} /> عبر تطبيق إنستاباي</> : <><PhoneIcon size={16} /> عبر محفظة فودافون كاش</>}
+                    {paymentNumberData.provider === 'instapay' ? (
+                      <><CreditCardIcon size={16} /> إنستاباي</>
+                    ) : (
+                      <><PhoneIcon size={16} /> فودافون كاش</>
+                    )}
                   </p>
                 </div>
 
                 <div className="banner banner-warning mb-6">
                   <AlertTriangleIcon size={20} />
                   <div>
-                    <p className="font-bold mb-2">تعليمات هامة قبل التحويل:</p>
+                    <p className="font-bold mb-2">أرسل المبلغ المذكور ثم التقط صورة إيصال التحويل</p>
                     <ul className="instructions-list">
-                      {paymentNumberData.instructions?.map((instruction, i) => <li key={i}>{instruction}</li>)}
+                      {paymentNumberData.instructions.map((instruction, i) => (
+                        <li key={i}>{instruction}</li>
+                      ))}
                     </ul>
                   </div>
                 </div>
 
                 <div className="flex gap-4 flex-wrap">
-                  <button onClick={resetTopup} className="btn btn-outline flex-1"><XIcon size={16} /> إلغاء العملية</button>
-                  <button onClick={() => setTopupStep('upload-proof')} className="btn btn-primary flex-1"><CheckIcon size={16} /> أرسلت المبلغ، المتابعة للإيصال</button>
+                  <button onClick={resetTopup} className="btn btn-outline flex-1">
+                    <XIcon size={16} />
+                    إلغاء
+                  </button>
+                  <button onClick={() => setTopupStep('upload-proof')} className="btn btn-primary flex-1">
+                    <CheckIcon size={16} />
+                    تم التحويل، التالي
+                  </button>
                 </div>
               </div>
             )}
@@ -595,94 +639,274 @@
             {topupStep === 'upload-proof' && (
               <div className="animate-fade-in">
                 <div className="form-group mb-6">
-                  <label className="form-label font-bold text-lg">المبلغ الذي قمت بتحويله (بالجنيه المصري)</label>
+                  <label className="form-label">المبلغ المرسل (بالجنيه)</label>
                   <input
                     type="number"
-                    min="1"
                     value={amount}
                     onChange={(e) => setAmount(e.target.value)}
-                    className="input-field w-full"
-                    placeholder="مثال: 150"
-                    style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}
+                    className="input-field"
+                    placeholder="أدخل المبلغ الذي قمت بتحويله"
+                    style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 700 }}
                   />
                 </div>
 
                 <div className="form-group mb-6">
-                  <label className="form-label font-bold text-lg mb-2 block">صورة إيصال التحويل (سكرين شوت من التطبيق)</label>
-                  <input type="file" accept="image/*" onChange={handleProofSelect} ref={fileInputRef} className="hidden" />
-                  <div onClick={() => fileInputRef.current?.click()} className={`file-upload-zone ${proofImage ? 'has-file' : ''}`}>
+                  <label className="form-label">صورة إيصال التحويل</label>
+                  <input
+                    type="file"
+                    accept="image/*"
+                    onChange={handleProofSelect}
+                    ref={fileInputRef}
+                  />
+                  <div
+                    onClick={() => fileInputRef.current?.click()}
+                    className={`file-upload-zone ${proofImage ? 'has-file' : ''}`}
+                  >
                     {proofPreview ? (
-                      <img src={proofPreview} alt="إيصال الدفع" className="upload-preview" />
+                      <img src={proofPreview} alt="إيصال دفع" className="upload-preview" />
                     ) : (
                       <div>
-                        <div className="upload-placeholder-icon text-primary mb-2"><ImageIcon size={48} /></div>
-                        <p className="font-black text-gray-700 text-lg">اضغط هنا لرفع صورة الإيصال</p>
-                        <p className="text-gray-400 font-bold mt-1 text-sm">صيغة الصور المدعومة: PNG, JPG, JPEG</p>
+                        <div className="upload-placeholder-icon">
+                          <ImageIcon size={40} />
+                        </div>
+                        <p className="font-semibold text-secondary">اضغط هنا لرفع الصورة</p>
+                        <p className="text-muted mt-2" style={{ fontSize: '0.875rem' }}>PNG, JPG أو JPEG</p>
                       </div>
                     )}
                   </div>
                 </div>
 
-                <div className="flex gap-4 flex-wrap mt-8">
-                  <button onClick={() => setTopupStep('show-number')} className="btn btn-outline flex-1"><ArrowLeftIcon size={16} /> رجوع للرقم</button>
-                  <button onClick={submitProof} disabled={topupLoading || !proofImage || !amount} className="btn btn-primary flex-1 py-3 font-bold text-lg shadow-md shadow-blue-200">
-                    {topupLoading ? <><span className="spinner spinner-white border-2 w-5 h-5" /> جاري الرفع...</> : <><UploadIcon size={18} /> تأكيد إرسال الطلب للإدارة</>}
+                <div className="flex gap-4 flex-wrap">
+                  <button onClick={() => setTopupStep('show-number')} className="btn btn-outline flex-1">
+                    <ArrowLeftIcon size={16} />
+                    رجوع
+                  </button>
+                  <button
+                    onClick={submitProof}
+                    disabled={topupLoading || !proofImage || !amount}
+                    className="btn btn-primary flex-1"
+                  >
+                    {topupLoading ? (
+                      <>
+                        <span className="spinner spinner-white" />
+                        جاري الإرسال...
+                      </>
+                    ) : (
+                      <>
+                        <UploadIcon size={16} />
+                        إرسال للمراجعة
+                      </>
+                    )}
                   </button>
                 </div>
               </div>
             )}
 
             {topupStep === 'success' && (
-              <div className="animate-fade-in text-center py-8">
-                <div className="success-circle shadow-lg shadow-green-200">
-                  <CheckCircleIcon size={48} style={{ color: 'white' }} />
-                </div>
-                <h3 className="success-title text-success">تم استقبال طلبك بنجاح!</h3>
-                <p className="text-gray-500 font-bold mb-8 leading-relaxed max-w-md mx-auto">
-                  تقوم الإدارة حالياً بمراجعة إيصال التحويل الخاص بك والتأكد من البنك.
-                  سيتم إضافة الرصيد إلى محفظتك تلقائياً فور التأكيد.
+              <div className="animate-fade-in text-center" style={{ padding: '2rem' }}>
+                <div className="success-circle">
+                  <CheckCircleIcon size={40} style={{ color: 'white' }} />
+                </div>
+                <h3 className="success-title">تم إرسال طلبك بنجاح!</h3>
+                <p className="text-secondary mb-6" style={{ lineHeight: 1.8 }}>
+                  سيتم مراجعة إيصال الدفع من قبل الإدارة.<br />
+                  سيضاف الرصيد إلى محفظتك فور التأكد من التحويل.
                 </p>
-                <button onClick={() => handleTabChange('transactions')} className="btn btn-primary px-8 font-bold mx-auto">
-                  العودة لسجل المحفظة
+                <button onClick={() => handleTabChange('transactions')} className="btn btn-primary">
+                  <ArrowLeftIcon size={16} />
+                  العودة للمحفظة
                 </button>
               </div>
             )}
           </div>
         )}
+
+
       </div>
 
       <style jsx>{`
-        .wallet-tabs { display: flex; gap: 0.5rem; background: var(--surface); border-radius: var(--radius-md); padding: 0.375rem; border: 1px solid var(--border); }
-        .wallet-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1rem; border: none; background: transparent; color: var(--text-secondary); font-family: var(--font-body); font-size: 0.9375rem; font-weight: 600; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.3s ease; }
-        .wallet-tab:hover { color: var(--primary); background: rgba(11, 79, 108, 0.04); }
-        .wallet-tab.active { background: var(--gradient-primary); color: white; box-shadow: var(--shadow-sm); }
-        .balance-card { background: var(--gradient-primary); border: none; position: relative; overflow: hidden; padding: var(--space-xl); border-radius: 1.5rem; box-shadow: 0 10px 25px -5px rgba(11, 79, 108, 0.3); }
-        .balance-card-bg { position: absolute; inset: 0; background: radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 50%); pointer-events: none; }
-        .balance-card-content { position: relative; z-index: 1; }
-        .balance-label { color: rgba(255,255,255,0.8); font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; }
-        .balance-value { color: white; font-family: var(--font-display); font-size: 3.5rem; font-weight: 900; margin-bottom: 1.5rem; }
-        .balance-unit { font-size: 1.25rem; font-weight: 700; opacity: 0.9; }
-        .balance-cta { background: white; color: var(--primary); border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-weight: 800; padding: 0.75rem 1.5rem; }
-        .balance-cta:hover { background: var(--surface); color: var(--primary-dark); box-shadow: 0 6px 16px rgba(0,0,0,0.2); transform: translateY(-2px); }
-        .payment-methods-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem; }
-        .payment-method-card { cursor: pointer; text-align: center; padding: 2.5rem 1.5rem; border: 2px solid transparent; background: var(--surface); box-shadow: var(--shadow-sm); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 1rem; }
-        .payment-method-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-lg); border-color: var(--primary); background: linear-gradient(135deg, rgba(11, 79, 108, 0.04) 0%, var(--surface) 100%); }
-        .payment-method-icon { color: var(--primary); margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; }
-        .payment-method-name { font-family: var(--font-display); font-size: 1.25rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--text-primary); }
-        .payment-method-desc { color: var(--text-secondary); font-size: 0.875rem; font-weight: 600; }
-        .payment-number-display { background: var(--gradient-accent); border-radius: 1rem; padding: 2.5rem; text-align: center; margin-bottom: 1.5rem; box-shadow: 0 10px 25px -5px rgba(27, 189, 212, 0.3); }
-        .payment-number-label { color: rgba(255,255,255,0.9); font-size: 1.1rem; font-weight: 700; }
-        .payment-number-value { color: white; font-family: var(--font-display); font-size: clamp(2rem, 5vw, 3rem); font-weight: 900; letter-spacing: 0.1em; margin: 1rem 0; direction: ltr; }
-        .payment-number-provider { color: rgba(255,255,255,0.9); font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: bold; }
-        .instructions-list { font-size: 0.95rem; padding-inline-start: 1.5rem; line-height: 1.8; list-style: disc; color: var(--text-secondary); }
-        .file-upload-zone { border: 2px dashed var(--border); border-radius: 1rem; padding: 3rem 1rem; text-align: center; cursor: pointer; transition: all 0.3s ease; background: var(--surface); }
-        .file-upload-zone:hover { border-color: var(--primary); background: rgba(11, 79, 108, 0.02); }
-        .file-upload-zone.has-file { border-style: solid; border-color: var(--success); background: rgba(16, 185, 129, 0.02); padding: 1rem; }
-        .upload-preview { max-height: 300px; object-fit: contain; margin: 0 auto; border-radius: var(--radius-sm); box-shadow: var(--shadow-sm); }
-        .upload-placeholder-icon { display: flex; align-items: center; justify-content: center; }
-        .success-circle { width: 100px; height: 100px; border-radius: 50%; background: var(--success); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
-        .success-title { font-family: var(--font-display); font-size: 2rem; font-weight: 900; margin-bottom: 1rem; }
+        .wallet-tabs {
+          display: flex;
+          gap: 0.5rem;
+          background: var(--surface);
+          border-radius: var(--radius-md);
+          padding: 0.375rem;
+          border: 1px solid var(--border);
+        }
+        .wallet-tab {
+          flex: 1;
+          display: flex;
+          align-items: center;
+          justify-content: center;
+          gap: 0.5rem;
+          padding: 0.75rem 1rem;
+          border: none;
+          background: transparent;
+          color: var(--text-secondary);
+          font-family: var(--font-body);
+          font-size: 0.9375rem;
+          font-weight: 600;
+          border-radius: var(--radius-sm);
+          cursor: pointer;
+          transition: all 0.3s ease;
+        }
+        .wallet-tab:hover {
+          color: var(--primary);
+          background: rgba(11, 79, 108, 0.04);
+        }
+        .wallet-tab.active {
+          background: var(--gradient-primary);
+          color: white;
+          box-shadow: var(--shadow-sm);
+        }
+        .balance-card {
+          background: var(--gradient-primary);
+          border: none;
+          position: relative;
+          overflow: hidden;
+          padding: var(--space-xl);
+        }
+        .balance-card-bg {
+          position: absolute;
+          inset: 0;
+          background: radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 50%);
+          pointer-events: none;
+        }
+        .balance-card-content {
+          position: relative;
+          z-index: 1;
+        }
+        .balance-label {
+          color: rgba(255,255,255,0.8);
+          font-size: 1rem;
+          font-weight: 600;
+          margin-bottom: 0.5rem;
+        }
+        .balance-value {
+          color: white;
+          font-family: var(--font-display);
+          font-size: 3rem;
+          font-weight: 800;
+          margin-bottom: 1.5rem;
+        }
+        .balance-unit {
+          font-size: 1.25rem;
+          font-weight: 600;
+        }
+        .balance-cta {
+          background: white;
+          color: var(--primary);
+          border: none;
+          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
+          font-weight: 700;
+        }
+        .balance-cta:hover {
+          background: white;
+          color: var(--primary-dark);
+          box-shadow: 0 6px 16px rgba(0,0,0,0.2);
+          transform: translateY(-2px);
+        }
+        .payment-methods-grid {
+          display: grid;
+          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
+          gap: 1rem;
+          margin-bottom: 1.5rem;
+        }
+        .payment-method-card {
+          cursor: pointer;
+          text-align: center;
+          padding: 2rem 1.5rem;
+          border: 2px solid var(--primary);
+          background: linear-gradient(135deg, rgba(11, 79, 108, 0.04) 0%, var(--surface) 100%);
+          transition: all 0.3s ease;
+        }
+        .payment-method-card:hover {
+          transform: translateY(-5px);
+          box-shadow: var(--shadow-lg);
+        }
+        .payment-method-icon {
+          color: var(--primary);
+          margin-bottom: 1rem;
+          display: flex;
+          align-items: center;
+          justify-content: center;
+        }
+        .payment-method-name {
+          font-family: var(--font-display);
+          font-size: 1.25rem;
+          font-weight: 700;
+          margin-bottom: 0.5rem;
+        }
+        .payment-method-desc {
+          color: var(--text-secondary);
+          font-size: 0.875rem;
+        }
+        .payment-number-display {
+          background: var(--gradient-accent);
+          border-radius: var(--radius-lg);
+          padding: 2.5rem;
+          text-align: center;
+          margin-bottom: 1.5rem;
+        }
+        .payment-number-label {
+          color: rgba(255,255,255,0.8);
+          font-size: 1rem;
+          font-weight: 600;
+        }
+        .payment-number-value {
+          color: white;
+          font-family: var(--font-display);
+          font-size: clamp(1.5rem, 5vw, 2.5rem);
+          font-weight: 800;
+          letter-spacing: 0.1em;
+          margin: 1rem 0;
+          direction: ltr;
+        }
+        .payment-number-provider {
+          color: rgba(255,255,255,0.8);
+          font-size: 0.875rem;
+          display: flex;
+          align-items: center;
+          justify-content: center;
+          gap: 0.5rem;
+        }
+        .instructions-list {
+          font-size: 0.875rem;
+          padding-inline-start: 1.25rem;
+          line-height: 1.8;
+          list-style: disc;
+        }
+        .upload-preview {
+          max-height: 250px;
+          object-fit: contain;
+          margin: 0 auto;
+          border-radius: var(--radius-sm);
+        }
+        .upload-placeholder-icon {
+          color: var(--text-muted);
+          margin-bottom: 1rem;
+          display: flex;
+          align-items: center;
+          justify-content: center;
+        }
+        .success-circle {
+          width: 100px;
+          height: 100px;
+          border-radius: 50%;
+          background: var(--success);
+          display: flex;
+          align-items: center;
+          justify-content: center;
+          margin: 0 auto 1.5rem;
+        }
+        .success-title {
+          font-family: var(--font-display);
+          font-size: 1.75rem;
+          font-weight: 800;
+          color: var(--success);
+          margin-bottom: 1rem;
+        }
       `}</style>
     </div>
   );
-}+}
```

### `components\SecureVideoPlayer.tsx`
```diff
--- Current: components\SecureVideoPlayer.tsx
+++ Other: components\SecureVideoPlayer.tsx
@@ -1,8 +1,6 @@
-// app/components/SecureVideoPlayer.tsx
 'use client';
 
 import { useEffect, useRef, useState } from 'react';
-import api from '@/lib/axios'; // 🚀 الاعتماد على عميل Axios الموحد
 
 interface SecureVideoPlayerProps {
   lectureId: string | number;
@@ -38,25 +36,29 @@
   const [killReason, setKillReason] = useState<'devtools' | 'account_shared'>('devtools');
   const [scriptsLoaded, setScriptsLoaded] = useState(false);
 
+  // 🚀 استخدام Refs لمنع الـ Re-renders الكارثية وإعادة تشغيل الفيديو
   const tokenRef = useRef(token);
   const streamIdRef = useRef(streamId);
   const onViolationRef = useRef(onViolation);
   const onCompletedRef = useRef(onCompleted);
   const onProgressRef = useRef(onProgress);
-  const hasSoughtRef = useRef(false);
-
-  useEffect(() => {
-    // eslint-disable-next-line react-hooks/set-state-in-effect
-    setIsClient(true);
-  }, []);
+  const hasSoughtRef = useRef(false); // قفل لضمان استرجاع الوقت مرة واحدة فقط
+
+  useEffect(() => { setIsClient(true); }, []);
+  
+  // تحديث الـ Refs باستمرار دون التسبب في تدمير المشغل
   useEffect(() => { tokenRef.current = token; }, [token]);
   useEffect(() => { streamIdRef.current = streamId; }, [streamId]);
   useEffect(() => { onViolationRef.current = onViolation; }, [onViolation]);
   useEffect(() => { onCompletedRef.current = onCompleted; }, [onCompleted]);
   useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
+
+  // إعادة ضبط قفل الوقت عند تغيير المحاضرة فقط
   useEffect(() => { hasSoughtRef.current = false; }, [lectureId]);
 
-  // 1. حقن مكتبات Video.js
+  // =================================================================
+  // 🌟 حقن المكتبات مباشرة في المتصفح
+  // =================================================================
   useEffect(() => {
     if (!isClient) return;
 
@@ -79,18 +81,23 @@
           link.href = 'https://vjs.zencdn.net/7.21.5/video-js.css';
           document.head.appendChild(link);
         }
+
         await loadScript('https://vjs.zencdn.net/7.21.5/video.min.js');
         await loadScript('https://cdn.jsdelivr.net/npm/videojs-contrib-quality-levels@2.1.0/dist/videojs-contrib-quality-levels.min.js');
         await loadScript('https://cdn.jsdelivr.net/npm/videojs-http-source-selector@1.1.6/dist/videojs-http-source-selector.min.js');
+
         setScriptsLoaded(true);
       } catch (err) {
         console.error("فشل تحميل مشغل الفيديو:", err);
       }
     };
+
     initScripts();
   }, [isClient]);
 
-  // 2. نظام الحماية الذكي
+  // -----------------------------------------------------------------
+  // 1. نظام الحماية الذكي
+  // -----------------------------------------------------------------
   useEffect(() => {
     if (!isClient || isKilled) return;
 
@@ -116,10 +123,14 @@
     };
 
     const handleCopyCut = (e: ClipboardEvent) => e.preventDefault();
+    
+    // Tab switching security handling - Pauses the video and warns the user without recording a database violation
     const handleVisibilityChange = () => {
-      if (document.hidden && playerRef.current && !playerRef.current.paused()) {
-        playerRef.current.pause();
-        alert("تنبيه أمني: تم إيقاف الفيديو مؤقتاً لأنك غادرت الصفحة.");
+      if (document.hidden) {
+        if (playerRef.current && !playerRef.current.paused()) {
+          playerRef.current.pause();
+          alert("تنبيه: تم إيقاف تشغيل الفيديو مؤقتاً لأنك غادرت الصفحة. يرجى عدم تغيير تبويب المتصفح أثناء مشاهدة المحاضرة!");
+        }
       }
     };
 
@@ -135,9 +146,11 @@
       document.removeEventListener('cut', handleCopyCut);
       document.removeEventListener('visibilitychange', handleVisibilityChange);
     };
-  }, [isClient, isKilled]);
-
-  // 3. العلامة المائية
+  }, [isClient, isKilled]); // 🚀 تمت إزالة onViolation لعدم إعادة تشغيل الحماية بلا داعٍ
+
+  // -----------------------------------------------------------------
+  // 2. العلامة المائية الفولاذية
+  // -----------------------------------------------------------------
   useEffect(() => {
     if (!isClient || isKilled || !canvasRef.current || !containerRef.current) return;
     const canvas = canvasRef.current;
@@ -151,16 +164,17 @@
       ctx.clearRect(0, 0, canvas.width, canvas.height);
       const x = Math.random() * (canvas.width - 300) + 20;
       const y = Math.random() * (canvas.height - 50) + 30;
-      ctx.font = 'bold 20px system-ui, sans-serif';
-      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'; 
+      ctx.font = 'bold 22px Cairo, sans-serif';
+      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'; 
       ctx.textBaseline = 'middle';
-      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
+      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
       ctx.shadowBlur = 4;
-      ctx.fillText(watermarkText || "محتوى محمي", x, y);
+      ctx.fillText(watermarkText || "Protected Content", x, y);
     };
 
     drawWatermark();
     const interval = setInterval(drawWatermark, 4000);
+
     const observer = new MutationObserver((mutations) => {
       mutations.forEach((mutation) => {
         if (mutation.removedNodes.length > 0) mutation.removedNodes.forEach(node => { if (node === canvas) { setIsKilled(true); onViolationRef.current?.('devtools'); }});
@@ -172,10 +186,20 @@
     });
 
     observer.observe(containerRef.current, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
-    return () => { clearInterval(interval); observer.disconnect(); };
+    return () => { 
+      clearInterval(interval); 
+      observer.disconnect(); 
+      if (canvas && ctx) {
+        ctx.clearRect(0, 0, canvas.width, canvas.height);
+        canvas.width = 0;
+        canvas.height = 0;
+      }
+    };
   }, [isClient, watermarkText, isKilled]); 
 
-  // 4. تهيئة المشغل (تحديث الرابط الذكي)
+  // -----------------------------------------------------------------
+  // 3. تهيئة المشغل والاستماع لحدث الانتهاء القاطع
+  // -----------------------------------------------------------------
   useEffect(() => {
     if (!isClient || !scriptsLoaded || !videoWrapperRef.current) return;
 
@@ -188,20 +212,23 @@
         if (!requestUri) return options;
         
         if (requestUri.includes('backblazeb2.com') && requestUri.includes(' ')) {
-          requestUri = requestUri.replace(/ /g, '%20');
+           requestUri = requestUri.replace(/ /g, '%20');
         }
         
-        // 🚀 الفلتر الذكي: يمنع تكرار /api/api ويدمج الرابط الأساسي بسلاسة
-        const videoPathIndex = requestUri.indexOf('/api/video/');
-        if (videoPathIndex !== -1) {
+        if (requestUri.includes('/api/')) {
           try {
-            const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
-            // نأخذ الجزء بدءاً من /video/ لتجنب تكرار كلمة /api
-            const endpoint = requestUri.substring(videoPathIndex + 4); 
-            requestUri = `${apiBase}${endpoint}`;
+            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
+            if (requestUri.startsWith('http')) {
+              const urlObj = new URL(requestUri);
+              requestUri = `${API_URL}${urlObj.pathname}${urlObj.search}`;
+            } else if (requestUri.startsWith('/api/')) {
+              requestUri = API_URL + requestUri;
+            }
             options.headers = options.headers || {};
             options.headers['Authorization'] = `Bearer ${tokenRef.current}`;
-          } catch (e) {}
+          } catch (e) {
+            console.error("URL Parsing error", e);
+          }
         }
         
         options.uri = requestUri;
@@ -213,6 +240,7 @@
     const videoElement = document.createElement('video-js');
     videoElement.className = "vjs-big-play-centered vjs-theme-city w-full h-full";
     videoElement.setAttribute('crossOrigin', 'anonymous');
+    
     videoWrapperRef.current.innerHTML = '';
     videoWrapperRef.current.appendChild(videoElement);
 
@@ -221,28 +249,43 @@
       fill: true, 
       playbackRates: [0.5, 1, 1.25, 1.5, 2],
       controlBar: { pictureInPictureToggle: false },
-      html5: { vhs: { overrideNative: true }, nativeAudioTracks: false, nativeVideoTracks: false },
-      plugins: { httpSourceSelector: { default: 'auto' } },
+      html5: { vhs: { overrideNative: true } },
+      plugins: {
+        httpSourceSelector: { default: 'auto' }
+      },
       sources: [{ src: videoUrl, type: 'application/x-mpegURL' }],
     });
 
     playerRef.current = player;
+
     player.on('contextmenu', (e: Event) => e.preventDefault());
 
-    if (typeof player.httpSourceSelector === 'function') player.httpSourceSelector();
+    if (typeof player.httpSourceSelector === 'function') {
+      player.httpSourceSelector();
+    }
 
     player.on('ended', async () => {
       const duration = player.duration();
       if (duration > 0) {
         try {
-          // 🚀 استخدام Axios
-          await api.post(`/lectures/${lectureId}/progress`, { 
-            watch_time: duration, 
-            total_duration: duration, 
-            stream_id: streamIdRef.current,
-            is_completed: true 
+          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+          await fetch(`${API_URL}/api/lectures/${lectureId}/progress`, {
+            method: 'POST',
+            headers: { 
+              'Authorization': `Bearer ${tokenRef.current}`, 
+              'Content-Type': 'application/json', 
+              'Accept': 'application/json' 
+            },
+            body: JSON.stringify({ 
+              watch_time: duration, 
+              total_duration: duration, 
+              stream_id: streamIdRef.current,
+              is_completed: true 
+            })
           });
-        } catch (error) {}
+        } catch (error) {
+          console.error("فشل إرسال نبضة الاغلاق النهائية:", error);
+        }
       }
       onCompletedRef.current?.();
     });
@@ -252,9 +295,10 @@
     });
 
     player.ready(() => {
+      // 🚀 القفل السحري: استرجاع الوقت مرة واحدة فقط!
       if (initialTime > 0 && !hasSoughtRef.current) {
         player.currentTime(initialTime);
-        hasSoughtRef.current = true;
+        hasSoughtRef.current = true; // تم الاسترجاع بنجاح، لن نتدخل مجدداً
       }
     });
 
@@ -264,76 +308,121 @@
         playerRef.current = null;
       }
     };
-  }, [videoUrl, isClient, scriptsLoaded, lectureId, initialTime]);
-
-  // 5. المزامنة (Ping باستخدام Axios)
+  // 🚀 أصبحت الـ Dependencies نظيفة جداً، لن يُعاد بناء المشغل إلا بتغير المحاضرة
+  }, [videoUrl, isClient, scriptsLoaded, lectureId]);
+
+  // -----------------------------------------------------------------
+  // 4. نَبَضَات المراقبة وتقدم المشاهدة الدوري مع המزامنة האوفلاين
+  // -----------------------------------------------------------------
   useEffect(() => {
     if (!isClient || isKilled || !token) return;
+
+    const syncOfflineProgress = async () => {
+      if (typeof window === 'undefined') return;
+      const offlineData = localStorage.getItem(`offline_sync_${lectureId}`);
+      if (offlineData) {
+        try {
+          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+          const res = await fetch(`${API_URL}/api/lectures/${lectureId}/progress`, {
+            method: 'POST',
+            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
+            body: offlineData
+          });
+          if (res.ok) {
+            localStorage.removeItem(`offline_sync_${lectureId}`);
+          }
+        } catch (e) {}
+      }
+    };
+
+    if (typeof window !== 'undefined') {
+      window.addEventListener('online', syncOfflineProgress);
+      syncOfflineProgress();
+    }
 
     const pingInterval = setInterval(async () => {
       const player = playerRef.current;
       if (!player || player.paused()) return; 
       
-      if (player.playbackRate() > 2) player.playbackRate(2);
+      if (player.playbackRate() > 2) {
+          player.playbackRate(2);
+      }
 
       const currentTime = player.currentTime();
       const duration = player.duration();
 
       if (currentTime > 0 && duration > 0) {
-        try {
-          // 🚀 استخدام Axios النظيف
-          const res = await api.post(`/lectures/${lectureId}/progress`, {
+        const payload = JSON.stringify({ 
             watch_time: currentTime, 
             total_duration: duration, 
             stream_id: streamIdRef.current 
+        });
+        
+        try {
+          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
+          const res = await fetch(`${API_URL}/api/lectures/${lectureId}/progress`, {
+            method: 'POST',
+            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
+            body: payload
           });
           
-          if (res.data?.data?.is_completed || res.data?.is_completed) {
-            onCompletedRef.current?.();
-          }
-          onProgressRef.current?.(currentTime, duration);
-        } catch (error: any) {
-          if (error.response && (error.response.status === 403 || error.response.status === 409)) {
+          if (res.status === 403 || res.status === 409) {
              setIsKilled(true);
              setKillReason('account_shared');
              onViolationRef.current?.('account_shared');
+             return;
           }
+
+          if (res.ok) {
+            const responseData = await res.json();
+            const data = responseData.data || responseData;
+            // تحديث حالة الاكتمال مباشرة من رد السيرفر
+            if (data.is_completed) onCompletedRef.current?.();
+          }
+          
+          onProgressRef.current?.(currentTime, duration);
+        } catch (error) {
+            if (typeof window !== 'undefined') {
+                localStorage.setItem(`offline_sync_${lectureId}`, payload);
+            }
         }
       }
     }, 15000); 
 
-    return () => clearInterval(pingInterval);
+    return () => {
+      clearInterval(pingInterval);
+      if (typeof window !== 'undefined') {
+        window.removeEventListener('online', syncOfflineProgress);
+      }
+    };
   }, [isClient, isKilled, lectureId, token]);
 
   if (!isClient) return null;
   if (!scriptsLoaded) {
     return (
-      <div className="w-full aspect-video bg-gray-900 flex items-center justify-center text-white rounded-2xl shadow-inner border border-gray-800">
-        <div className="flex flex-col items-center gap-4">
-          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
-          <p className="font-bold text-gray-300 tracking-wide">جاري تهيئة المشغل الآمن...</p>
+      <div className="w-full aspect-video bg-black flex items-center justify-center text-white rounded-md shadow-lg">
+        <div className="flex flex-col items-center">
+          <span className="text-4xl mb-2 animate-bounce">⚙️</span>
+          <p>جاري تجهيز المشغل الآمن...</p>
         </div>
       </div>
     );
   }
 
- return (
-    // 🚀 تم إضافة style={{ aspectRatio: '16/9', minHeight: '300px' }} لمنع انهيار الحاوية
-    <div ref={containerRef} className="relative w-full bg-black overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/10" style={{ aspectRatio: '16/9', minHeight: '300px' }} onContextMenu={(e) => e.preventDefault()}>
+  return (
+    <div ref={containerRef} className="video-player-container relative w-full aspect-video bg-black overflow-hidden rounded-md shadow-lg" onContextMenu={(e) => e.preventDefault()}>
       <div data-vjs-player ref={videoWrapperRef} className={`absolute inset-0 w-full h-full ${isKilled ? 'hidden' : ''}`} />
       <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full pointer-events-none z-[60] ${isKilled ? 'hidden' : ''}`} />
 
       {isKilled && (
-        <div className="absolute inset-0 z-[100] w-full h-full bg-red-600 flex flex-col items-center justify-center text-white p-8 text-center animate-fade-in">
-          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm">
-            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
-          </div>
-          <h2 className="text-3xl font-black mb-4 tracking-tight">تنبيه أمني صارم</h2>
-          <p className="text-red-50 text-lg leading-relaxed max-w-2xl font-bold bg-black/20 p-6 rounded-xl border border-red-500/50">
+        <div className="absolute inset-0 z-[100] w-full h-full bg-red-900 flex flex-col items-center justify-center text-white p-6 text-center">
+          <span className="text-5xl mb-4">🛑</span>
+          <h2 className="text-2xl font-bold mb-2">تم إيقاف التشغيل</h2>
+          <p className="text-red-200 text-sm leading-relaxed max-w-md">
             {killReason === 'devtools' ? (
-              <>تم إيقاف تشغيل الفيديو لأن نظام الحماية اكتشف محاولة لاستخدام أدوات خارجية أو تصوير الشاشة.<br/>تم تسجيل هذه المحاولة كـ (مخالفة أمنية) في حسابك.</>
+              <>تم ايقاف الفيديو لانه تم ملاحظة محاولة استخدام لادوات المطور.<br/>سيتم ارسال هذا التحذير للاستاذ.<br/>قد يؤدي تكرر هذا التصرف الى حظر حسابك</>
             ) : (
-              <>تم اكتشاف جلسة مشاهدة أخرى نشطة لحسابك في نفس اللحظة!<br/>يُمنع مشاركة الحسابات وسيتم اتخاذ الإجراءات اللازمة ضد الحسابات المخالفة.</>
+              <>تم اكتشاف استخدام هذا الحساب للمشاهدة على جهاز آخر أو تبويب آخر في نفس اللحظة!<br/>(يُمنع مشاركة الحسابات حسب سياسة المنصة).</>
             )}
           </p>
         </div>
```

### `e2e\security.spec.ts`
```diff
--- Current: e2e\security.spec.ts
+++ Other: e2e\security.spec.ts
@@ -1,7 +1,4 @@
 import { test, expect } from '@playwright/test';
-import * as path from 'path';
-import * as os from 'os';
-import * as fs from 'fs';
 
 const API_URL = 'http://localhost:8000';
 
@@ -57,7 +54,8 @@
     await page.selectOption('#governorate', { index: 1 });
     await page.fill('#parent_job', 'XSS Test Job');
 
-    const filePath = path.join(os.tmpdir(), 'test-id.png');
+    const filePath = require('path').join(require('os').tmpdir(), 'test-id.png');
+    const fs = require('fs');
     if (!fs.existsSync(filePath)) {
       fs.writeFileSync(filePath, Buffer.alloc(1024));
     }
```

### `test-results\.last-run.json`
```diff
--- Current: test-results\.last-run.json
+++ Other: test-results\.last-run.json
@@ -1,4 +1,7 @@
 {
-  "status": "passed",
-  "failedTests": []
+  "status": "failed",
+  "failedTests": [
+    "b544d83587a17b58f3ea-d46d226206c932b6e302",
+    "b544d83587a17b58f3ea-ae389ffdc5116ac8ed45"
+  ]
 }```

