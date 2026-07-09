# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: security.spec.ts >> XSS & Injection >> TC-SEC-XSS02: Course search handles special characters
- Location: e2e\security.spec.ts:81:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.waitForLoadState: Test timeout of 60000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - navigation [ref=e3]:
      - generic [ref=e4]:
        - link "م منصتنا" [ref=e5] [cursor=pointer]:
          - /url: /
          - generic [ref=e6]: م
          - generic [ref=e7]: منصتنا
        - list [ref=e8]:
          - listitem [ref=e9]:
            - link "الرئيسية" [ref=e10] [cursor=pointer]:
              - /url: /
          - listitem [ref=e11]:
            - link "الكورسات" [ref=e12] [cursor=pointer]:
              - /url: /courses
        - generic [ref=e13]:
          - link "دخول" [ref=e14] [cursor=pointer]:
            - /url: /login
          - link "تسجيل" [ref=e15] [cursor=pointer]:
            - /url: /register
          - button "تبديل الوضع" [ref=e16] [cursor=pointer]:
            - img [ref=e17]
    - generic [ref=e19]:
      - generic [ref=e21]:
        - heading "استكشف الكورسات" [level=1] [ref=e22]
        - paragraph [ref=e23]: اختر الكورس المناسب وابدأ رحلة التعلم
      - generic [ref=e24]:
        - img [ref=e26]
        - heading "لا توجد كورسات متاحة حالياً" [level=3] [ref=e29]
        - paragraph [ref=e30]: يرجى العودة لاحقاً لاستكشاف الكورسات الجديدة
  - button "Open Next.js Dev Tools" [ref=e36] [cursor=pointer]:
    - img [ref=e37]
  - alert [ref=e40]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const API_URL = 'http://localhost:8000';
  4   | 
  5   | test.describe('API Security & Authentication', () => {
  6   |   const endpoints = [
  7   |     { method: 'GET', url: '/api/auth/me' },
  8   |     { method: 'POST', url: '/api/auth/logout' },
  9   |     // /api/courses is public, intentionally excluded
  10  |     { method: 'GET', url: '/api/wallet/balance' },
  11  |     { method: 'POST', url: '/api/wallet/topup/initiate' },
  12  |     { method: 'GET', url: '/api/admin/courses' },
  13  |     // ⚠️ The following were rewired from BROKEN → real inventory endpoints:
  14  |     // /api/admin/pending-students → /api/admin/users/pending
  15  |     { method: 'GET', url: '/api/admin/users/pending' },
  16  |     // /api/admin/finance (no such route) → /api/admin/wallet/summary
  17  |     { method: 'GET', url: '/api/admin/wallet/summary' },
  18  |     // /api/admin/wallet/pending (no such route) → /api/admin/wallet/topups?status=pending
  19  |     { method: 'GET', url: '/api/admin/wallet/topups?status=pending' },
  20  |     // /api/admin/topups → /api/admin/wallet/topups
  21  |     { method: 'GET', url: '/api/admin/wallet/topups' },
  22  |     { method: 'GET', url: '/api/admin/security/violations' },
  23  |     { method: 'GET', url: '/api/admin/settings' },
  24  |     { method: 'POST', url: '/api/admin/courses' },
  25  |     // ⚠️ /api/admin/students/1 (user deletion by DELETE) does not exist; the
  26  |     // closest user-management surface is
  27  |     // /api/admin/security/block-student/{user} (POST) or
  28  |     // /api/admin/users/{user}/reset-password (POST). Switch the test to a
  29  |     // POST against the block endpoint so the contract assertion is real.
  30  |     { method: 'POST', url: '/api/admin/security/block-student/1' },
  31  |   ];
  32  | 
  33  |   for (const ep of endpoints) {
  34  |     test(`TC-SEC-API: ${ep.method} ${ep.url} rejects without token`, async ({ page }) => {
  35  |       const response = await page.request.fetch(`${API_URL}${ep.url}`, {
  36  |         method: ep.method,
  37  |         headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  38  |       });
  39  |       expect(response.status()).toBeGreaterThanOrEqual(401);
  40  |       expect(response.status()).toBeLessThan(500);
  41  |     });
  42  |   }
  43  | });
  44  | 
  45  | test.describe('XSS & Injection', () => {
  46  |   test('TC-SEC-XSS01: Registration rejects XSS in name', async ({ page }) => {
  47  |     await page.goto('/register');
  48  |     await page.waitForSelector('#full_name', { timeout: 10000 });
  49  | 
  50  |     // Step 1
  51  |     await page.fill('#full_name', '<script>alert("xss")</script>');
  52  |     await page.fill('#email', `xss-test-${Date.now()}@test.com`);
  53  |     await page.fill('#password', 'Password123!');
  54  |     await page.fill('#confirmPassword', 'Password123!');
  55  |     await page.click('button:has-text("التالي")');
  56  |     await page.waitForTimeout(500);
  57  | 
  58  |     // Step 2
  59  |     await page.fill('#student_number', `STU${Date.now()}`);
  60  |     await page.selectOption('#academic_year', { index: 1 });
  61  |     await page.fill('#phone', `0100${String(Math.floor(Math.random() * 90000000 + 10000000)).slice(0, 7)}`);
  62  |     await page.fill('#parent_phone', `0100${String(Math.floor(Math.random() * 90000000 + 10000000)).slice(0, 7)}`);
  63  |     await page.fill('#school', 'XSS Test School');
  64  |     await page.selectOption('#governorate', { index: 1 });
  65  |     await page.fill('#parent_job', 'XSS Test Job');
  66  | 
  67  |     const filePath = require('path').join(require('os').tmpdir(), 'test-id.png');
  68  |     const fs = require('fs');
  69  |     if (!fs.existsSync(filePath)) {
  70  |       fs.writeFileSync(filePath, Buffer.alloc(1024));
  71  |     }
  72  |     await page.locator('input[type="file"]').setInputFiles(filePath);
  73  |     await page.waitForTimeout(500);
  74  | 
  75  |     await page.click('button:has-text("إنشاء حساب")');
  76  |     await page.waitForTimeout(2000);
  77  |     const body = await page.textContent('body');
  78  |     expect(body).toBeTruthy();
  79  |   });
  80  | 
  81  |   test('TC-SEC-XSS02: Course search handles special characters', async ({ page }) => {
  82  |     await page.goto('/courses');
> 83  |     await page.waitForLoadState('networkidle');
      |                ^ Error: page.waitForLoadState: Test timeout of 60000ms exceeded.
  84  | 
  85  |     const searchInput = page.locator('input[placeholder*="بحث"]');
  86  |     if (await searchInput.isVisible()) {
  87  |       await searchInput.fill('<img src=x onerror=alert(1)>');
  88  |       await page.waitForTimeout(1000);
  89  |       const body = await page.textContent('body');
  90  |       expect(body).toBeTruthy();
  91  |     }
  92  |   });
  93  | });
  94  | 
  95  | test.describe('Rate Limiting & Abuse', () => {
  96  |   test('TC-SEC-RATE01: Rapid registration attempts are handled', async ({ page }) => {
  97  |     const results: number[] = [];
  98  |     for (let i = 0; i < 5; i++) {
  99  |       const response = await page.request.post(`${API_URL}/api/auth/register`, {
  100 |         headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  101 |         data: {
  102 |           full_name: 'Rate Test',
  103 |           email: `ratetest-${Date.now()}-${i}@test.com`,
  104 |           phone: `0100${String(Math.floor(Math.random() * 90000000 + 10000000)).slice(0, 7)}`,
  105 |           password: 'Password123!',
  106 |           password_confirmation: 'Password123!',
  107 |         },
  108 |       });
  109 |       results.push(response.status());
  110 |     }
  111 |     // All requests should either succeed or be rate-limited
  112 |     for (const status of results) {
  113 |       expect(status).toBeGreaterThanOrEqual(200);
  114 |       expect(status).toBeLessThan(500);
  115 |     }
  116 |   });
  117 | });
  118 | 
  119 | test.describe('Console Error Detection', () => {
  120 |   test('TC-SEC-CONSOLE01: Main pages have no console errors', async ({ page }) => {
  121 |     const consoleErrors: string[] = [];
  122 |     page.on('console', (msg) => {
  123 |       if (msg.type() === 'error') consoleErrors.push(msg.text());
  124 |     });
  125 | 
  126 |     const pages = ['/', '/login', '/register', '/courses'];
  127 |     for (const path of pages) {
  128 |       await page.goto(path);
  129 |       await page.waitForLoadState('networkidle');
  130 |     }
  131 | 
  132 |     // Allow known non-critical errors (like favicon 404)
  133 |     const criticalErrors = consoleErrors.filter(
  134 |       (e) => !e.includes('favicon') && !e.includes('Failed to load resource')
  135 |     );
  136 |     expect(criticalErrors.length).toBe(0);
  137 |   });
  138 | 
  139 |   test('TC-SEC-CONSOLE02: Admin pages have no console errors', async ({ page }) => {
  140 |     const consoleErrors: string[] = [];
  141 |     page.on('console', (msg) => {
  142 |       if (msg.type() === 'error') consoleErrors.push(msg.text());
  143 |     });
  144 | 
  145 |     // Login first
  146 |     await page.goto('/login');
  147 |     await page.waitForSelector('#email', { timeout: 10000 });
  148 |     await page.fill('#email', 'admin@eduplatform.com');
  149 |     await page.fill('#password', 'password');
  150 |     await page.click('button[type="submit"]');
  151 |     await page.waitForTimeout(2000);
  152 | 
  153 |     const adminPages = [
  154 |       '/admin', '/admin/courses', '/admin/pending-students',
  155 |       '/admin/finance', '/admin/wallet', '/admin/topups',
  156 |       '/admin/security', '/admin/forum', '/admin/settings',
  157 |       '/admin/center-codes', '/admin/payment-numbers',
  158 |     ];
  159 |     for (const path of adminPages) {
  160 |       await page.goto(path);
  161 |       await page.waitForLoadState('networkidle');
  162 |     }
  163 | 
  164 |     const criticalErrors = consoleErrors.filter(
  165 |       (e) => !e.includes('favicon') && !e.includes('Failed to load resource')
  166 |     );
  167 |     expect(criticalErrors.length).toBe(0);
  168 |   });
  169 | });
  170 | 
```