// E2E smoke test: chay app that (wrangler dev + D1 local) va bam qua cac flow
// chinh bang Chromium. Dung `pnpm e2e` de tu bat server; hoac `pnpm e2e:smoke`
// khi da co server chay san (`pnpm dev:api`).
//
// Bien moi truong:
// - E2E_BASE_URL: mac dinh http://127.0.0.1:8787
// - PLAYWRIGHT_CHROMIUM_PATH: duong dan chromium co san; bo trong de
//   playwright-core tu tim (xem findChromium trong @huyab/e2e).

import assert from "node:assert/strict";
import { join } from "node:path";
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

/** Khung tao cuoc choi mac dinh dong: mo ra neu chua mo roi cho o ten hien. */
async function openCreateGameForm(page) {
  const toggle = page.getByRole("button", { name: "Thêm cuộc chơi mới" });
  await toggle.waitFor(WAIT);
  if ((await page.locator("#game-name").count()) === 0) await toggle.click();
  await page.waitForSelector("#game-name", WAIT);
}

/** Mo mot tab cua trang cuoc choi (Chi, Người, Tổng kết, Khác). */
const goTab = (target, name) =>
  target.getByRole("button", { name, exact: true }).click();

/** Them mot nguoi bang Sheet cua tab Nguoi (co the kem tai khoan ngan hang). */
async function addPerson(target, gameId, name, bank) {
  await goTab(target, "Người");
  await target.getByRole("button", { name: "Mở form thêm người" }).click();
  await target.fill("input[placeholder='Huy']:visible", name);
  if (bank) {
    await target.click('button:has-text("Tài khoản nhận tiền"):visible');
    await target.click('button:has-text("Chọn ngân hàng"):visible');
    await target.click('[role="option"]:has-text("Vietcombank (VCB)")');
    const accountKeyboard = await target
      .locator("input[placeholder='0123456789']:visible")
      .evaluate((el) => [el.inputMode, el.autocapitalize].join("|"));
    const accountNameKeyboard = await target
      .locator("input[placeholder='NGUYEN VAN A']:visible")
      .evaluate((el) => el.autocapitalize);
    assert.equal(
      accountKeyboard,
      "numeric|",
      "so tai khoan khong mo ban phim so",
    );
    assert.equal(
      accountNameKeyboard,
      "characters",
      "ten chu TK khong viet hoa",
    );
    await target.fill(
      "input[placeholder='0123456789']:visible",
      bank.accountNo,
    );
    await target.fill(
      "input[placeholder='NGUYEN VAN A']:visible",
      bank.accountName,
    );
  }
  await target.click("button[type='submit']:visible");
  await target.waitForFunction(
    ({ id, personName }) =>
      fetch(`/api/games/${id}`, { credentials: "include" })
        .then((response) => response.json())
        .then((game) =>
          game.participants.some((item) => item.name === personName),
        ),
    { id: gameId, personName: name },
    WAIT,
  );
  await target.keyboard.press("Escape");
  await target
    .locator("input[placeholder='Huy']:visible")
    .waitFor({ state: "hidden", ...WAIT });
}

/** Mo Sheet them khoan chi o tab Chi, dien ten va so tien. */
async function openExpenseSheet(target, title, amount) {
  await goTab(target, "Chi");
  await target.getByRole("button", { name: "Thêm khoản chi" }).first().click();
  await target.fill("input[placeholder='Ăn tối']:visible", title);
  await target.fill("input[placeholder='500.000']:visible", amount);
}

/** Gui form khoan chi dang mo va doi Sheet dong lai. */
async function submitExpenseSheet(target) {
  await target.click("button[type='submit']:visible");
  await target
    .locator("input[placeholder='Ăn tối']:visible")
    .waitFor({ state: "hidden", ...WAIT });
}

/** Mo Sheet chi tiet cua mot dong chuyen khoan (tab Tong ket > Chuyen khoan). */
async function openTransferSheet(target, fromTo) {
  await goTab(target, "Tổng kết");
  await target
    .getByRole("button", { name: "Chuyển khoản", exact: true })
    .click();
  await target
    .getByRole("button", { name: `Chi tiết ${fromTo}` })
    .first()
    .click();
}

/**
 * Tao tai khoan moi qua Better Auth va giu cookie session trong tab hien tai.
 * Chay trong trang de cookie thuoc dung origin cua app.
 */
async function signUp(target, username) {
  const result = await target.evaluate(
    async ({ name, password }) => {
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
    },
    { name: username, password: E2E_PASSWORD },
  );
  if (result.status !== 200) {
    throw new Error(`sign-up that bai (${result.status}): ${result.body}`);
  }
}

