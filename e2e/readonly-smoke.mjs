// Smoke CHI DOC: chi GET trang/API cong khai va kiem trang render, khong dang
// ky, khong submit form, khong ghi gi. An toan de chay vao production:
// `pnpm e2e:prod` (chiakeo.huyab.click). `pnpm e2e` cung chay no truoc
// ui-smoke de dev va prod dung chung mot bo kiem tra.
//
// Bien moi truong:
// - E2E_BASE_URL: mac dinh http://127.0.0.1:8787
// - PLAYWRIGHT_CHROMIUM_PATH: xem findChromium trong @huyab/e2e
import { findChromium } from "@huyab/e2e";
import { chromium } from "playwright-core";

const BASE = (process.env.E2E_BASE_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
const WAIT = { timeout: 15000 };
const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;

let passed = 0;
let failed = 0;

function ok(name) {
  passed += 1;
  console.log(`PASS ${name}`);
}

/** GET mot endpoint JSON, nem neu status khac mong doi. */
async function getJson(path, expectedStatus) {
  const response = await fetch(BASE + path, { redirect: "manual" });
  if (response.status !== expectedStatus) {
    throw new Error(`GET ${path}: mong ${expectedStatus}, nhan ${response.status}`);
  }
  return response.json();
}

console.log(`Read-only smoke tai ${BASE}\n`);

const browser = await chromium.launch({ executablePath: findChromium() });
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));

try {
  const version = await getJson("/api/version", HTTP_OK);
  if (typeof version.commit !== "string" || version.commit.length === 0) {
    throw new Error(`/api/version thieu commit: ${JSON.stringify(version)}`);
  }
  ok(`GET /api/version (${version.shortCommit ?? version.commit})`);

  const health = await getJson("/api/health", HTTP_OK);
  if (health.ok !== true) throw new Error(`/api/health khong ok: ${JSON.stringify(health)}`);
  ok("GET /api/health reports D1 ok");

  const session = await getJson("/api/session", HTTP_OK);
  if (session.user !== null) throw new Error(`/api/session phai user=null: ${JSON.stringify(session)}`);
  ok("GET /api/session is anonymous without cookie");

  await getJson("/api/games", HTTP_UNAUTHORIZED);
  ok("GET /api/games is guarded (401)");

  await page.goto(BASE + "/");
  await page.waitForURL("**/login", WAIT);
  await page.getByRole("heading", { name: "Đăng nhập" }).waitFor(WAIT);
  await page.getByRole("button", { name: "Tiếp tục với Google" }).waitFor(WAIT);
  ok("SPA redirects to /login and renders the SSO button");

  if (pageErrors.length > 0) throw new Error(`loi JS tren trang: ${pageErrors.join(" | ")}`);
  ok("no uncaught page errors");
} catch (error) {
  failed += 1;
  console.log("FAIL:", error.message);
  await page.screenshot({ path: "e2e-failure.png" }).catch(() => {});
} finally {
  await browser.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
