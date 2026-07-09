# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: security.spec.ts >> XSS & Injection >> TC-SEC-XSS01: Registration rejects XSS in name
- Location: e2e\security.spec.ts:46:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('button:has-text("إنشاء الحساب")')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - navigation [ref=e2]:
    - generic [ref=e3]:
      - link "م منصتنا" [ref=e4] [cursor=pointer]:
        - /url: /
        - generic [ref=e5]: م
        - generic [ref=e6]: منصتنا
      - list [ref=e7]:
        - listitem [ref=e8]:
          - link "الرئيسية" [ref=e9] [cursor=pointer]:
            - /url: /
        - listitem [ref=e10]:
          - link "الكورسات" [ref=e11] [cursor=pointer]:
            - /url: /courses
      - generic [ref=e12]:
        - link "دخول" [ref=e13] [cursor=pointer]:
          - /url: /login
        - link "تسجيل" [ref=e14] [cursor=pointer]:
          - /url: /register
        - button "تبديل الوضع" [ref=e15] [cursor=pointer]:
          - img [ref=e16]
  - generic [ref=e18]:
    - generic [ref=e20]:
      - img [ref=e21]
      - heading "منصتنا" [level=1] [ref=e24]
      - paragraph [ref=e25]: منصتك التعليمية الذكية لتطوير مهاراتك والتفوق في دراستك
    - generic [ref=e27]:
      - generic [ref=e28]:
        - img [ref=e30]
        - heading "إنشاء حساب جديد" [level=2] [ref=e33]
        - paragraph [ref=e34]: املأ البيانات التالية للتسجيل في منصتنا
      - generic [ref=e35]:
        - img [ref=e37]
        - generic [ref=e40]: "2"
      - generic [ref=e41]:
        - generic [ref=e42]:
          - generic [ref=e43]:
            - generic [ref=e44]: السنة الدراسية
            - combobox "السنة الدراسية" [ref=e45]:
              - option "اختر..."
              - option "الاول الابتدائي" [selected]
              - option "الثاني الابتدائي"
              - option "الثالث الابتدائي"
              - option "الرابع الابتدائي"
              - option "الخامس الابتدائي"
              - option "السادس الابتدائي"
              - option "الاول الاعدادي"
              - option "الثاني الاعدادي"
              - option "الثالث الاعدادي"
              - option "الاول الثانوي"
              - option "الثاني الثانوية"
              - option "الثالث الثانوي"
          - generic [ref=e46]:
            - generic [ref=e47]: رقم الطالب السري
            - textbox "رقم الطالب السري" [ref=e48]:
              - /placeholder: رقم الطالب
              - text: STU1783607133735
        - generic [ref=e49]:
          - generic [ref=e50]:
            - generic [ref=e51]: رقم الهاتف
            - textbox "رقم الهاتف" [ref=e52]:
              - /placeholder: 01xxxxxxxxx
              - text: "01008424456"
          - generic [ref=e53]:
            - generic [ref=e54]: هاتف ولي الأمر
            - textbox "هاتف ولي الأمر" [ref=e55]:
              - /placeholder: 01xxxxxxxxx
              - text: "01009190439"
        - generic [ref=e56]:
          - generic [ref=e57]:
            - generic [ref=e58]: المدرسة
            - textbox "المدرسة" [ref=e59]:
              - /placeholder: اسم المدرسة
              - text: XSS Test School
          - generic [ref=e60]:
            - generic [ref=e61]: المحافظة
            - combobox "المحافظة" [ref=e62]:
              - option "اختر المحافظة..."
              - option "القاهرة" [selected]
              - option "الجيزة"
              - option "الاسكندرية"
              - option "الدقهلية"
              - option "البحيرة"
              - option "الغربية"
              - option "المنوفية"
              - option "الشرقية"
              - option "القليوبية"
              - option "كفر الشيخ"
              - option "الاقصر"
              - option "اسوان"
              - option "سوهاج"
              - option "المنيا"
              - option "قنا"
              - option "الوادي الجديد"
              - option "البحر الاحمر"
              - option "السويس"
              - option "الاسماعيلية"
              - option "بورسعيد"
              - option "دمياط"
              - option "شمال سيناء"
              - option "جنوب سيناء"
        - generic [ref=e63]:
          - generic [ref=e64]: وظيفة ولي الأمر
          - textbox "وظيفة ولي الأمر" [active] [ref=e65]:
            - /placeholder: أدخل وظيفة ولي الأمر
            - text: XSS Test Job
        - generic [ref=e68] [cursor=pointer]:
          - img "Preview" [ref=e69]
          - generic [ref=e70]: test-id.png
        - generic [ref=e71]:
          - button "رجوع" [ref=e72] [cursor=pointer]:
            - img [ref=e73]
            - text: رجوع
          - button "إنشاء حساب" [ref=e75] [cursor=pointer]:
            - img [ref=e76]
            - text: إنشاء حساب
      - generic [ref=e79]:
        - paragraph [ref=e80]: لديك حساب بالفعل؟
        - link "تسجيل الدخول" [ref=e81] [cursor=pointer]:
          - /url: /login
  - button "Open Next.js Dev Tools" [ref=e87] [cursor=pointer]:
    - img [ref=e88]
  - alert [ref=e91]
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
> 75  |     await page.click('button:has-text("إنشاء الحساب")');
      |                ^ Error: page.click: Test timeout of 60000ms exceeded.
  76  |     await page.waitForTimeout(2000);
  77  |     const body = await page.textContent('body');
  78  |     expect(body).toBeTruthy();
  79  |   });
  80  | 
  81  |   test('TC-SEC-XSS02: Course search handles special characters', async ({ page }) => {
  82  |     await page.goto('/courses');
  83  |     await page.waitForLoadState('networkidle');
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