// E2E smoke test: chay app that (wrangler dev + D1 local) va bam qua cac flow
// chinh bang Chromium. Chay: pnpm e2e (can `pnpm dev:api` dang chay san).
//
// Bien moi truong:
// - E2E_BASE_URL: mac dinh http://127.0.0.1:8787
// - PLAYWRIGHT_CHROMIUM_PATH: duong dan chromium co san; bo trong de
//   playwright-core tu tim (can `npx playwright install chromium` truoc).
import { chromium } from "playwright-core";

const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:8787";
const WAIT = { timeout: 15000 };

let passed = 0;
let failed = 0;

function ok(name) {
  passed += 1;
  console.log(`PASS ${name}`);
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});
const page = await browser.newPage();
page.on("pageerror", (error) => console.log("PAGE ERROR:", error.message));

try {
  const username = "e2e" + Math.floor(Math.random() * 1e9);

  // 1. Chua dang nhap -> redirect ve /login
  await page.goto(BASE + "/");
  await page.waitForURL("**/login", WAIT);
  ok("redirect to /login when logged out");

  // 2. Dang ky tai khoan moi
  await page.click("text=Chua co tai khoan? Dang ky");
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', "matkhau123");
  await page.click('button[type="submit"]');
  await page.waitForURL(BASE + "/", WAIT);
  ok("sign up + redirect to home");

  // 3. Tao cuoc choi
  await page.fill("#game-name", "E2E Trip");
  await page.click('button[aria-label="Tao cuoc choi"]');
  await page.waitForURL("**/games/**", WAIT);
  ok("create game navigates to game page");

  // 4. Them 2 nguoi (1 nguoi co thong tin ngan hang)
  await page.fill('input[placeholder="Huy"]', "An");
  await page.fill('input[placeholder="VCB, TCB, MBB..."]', "VCB");
  await page.fill('input[placeholder="0123456789"]', "111222333");
  await page.fill('input[placeholder="NGUYEN VAN A"]', "LE AN");
  await page.click("text=Them nguoi");
  await page.waitForSelector("text=VCB - 111222333", WAIT);
  await page.fill('input[placeholder="Huy"]', "Binh");
  await page.click("text=Them nguoi");
  await page.waitForSelector("text=Chua co thong tin QR", WAIT);
  ok("add 2 participants");

  // 5. Them khoan chi chia doi
  await page.fill('input[placeholder="An toi"]', "An trua");
  await page.fill('input[placeholder="500000"]', "100000");
  await page.click("text=Them khoan chi");
  await page.waitForSelector("text=An trua", WAIT);
  ok("add expense");

  // 6. Dashboard tinh dung: Binh tra An 50.000 + co QR
  await page.waitForSelector("text=Binh tra An", WAIT);
  const qrCount = await page.locator('img[alt*="QR nhan tien"]').count();
  if (qrCount !== 1) throw new Error(`expected 1 QR image, got ${qrCount}`);
  ok("settlement + VietQR shown");

  // 7. Share link read-only mo duoc khong can dang nhap
  await page.click("text=Tao link share");
  await page.waitForSelector("text=Copy link share", WAIT);
  const detail = await page.evaluate(async () => {
    const gameId = location.pathname.split("/").pop();
    const response = await fetch(`/api/games/${gameId}`, { credentials: "include" });
    return response.json();
  });
  const anonPage = await browser.newPage();
  await anonPage.goto(`${BASE}/share/${detail.shareLink.token}`);
  await anonPage.waitForSelector("text=E2E Trip", WAIT);
  await anonPage.waitForSelector("text=Binh tra An", WAIT);
  await anonPage.close();
  ok("public share page works without login");

  // 8. Logout
  await page.click("text=Thoat");
  await page.waitForURL("**/login", WAIT);
  ok("logout returns to /login");
} catch (error) {
  failed += 1;
  console.log("FAIL:", error.message);
  await page.screenshot({ path: "e2e-failure.png" }).catch(() => {});
} finally {
  await browser.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
