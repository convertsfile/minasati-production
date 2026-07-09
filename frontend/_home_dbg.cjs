const { chromium } = require("playwright");
const path = require("path");

(async function () {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("console", function (msg) { if (msg.type() === "error") console.log("[err]", msg.text().slice(0, 200)); });
  await page.goto("http://localhost:3002/", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1000);
  const sectionInfo = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll(".features-section, .courses-section, .stats-section, .cta-section, .footer").forEach(s => {
      const rect = s.getBoundingClientRect();
      const style = getComputedStyle(s);
      out.push({ cls: s.className.slice(0, 80), opacity: style.opacity, transform: style.transform, top: rect.top, height: rect.height, hasSectionVisible: s.classList.contains("section-visible"), hasSectionAnimate: s.classList.contains("section-animate") });
    });
    return out;
  });
  console.log("=== INITIAL SECTIONS ===");
  console.log(JSON.stringify(sectionInfo, null, 2));
  await page.evaluate(async () => {
    const totalHeight = document.documentElement.scrollHeight;
    for (let y = 0; y < totalHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 200));
    }
    await new Promise(r => setTimeout(r, 800));
  });
  const sectionInfo2 = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll(".features-section, .courses-section, .stats-section, .cta-section, .footer").forEach(s => {
      const style = getComputedStyle(s);
      out.push({ cls: s.className.slice(0, 60), opacity: style.opacity, hasSectionVisible: s.classList.contains("section-visible") });
    });
    return out;
  });
  console.log("=== AFTER SCROLL ===");
  console.log(JSON.stringify(sectionInfo2, null, 2));
  await page.screenshot({ path: path.join("C:/Users/drhab/OneDrive/Desktop/new-minasaati/.pi/artifacts/frontend-migration/screenshots", "DEBUG-home.png"), fullPage: true });
  await browser.close();
})();
