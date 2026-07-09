const { chromium } = require("playwright");

(async function () {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: "token", value: "225|l6EOTUh9F2sGRbKCfdUPKOQDwvo6ti7T2AhCd4z94ac79805", domain: "localhost", path: "/", httpOnly: false, secure: false }]);
  const page = await ctx.newPage();
  page.on("console", function (msg) { if (msg.type() === "error") console.log("[err]", msg.text().slice(0, 200)); });
  await page.goto("http://localhost:3002/comprehensive-exams/1", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);
  // Check if Tailwind classes are applied
  const html = await page.evaluate(() => {
    const h1 = document.querySelector("h1");
    const card = document.querySelector(".bg-white");
    return {
      h1Text: h1 ? h1.textContent : null,
      h1Style: h1 ? getComputedStyle(h1).fontSize + " " + getComputedStyle(h1).fontWeight : null,
      cardClass: card ? card.className : null,
      cardStyle: card ? getComputedStyle(card).backgroundColor + " " + getComputedStyle(card).borderRadius : null,
    };
  });
  console.log("HTML check:", JSON.stringify(html, null, 2));
  await browser.close();
})();
