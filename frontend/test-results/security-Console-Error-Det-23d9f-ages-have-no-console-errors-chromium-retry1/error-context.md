# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: security.spec.ts >> Console Error Detection >> TC-SEC-CONSOLE01: Main pages have no console errors
- Location: e2e\security.spec.ts:120:7

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
    - generic [ref=e20]:
      - generic [ref=e21]:
        - generic [ref=e24]: منصة تعليمية متكاملة
        - heading "تعلم بذكاء وحقق التميز مع منصتنا" [level=1] [ref=e25]:
          - text: تعلم بذكاء
          - text: وحقق التميز مع منصتنا
        - paragraph [ref=e26]: منصة تعليمية عربية تجمع بين الشرح العميق والمحتوى التفاعلي عالي الجودة لتحقيق أقصى استفادة من رحلتك التعليمية.
        - generic [ref=e27]:
          - link "سجل الآن مجاناً" [ref=e28] [cursor=pointer]:
            - /url: /register
            - img [ref=e29]
            - text: سجل الآن مجاناً
          - link "دخول" [ref=e32] [cursor=pointer]:
            - /url: /login
        - generic [ref=e33]:
          - generic [ref=e34]:
            - img [ref=e36]
            - generic [ref=e41]:
              - generic [ref=e42]: +1,000
              - generic [ref=e43]: طالب مسجل
          - generic [ref=e44]:
            - img [ref=e46]
            - generic [ref=e49]:
              - generic [ref=e50]: 50+
              - generic [ref=e51]: محاضرة
      - generic [ref=e52]:
        - generic [ref=e55]:
          - img [ref=e57]
          - generic [ref=e59]:
            - generic [ref=e60]: تعليم عن بعد
            - generic [ref=e61]: من أي مكان وفي أي وقت
        - generic [ref=e62]:
          - img [ref=e64]
          - generic [ref=e66]:
            - generic [ref=e67]: محتوى محمي
            - generic [ref=e68]: بتقنيات التشفير المتقدمة
        - generic [ref=e69]:
          - generic [ref=e71]:
            - img [ref=e73]
            - generic [ref=e76]: رحلتك التعليمية تبدأ هنا
          - generic [ref=e77]:
            - generic [ref=e78]:
              - img [ref=e80]
              - generic [ref=e83]:
                - generic [ref=e84]: فيزياء - الثالث الثانوي
                - generic [ref=e85]: شرح كامل للمنهج + اختبارات
            - generic [ref=e86]:
              - img [ref=e88]
              - generic [ref=e91]:
                - generic [ref=e92]: جدول مرن
                - generic [ref=e93]: ادرس حسب وقتك
            - generic [ref=e94]:
              - img [ref=e96]
              - generic [ref=e98]:
                - generic [ref=e99]: متابعة ذكية
                - generic [ref=e100]: تقارير أداء وتوصيات
    - generic [ref=e101]:
      - generic [ref=e102]:
        - generic [ref=e103]:
          - img [ref=e104]
          - generic [ref=e108]: مميزات المنصة
        - heading "ليه تختار منصتنا؟" [level=2] [ref=e109]
        - paragraph [ref=e110]: نقدم لك تجربة تعليمية متكاملة تجمع بين أحدث أساليب التعليم وأفضل الممارسات التربوية
      - generic [ref=e111]:
        - generic [ref=e112]:
          - img [ref=e114]
          - heading "تعلم عميق" [level=3] [ref=e117]
          - paragraph [ref=e118]: نظام تعليمي متكامل يركز على الفهم العميق للمادة وليس الحفظ فقط.
        - generic [ref=e119]:
          - img [ref=e121]
          - heading "محاضرات تفاعلية" [level=3] [ref=e124]
          - paragraph [ref=e125]: فيديوهات تفاعلية عالية الجودة مع شرح وافي ومبسط لكل درس.
        - generic [ref=e126]:
          - img [ref=e128]
          - heading "لوحة متابعة ذكية" [level=3] [ref=e130]
          - paragraph [ref=e131]: تتبع تقدمك الدراسي مع إحصائيات وتقارير أداء لحظة بلحظة.
        - generic [ref=e132]:
          - img [ref=e134]
          - heading "مجتمع تعليمي" [level=3] [ref=e139]
          - paragraph [ref=e140]: منتدى تفاعلي للتواصل مع زملائك وطرح الأسئلة والاستفسارات.
        - generic [ref=e141]:
          - img [ref=e143]
          - heading "اختبارات تقويمية" [level=3] [ref=e146]
          - paragraph [ref=e147]: اختبارات دورية لقياس مستواك وتعزيز الفهم ومراجعة الدروس.
        - generic [ref=e148]:
          - img [ref=e150]
          - heading "مرونة في التعلم" [level=3] [ref=e153]
          - paragraph [ref=e154]: ادرس في أي وقت ومن أي مكان وفق جدولك الخاص ووتيرتك المناسبة.
    - generic [ref=e155]:
      - generic [ref=e156]:
        - generic [ref=e157]:
          - img [ref=e158]
          - generic [ref=e161]: كورساتنا
        - heading "أحدث الكورسات" [level=2] [ref=e162]
        - paragraph [ref=e163]: محتوى تعليمي محدث باستمرار لضمان أفضل تجربة تعلم
      - generic [ref=e164]:
        - img [ref=e166]
        - heading "لا توجد كورسات متاحة حالياً" [level=3] [ref=e169]
        - paragraph [ref=e170]: سيتم إضافة كورسات جديدة قريباً، تابعنا!
    - generic [ref=e173]:
      - generic [ref=e174]:
        - img [ref=e176]
        - generic [ref=e179]: 50+
        - text: محاضرة تعليمية
      - generic [ref=e180]:
        - img [ref=e182]
        - generic [ref=e187]: 1,000+
        - text: طالب مسجل
      - generic [ref=e188]:
        - img [ref=e190]
        - generic [ref=e193]: "0"
        - text: كورس متاح
    - generic [ref=e195]:
      - heading "ابدأ رحلتك التعليمية الآن" [level=2] [ref=e196]
      - paragraph [ref=e197]: انضم إلى مجتمعنا المتنامي من الطلاب وابدأ في تحقيق أهدافك التعليمية مع أفضل المحاضرات والكورسات المتاحة.
      - generic [ref=e198]:
        - link "سجل مجاناً" [ref=e199] [cursor=pointer]:
          - /url: /register
          - img [ref=e200]
          - text: سجل مجاناً
        - link "شاهد الكورسات" [ref=e203] [cursor=pointer]:
          - /url: /courses
    - contentinfo [ref=e204]:
      - generic [ref=e205]:
        - generic [ref=e206]:
          - generic [ref=e207]:
            - generic [ref=e208]: م
            - generic [ref=e209]: منصتنا
          - paragraph [ref=e210]: منصتك التعليمية المتكاملة للتميز في التعلم العميق. نقدم أفضل المحاضرات والكورسات التعليمية في الوطن العربي.
        - generic [ref=e211]:
          - heading "روابط سريعة" [level=4] [ref=e212]
          - list [ref=e213]:
            - listitem [ref=e214]:
              - link "الكورسات" [ref=e215] [cursor=pointer]:
                - /url: /courses
            - listitem [ref=e216]:
              - link "التسجيل" [ref=e217] [cursor=pointer]:
                - /url: /register
            - listitem [ref=e218]:
              - link "تسجيل الدخول" [ref=e219] [cursor=pointer]:
                - /url: /login
            - listitem [ref=e220]:
              - link "المنتدى" [ref=e221] [cursor=pointer]:
                - /url: /forum
        - generic [ref=e222]:
          - heading "الدعم" [level=4] [ref=e223]
          - list [ref=e224]:
            - listitem [ref=e225]:
              - link "طرق الدفع" [ref=e226] [cursor=pointer]:
                - /url: /wallet
            - listitem [ref=e227]: الشروط والأحكام
            - listitem [ref=e228]: سياسة الخصوصية
            - listitem [ref=e229]: الدعم الفني
      - generic [ref=e230]:
        - generic [ref=e231]: © 2026 منصتنا - جميع الحقوق محفوظة
        - generic [ref=e232]: منصة تعليمية عربية متكاملة
  - button "Open Next.js Dev Tools" [ref=e238] [cursor=pointer]:
    - generic [ref=e241]:
      - text: Compiling
      - generic [ref=e242]:
        - generic [ref=e243]: .
        - generic [ref=e244]: .
        - generic [ref=e245]: .
  - alert [ref=e246]: تعلم بذكاء وحقق التميز مع منصتنا
```

# Test source

```ts
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
> 129 |       await page.waitForLoadState('networkidle');
      |                  ^ Error: page.waitForLoadState: Test timeout of 60000ms exceeded.
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