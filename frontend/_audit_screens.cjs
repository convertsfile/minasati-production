// Playwright screenshot script for design-quality audit
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '.pi', 'artifacts', 'frontend-migration', 'screenshots');
fs.mkdirSync(OUT_DIR, { recursive: true });

const BASE = 'http://localhost:3002';

async function setAuthCookie(context) {
  // Use domain+path instead of url to satisfy addCookies API
  await context.addCookies([
    {
      name: 'token',
      value: 'audit-mock-token',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
    },
  ]);
}

async function mockAuthMe(context) {
  await context.addInitScript(() => {
    const originalFetch = window.fetch;
    window.fetch = async function (input, init) {
      const url = typeof input === 'string' ? input : input?.url;
      if (url && url.includes('/api/auth/me')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: 1,
              full_name: 'مدير المنصة',
              email: 'admin@eduplatform.com',
              isAdmin: true,
              is_admin: true,
              role: 'super_admin',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return originalFetch(input, init);
    };
  });
}

async function shot(page, name) {
  const target = path.join(OUT_DIR, name);
  try {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let y = 0;
        const step = 400;
        const timer = setInterval(() => {
          y += step;
          window.scrollTo(0, y);
          if (y >= document.body.scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            setTimeout(resolve, 300);
          }
        }, 80);
      });
    });
  } catch (e) { /* noop */ }
  await page.screenshot({ path: target, fullPage: true });
  const stat = fs.statSync(target);
  console.log(`[ok] ${name}  (${(stat.size / 1024).toFixed(1)} KB)`);
}

const VIEWS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

// auth: 'none' | 'user' (student) | 'admin'
const PAGES = [
  { url: '/', slug: 'home', auth: 'none' },
  { url: '/login', slug: 'login', auth: 'none' },
  { url: '/register', slug: 'register', auth: 'none' },
  { url: '/otp', slug: 'otp', auth: 'none' },
  { url: '/forum', slug: 'forum', auth: 'user' },
  { url: '/courses', slug: 'courses', auth: 'none' },
  { url: '/wallet', slug: 'wallet', auth: 'user' },
  { url: '/blocked', slug: 'blocked', auth: 'user' },
  { url: '/locked', slug: 'locked', auth: 'user' },
  { url: '/redeem', slug: 'redeem', auth: 'user' },
  { url: '/resubmit', slug: 'resubmit', auth: 'user' },
  { url: '/waiting-room', slug: 'waiting-room', auth: 'user' },
  { url: '/comprehensive-exams/1', slug: 'comp-exam', auth: 'user' },
  { url: '/admin', slug: 'admin-home', auth: 'admin' },
  { url: '/admin/students', slug: 'admin-students', auth: 'admin' },
  { url: '/admin/center-codes', slug: 'admin-center-codes', auth: 'admin' },
  { url: '/admin/pending-students', slug: 'admin-pending-students', auth: 'admin' },
  { url: '/admin/monitoring', slug: 'admin-monitoring', auth: 'admin' },
  { url: '/admin/exams', slug: 'admin-exams', auth: 'admin' },
  { url: '/admin/finance', slug: 'admin-finance', auth: 'admin' },
  { url: '/admin/payment-numbers', slug: 'admin-payment-numbers', auth: 'admin' },
  { url: '/admin/courses', slug: 'admin-courses', auth: 'admin' },
  { url: '/admin/forum', slug: 'admin-forum', auth: 'admin' },
  { url: '/admin/homework', slug: 'admin-homework', auth: 'admin' },
  { url: '/admin/security', slug: 'admin-security', auth: 'admin' },
  { url: '/admin/settings', slug: 'admin-settings', auth: 'admin' },
  { url: '/admin/topups', slug: 'admin-topups', auth: 'admin' },
  { url: '/admin/plan', slug: 'admin-plan', auth: 'admin' },
  { url: '/admin/stats/courses', slug: 'admin-stats-courses', auth: 'admin' },
  { url: '/admin/stats/finance', slug: 'admin-stats-finance', auth: 'admin' },
  { url: '/health/live', slug: 'health-live', auth: 'none' },
  { url: '/health/ready', slug: 'health-ready', auth: 'none' },
  { url: '/api/metrics', slug: 'api-metrics', auth: 'none' },
];

(async () => {
  const browser = await chromium.launch();
  for (const view of VIEWS) {
    console.log(`\n=== ${view.name} (${view.width}x${view.height}) ===`);
    for (const p of PAGES) {
      const context = await browser.newContext({
        viewport: { width: view.width, height: view.height },
        locale: 'ar-EG',
      });
      if (p.auth === 'user') await setAuthCookie(context);
      if (p.auth === 'admin') {
        await setAuthCookie(context);
        await mockAuthMe(context);
      }
      const page = await context.newPage();
      const url = `${BASE}${p.url}`;
      try {
        const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
        if (resp) console.log(`  -> ${p.url} HTTP ${resp.status()}`);
      } catch (e) {
        console.log(`  -> ${p.url} ERR ${e.message}`);
      }
      await page.waitForTimeout(2500);
      const slug = p.slug + (view.name === 'mobile' ? '-mobile' : '-desktop');
      try {
        await shot(page, `${slug}.png`);
      } catch (e) {
        console.log(`[fail] ${slug} ${e.message}`);
      }
      await context.close();
    }
  }
  await browser.close();
  console.log('\nDone.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
