import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const API_URL = 'http://localhost:8000';

function runLaravelCode(phpCode: string): string {
  const backendPath = path.resolve(__dirname, '../../backend');
  const tempFile = path.resolve(backendPath, `temp_run_${Date.now()}_${Math.floor(Math.random() * 1000)}.php`);
  const fullCode = [
    '<?php',
    "require __DIR__.'/vendor/autoload.php';",
    "$app = require_once __DIR__.'/bootstrap/app.php';",
    "$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);",
    "$kernel->bootstrap();",
    phpCode
  ].join('\n');
  fs.writeFileSync(tempFile, fullCode);
  try {
    const result = execSync(`php "${tempFile}"`, { cwd: backendPath }).toString();
    return result;
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

function createE2ECourse(isStrict: boolean): number {
  const phpCode = [
    `$course = App\\Models\\Course::create([`,
    `  'title' => 'E2E ${isStrict ? 'Strict' : 'Non-Strict'} Course ' . time(),`,
    `  'description' => 'Test E2E Course description',`,
    `  'price_points' => 100,`,
    `  'status' => 'published',`,
    `  'is_strict_order' => ${isStrict ? 'true' : 'false'},`,
    `  'academic_year' => 'grade_7'`,
    `]);`,
    `App\\Models\\Lecture::create(['course_id' => $course->id, 'title' => 'L1', 'is_locked' => true, 'order_index' => 1, 'video_status' => 'completed', 'm3u8_path' => 'hls/l1.m3u8']);`,
    `App\\Models\\Lecture::create(['course_id' => $course->id, 'title' => 'L2', 'is_locked' => true, 'order_index' => 2, 'video_status' => 'completed', 'm3u8_path' => 'hls/l2.m3u8']);`,
    `echo "ID:" . $course->id;`
  ].join('\n');
  const output = runLaravelCode(phpCode);
  const match = output.match(/ID:(\d+)/);
  if (!match) throw new Error('Failed to create E2E course: ' + output);
  return parseInt(match[1], 10);
}

async function registerStudent(page: any, suffix: string) {
  const email = `restrict-student-${suffix}@example.com`;
  const password = 'Password123!';
  const phone = `0100${String(Math.floor(10000000 + Math.random() * 90000000)).slice(0, 7)}`;
  const parentPhone = `0100${String(Math.floor(10000000 + Math.random() * 90000000)).slice(0, 7)}`;

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
      student_number: `STU${Date.now()}`,
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
    throw new Error(`Registration failed: ${JSON.stringify(data)}`);
  }

  const tempUserId = data.data?.tempUserId || data.data?.temp_user_id;

  const otpResponse = await page.request.post('http://localhost:8000/api/auth/verify-otp', {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    data: { temp_user_id: tempUserId, firebase_token: 'DEV_TEST_TOKEN_123' },
  });

  const otpData = await otpResponse.json();
  if (!otpResponse.ok()) {
    throw new Error(`OTP verification failed: ${JSON.stringify(otpData)}`);
  }

  // Recharge user wallet with 1000 points to buy courses
  runLaravelCode([
    `$user = App\\Models\\User::where('email', '${email}')->first();`,
    `$user->update(['status' => 'active', 'wallet_balance' => 1000]);`
  ].join('\n'));

  return { email, password };
}

async function loginAs(page: any, email: string, password: string) {
  await page.goto('/login');
  await page.waitForSelector('#email', { timeout: 10000 });
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
}

test.describe('Course Access & Progression Restrictions', () => {
  let nonStrictCourseId: number;
  let strictCourseId: number;

  test.beforeAll(() => {
    nonStrictCourseId = createE2ECourse(false);
    strictCourseId = createE2ECourse(true);
  });

  test('TC-REST01: Guest user cannot open locked lectures', async ({ page }) => {
    // Go to course details page
    await page.goto(`/courses/${nonStrictCourseId}`);
    await page.waitForLoadState('networkidle');

    // Click on L1 (locked)
    await page.click('text=L1');
    await page.waitForTimeout(1000);

    // Should redirect to login or show toast
    const currentUrl = page.url();
    expect(currentUrl.includes('login') || currentUrl.includes('auth')).toBeTruthy();
  });

  test('TC-REST02: Unsubscribed student cannot open locked lectures', async ({ page }) => {
    const suffix = `unsub-${Date.now()}`;
    const { email, password } = await registerStudent(page, suffix);
    await loginAs(page, email, password);

    // Go to course details page
    await page.goto(`/courses/${nonStrictCourseId}`);
    await page.waitForLoadState('networkidle');

    // Click L1
    await page.click('text=L1');
    await page.waitForTimeout(1000);

    // Toast message should indicate course purchase is required
    const body = await page.textContent('body');
    expect(body).toContain('شراء');
  });

  test('TC-REST03: Subscribed student with non-strict course can access all lectures', async ({ page }) => {
    const suffix = `nonstrict-${Date.now()}`;
    const { email, password } = await registerStudent(page, suffix);
    await loginAs(page, email, password);

    // Go to course details page
    await page.goto(`/courses/${nonStrictCourseId}`);
    await page.waitForLoadState('networkidle');

    // Purchase the course
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('شراء');
      await dialog.accept();
    });
    await page.click('text=شراء الآن');
    await page.waitForTimeout(3000);

    // Both lectures should be unlocked
    // Click L1
    await page.click('text=L1');
    await page.waitForTimeout(2000);
    expect(page.url()).toContain(`/lectures/`);

    // Go back and click L2
    await page.goto(`/courses/${nonStrictCourseId}`);
    await page.waitForLoadState('networkidle');
    await page.click('text=L2');
    await page.waitForTimeout(2000);
    expect(page.url()).toContain(`/lectures/`);
  });

  test('TC-REST04: Subscribed student with strict course must progress sequentially', async ({ page }) => {
    const suffix = `strict-${Date.now()}`;
    const { email, password } = await registerStudent(page, suffix);
    await loginAs(page, email, password);

    // Go to course details page
    await page.goto(`/courses/${strictCourseId}`);
    await page.waitForLoadState('networkidle');

    // Purchase the course
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    await page.click('text=شراء الآن');
    await page.waitForTimeout(3000);

    // Click L2 first (should show toast error since L1 is not completed)
    await page.click('text=L2');
    await page.waitForTimeout(1000);
    const body = await page.textContent('body');
    expect(body).toContain('مغلقة');

    // Click L1 (first lecture is unlocked)
    await page.click('text=L1');
    await page.waitForTimeout(2000);
    expect(page.url()).toContain(`/lectures/`);
  });
});
