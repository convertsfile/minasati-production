const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const http = require("http");
const PAGES = require("./_pages.json");
const HEALTH_PATHS = require("./_health-paths.json");
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
var SREGEX = new RegExp("[\s\n\r]+", "g");
(async function () {
  let studentToken = null;
  let adminToken = null;
  try {
    if (fs.existsSync("./_tokens.json")) {
      const tokens = JSON.parse(fs.readFileSync("./_tokens.json", "utf8"));
      studentToken = tokens.student;
      adminToken = tokens.admin;
    }
  } catch (e) {}
  if (!studentToken) {
    try {
      const suffix = Date.now().toString().slice(-7);
      const r = await httpJson("POST", "/auth/register", {
        full_name: "Test Student", email: "e2e-" + suffix + "@test.com", password: "Password123!", password_confirmation: "Password123!",
        phone: "0100" + suffix, parent_phone: "0101" + suffix, academic_year: "الاول الابتدائي",
        student_number: "STU" + suffix, school: "Test School", parent_job: "Test", governorate: "القاهرة",
      });
      const tok = r.body && (r.body.token || (r.body.data && r.body.data.token) || r.body.access_token);
      if (tok) { studentToken = tok; console.log("Got student token"); } else console.log("Student register:", JSON.stringify(r).slice(0, 200));
    } catch (e) { console.log("Student register failed:", e.message); }
  }
  if (!adminToken) {
    try {
      const r = await httpJson("POST", "/auth/login", { phone: "01000000000", password: "password" });
      const tok = r.body && (r.body.token || (r.body.data && r.body.data.token) || r.body.access_token);
      if (tok) { adminToken = tok; console.log("Got admin token"); } else console.log("Admin login:", JSON.stringify(r).slice(0, 200));
    } catch (e) { console.log("Admin login error:", e.message); }
  }
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
        const resp = await page.goto(BASE + p.path, { waitUntil: "networkidle", timeout: 25000 }).catch(function () { return null; });
        await page.waitForTimeout(2500);
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
  for (let k = 0; k < HEALTH_PATHS.length; k++) {
    const h = HEALTH_PATHS[k];
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const out = path.join(SCREENSHOT_DIR, h.name + "-desktop.png");
    try {
      const resp = await page.goto(BASE + h.path, { waitUntil: "networkidle", timeout: 20000 }).catch(function () { return null; });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: out, fullPage: true });
      const finalUrl = page.url();
      const bodyText = await page.locator("body").textContent().catch(function () { return ""; });
      results.push({ name: h.name + "-desktop", path: h.path, ok: true, url: finalUrl, status: resp ? resp.status() : null, bodyPreview: bodyText.slice(0, 300).replace(SREGEX, " ") });
    } catch (e) {
      results.push({ name: h.name + "-desktop", path: h.path, ok: false, error: e.message });
    }
    await ctx.close();
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
