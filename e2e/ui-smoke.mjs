// E2E smoke test: chay app that (wrangler dev + D1 local) va bam qua cac flow
// chinh bang Chromium. Dung `pnpm e2e` de tu bat server; hoac `pnpm e2e:smoke`
// khi da co server chay san (`pnpm dev:api`).
//
// Bien moi truong:
// - E2E_BASE_URL: mac dinh http://127.0.0.1:8787
// - PLAYWRIGHT_CHROMIUM_PATH: duong dan chromium co san; bo trong de
//   playwright-core tu tim (xem findChromium trong @huyab/e2e).
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { findChromium } from "@huyab/e2e";
import { chromium } from "playwright-core";

const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:8787";
const WAIT = { timeout: 15000 };
const E2E_PASSWORD = "matkhau123";

let passed = 0;
let failed = 0;

function ok(name) {
  passed += 1;
  console.log(`PASS ${name}`);
}

/**
 * Tao mot anh JPEG that bang canvas de kiem tra luong nen + upload anh.
 * Tra ve duong dan file tam.
 */
async function createJpegFixture() {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1000;
    const context = canvas.getContext("2d");
    context.fillStyle = "#7c3aed";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.font = "120px sans-serif";
    context.fillText("HOA DON", 120, 520);
    return canvas.toDataURL("image/jpeg", 0.9);
  });
  const path = join(tmpdir(), `chia-keo-e2e-${process.pid}.jpg`);
  writeFileSync(path, Buffer.from(dataUrl.split(",")[1], "base64"));
  return path;
}

/**
 * Tao tai khoan moi qua Better Auth va giu cookie session trong tab hien tai.
 * Chay trong trang de cookie thuoc dung origin cua app.
 */
async function signUp(target, username) {
  const result = await target.evaluate(async ({ name, password }) => {
    const response = await fetch("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        username: name,
        name,
        email: `${name}@e2e.local`,
        password,
      }),
    });
    return { status: response.status, body: await response.text() };
  }, { name: username, password: E2E_PASSWORD });
  if (result.status !== 200) {
    throw new Error(`sign-up that bai (${result.status}): ${result.body}`);
  }
}

async function getGameDetail(target, gameId) {
  const result = await target.evaluate(async (id) => {
    const response = await fetch(`/api/games/${id}`, { credentials: "include" });
    return { status: response.status, body: await response.json() };
  }, gameId);
  assert.equal(result.status, 200);
  return result.body;
}

/**
 * Dong y hop thoai xac nhan trong app (ConfirmDialog, khong phai window.confirm):
 * nut xac nhan la nut cuoi trong role="alertdialog".
 */
async function acceptConfirm(target = page) {
  const dialog = target.locator('[role="alertdialog"]');
  await dialog.waitFor(WAIT);
  await dialog.locator("button").last().click();
  await dialog.waitFor({ state: "detached", timeout: WAIT.timeout });
}

/** O anh thu `index` trong album (khung co huy hieu so luong dang "n/60"). */
function albumTile(index) {
  // Layout boc ngoai cung cung la <section>, lay khung trong cung bang .last().
  return page.locator('section:has(span:text("/60"))').last().locator("button").nth(index);
}

const browser = await chromium.launch({
  executablePath: findChromium(),
});
const page = await browser.newPage();
page.on("pageerror", (error) => console.log("PAGE ERROR:", error.message));