async function getGameDetail(target, gameId) {
  const result = await target.evaluate(async (id) => {
    const response = await fetch(`/api/games/${id}`, {
      credentials: "include",
    });
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
  // auth.huyab.cfd, khong chay duoc trong test), nen tao session bang API
  // username/mat khau cua Better Auth - van bat trong backend/src/auth.ts.
  await signUp(page, username);
  await page.goto(BASE + "/");
  await openCreateGameForm(page);
  ok("sign up + land on home");

  // 3. Tao cuoc choi
  await page.fill("#game-name", "E2E Trip");
  await page.click('button[aria-label="Tạo cuộc chơi"]');
  await page.waitForURL("**/games/**", WAIT);
  const gameId = new URL(page.url()).pathname.split("/").pop();
  ok("create game navigates to game page");

  // 4. Them 2 nguoi (1 nguoi co thong tin ngan hang) bang Sheet cua tab Nguoi
  await addPerson(page, gameId, "An", {
    accountNo: "111222333",
    accountName: "LE AN",
  });
  await addPerson(page, gameId, "Binh");
  const withBank = await getGameDetail(page, gameId);
  const anWithBank = withBank.participants.find(
    (person) => person.name === "An",
  );
  assert.equal(anWithBank.bankId, "VCB");
  assert.equal(anWithBank.accountNo, "111222333");
  ok("add 2 participants");

  // 5. Them khoan chi chia doi
  await openExpenseSheet(page, "An trua", "100000");
  await submitExpenseSheet(page);
  await page.waitForFunction(
    (id) =>
      fetch(`/api/games/${id}`, { credentials: "include" })
        .then((response) => response.json())
        .then((game) => game.expenses.some((item) => item.title === "An trua")),
    gameId,
    WAIT,
  );
  ok("add expense");

  // 6. Dashboard tinh dung: Binh tra An 50.000 + co QR
  await openTransferSheet(page, "Binh trả An");
  const qrCount = await page.locator('img[alt*="QR nhận tiền"]').count();
  if (qrCount !== 1) throw new Error(`expected 1 QR image, got ${qrCount}`);
  ok("settlement + VietQR shown");

  await page
    .context()
    .grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  await page.getByRole("button", { name: "Copy lời nhắc cho Binh" }).click();
  await page.waitForSelector("text=Đã sao chép lời nhắc", WAIT);
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    'Binh ơi, bạn chuyển 50.000 ₫ cho An cho kèo "E2E Trip" nhé.',
  );
  await page.keyboard.press("Escape");
  ok("copy payment reminder for current settlement");

  // 6.5 Khoan chi chia theo so tien cu the (mode "amount")
  await openExpenseSheet(page, "Karaoke", "90000");
  await page.click('button:has-text("Số tiền"):visible');
  await page.fill('input[aria-label="Phần tiền của An"]', "30000");
  await page.fill('input[aria-label="Phần tiền của Binh"]', "60000");
  await submitExpenseSheet(page);
  // Balance moi: An +110.000, Binh -110.000
  await openTransferSheet(page, "Binh trả An");
  await page.waitForSelector("text=110.000", WAIT);
  await page.getByRole("button", { name: "Copy lời nhắc cho Binh" }).click();
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    'Binh ơi, bạn chuyển 110.000 ₫ cho An cho kèo "E2E Trip" nhé.',
  );
  await page.keyboard.press("Escape");
  await page.click('button:has-text("Nhiều chiều")');
  await page.waitForSelector(
    'button[aria-pressed="true"]:has-text("Nhiều chiều")',
    WAIT,
  );
  await page.waitForFunction(
    async (id) => {
      const response = await fetch(`/api/games/${id}`, {
        credentials: "include",
      });
      return (await response.json()).settlementMode === "p2p";
    },
    gameId,
    WAIT,
  );
  await openTransferSheet(page, "Binh trả An");
  await page.getByRole("button", { name: "Copy lời nhắc cho Binh" }).click();
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    'Binh ơi, bạn chuyển 110.000 ₫ cho An cho kèo "E2E Trip" nhé.',
  );
  await page.keyboard.press("Escape");
  await page.click('button:has-text("Gom 1 người")');
  await page.waitForSelector(
    'button[aria-pressed="true"]:has-text("Gom 1 người")',
    WAIT,
  );
  await page.waitForFunction(
    async (id) => {
      const response = await fetch(`/api/games/${id}`, {
        credentials: "include",
      });
      return (await response.json()).settlementMode === "host";
    },
    gameId,
    WAIT,
  );
  ok("payment reminder follows updated balance in both settlement modes");
  const beforeInvalid = await getGameDetail(page, gameId);
  const an = beforeInvalid.participants.find((person) => person.name === "An");
  const binh = beforeInvalid.participants.find(
    (person) => person.name === "Binh",
  );
  assert.ok(an);
  assert.ok(binh);
  const lunch = beforeInvalid.expenses.find(
    (expense) => expense.title === "An trua",
  );
  const karaoke = beforeInvalid.expenses.find(
    (expense) => expense.title === "Karaoke",
  );
  assert.ok(lunch);
  assert.ok(karaoke);
  assert.deepEqual(
    lunch.splits
      .map(({ participantId, amount }) => [participantId, amount])
      .sort(),
    [
      [an.id, 50000],
      [binh.id, 50000],
    ].sort(),
  );
  assert.deepEqual(
    karaoke.splits
      .map(({ participantId, amount }) => [participantId, amount])
      .sort(),
    [
      [an.id, 30000],
      [binh.id, 60000],
    ].sort(),
  );
  assert.equal(beforeInvalid.summary.totalExpense, 190000);
  assert.equal(
    beforeInvalid.summary.balances.find((row) => row.participantId === an.id)
      .balance,
    110000,
  );
  assert.equal(
    beforeInvalid.summary.balances.find((row) => row.participantId === binh.id)
      .balance,
    -110000,
  );
  assert.deepEqual(beforeInvalid.summary.settlements, [
    {
      fromParticipantId: binh.id,
      toParticipantId: an.id,
      amount: 110000,
    },
  ]);
  await page.reload();
  await openTransferSheet(page, "Binh trả An");
  await page.waitForSelector("text=110.000", WAIT);
  await page.keyboard.press("Escape");
  const reloaded = await getGameDetail(page, gameId);
  assert.deepEqual(reloaded.summary, beforeInvalid.summary);
  assert.deepEqual(reloaded.expenses, beforeInvalid.expenses);
  ok("add expense with custom amounts");

  // 5.5 Doi thu tu khoan chi bang menu "Đưa xuống" / "Đưa lên"
  const expenseIds = async () =>
    (await getGameDetail(page, gameId)).expenses.map((item) => item.id);
  const waitForOrder = async (expected) => {
    for (let attempt = 0; attempt < 25; attempt += 1) {
      if (JSON.stringify(await expenseIds()) === JSON.stringify(expected))
        return;
      await page.waitForTimeout(200);
    }
    assert.deepEqual(await expenseIds(), expected);
  };
  await goTab(page, "Chi");
  const orderBefore = await expenseIds();
  assert.ok(orderBefore.length >= 2);
  const [first, second, ...rest] = orderBefore;
  const expenseRows = page.locator("main div[style*='height: 68px']");
  await expenseRows.first().waitFor({ state: "visible", ...WAIT });
  await expenseRows
    .first()
    .getByRole("button", { name: /^Tùy chọn / })
    .click();
  await page.getByRole("button", { name: "Đưa xuống", exact: true }).click();
  await waitForOrder([second, first, ...rest]);
  await expenseRows
    .nth(1)
    .getByRole("button", { name: /^Tùy chọn / })
    .click();
  await page.getByRole("button", { name: "Đưa lên", exact: true }).click();
  await waitForOrder(orderBefore);
  ok("reorder expenses from the row menu and back");

  const invalidSplit = await page.evaluate(
    async ({ id, payerId, anId, binhId }) => {
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
    },
    { id: gameId, payerId: an.id, anId: an.id, binhId: binh.id },
  );
  assert.equal(invalidSplit, 400);
  const afterInvalid = await getGameDetail(page, gameId);
  assert.equal(afterInvalid.expenses.length, beforeInvalid.expenses.length);
  assert.deepEqual(afterInvalid.summary, beforeInvalid.summary);
  ok("invalid split is rejected without changing the game");

  const outsiderPage = await browser.newPage();
  await outsiderPage.goto(BASE + "/");
  await signUp(outsiderPage, `outsider${username}`);
  const outsiderAccess = await outsiderPage.evaluate(
    async ({ id, payerId, anId, binhId }) => {
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
    },
    { id: gameId, payerId: an.id, anId: an.id, binhId: binh.id },
  );
  assert.deepEqual(outsiderAccess, { read: 404, write: 404 });
  await outsiderPage.close();
  ok("another account cannot read or write the game");

  // 6.8 Anh: tao anh bang API (khung gon chi xem anh), mot anh gan vao khoan chi
  const uploadPhoto = (caption, expenseId) =>
    page.evaluate(
      async ({ id, photoCaption, photoExpenseId }) => {
        const jpeg = (width, height) => {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");
          context.fillStyle = "#7c3aed";
          context.fillRect(0, 0, width, height);
          return canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
        };
        const response = await fetch(`/api/games/${id}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            mimeType: "image/jpeg",
            data: jpeg(800, 500),
            thumbData: jpeg(160, 100),
            width: 800,
            height: 500,
            caption: photoCaption,
            expenseId: photoExpenseId,
          }),
        });
        return response.status;
      },
      { id: gameId, photoCaption: caption, photoExpenseId: expenseId },
    );
  assert.equal(await uploadPhoto("Hoa don san", null), 201);
  ok("add photo to album + caption");

  await openExpenseSheet(page, "Nuoc suoi", "20000");
  await submitExpenseSheet(page);
  const waterExpense = await page.waitForFunction(
    (id) =>
      fetch(`/api/games/${id}`, { credentials: "include" })
        .then((response) => response.json())
        .then(
          (game) =>
            game.expenses.find((item) => item.title === "Nuoc suoi")?.id ||
            false,
        ),
    gameId,
    WAIT,
  );
  assert.equal(await uploadPhoto("", await waterExpense.jsonValue()), 201);
  // Anh tao bang API nen cache cua trang chua biet: tai lai de thay nut anh.
  await page.reload();
  await page.waitForSelector(
    'button[aria-label="Xem ảnh của Nuoc suoi"]',
    WAIT,
  );
  ok("attach photo to expense");

  // 7. Share link read-only mo duoc khong can dang nhap
  const moreOptions = 'button[aria-label="Thêm tùy chọn cuộc chơi"]';
  await page.click(moreOptions);
  await page.click('[role="menuitem"]:has-text("Tạo link share")');
  await page.click(moreOptions);
  await page.waitForSelector('[role="menuitem"]:has-text("Đổi link")', WAIT);
  await page.keyboard.press("Escape");
  const detail = await page.evaluate(async () => {
    const gameId = location.pathname.split("/").pop();
    const response = await fetch(`/api/games/${gameId}`, {
      credentials: "include",
    });
    return response.json();
  });
  const anonPage = await browser.newPage();
  await anonPage.goto(`${BASE}/share/${detail.shareLink.token}`);
  await anonPage.waitForSelector("text=E2E Trip", WAIT);
  await anonPage.waitForSelector("text=Binh → An", WAIT);
  await anonPage.click('button:has-text("Ảnh")');
  await anonPage.waitForSelector("text=Ảnh (2) >> visible=true", WAIT);
  await anonPage.click('button[aria-label="Hoa don san"] >> visible=true');
  await anonPage.waitForSelector(
    '[role="dialog"] button[aria-label="Đóng"]',
    WAIT,
  );
  const deleteCount = await anonPage
    .locator('button[aria-label="Xóa ảnh"]')
    .count();
  if (deleteCount !== 0)
    throw new Error("share view must not allow deleting photos");
  assert.equal(
    await anonPage.locator('button[aria-label^="Copy lời nhắc cho"]').count(),
    0,
  );
  const shareWriteStatus = await anonPage.evaluate(
    async ({ id, payerId, anId, binhId }) => {
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
    },
    { id: gameId, payerId: an.id, anId: an.id, binhId: binh.id },
  );
  assert.equal(shareWriteStatus, 401);
  await anonPage.close();
  assert.equal((await getGameDetail(page, gameId)).expenses.length, 3);
  ok("public share page works without login");

  const sharePhone = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  const shareScrolls = () =>
    sharePhone.evaluate(() => {
      const root = document.documentElement;
      const panes = [...document.body.querySelectorAll("*")].filter((el) => {
        const overflowY = getComputedStyle(el).overflowY;
        return (
          (overflowY === "auto" || overflowY === "scroll") &&
          el.scrollHeight > el.clientHeight + 1
        );
      });
      return root.scrollHeight > innerHeight + 1 || panes.length > 0;
    });
  await sharePhone.goto(`${BASE}/share/${detail.shareLink.token}`);
  await sharePhone
    .getByRole("button", { name: "Chuyển khoản", exact: true })
    .waitFor({ state: "visible", ...WAIT });
  assert.equal(await shareScrolls(), false, "share Tong ket cuon duoc");
  await sharePhone
    .getByRole("button", { name: "Bảng chia", exact: true })
    .click();
  const shareRow = sharePhone
    .getByRole("button", { name: /^Chi tiết / })
    .first();
  await shareRow.waitFor({ state: "visible", ...WAIT });
  assert.equal(await shareScrolls(), false, "share Bang chia cuon duoc");
  await shareRow.click();
  const shareDialog = sharePhone.getByRole("dialog");
  await shareDialog.waitFor({ state: "visible", ...WAIT });
  await sharePhone.keyboard.press("Escape");
  await shareDialog.waitFor({ state: "hidden", ...WAIT });
  await sharePhone.getByRole("button", { name: "Ảnh", exact: true }).click();
  await sharePhone
    .locator("text=Ảnh (2) >> visible=true")
    .waitFor({ state: "visible", ...WAIT });
  assert.equal(await shareScrolls(), false, "share Anh cuon duoc");
  await sharePhone.close();
  ok("phone: public share page fits one screen on every tab");

  // 7.5 Ghi nhan tra no: bam "Đã trả" -> transfer duoc luu, het cong no
  await openTransferSheet(page, "Binh trả An");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đã trả", exact: true })
    .click();
  await acceptConfirm();
  await page.getByRole("button", { name: /^Đã trả \(1\)$/ }).click();
  await page.waitForSelector("text=Binh đã trả An", WAIT);
  await page.getByRole("button", { name: "Chuyển khoản", exact: true }).click();
  await page.waitForSelector("text=Mọi người đã cân bằng", WAIT);
  const settled = await getGameDetail(page, gameId);
  const transfers = settled.expenses.filter(
    (expense) => expense.kind === "transfer",
  );
  assert.equal(transfers.length, 1);
  assert.equal(transfers[0].amount, 120000);
  assert.equal(transfers[0].payerParticipantId, binh.id);
  assert.deepEqual(
    transfers[0].splits.map(({ participantId, amount }) => ({
      participantId,
      amount,
    })),
    [
      {
        participantId: an.id,
        amount: 120000,
      },
    ],
  );
  assert.equal(settled.summary.totalExpense, 210000);
  assert.equal(settled.summary.balances.length, 2);
  assert.ok(settled.summary.balances.every((row) => row.balance === 0));
  assert.deepEqual(settled.summary.settlements, []);
  await page.reload();
  await goTab(page, "Tổng kết");
  await page.getByRole("button", { name: "Chuyển khoản", exact: true }).click();
  await page.waitForSelector("text=Mọi người đã cân bằng", WAIT);
  const persisted = await getGameDetail(page, gameId);
  assert.deepEqual(persisted.summary, settled.summary);
  assert.equal(
    persisted.expenses.filter((expense) => expense.kind === "transfer").length,
    1,
  );
  ok("record settlement as transfer");

  // 7.8 Xoa anh khoi album
  const deletedPhoto = await page.evaluate(async (id) => {
    const list = await fetch(`/api/games/${id}/photos`, {
      credentials: "include",
    }).then((response) => response.json());
    const target = list.find((item) => item.caption === "Hoa don san");
    const status = (
      await fetch(`/api/photos/${target.id}`, {
        method: "DELETE",
        credentials: "include",
      })
    ).status;
    const after = await fetch(`/api/games/${id}/photos`, {
      credentials: "include",
    }).then((response) => response.json());
    return { status, remaining: after.length };
  }, gameId);
  assert.ok(deletedPhoto.status < 300);
  assert.equal(deletedPhoto.remaining, 1);
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
  const secret = await page
    .locator("code", { hasText: /^ck_[0-9a-f]{64}$/ })
    .first()
    .innerText();
  await page.waitForSelector('text="1/20 chưa thu hồi"', WAIT);
  ok("create MCP token from settings page");

  const mcp = await page.evaluate(async (token) => {
    const call = (body) =>
      fetch("/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
    throw new Error(
      `token co games:read phai thay list_games, got ${mcp.tools.join(",")}`,
    );
  }
  if (mcp.tools.includes("get_summary_text")) {
    throw new Error(
      "token khong co summary:read khong duoc thay get_summary_text",
    );
  }
  if (!mcp.games.includes("E2E Trip"))
    throw new Error(`list_games thieu game: ${mcp.games}`);
  if (!mcp.outOfScope) throw new Error("tool ngoai scope phai bi tu choi");
  ok("MCP token works and stays inside its scopes");

  await page.click('button[aria-label="Thu hồi token"]');
  await acceptConfirm();
  await page.waitForSelector("text=Đã thu hồi", WAIT);
  const statusAfterRevoke = await page.evaluate(
    (token) =>
      fetch("/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      }).then((response) => response.status),
    secret,
  );
  if (statusAfterRevoke !== 401) {
    throw new Error(`token da thu hoi phai tra 401, got ${statusAfterRevoke}`);
  }
  ok("revoke MCP token from UI kills it");

  await page.goto(`${BASE}/`);
  await openCreateGameForm(page);
  await page.fill("#game-name", "E2E Weighted Split");
  await page.click('button[aria-label="Tạo cuộc chơi"]');
  await page.waitForURL("**/games/**", WAIT);
  const weightedGameId = new URL(page.url()).pathname.split("/").pop();

  for (const name of ["An", "Binh", "Cuong"]) {
    await addPerson(page, weightedGameId, name);
  }

  await openExpenseSheet(page, "Bua toi theo phan", "120000");
  await page.click('button:has-text("Theo phần"):visible');
  await page.fill('input[aria-label="Số phần của An"]', "1");
  await page.fill('input[aria-label="Số phần của Binh"]', "2");
  await page.fill('input[aria-label="Số phần của Cuong"]', "3");
  await page.waitForSelector("text=≈ 20.000", WAIT);
  await page.waitForSelector("text=≈ 40.000", WAIT);
  await page.waitForSelector("text=≈ 60.000", WAIT);
  await submitExpenseSheet(page);
  await page.waitForSelector("text=Bua toi theo phan", WAIT);

  const weighted = await getGameDetail(page, weightedGameId);
  const weightedIds = Object.fromEntries(
    weighted.participants.map((person) => [person.name, person.id]),
  );
  const weightedExpense = weighted.expenses.find(
    (expense) => expense.title === "Bua toi theo phan",
  );
  assert.ok(weightedExpense);
  assert.equal(weightedExpense.splitMode, "shares");
  assert.equal(weightedExpense.amount, 120000);
  assert.equal(weightedExpense.payerParticipantId, weightedIds.An);
  assert.deepEqual(
    weightedExpense.splits
      .map(({ participantId, amount, weight }) => [
        participantId,
        amount,
        weight,
      ])
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
      .map(({ fromParticipantId, toParticipantId, amount }) => [
        fromParticipantId,
        toParticipantId,
        amount,
      ])
      .sort(),
    [
      [weightedIds.Binh, weightedIds.An, 40000],
      [weightedIds.Cuong, weightedIds.An, 60000],
    ].sort(),
  );
  ok("weighted split shows 1:2:3 shares and correct settlements");

  await page.reload();
  await page.waitForSelector("text=Bua toi theo phan", WAIT);
  const weightedReloaded = await getGameDetail(page, weightedGameId);
  assert.deepEqual(weightedReloaded.expenses, weighted.expenses);
  assert.deepEqual(weightedReloaded.summary, weighted.summary);
  ok("weighted split persists after reload");

  const invalidWeightStatus = await page.evaluate(
    async ({ id, payerId, participants }) => {
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
    },
    {
      id: weightedGameId,
      payerId: weightedIds.An,
      participants: [weightedIds.An, weightedIds.Binh, weightedIds.Cuong],
    },
  );
  assert.equal(invalidWeightStatus, 400);
  const afterInvalidWeight = await getGameDetail(page, weightedGameId);
  assert.deepEqual(afterInvalidWeight.expenses, weightedReloaded.expenses);
  assert.deepEqual(afterInvalidWeight.summary, weightedReloaded.summary);
  ok("invalid weighted split leaves stored game unchanged");

  // 7.10 Luu tru: an khoi danh sach dang choi, hien o "Da luu tru", khoi phuc duoc
  await page.click('button[aria-label="Thêm tùy chọn cuộc chơi"]');
  await page.click('[role="menuitem"]:has-text("Lưu trữ")');
  await acceptConfirm();
  await page.waitForURL(`${BASE}/`, WAIT);
  const listIds = (path) =>
    page.evaluate(
      (url) =>
        fetch(url, { credentials: "include" })
          .then((response) => response.json())
          .then((games) => games.map((game) => game.id)),
      path,
    );
  assert.ok((await listIds("/api/games/archived")).includes(weightedGameId));
  assert.ok(!(await listIds("/api/games")).includes(weightedGameId));
  assert.ok(!(await listIds("/api/games/closed")).includes(weightedGameId));
  await page.getByRole("button", { name: "Đã lưu trữ", exact: true }).click();
  await page.getByText("E2E Weighted Split").last().waitFor(WAIT);
  await page.getByRole("button", { name: "Khôi phục" }).click();
  await page.waitForFunction(
    async (id) => {
      const response = await fetch("/api/games", { credentials: "include" });
      return (await response.json()).some((game) => game.id === id);
    },
    weightedGameId,
    WAIT,
  );
  assert.deepEqual(await listIds("/api/games/archived"), []);
  ok("archive hides a game from every list and restore brings it back");

  // 7b. Dien thoai: tab Chi vua mot man hinh, chia trang, them bang Sheet
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(
    async ({ id, payerId, participantIds }) => {
      for (let n = 1; n <= 14; n += 1) {
        await fetch(`/api/games/${id}/expenses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: `Phone ${n}`,
            amount: 10000 * n,
            payerParticipantId: payerId,
            splitMode: "equal",
            splitParticipantIds: participantIds,
          }),
        });
      }
    },
    { id: gameId, payerId: an.id, participantIds: [an.id, binh.id] },
  );
  await page.goto(`${BASE}/games/${gameId}`);
  const phoneRows = page.locator("main div[style*='height: 68px']");
  await phoneRows.first().waitFor({ state: "visible", ...WAIT });
  const scrolls = () =>
    page.evaluate(() => {
      const root = document.documentElement;
      const panes = [...document.body.querySelectorAll("*")].filter((el) => {
        const overflowY = getComputedStyle(el).overflowY;
        return (
          (overflowY === "auto" || overflowY === "scroll") &&
          el.scrollHeight > el.clientHeight + 1
        );
      });
      return root.scrollHeight > innerHeight + 1 || panes.length > 0;
    });
  assert.equal(await scrolls(), false, "tab Chi cuon duoc tren dien thoai");
  const firstPageTitle = await phoneRows.first().innerText();
  assert.ok(
    (await phoneRows.count()) < 14,
    "danh sach khong chia trang tren dien thoai",
  );
  await page.getByRole("button", { name: "Trang sau" }).click();
  assert.notEqual(await phoneRows.first().innerText(), firstPageTitle);
  assert.equal(await scrolls(), false, "tab Chi cuon duoc o trang sau");
  await phoneRows
    .first()
    .getByRole("button", { name: /^Tùy chọn / })
    .click();
  const moveUp = page.getByRole("button", { name: "Đưa lên", exact: true });
  await moveUp.waitFor({ state: "visible", ...WAIT });
  assert.ok(
    await moveUp.isVisible(),
    "menu dong khoan chi bi cat tren dien thoai",
  );
  await page.keyboard.press("Escape");
  await moveUp.waitFor({ state: "hidden", ...WAIT });
  await page.getByRole("button", { name: "Thêm khoản chi" }).first().click();
  await page.fill("input[placeholder='Ăn tối']:visible", "Them tu Sheet");
  await page.fill("input[placeholder='500.000']:visible", "45000");
  await page.click("button[type='submit']:visible");
  await page
    .locator("input[placeholder='Ăn tối']:visible")
    .waitFor({ state: "hidden", ...WAIT });
  await page.waitForFunction(
    (id) =>
      fetch(`/api/games/${id}`, { credentials: "include" })
        .then((response) => response.json())
        .then((game) =>
          game.expenses.some((item) => item.title === "Them tu Sheet"),
        ),
    gameId,
    WAIT,
  );
  await page.getByRole("button", { name: "Tổng kết", exact: true }).click();
  await page.getByRole("button", { name: "Chuyển khoản", exact: true }).click();
  const settleRow = page.getByRole("button", { name: /^Chi tiết / }).first();
  await settleRow.waitFor({ state: "visible", ...WAIT });
  assert.equal(
    await scrolls(),
    false,
    "tab Tổng kết cuon duoc tren dien thoai",
  );
  await settleRow.click();
  const paidButton = page.getByRole("button", { name: "Đã trả", exact: true });
  await paidButton.waitFor({ state: "visible", ...WAIT });
  await page.keyboard.press("Escape");
  await paidButton.waitFor({ state: "hidden", ...WAIT });
  await page.getByRole("button", { name: "Số dư", exact: true }).click();
  assert.equal(await scrolls(), false, "so du cuon duoc tren dien thoai");
  ok(
    "phone: Tổng kết tab fits one screen with balances, transfers and a Sheet",
  );

  const openTab = (name) =>
    page.getByRole("button", { name, exact: true }).click();
  await openTab("Người");
  await page
    .getByRole("button", { name: "Mở form thêm người" })
    .waitFor({ state: "visible", ...WAIT });
  assert.equal(await scrolls(), false, "tab Nguoi cuon duoc tren dien thoai");
  await page.getByRole("button", { name: "Mở form thêm người" }).click();
  await page.fill("input[placeholder='Huy']:visible", "Phone Guest");
  await page.click("button[type='submit']:visible");
  await page.waitForFunction(
    (id) =>
      fetch(`/api/games/${id}`, { credentials: "include" })
        .then((response) => response.json())
        .then((game) =>
          game.participants.some((item) => item.name === "Phone Guest"),
        ),
    gameId,
    WAIT,
  );
  await page.keyboard.press("Escape");
  await page
    .locator("input[placeholder='Huy']:visible")
    .waitFor({ state: "hidden", ...WAIT });
  await page
    .getByRole("button", { name: /^Tùy chọn (?!cuộc chơi)/ })
    .first()
    .click();
  const personUp = page.getByRole("button", { name: "Đưa lên", exact: true });
  await personUp.waitFor({ state: "visible", ...WAIT });
  await page.keyboard.press("Escape");
  await personUp.waitFor({ state: "hidden", ...WAIT });
  ok("phone: Người tab fits one screen and adds from a Sheet");

  await openTab("Khác");
  await page.getByRole("button", { name: "Lịch sử", exact: true }).click();
  await page
    .locator("main div[style*='height: 64px']")
    .first()
    .waitFor({ state: "visible", ...WAIT });
  assert.equal(await scrolls(), false, "Lich su cuon duoc tren dien thoai");
  await page.getByRole("button", { name: "Ảnh", exact: true }).click();
  assert.equal(await scrolls(), false, "Anh cuon duoc tren dien thoai");
  await page.getByRole("button", { name: "Chia sẻ", exact: true }).click();
  await page.getByRole("button", { name: "Ảnh tổng kết" }).click();
  await page
    .getByRole("dialog", { name: "Ảnh tổng kết" })
    .waitFor({ state: "visible", ...WAIT });
  await page.keyboard.press("Escape");
  await page
    .getByRole("dialog", { name: "Ảnh tổng kết" })
    .waitFor({ state: "hidden", ...WAIT });
  assert.equal(await scrolls(), false, "Chia se cuon duoc tren dien thoai");
  ok("phone: Khác tab fits one screen with photos, history and share Sheets");

  await page.goto(`${BASE}/`);
  await page
    .getByRole("button", { name: "Mở danh sách cuộc chơi" })
    .first()
    .waitFor({ state: "visible", ...WAIT });
  assert.equal(await scrolls(), false, "trang chu cuon duoc tren dien thoai");
  await page.getByRole("button", { name: "Cần tất toán", exact: true }).click();
  assert.equal(await scrolls(), false, "trang chu cuon duoc o view khac");
  ok("phone: home page fits one screen");

  await page.goto(`${BASE}/shuttles`);
  await page
    .getByRole("button", { name: "Dùng 1 trái" })
    .waitFor({ state: "visible", ...WAIT });
  assert.equal(await scrolls(), false, "kho cau cuon duoc tren dien thoai");
  await page.goto(`${BASE}/fun`);
  await page
    .getByRole("heading", { name: "Thống kê vui" })
    .first()
    .waitFor({ state: "visible", ...WAIT });
  assert.equal(
    await scrolls(),
    false,
    "thong ke vui cuon duoc tren dien thoai",
  );
  ok("phone: shuttles and fun stats fit one screen");
  await page.setViewportSize({ width: 1280, height: 720 });
  ok("phone: Chi tab fits one screen, pages the list and adds from a Sheet");

  // 7c. May tinh: cac trang chinh cung vua mot man hinh, khong cuon ca trang
  // (cot trai va danh sach ben trong tu cuon trong khung cua minh).
  const pageScrolls = () =>
    page.evaluate(
      () =>
        document.documentElement.scrollHeight >
        document.documentElement.clientHeight + 1,
    );
  for (const path of ["/", "/shuttles", "/fun", `/games/${gameId}`]) {
    await page.goto(`${BASE}${path}`);
    await page.waitForLoadState("networkidle");
    assert.equal(
      await pageScrolls(),
      false,
      `${path} cuon ca trang tren may tinh`,
    );
  }
  for (const tab of ["Người", "Tổng kết", "Khác", "Chi"]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    assert.equal(
      await pageScrolls(),
      false,
      `tab ${tab} cuon ca trang tren may tinh`,
    );
  }
  ok("desktop: home, shuttles, fun stats and every game tab fit one screen");

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
