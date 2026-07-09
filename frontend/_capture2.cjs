const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const http = require("http");

const PAGES = require("./_pages.json");
const SCREENSHOT_DIR = "C:/Users/drhab/OneDrive/Desktop/new-minasaati/.pi/artifacts/frontend-migration/screenshots";
const BASE = "http://localhost:3002";
const API_URL = "http://127.0.0.1:8000/api";

function httpJson(method, urlPath, body, headers) {
  headers = headers || {};
  return new Promise(function (resolve, reject) {
    var u = new URL(API_URL + urlPath);
    var data = body ? Buffer.from(JSON.stringify(body)) : null;
    var req = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: method,
      headers: Object.assign({ "Content-Type": "application/json", "Accept": "application/json" }, headers, data ? { "Content-Length": data.length } : {}),
    }, function (res) {
      var chunks = [];
      res.on("data", function (c) { chunks.push(c); });
      res.on("end", function () {
        var text = Buffer.concat(chunks).toString("utf8");
        try { resolve({ status: res.statusCode, body: JSON.parse(text) }); } catch (e) { resolve({ status: res.statusCode, body: text }); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

(async function () {
  const tokens = JSON.parse(fs.readFileSync("./_tokens.json", "utf8"));
  const studentToken = tokens.student;
  const adminToken = tokens.admin;
  console.log("studentToken:", studentToken ? "OK" : "MISSING");
  console.log("adminToken:", adminToken ? "OK" : "MISSING");

  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const results = [];

  for (let i = 0; i < PAGES.length; i++) {
    const p = PAGES[i];
    const sizes = [];
    if (p.desktop) sizes.push({ suffix: "desktop", viewport: { width: 1440, height: 900 } });
    if (p.mobile) sizes.push({ suffix: "mobile", viewport: { width: 390, height: 844 } });
    let token = null;
    if (p.auth === "student") token = studentToken;
    else if (p.auth === "admin") token = adminToken;
    for (let j = 0; j < sizes.length; j++) {
      const sz = sizes[j];
      const ctx = await browser.newContext({ viewport: sz.viewport });
      const page = await ctx.newPage();
      if (token) {
        await ctx.addCookies([{ name: "token", value: token, domain: "localhost", path: "/", httpOnly: false, secure: false }]);
      }
      const consoleErrors = [];
      page.on("console", function (msg) { if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 200)); });
      const failedRequests = [];
      page.on("requestfailed", function (req) { failedRequests.push((req.failure() && req.failure().errorText) + " " + req.url().slice(0, 120)); });
      const out = path.join(SCREENSHOT_DIR, p.name + "-" + sz.suffix + ".png");
      try {
        const resp = await page.goto(BASE + p.path, { waitUntil: "networkidle", timeout: 30000 }).catch(function () { return null; });
        await page.waitForTimeout(2000);
        // Scroll through to trigger IntersectionObserver fade-ins
        try {
          await page.evaluate(async () => {
            const totalHeight = document.documentElement.scrollHeight;
            const step = window.innerHeight * 0.6;
            for (let y = 0; y < totalHeight; y += step) {
              window.scrollTo(0, y);
              await new Promise(r => setTimeout(r, 120));
            }
            window.scrollTo(0, 0);
            await new Promise(r => setTimeout(r, 200));
          });
        } catch (e) {}
        await page.waitForTimeout(1500);
        await page.screenshot({ path: out, fullPage: true });
        const finalUrl = page.url();
        const h1 = await page.locator("h1, h2, [role=heading]").first().textContent().catch(function () { return null; });
        results.push({ name: p.name + "-" + sz.suffix, path: p.path, ok: true, url: finalUrl, status: resp ? resp.status() : null, h1: h1 ? h1.trim().slice(0, 80) : null, consoleErrors: consoleErrors.slice(0, 5), failedRequests: failedRequests.slice(0, 5) });
      } catch (e) {
        results.push({ name: p.name + "-" + sz.suffix, path: p.path, ok: false, error: e.message });
      }
      await ctx.close();
    }
  }
  await browser.close();
  fs.writeFileSync("./_capture-results.json", JSON.stringify(results, null, 2));
  console.log("=== CAPTURE SUMMARY ===");
  for (let m = 0; m < results.length; m++) {
    const r = results[m];
    if (r.ok) console.log("OK  " + r.name + " [" + r.status + "] " + r.url + " h1=" + (r.h1 || "?") + " errs=" + ((r.consoleErrors && r.consoleErrors.length) || 0));
    else console.log("FAIL " + r.name + " " + r.error);
  }
})();
