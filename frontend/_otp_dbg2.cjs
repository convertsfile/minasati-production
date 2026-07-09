const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3002/otp', { waitUntil: 'networkidle' });
  const info = await page.evaluate(() => {
    const link = document.querySelector('.branding-logo');
    const out = [];
    out.push({ tag: link.tagName, html: link.outerHTML.slice(0, 400) });
    // Walk the document for any stylesheet rules that match .branding-logo
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText && /branding-logo|logo-icon|logo-text/.test(rule.selectorText)) {
            out.push({ sel: rule.selectorText, css: rule.cssText });
          }
        }
      } catch (e) { out.push({ err: e.message, sheet: sheet.href }); }
    }
    return out;
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
