const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3002/otp', { waitUntil: 'networkidle' });
  const info = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.branding-logo, .logo-icon, .logo-text, .branding-title, .branding-subtitle').forEach((el) => {
      const cs = getComputedStyle(el);
      out.push({
        cls: el.className,
        text: (el.textContent || '').slice(0, 40),
        color: cs.color,
        background: cs.backgroundColor,
      });
    });
    return out;
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
