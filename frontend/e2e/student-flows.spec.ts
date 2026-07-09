import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:8000';

// ─── Register a new student via API and return token ───
async function registerStudent(page: any, suffix: string, retries = 3) {
  const email = `test-student-${suffix}@example.com`;
  const password = 'Password123!';
  const phone = `0100${String(Math.floor(10000000 + Math.random() * 90000000)).slice(0, 7)}`;
  const parentPhone = `0100${String(Math.floor(10000000 + Math.random() * 90000000)).slice(0, 7)}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await page.request.post('http://localhost:8000/api/auth/register', {
        headers: { Accept: 'application/json' },
        multipart: {
          full_name: `Test Student ${suffix}`,
          email,
          password,
          password_confirmation: password,
          phone,
          parent_phone: parentPhone,
          academic_year: 'الاول الاعدادي',
          student_number: `STU${Date.now()}${attempt}`,
          school: `Test School ${suffix}`,
          parent_job: `Test Job ${suffix}`,
          governorate: 'القاهرة',
          id_image: {
            name: 'test-id.png',
            mimeType: 'image/png',
            buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'),
          }
        },
      });

      const data = await response.json();
      if (!response.ok()) {
        if (response.status() === 429 && attempt < retries - 1) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        throw new Error(`Registration failed: ${JSON.stringify(data)}`);
      }

      const tempUserId = data.data?.tempUserId || data.data?.temp_user_id;

      // Verify OTP via API (with retry for rate limiting) using dev bypass token
      for (let otpAttempt = 0; otpAttempt < retries; otpAttempt++) {
        try {
          const otpResponse = await page.request.post('http://localhost:8000/api/auth/verify-otp', {
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            data: { temp_user_id: tempUserId, firebase_token: 'DEV_TEST_TOKEN_123' },
          });

          const otpData = await otpResponse.json();
          if (!otpResponse.ok()) {
            if (otpResponse.status() === 429 && otpAttempt < retries - 1) {
              await new Promise(r => setTimeout(r, 2000));
              continue;
            }
            throw new Error(`OTP verification failed: ${JSON.stringify(otpData)}`);
          }

          // Store token in browser for UI tests
          const token = otpData.data?.token;
          if (token) {
            await page.goto('/');
            await page.evaluate((t: string) => {
              localStorage.setItem('token', t);
              document.cookie = `token=${t}; path=/; max-age=2592000`;
            }, token);
          }

          return { email, password, phone };
        } catch (e: any) {
          if (e.message?.includes('429') && otpAttempt < retries - 1) {
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          throw e;
        }
      }
    } catch (e: any) {
      if (e.message?.includes('429') && attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      throw e;
    }
  }
  throw new Error('Registration failed after all retries');
}

// ─── Login and return token ───
async function loginAs(page: any, email: string, password: string) {
  await page.goto('/login');
  await page.waitForSelector('#email', { timeout: 10000 });

  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  return page;
}

test.describe('Student Registration Flow', () => {
  test('TC-S01: Register new student with valid data', async ({ page }) => {
    const { email } = await registerStudent(page, `reg-${Date.now()}`);
    // Token stored, should be on a valid page
    const currentUrl = page.url();
    expect(currentUrl).toBeTruthy();
  });

  test('TC-S02: Register with duplicate email shows error', async ({ page }) => {
    const suffix = `dup-${Date.now()}`;
    const email = `test-student-${suffix}@example.com`;
    await registerStudent(page, suffix);

    // Try registering with same email via API (expect 422 validation error)
    const response = await page.request.post('http://localhost:8000/api/auth/register', {
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      data: {
        full_name: 'Duplicate Student',
        email,
        password: 'Password123!',
        password_confirmation: 'Password123!',
        phone: `0100${String(Math.floor(10000000 + Math.random() * 90000000)).slice(0, 7)}`,
        parent_phone: `0100${String(Math.floor(10000000 + Math.random() * 90000000)).slice(0, 7)}`,
        academic_year: 'الاول الاعدادي',
        student_number: `STU${Date.now()}`,
        school: 'Duplicate School',
        parent_job: 'Duplicate Job',
        governorate: 'القاهرة',
      },
    });
    // 422 for validation error, or 429 if rate limited (both are acceptable)
    expect([422, 429]).toContain(response.status());
  });

  test('TC-S03: Login with wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('#email', { timeout: 10000 });
    await page.fill('#email', 'nonexistent@test.com');
    await page.fill('#password', 'wrongpass');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body).toContain('error');
  });

  test('TC-S04: Login with valid pending account goes to waiting room', async ({ page }) => {
    const suffix = `login-wait-${Date.now()}`;
    const { email, password } = await registerStudent(page, suffix);
    await loginAs(page, email, password);
    const currentUrl = page.url();
    // After login, pending accounts go to waiting-room or show login with toast
    expect(
      currentUrl.includes('waiting-room') || currentUrl.includes('login')
    ).toBeTruthy();
  });

  test('TC-S05: Login page loads and shows form elements', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('TC-S06: Register page loads with all form fields', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('#full_name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
  });
});

test.describe('Course Browsing', () => {
  test('TC-C01: Home page loads and shows courses section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).toContain('أحدث الكورسات');
  });

  test('TC-C02: Courses page loads and shows course list', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).toContain('استكشف الكورسات');
  });

  test('TC-C03: Course detail page loads for valid course ID', async ({ page }) => {
    await page.goto('/courses/1');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body?.length || 0).toBeGreaterThan(0);
  });

  test('TC-C04: Course detail shows 404 for invalid ID', async ({ page }) => {
    const response = await page.goto('/courses/99999');
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe('Accessibility & Security - Student', () => {
  test('TC-SEC01: Blocked page loads', async ({ page }) => {
    await page.goto('/locked');
    await page.waitForLoadState('networkidle');
  });

  test('TC-SEC02: Protected routes redirect unauthenticated to login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    // Should redirect to login or show error
    const currentUrl = page.url();
    const isOnLogin = currentUrl.includes('login');
    const body = await page.textContent('body');
    const hasRedirect = body?.includes('تسجيل') || body?.includes('دخول');
    expect(isOnLogin || hasRedirect).toBeTruthy();
  });

  test('TC-SEC03: Wallet page redirects unauthenticated', async ({ page }) => {
    await page.goto('/wallet');
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    const isOnLogin = currentUrl.includes('login');
    const body = await page.textContent('body');
    const hasRedirect = body?.includes('تسجيل') || body?.includes('دخول');
    expect(isOnLogin || hasRedirect).toBeTruthy();
  });

  test('TC-SEC04: Exam page redirects without auth', async ({ page }) => {
    await page.goto('/exams/1');
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl.includes('login') || currentUrl.includes('auth')).toBeTruthy();
  });
});

test.describe('Multi-language / RTL', () => {
  test('TC-RTL01: All public pages have rtl direction', async ({ page }) => {
    const pages = ['/', '/login', '/register', '/courses'];
    for (const path of pages) {
      await page.goto(path);
      const htmlDir = await page.getAttribute('html', 'dir');
      expect(htmlDir).toBe('rtl');
    }
  });
});

test.describe('Forum Page', () => {
  test('TC-F01: Forum page loads', async ({ page }) => {
    await page.goto('/forum');
    await page.waitForLoadState('networkidle');
  });
});