try {
  const username = "e2e" + Math.floor(Math.random() * 1e9);

  // 1. Chua dang nhap -> redirect ve /login
  await page.goto(BASE + "/");
  await page.waitForURL("**/login", WAIT);
  ok("redirect to /login when logged out");

  const invalidBearerStatus = await page.evaluate(async () => {
    const response = await fetch("/api/games", {
      headers: { Authorization: "Bearer invalid" },
    });
    return response.status;
  });
  assert.equal(invalidBearerStatus, 401);
  ok("invalid SSO Bearer token is rejected");

  // 2. Dang ky tai khoan moi. Trang /login chi con nut SSO Google (di ra
  // auth.huyab.click, khong chay duoc trong test), nen tao session bang API
  // username/mat khau cua Better Auth - van bat trong worker/src/auth.ts.
  await signUp(page, username);
  await page.goto(BASE + "/");
  await page.waitForSelector("#game-name", WAIT);
  ok("sign up + land on home");

  // 3. Tao cuoc choi
  await page.fill("#game-name", "E2E Trip");
  await page.click('button[aria-label="Tạo cuộc chơi"]');
  await page.waitForURL("**/games/**", WAIT);
  const gameId = new URL(page.url()).pathname.split("/").pop();
  ok("create game navigates to game page");

  // 4. Them 2 nguoi (1 nguoi co thong tin ngan hang)
  await page.fill('input[placeholder="Huy"]', "An");
  await page.click('button:has-text("Chọn ngân hàng")');
  await page.click('[role="option"]:has-text("Vietcombank (VCB)")');
  await page.fill('input[placeholder="0123456789"]', "111222333");
  await page.fill('input[placeholder="NGUYEN VAN A"]', "LE AN");
  await page.click('button[type="submit"]:has-text("Thêm người")');
  await page.waitForSelector("text=Vietcombank · 111222333", WAIT);
  await page.fill('input[placeholder="Huy"]', "Binh");
  await page.click('button[type="submit"]:has-text("Thêm người")');
  await page.waitForSelector("text=Chưa có thông tin QR", WAIT);
  ok("add 2 participants");

  // 5. Them khoan chi chia doi
  await page.fill('input[placeholder="Ăn tối"]', "An trua");
  await page.fill('input[placeholder="500.000"]', "100000");
  await page.click('button[type="submit"]:has-text("Thêm khoản chi")');
  await page.waitForSelector("text=An trua", WAIT);
  ok("add expense");

  // 6. Dashboard tinh dung: Binh tra An 50.000 + co QR
  await page.waitForSelector("text=Binh → An", WAIT);
  const qrCount = await page.locator('img[alt*="QR nhận tiền"]').count();
  if (qrCount !== 1) throw new Error(`expected 1 QR image, got ${qrCount}`);
  ok("settlement + VietQR shown");

  // 6.5 Khoan chi chia theo so tien cu the (mode "amount")
  await page.click('button:has-text("Số tiền")');
  await page.fill('input[placeholder="Ăn tối"]', "Karaoke");
  await page.fill('input[placeholder="500.000"]', "90000");
  await page.fill('input[aria-label="Phần tiền của An"]', "30000");
  await page.fill('input[aria-label="Phần tiền của Binh"]', "60000");
  await page.click('button[type="submit"]:has-text("Thêm khoản chi")');
  await page.waitForSelector("text=số tiền riêng", WAIT);
  // Balance moi: An +110.000, Binh -110.000
  await page.waitForSelector("text=110.000", WAIT);
  const beforeInvalid = await getGameDetail(page, gameId);
  const an = beforeInvalid.participants.find((person) => person.name === "An");
  const binh = beforeInvalid.participants.find((person) => person.name === "Binh");
  assert.ok(an);
  assert.ok(binh);
  const lunch = beforeInvalid.expenses.find((expense) => expense.title === "An trua");
  const karaoke = beforeInvalid.expenses.find((expense) => expense.title === "Karaoke");
  assert.ok(lunch);
  assert.ok(karaoke);
  assert.deepEqual(
    lunch.splits.map(({ participantId, amount }) => [participantId, amount]).sort(),
    [[an.id, 50000], [binh.id, 50000]].sort(),
  );
  assert.deepEqual(
    karaoke.splits.map(({ participantId, amount }) => [participantId, amount]).sort(),
    [[an.id, 30000], [binh.id, 60000]].sort(),
  );
  assert.equal(beforeInvalid.summary.totalExpense, 190000);
  assert.equal(beforeInvalid.summary.balances.find((row) => row.participantId === an.id).balance, 110000);
  assert.equal(beforeInvalid.summary.balances.find((row) => row.participantId === binh.id).balance, -110000);
  assert.deepEqual(beforeInvalid.summary.settlements, [{
    fromParticipantId: binh.id,
    toParticipantId: an.id,
    amount: 110000,
  }]);
  await page.reload();
  await page.waitForSelector("text=110.000", WAIT);
  const reloaded = await getGameDetail(page, gameId);
  assert.deepEqual(reloaded.summary, beforeInvalid.summary);
  assert.deepEqual(reloaded.expenses, beforeInvalid.expenses);
  ok("add expense with custom amounts");

  const invalidSplit = await page.evaluate(async ({ id, payerId, anId, binhId }) => {
    const response = await fetch(`/api/games/${id}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: "Invalid split",
        amount: 100000,
        payerParticipantId: payerId,
        splitMode: "amount",
        splits: [
          { participantId: anId, value: 10000 },
          { participantId: binhId, value: 10000 },
        ],
      }),
    });
    return response.status;
  }, { id: gameId, payerId: an.id, anId: an.id, binhId: binh.id });
  assert.equal(invalidSplit, 400);
  const afterInvalid = await getGameDetail(page, gameId);
  assert.equal(afterInvalid.expenses.length, beforeInvalid.expenses.length);
  assert.deepEqual(afterInvalid.summary, beforeInvalid.summary);
  ok("invalid split is rejected without changing the game");

  const outsiderPage = await browser.newPage();
  await outsiderPage.goto(BASE + "/");
  await signUp(outsiderPage, `outsider${username}`);
  const outsiderAccess = await outsiderPage.evaluate(async ({ id, payerId, anId, binhId }) => {
    const read = await fetch(`/api/games/${id}`, { credentials: "include" });
    const write = await fetch(`/api/games/${id}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: "Unauthorized expense",
        amount: 1000,
        payerParticipantId: payerId,
        splitParticipantIds: [anId, binhId],
      }),
    });
    return { read: read.status, write: write.status };
  }, { id: gameId, payerId: an.id, anId: an.id, binhId: binh.id });
  assert.deepEqual(outsiderAccess, { read: 404, write: 404 });
  await outsiderPage.close();
  ok("another account cannot read or write the game");

  // 6.8 Anh: them vao album, sua chu thich, dinh kem vao khoan chi
  const jpegPath = await createJpegFixture();
  await page.setInputFiles('label[aria-label="Thêm ảnh vào album"] input[type="file"]', jpegPath);
  await page.waitForSelector('span:text-is("1/60")', WAIT);
  await albumTile(0).click();
  await page.click('button[aria-label="Sửa chú thích"]');
  await page.fill('input[placeholder="Chú thích ảnh"]', "Hoa don san");
  await page.click('button[aria-label="Lưu chú thích"]');
  await page.waitForSelector("text=Hoa don san", WAIT);
  await page.click('button[aria-label="Đóng ảnh"]');
  ok("add photo to album + caption");

  await page.click('button:has-text("Chia đều")');
  await page.fill('input[placeholder="Ăn tối"]', "Nuoc suoi");
  await page.fill('input[placeholder="500.000"]', "20000");
  // Khoi "Ảnh hóa đơn" dong san, phai mo ra moi thay o chon file.
  await page.click('button:has-text("Ảnh hóa đơn")');
  await page.setInputFiles('label[aria-label="Đính kèm ảnh hóa đơn"] input[type="file"]', jpegPath);
  await page.click('button[type="submit"]:has-text("Thêm khoản chi")');
  await page.waitForSelector('button[aria-label="Xem ảnh của Nuoc suoi"]', WAIT);
  await page.waitForSelector('span:text-is("2/60")', WAIT);
  ok("attach photo to expense");

  // 7. Share link read-only mo duoc khong can dang nhap
  await page.click("text=Tạo link share");
  await page.waitForSelector('button:has-text("Đổi link")', WAIT);
  const detail = await page.evaluate(async () => {
    const gameId = location.pathname.split("/").pop();
    const response = await fetch(`/api/games/${gameId}`, { credentials: "include" });
    return response.json();
  });
  const anonPage = await browser.newPage();
  await anonPage.goto(`${BASE}/share/${detail.shareLink.token}`);
  await anonPage.waitForSelector("text=E2E Trip", WAIT);
  await anonPage.waitForSelector("text=Binh → An", WAIT);
  await anonPage.click('button:has-text("Ảnh")');
  await anonPage.waitForSelector("text=Ảnh (2)", WAIT);
  await anonPage.click('button[aria-label="Hoa don san"]');
  await anonPage.waitForSelector('button[aria-label="Đóng ảnh"]', WAIT);
  const deleteCount = await anonPage.locator('button[aria-label="Xóa ảnh"]').count();
  if (deleteCount !== 0) throw new Error("share view must not allow deleting photos");
  const shareWriteStatus = await anonPage.evaluate(async ({ id, payerId, anId, binhId }) => {
    const response = await fetch(`/api/games/${id}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Share write",
        amount: 1000,
        payerParticipantId: payerId,
        splitParticipantIds: [anId, binhId],
      }),
    });
    return response.status;
  }, { id: gameId, payerId: an.id, anId: an.id, binhId: binh.id });
  assert.equal(shareWriteStatus, 401);
  await anonPage.close();
  assert.equal((await getGameDetail(page, gameId)).expenses.length, 3);
  ok("public share page works without login");

  // 7.5 Ghi nhan tra no: bam "Đã trả" -> transfer duoc luu, het cong no
  await page.click('button:has-text("Đã trả")');
  await acceptConfirm();
  await page.waitForSelector("text=Đã trả nợ", WAIT);
  await page.waitForSelector("text=Binh đã trả An", WAIT);
  await page.waitForSelector("text=Mọi người đã cân bằng", WAIT);
  const settled = await getGameDetail(page, gameId);
  const transfers = settled.expenses.filter((expense) => expense.kind === "transfer");
  assert.equal(transfers.length, 1);
  assert.equal(transfers[0].amount, 120000);
  assert.equal(transfers[0].payerParticipantId, binh.id);
  assert.deepEqual(transfers[0].splits.map(({ participantId, amount }) => ({ participantId, amount })), [{
    participantId: an.id,
    amount: 120000,
  }]);
  assert.equal(settled.summary.totalExpense, 210000);
  assert.equal(settled.summary.balances.length, 2);
  assert.ok(settled.summary.balances.every((row) => row.balance === 0));
  assert.deepEqual(settled.summary.settlements, []);
  await page.reload();
  await page.waitForSelector("text=Mọi người đã cân bằng", WAIT);
  const persisted = await getGameDetail(page, gameId);
  assert.deepEqual(persisted.summary, settled.summary);
  assert.equal(persisted.expenses.filter((expense) => expense.kind === "transfer").length, 1);
  ok("record settlement as transfer");

  // 7.8 Xoa anh khoi album
  await albumTile(0).click();
  await page.click('button[aria-label="Xóa ảnh"]');
  await acceptConfirm();
  await page.waitForSelector('span:text-is("1/60")', WAIT);
  // Xoa xong van con anh khac nen khung xem mo tiep, dong lai truoc khi thoat.
  await page.click('button[aria-label="Đóng ảnh"]');
  ok("delete photo");

  // 7.9 Token MCP: tao tu trang cai dat, dung that, roi thu hoi
  await page.click('a[aria-label="Cài đặt"]');
  await page.waitForURL("**/settings", WAIT);
  await page.waitForSelector("text=Chưa có token nào", WAIT);
  // Bo tick "Đọc bản tổng kết" (mac dinh co) de kiem tra scope duoc ton trong.
  await page.click("text=Đọc bản tổng kết");
  await page.fill("#mcp-token-name", "E2E Claude");
  await page.click('button[type="submit"]:has-text("Tạo token")');
  await page.waitForSelector("text=Token chỉ hiện lần này", WAIT);
  const secret = await page.locator("code", { hasText: /^ck_[0-9a-f]{64}$/ }).first().innerText();
  await page.waitForSelector('text="1/20 chưa thu hồi"', WAIT);
  ok("create MCP token from settings page");

  const mcp = await page.evaluate(async (token) => {
    const call = (body) =>
      fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      }).then((response) => response.json());
    const tools = await call({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    const games = await call({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "list_games", arguments: {} },
    });
    const outOfScope = await call({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "get_summary_text", arguments: { game: "E2E" } },
    });
    return {
      tools: tools.result.tools.map((tool) => tool.name),
      games: games.result.content[0].text,
      outOfScope: Boolean(outOfScope.result?.isError),
    };
  }, secret);
  // Chi kiem tra theo scope, khong khoa cung danh sach tool.
  if (!mcp.tools.includes("list_games")) {
    throw new Error(`token co games:read phai thay list_games, got ${mcp.tools.join(",")}`);
  }
  if (mcp.tools.includes("get_summary_text")) {
    throw new Error("token khong co summary:read khong duoc thay get_summary_text");
  }
  if (!mcp.games.includes("E2E Trip")) throw new Error(`list_games thieu game: ${mcp.games}`);
  if (!mcp.outOfScope) throw new Error("tool ngoai scope phai bi tu choi");
  ok("MCP token works and stays inside its scopes");

  await page.click('button[aria-label="Thu hồi token"]');
  await acceptConfirm();
  await page.waitForSelector("text=Đã thu hồi", WAIT);
  const statusAfterRevoke = await page.evaluate(
    (token) =>
      fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      }).then((response) => response.status),
    secret,
  );
  if (statusAfterRevoke !== 401) {
    throw new Error(`token da thu hoi phai tra 401, got ${statusAfterRevoke}`);
  }
  ok("revoke MCP token from UI kills it");

  await page.goto(`${BASE}/`);
  await page.fill("#game-name", "E2E Weighted Split");
  await page.click('button[aria-label="Tạo cuộc chơi"]');
  await page.waitForURL("**/games/**", WAIT);
  const weightedGameId = new URL(page.url()).pathname.split("/").pop();

  for (const name of ["An", "Binh", "Cuong"]) {
    await page.fill('input[placeholder="Huy"]', name);
    await page.click('button[type="submit"]:has-text("Thêm người")');
    await page.locator(`button[aria-label="Đưa ${name} xuống"]`).waitFor(WAIT);
    await page.waitForFunction(() => document.querySelector('input[placeholder="Huy"]')?.value === "");
  }

  await page.click('button:has-text("Theo phần")');
  await page.fill('input[placeholder="Ăn tối"]', "Bua toi theo phan");
  await page.fill('input[placeholder="500.000"]', "120000");
  await page.fill('input[aria-label="Số phần của An"]', "1");
  await page.fill('input[aria-label="Số phần của Binh"]', "2");
  await page.fill('input[aria-label="Số phần của Cuong"]', "3");
  await page.waitForSelector("text=≈ 20.000", WAIT);
  await page.waitForSelector("text=≈ 40.000", WAIT);
  await page.waitForSelector("text=≈ 60.000", WAIT);
  await page.click('button[type="submit"]:has-text("Thêm khoản chi")');
  await page.waitForSelector("text=theo phần", WAIT);
  await page.waitForSelector("text=100.000", WAIT);

  const weighted = await getGameDetail(page, weightedGameId);
  const weightedIds = Object.fromEntries(
    weighted.participants.map((person) => [person.name, person.id]),
  );
  const weightedExpense = weighted.expenses.find((expense) => expense.title === "Bua toi theo phan");
  assert.ok(weightedExpense);
  assert.equal(weightedExpense.splitMode, "shares");
  assert.equal(weightedExpense.amount, 120000);
  assert.equal(weightedExpense.payerParticipantId, weightedIds.An);
  assert.deepEqual(
    weightedExpense.splits
      .map(({ participantId, amount, weight }) => [participantId, amount, weight])
      .sort(),
    [
      [weightedIds.An, 20000, 1],
      [weightedIds.Binh, 40000, 2],
      [weightedIds.Cuong, 60000, 3],
    ].sort(),
  );
  assert.equal(weighted.summary.totalExpense, 120000);
  assert.deepEqual(
    weighted.summary.balances
      .map(({ participantId, balance }) => [participantId, balance])
      .sort(),
    [
      [weightedIds.An, 100000],
      [weightedIds.Binh, -40000],
      [weightedIds.Cuong, -60000],
    ].sort(),
  );
  assert.deepEqual(
    weighted.summary.settlements
      .map(({ fromParticipantId, toParticipantId, amount }) => [fromParticipantId, toParticipantId, amount])
      .sort(),
    [
      [weightedIds.Binh, weightedIds.An, 40000],
      [weightedIds.Cuong, weightedIds.An, 60000],
    ].sort(),
  );
  ok("weighted split shows 1:2:3 shares and correct settlements");

  await page.reload();
  await page.waitForSelector("text=theo phần", WAIT);
  await page.waitForSelector("text=100.000", WAIT);
  const weightedReloaded = await getGameDetail(page, weightedGameId);
  assert.deepEqual(weightedReloaded.expenses, weighted.expenses);
  assert.deepEqual(weightedReloaded.summary, weighted.summary);
  ok("weighted split persists after reload");

  const invalidWeightStatus = await page.evaluate(async ({ id, payerId, participants }) => {
    const response = await fetch(`/api/games/${id}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: "Invalid weighted split",
        amount: 120000,
        payerParticipantId: payerId,
        splitMode: "shares",
        splits: participants.map((participantId, index) => ({
          participantId,
          value: index === 2 ? 1001 : 1,
        })),
      }),
    });
    return response.status;
  }, {
    id: weightedGameId,
    payerId: weightedIds.An,
    participants: [weightedIds.An, weightedIds.Binh, weightedIds.Cuong],
  });
  assert.equal(invalidWeightStatus, 400);
  const afterInvalidWeight = await getGameDetail(page, weightedGameId);
  assert.deepEqual(afterInvalidWeight.expenses, weightedReloaded.expenses);
  assert.deepEqual(afterInvalidWeight.summary, weightedReloaded.summary);
  ok("invalid weighted split leaves stored game unchanged");

  // 8. Logout
  await page.click("text=Thoát");
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
