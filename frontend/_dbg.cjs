const { chromium } = require("playwright");

(async function () {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: "token", value: "225|l6EOTUh9F2sGRbKCfdUPKOQDwvo6ti7T2AhCd4z94ac79805", domain: "localhost", path: "/", httpOnly: false, secure: false }]);
  const page = await ctx.newPage();
  page.on("console", function (msg) { console.log("[" + msg.type() + "]", msg.text().slice(0, 300)); });
  page.on("requestfailed", function (req) { console.log("[failed]", req.url().slice(0, 120), req.failure() && req.failure().errorText); });
  page.on("response", function (resp) { if (resp.status() >= 400) console.log("[http " + resp.status() + "]", resp.url().slice(0, 120)); });
  await page.goto("http://localhost:3002/dashboard", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);
  const tableText = await page.locator("table").first().textContent().catch(() => null);
  console.log("=== TABLE TEXT ===");
  console.log(tableText);
  await browser.close();
})();
