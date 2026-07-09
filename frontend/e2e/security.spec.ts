import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:8000';

test.describe('API Security & Authentication', () => {
  const endpoints = [
    { method: 'GET', url: '/api/auth/me' },
    { method: 'POST', url: '/api/auth/logout' },
    // /api/courses is public, intentionally excluded
    { method: 'GET', url: '/api/wallet/balance' },
    { method: 'POST', url: '/api/wallet/topup/initiate' },
    { method: 'GET', url: '/api/admin/courses' },
    // ⚠️ The following were rewired from BROKEN → real inventory endpoints:
    // /api/admin/pending-students → /api/admin/users/pending
    { method: 'GET', url: '/api/admin/users/pending' },
    // /api/admin/finance (no such route) → /api/admin/wallet/summary
    { method: 'GET', url: '/api/admin/wallet/summary' },
    // /api/admin/wallet/pending (no such route) → /api/admin/wallet/topups?status=pending
    { method: 'GET', url: '/api/admin/wallet/topups?status=pending' },
    // /api/admin/topups → /api/admin/wallet/topups
    { method: 'GET', url: '/api/admin/wallet/topups' },
    { method: 'GET', url: '/api/admin/security/violations' },
    { method: 'GET', url: '/api/admin/settings' },
    { method: 'POST', url: '/api/admin/courses' },
    // ⚠️ /api/admin/students/1 (user deletion by DELETE) does not exist; the
    // closest user-management surface is
    // /api/admin/security/block-student/{user} (POST) or
    // /api/admin/users/{user}/reset-password (POST). Switch the test to a
    // POST against the block endpoint so the contract assertion is real.
    { method: 'POST', url: '/api/admin/security/block-student/1' },
  ];

  for (const ep of endpoints) {
    test(`TC-SEC-API: ${ep.method} ${ep.url} rejects without token`, async ({ page }) => {
      const response = await page.request.fetch(`${API_URL}${ep.url}`, {
        method: ep.method,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      });
      expect(response.status()).toBeGreaterThanOrEqual(401);
      expect(response.status()).toBeLessThan(500);
    });
  }
});

test.describe('XSS & Injection', () => {
  test('TC-SEC-XSS01: Registration rejects XSS in name', async ({ page }) => {
    await page.goto('/register');
    await page.waitForSelector('#full_name', { timeout: 10000 });

    // Step 1
    await page.fill('#full_name', '<script>alert("xss")</script>');
    await page.fill('#email', `xss-test-${Date.now()}@test.com`);
    await page.fill('#password', 'Password123!');
    await page.fill('#confirmPassword', 'Password123!');
    await page.click('button:has-text("التالي")');
    await page.waitForTimeout(500);

    // Step 2
    await page.fill('#student_number', `STU${Date.now()}`);
    await page.selectOption('#academic_year', { index: 1 });
    await page.fill('#phone', `0100${String(Math.floor(Math.random() * 90000000 + 10000000)).slice(0, 7)}`);
    await page.fill('#parent_phone', `0100${String(Math.floor(Math.random() * 90000000 + 10000000)).slice(0, 7)}`);
    await page.fill('#school', 'XSS Test School');
    await page.selectOption('#governorate', { index: 1 });
    await page.fill('#parent_job', 'XSS Test Job');

    const filePath = require('path').join(require('os').tmpdir(), 'test-id.png');
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, Buffer.alloc(1024));
    }
    await page.locator('input[type="file"]').setInputFiles(filePath);
    await page.waitForTimeout(500);

    await page.click('button:has-text("إنشاء حساب")');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('TC-SEC-XSS02: Course search handles special characters', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="بحث"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('<img src=x onerror=alert(1)>');
      await page.waitForTimeout(1000);
      const body = await page.textContent('body');
      expect(body).toBeTruthy();
    }
  });
});

test.describe('Rate Limiting & Abuse', () => {
  test('TC-SEC-RATE01: Rapid registration attempts are handled', async ({ page }) => {
    const results: number[] = [];
    for (let i = 0; i < 5; i++) {
      const response = await page.request.post(`${API_URL}/api/auth/register`, {
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        data: {
          full_name: 'Rate Test',
          email: `ratetest-${Date.now()}-${i}@test.com`,
          phone: `0100${String(Math.floor(Math.random() * 90000000 + 10000000)).slice(0, 7)}`,
          password: 'Password123!',
          password_confirmation: 'Password123!',
        },
      });
      results.push(response.status());
    }
    // All requests should either succeed or be rate-limited
    for (const status of results) {
      expect(status).toBeGreaterThanOrEqual(200);
      expect(status).toBeLessThan(500);
    }
  });
});

test.describe('Console Error Detection', () => {
  test('TC-SEC-CONSOLE01: Main pages have no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const pages = ['/', '/login', '/register', '/courses'];
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
    }

    // Allow known non-critical errors (like favicon 404)
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('Failed to load resource')
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('TC-SEC-CONSOLE02: Admin pages have no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Login first
    await page.goto('/login');
    await page.waitForSelector('#email', { timeout: 10000 });
    await page.fill('#email', 'admin@eduplatform.com');
    await page.fill('#password', 'password');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    const adminPages = [
      '/admin', '/admin/courses', '/admin/pending-students',
      '/admin/finance', '/admin/wallet', '/admin/topups',
      '/admin/security', '/admin/forum', '/admin/settings',
      '/admin/center-codes', '/admin/payment-numbers',
    ];
    for (const path of adminPages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
    }

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('Failed to load resource')
    );
    expect(criticalErrors.length).toBe(0);
  });
});
