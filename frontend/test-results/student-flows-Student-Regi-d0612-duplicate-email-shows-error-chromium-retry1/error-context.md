# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: student-flows.spec.ts >> Student Registration Flow >> TC-S02: Register with duplicate email shows error
- Location: e2e\student-flows.spec.ts:110:7

# Error details

```
Error: Registration failed: {"message":"Too Many Attempts.","exception":"Illuminate\\Http\\Exceptions\\ThrottleRequestsException","file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Routing\\Middleware\\ThrottleRequests.php","line":254,"trace":[{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Routing\\Middleware\\ThrottleRequests.php","line":158,"function":"buildException","class":"Illuminate\\Routing\\Middleware\\ThrottleRequests","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Routing\\Middleware\\ThrottleRequests.php","line":93,"function":"handleRequest","class":"Illuminate\\Routing\\Middleware\\ThrottleRequests","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":219,"function":"handle","class":"Illuminate\\Routing\\Middleware\\ThrottleRequests","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\app\\Http\\Middleware\\ForceJsonResponse.php","line":15,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":219,"function":"handle","class":"App\\Http\\Middleware\\ForceJsonResponse","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Http\\Middleware\\HandleCors.php","line":74,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":219,"function":"handle","class":"Illuminate\\Http\\Middleware\\HandleCors","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":137,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Routing\\Router.php","line":821,"function":"then","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Routing\\Router.php","line":800,"function":"runRouteWithinStack","class":"Illuminate\\Routing\\Router","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Routing\\Router.php","line":764,"function":"runRoute","class":"Illuminate\\Routing\\Router","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Routing\\Router.php","line":753,"function":"dispatchToRoute","class":"Illuminate\\Routing\\Router","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Http\\Kernel.php","line":200,"function":"dispatch","class":"Illuminate\\Routing\\Router","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":180,"function":"Illuminate\\Foundation\\Http\\{closure}","class":"Illuminate\\Foundation\\Http\\Kernel","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Http\\Middleware\\TransformsRequest.php","line":21,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Http\\Middleware\\ConvertEmptyStringsToNull.php","line":31,"function":"handle","class":"Illuminate\\Foundation\\Http\\Middleware\\TransformsRequest","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":219,"function":"handle","class":"Illuminate\\Foundation\\Http\\Middleware\\ConvertEmptyStringsToNull","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Http\\Middleware\\TransformsRequest.php","line":21,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Http\\Middleware\\TrimStrings.php","line":51,"function":"handle","class":"Illuminate\\Foundation\\Http\\Middleware\\TransformsRequest","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":219,"function":"handle","class":"Illuminate\\Foundation\\Http\\Middleware\\TrimStrings","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Http\\Middleware\\ValidatePostSize.php","line":27,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":219,"function":"handle","class":"Illuminate\\Http\\Middleware\\ValidatePostSize","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Http\\Middleware\\PreventRequestsDuringMaintenance.php","line":109,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":219,"function":"handle","class":"Illuminate\\Foundation\\Http\\Middleware\\PreventRequestsDuringMaintenance","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Http\\Middleware\\HandleCors.php","line":74,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":219,"function":"handle","class":"Illuminate\\Http\\Middleware\\HandleCors","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Http\\Middleware\\TrustProxies.php","line":58,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":219,"function":"handle","class":"Illuminate\\Http\\Middleware\\TrustProxies","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Http\\Middleware\\InvokeDeferredCallbacks.php","line":22,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":219,"function":"handle","class":"Illuminate\\Foundation\\Http\\Middleware\\InvokeDeferredCallbacks","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Http\\Middleware\\ValidatePathEncoding.php","line":26,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":219,"function":"handle","class":"Illuminate\\Http\\Middleware\\ValidatePathEncoding","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":137,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Http\\Kernel.php","line":175,"function":"then","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Http\\Kernel.php","line":144,"function":"sendRequestThroughRouter","class":"Illuminate\\Foundation\\Http\\Kernel","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php","line":1220,"function":"handle","class":"Illuminate\\Foundation\\Http\\Kernel","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\public\\index.php","line":20,"function":"handleRequest","class":"Illuminate\\Foundation\\Application","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\resources\\server.php","line":23,"function":"require_once"}]}
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const API_URL = 'http://localhost:8000';
  4   | 
  5   | // ─── Register a new student via API and return token ───
  6   | async function registerStudent(page: any, suffix: string, retries = 3) {
  7   |   const email = `test-student-${suffix}@example.com`;
  8   |   const password = 'Password123!';
  9   |   const phone = `0100${String(Math.floor(10000000 + Math.random() * 90000000)).slice(0, 7)}`;
  10  |   const parentPhone = `0100${String(Math.floor(10000000 + Math.random() * 90000000)).slice(0, 7)}`;
  11  | 
  12  |   for (let attempt = 0; attempt < retries; attempt++) {
  13  |     try {
  14  |       const response = await page.request.post('http://localhost:8000/api/auth/register', {
  15  |         headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  16  |         data: {
  17  |           full_name: `Test Student ${suffix}`,
  18  |           email,
  19  |           password,
  20  |           password_confirmation: password,
  21  |           phone,
  22  |           parent_phone: parentPhone,
  23  |           academic_year: 'الاول الابتدائي',
  24  |           student_number: `STU${Date.now()}${attempt}`,
  25  |           school: `Test School ${suffix}`,
  26  |           parent_job: `Test Job ${suffix}`,
  27  |           governorate: 'القاهرة',
  28  |         },
  29  |       });
  30  | 
  31  |       const data = await response.json();
  32  |       if (!response.ok()) {
  33  |         if (response.status() === 429 && attempt < retries - 1) {
  34  |           await new Promise(r => setTimeout(r, 2000));
  35  |           continue;
  36  |         }
> 37  |         throw new Error(`Registration failed: ${JSON.stringify(data)}`);
      |               ^ Error: Registration failed: {"message":"Too Many Attempts.","exception":"Illuminate\\Http\\Exceptions\\ThrottleRequestsException","file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Routing\\Middleware\\ThrottleRequests.php","line":254,"trace":[{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Routing\\Middleware\\ThrottleRequests.php","line":158,"function":"buildException","class":"Illuminate\\Routing\\Middleware\\ThrottleRequests","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Routing\\Middleware\\ThrottleRequests.php","line":93,"function":"handleRequest","class":"Illuminate\\Routing\\Middleware\\ThrottleRequests","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":219,"function":"handle","class":"Illuminate\\Routing\\Middleware\\ThrottleRequests","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\app\\Http\\Middleware\\ForceJsonResponse.php","line":15,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":219,"function":"handle","class":"App\\Http\\Middleware\\ForceJsonResponse","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Http\\Middleware\\HandleCors.php","line":74,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":219,"function":"handle","class":"Illuminate\\Http\\Middleware\\HandleCors","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":137,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Routing\\Router.php","line":821,"function":"then","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Routing\\Router.php","line":800,"function":"runRouteWithinStack","class":"Illuminate\\Routing\\Router","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Routing\\Router.php","line":764,"function":"runRoute","class":"Illuminate\\Routing\\Router","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Routing\\Router.php","line":753,"function":"dispatchToRoute","class":"Illuminate\\Routing\\Router","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Http\\Kernel.php","line":200,"function":"dispatch","class":"Illuminate\\Routing\\Router","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":180,"function":"Illuminate\\Foundation\\Http\\{closure}","class":"Illuminate\\Foundation\\Http\\Kernel","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Http\\Middleware\\TransformsRequest.php","line":21,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Http\\Middleware\\ConvertEmptyStringsToNull.php","line":31,"function":"handle","class":"Illuminate\\Foundation\\Http\\Middleware\\TransformsRequest","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":219,"function":"handle","class":"Illuminate\\Foundation\\Http\\Middleware\\ConvertEmptyStringsToNull","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Http\\Middleware\\TransformsRequest.php","line":21,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Http\\Middleware\\TrimStrings.php","line":51,"function":"handle","class":"Illuminate\\Foundation\\Http\\Middleware\\TransformsRequest","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":219,"function":"handle","class":"Illuminate\\Foundation\\Http\\Middleware\\TrimStrings","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Http\\Middleware\\ValidatePostSize.php","line":27,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":219,"function":"handle","class":"Illuminate\\Http\\Middleware\\ValidatePostSize","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Http\\Middleware\\PreventRequestsDuringMaintenance.php","line":109,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":219,"function":"handle","class":"Illuminate\\Foundation\\Http\\Middleware\\PreventRequestsDuringMaintenance","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Http\\Middleware\\HandleCors.php","line":74,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":219,"function":"handle","class":"Illuminate\\Http\\Middleware\\HandleCors","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Http\\Middleware\\TrustProxies.php","line":58,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":219,"function":"handle","class":"Illuminate\\Http\\Middleware\\TrustProxies","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Http\\Middleware\\InvokeDeferredCallbacks.php","line":22,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":219,"function":"handle","class":"Illuminate\\Foundation\\Http\\Middleware\\InvokeDeferredCallbacks","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Http\\Middleware\\ValidatePathEncoding.php","line":26,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":219,"function":"handle","class":"Illuminate\\Http\\Middleware\\ValidatePathEncoding","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php","line":137,"function":"Illuminate\\Pipeline\\{closure}","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Http\\Kernel.php","line":175,"function":"then","class":"Illuminate\\Pipeline\\Pipeline","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Http\\Kernel.php","line":144,"function":"sendRequestThroughRouter","class":"Illuminate\\Foundation\\Http\\Kernel","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php","line":1220,"function":"handle","class":"Illuminate\\Foundation\\Http\\Kernel","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\public\\index.php","line":20,"function":"handleRequest","class":"Illuminate\\Foundation\\Application","type":"->"},{"file":"C:\\Users\\drhab\\OneDrive\\Desktop\\final-version\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\resources\\server.php","line":23,"function":"require_once"}]}
  38  |       }
  39  | 
  40  |       const devOtp = data.data?.dev_otp || '123456';
  41  |       const tempUserId = data.data?.temp_user_id;
  42  | 
  43  |       // Verify OTP via API (with retry for rate limiting)
  44  |       for (let otpAttempt = 0; otpAttempt < retries; otpAttempt++) {
  45  |         try {
  46  |           const otpResponse = await page.request.post('http://localhost:8000/api/auth/verify-otp', {
  47  |             headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  48  |             data: { temp_user_id: tempUserId, otp: devOtp },
  49  |           });
  50  | 
  51  |           const otpData = await otpResponse.json();
  52  |           if (!otpResponse.ok()) {
  53  |             if (otpResponse.status() === 429 && otpAttempt < retries - 1) {
  54  |               await new Promise(r => setTimeout(r, 2000));
  55  |               continue;
  56  |             }
  57  |             throw new Error(`OTP verification failed: ${JSON.stringify(otpData)}`);
  58  |           }
  59  | 
  60  |           // Store token in browser for UI tests
  61  |           const token = otpData.data?.token;
  62  |           if (token) {
  63  |             await page.goto('/');
  64  |             await page.evaluate((t) => {
  65  |               localStorage.setItem('token', t);
  66  |               document.cookie = `token=${t}; path=/; max-age=2592000`;
  67  |             }, token);
  68  |           }
  69  | 
  70  |           return { email, password, phone };
  71  |         } catch (e: any) {
  72  |           if (e.message?.includes('429') && otpAttempt < retries - 1) {
  73  |             await new Promise(r => setTimeout(r, 2000));
  74  |             continue;
  75  |           }
  76  |           throw e;
  77  |         }
  78  |       }
  79  |     } catch (e: any) {
  80  |       if (e.message?.includes('429') && attempt < retries - 1) {
  81  |         await new Promise(r => setTimeout(r, 2000));
  82  |         continue;
  83  |       }
  84  |       throw e;
  85  |     }
  86  |   }
  87  |   throw new Error('Registration failed after all retries');
  88  | }
  89  | 
  90  | // ─── Login and return token ───
  91  | async function loginAs(page: any, email: string, password: string) {
  92  |   await page.goto('/login');
  93  |   await page.waitForSelector('#email', { timeout: 10000 });
  94  | 
  95  |   await page.fill('#email', email);
  96  |   await page.fill('#password', password);
  97  |   await page.click('button[type="submit"]');
  98  |   await page.waitForTimeout(3000);
  99  |   return page;
  100 | }
  101 | 
  102 | test.describe('Student Registration Flow', () => {
  103 |   test('TC-S01: Register new student with valid data', async ({ page }) => {
  104 |     const { email } = await registerStudent(page, `reg-${Date.now()}`);
  105 |     // Token stored, should be on a valid page
  106 |     const currentUrl = page.url();
  107 |     expect(currentUrl).toBeTruthy();
  108 |   });
  109 | 
  110 |   test('TC-S02: Register with duplicate email shows error', async ({ page }) => {
  111 |     const suffix = `dup-${Date.now()}`;
  112 |     const email = `test-student-${suffix}@example.com`;
  113 |     await registerStudent(page, suffix);
  114 | 
  115 |     // Try registering with same email via API (expect 422 validation error)
  116 |     const response = await page.request.post('http://localhost:8000/api/auth/register', {
  117 |       headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  118 |       data: {
  119 |         full_name: 'Duplicate Student',
  120 |         email,
  121 |         password: 'Password123!',
  122 |         password_confirmation: 'Password123!',
  123 |         phone: `0100${String(Math.floor(10000000 + Math.random() * 90000000)).slice(0, 7)}`,
  124 |         parent_phone: `0100${String(Math.floor(10000000 + Math.random() * 90000000)).slice(0, 7)}`,
  125 |         academic_year: 'الاول الابتدائي',
  126 |         student_number: `STU${Date.now()}`,
  127 |         school: 'Duplicate School',
  128 |         parent_job: 'Duplicate Job',
  129 |         governorate: 'القاهرة',
  130 |       },
  131 |     });
  132 |     // 422 for validation error, or 429 if rate limited (both are acceptable)
  133 |     expect([422, 429]).toContain(response.status());
  134 |   });
  135 | 
  136 |   test('TC-S03: Login with wrong password shows error', async ({ page }) => {
  137 |     await page.goto('/login');
```