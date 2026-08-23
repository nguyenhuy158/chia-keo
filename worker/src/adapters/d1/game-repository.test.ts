import { beforeEach, describe, expect, it } from "vitest";
import type { GameRepository } from "../../core/ports/game-repository";
import { createSqliteD1 } from "../../test-support/sqlite-d1";
import { createD1GameRepository } from "./game-repository";

const OWNER = "user_owner";
const GAME_ID = "game_1";

let repo: GameRepository;
let sqlite: ReturnType<typeof createSqliteD1>["sqlite"];

function gameRow(overrides: Record<string, unknown> = {}) {
  return {
    id: GAME_ID,
    ownerUserId: OWNER,
    code: "DSKVUF",
    name: "Cầu lông",
    settlementMode: "host",
    settlementHostId: "",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    deletedAt: null,
    ...overrides,
  } as Parameters<GameRepository["games"]["insert"]>[0];
}

function seedUser(id: string, email: string) {
  sqlite
    .prepare(
      "INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)",
    )
    .run(id, "Người dùng", email, Date.now(), Date.now());
}

beforeEach(async () => {
  const harness = createSqliteD1();
  sqlite = harness.sqlite;
  repo = createD1GameRepository(harness.d1);
  // Khoa ngoai duoc bat that: games.owner_user_id tro toi user(id), nen phai
  // co user truoc khi tao cuoc chia — dung nhu tren D1.
  seedUser(OWNER, "chu@example.com");
  seedUser("user_khac", "khac@example.com");
});

describe("games", () => {
  it("them roi doc lai duoc", async () => {
    await repo.games.insert(gameRow());

    expect(await repo.games.getById(GAME_ID)).toMatchObject({ code: "DSKVUF", name: "Cầu lông" });
  });

  it("khong co thi tra ve null chu khong nem", async () => {
    expect(await repo.games.getById("game_la")).toBeNull();
  });

  it("listByOwner bo cuoc trong thung rac", async () => {
    await repo.games.insert(gameRow());
    await repo.games.insert(gameRow({ id: "game_2", code: "ABCDEF" }));
    await repo.games.setDeletedAt("game_2", "2026-08-02T00:00:00.000Z");

    expect((await repo.games.listByOwner(OWNER)).map((row) => row.id)).toEqual([GAME_ID]);
  });

  it("listDeletedByOwner chi tra cuoc trong thung rac", async () => {
    await repo.games.insert(gameRow());
    await repo.games.setDeletedAt(GAME_ID, "2026-08-02T00:00:00.000Z");

    expect((await repo.games.listDeletedByOwner(OWNER)).map((row) => row.id)).toEqual([GAME_ID]);
  });

  it("khong tra ve cuoc cua nguoi khac", async () => {
    await repo.games.insert(gameRow({ ownerUserId: "user_khac" }));

    expect(await repo.games.listByOwner(OWNER)).toEqual([]);
  });

  it("update chi doi truong duoc gui", async () => {
    await repo.games.insert(gameRow());

    await repo.games.update(GAME_ID, { name: "Bóng bàn" }, "2026-08-03T00:00:00.000Z");

    const game = await repo.games.getById(GAME_ID);
    expect(game).toMatchObject({ name: "Bóng bàn", code: "DSKVUF" });
    expect(game?.updatedAt).toBe("2026-08-03T00:00:00.000Z");
  });

  it("phuc hoi bang cach xoa deletedAt", async () => {
    await repo.games.insert(gameRow());
    await repo.games.setDeletedAt(GAME_ID, "2026-08-02T00:00:00.000Z");

    await repo.games.setDeletedAt(GAME_ID, null);

    expect((await repo.games.getById(GAME_ID))?.deletedAt).toBeNull();
  });

  it("xoa that keo theo participant va khoan chi (cascade)", async () => {
    await repo.games.insert(gameRow());
    await repo.participants.insert(
      {
        id: "participant_an",
        gameId: GAME_ID,
        name: "An",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
      },
      { bankId: "", accountNo: "", accountName: "" },
    );

    await repo.games.delete(GAME_ID);

    expect(await repo.participants.listByGame(GAME_ID)).toEqual([]);
  });

  it("dem so nguoi va so khoan chi theo game", async () => {
    await repo.games.insert(gameRow());
    for (const [id, name] of [
      ["participant_an", "An"],
      ["participant_binh", "Bình"],
    ]) {
      await repo.participants.insert(
        {
          id,
          gameId: GAME_ID,
          name,
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
        { bankId: "", accountNo: "", accountName: "" },
      );
    }
    await repo.expenses.insert({
      id: "expense_1",
      gameId: GAME_ID,
      payerParticipantId: "participant_an",
      kind: "expense",
      title: "Nước",
      amount: 90_000,
      note: "",
      splitMode: "equal",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    });
    await repo.expenses.insert({
      id: "expense_2",
      gameId: GAME_ID,
      payerParticipantId: "participant_an",
      kind: "transfer",
      title: "Trả nợ",
      amount: 10_000,
      note: "",
      splitMode: "amount",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    });

    expect((await repo.games.countParticipants([GAME_ID])).get(GAME_ID)).toBe(2);
    // Khoan tra no khong tinh vao so khoan chi.
    expect((await repo.games.countExpenses([GAME_ID])).get(GAME_ID)).toBe(1);
  });
});

describe("participants", () => {
  beforeEach(async () => {
    await repo.games.insert(gameRow());
  });

  async function addParticipant(id: string, name: string, bankId = "") {
    await repo.participants.insert(
      {
        id,
        gameId: GAME_ID,
        name,
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
      },
      { bankId, accountNo: bankId ? "0123" : "", accountName: bankId ? name : "" },
    );
  }

  it("them roi liet ke theo thu tu them", async () => {
    await addParticipant("participant_an", "An");
    await addParticipant("participant_binh", "Bình");

    expect((await repo.participants.listByGame(GAME_ID)).map((row) => row.name)).toEqual([
      "An",
      "Bình",
    ]);
  });

  it("listIdsByGame chi tra id", async () => {
    await addParticipant("participant_an", "An");

    expect(await repo.participants.listIdsByGame(GAME_ID)).toEqual(["participant_an"]);
  });

  it("getWithGame tra ve ca cuoc chia", async () => {
    await addParticipant("participant_an", "An");

    expect(await repo.participants.getWithGame("participant_an")).toMatchObject({
      participant: { name: "An" },
      game: { id: GAME_ID },
    });
  });

  it("getWithGame khong co thi null", async () => {
    expect(await repo.participants.getWithGame("participant_la")).toBeNull();
  });

  it("doi ten", async () => {
    await addParticipant("participant_an", "An");

    await repo.participants.rename("participant_an", "An Anh", "2026-08-02T00:00:00.000Z");

    expect((await repo.participants.listByGame(GAME_ID))[0].name).toBe("An Anh");
  });

  it("sap lai thu tu: id dau tien hien tren cung", async () => {
    await addParticipant("participant_an", "An");
    await addParticipant("participant_binh", "Bình");

    await repo.participants.reorder(GAME_ID, ["participant_binh", "participant_an"]);

    expect((await repo.participants.listByGame(GAME_ID)).map((row) => row.name)).toEqual([
      "Bình",
      "An",
    ]);
  });

  it("luu va cap nhat tai khoan nhan tien", async () => {
    await addParticipant("participant_an", "An", "970436");

    await repo.participants.upsertPaymentProfile(
      "participant_an",
      { accountNo: "999" },
      "2026-08-02T00:00:00.000Z",
    );

    const payments = await repo.paymentProfiles.listByParticipantIds(["participant_an"]);
    expect(payments[0]).toMatchObject({ bankId: "970436", accountNo: "999" });
  });

  it("xoa nguoi thi split cua ho cung mat theo", async () => {
    await addParticipant("participant_an", "An");
    await repo.expenses.insert({
      id: "expense_1",
      gameId: GAME_ID,
      payerParticipantId: "participant_an",
      kind: "expense",
      title: "Nước",
      amount: 90_000,
      note: "",
      splitMode: "equal",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    });
    await repo.splits.replace("expense_1", [
      {
        id: "split_1",
        expenseId: "expense_1",
        participantId: "participant_an",
        amount: 90_000,
        weight: null,
      },
    ]);

    await repo.participants.delete("participant_an");

    expect(await repo.splits.listByExpense("expense_1")).toEqual([]);
  });

  it("danh ba suy ra tu participant cua moi cuoc minh tao", async () => {
    await addParticipant("participant_an", "An", "970436");

    const rows = await repo.participants.listByOwner(OWNER);

    expect(rows[0]).toMatchObject({ name: "An", bankId: "970436" });
  });

  it("id + ten cua moi participant, mot truy van", async () => {
    await addParticipant("participant_an", "An");

    expect(await repo.participants.listIdNamesByOwner(OWNER)).toEqual([
      { id: "participant_an", name: "An", gameId: GAME_ID },
    ]);
  });
});

describe("expenses va splits", () => {
  beforeEach(async () => {
    await repo.games.insert(gameRow());
    for (const [id, name] of [
      ["participant_an", "An"],
      ["participant_binh", "Bình"],
    ]) {
      await repo.participants.insert(
        {
          id,
          gameId: GAME_ID,
          name,
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
        { bankId: "", accountNo: "", accountName: "" },
      );
    }
  });

  async function addExpense(id: string, title: string, amount = 90_000) {
    await repo.expenses.insert({
      id,
      gameId: GAME_ID,
      payerParticipantId: "participant_an",
      kind: "expense",
      title,
      amount,
      note: "",
      splitMode: "equal",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    });
    await repo.splits.replace(id, [
      {
        id: `split_${id}_an`,
        expenseId: id,
        participantId: "participant_an",
        amount: amount / 2,
        weight: null,
      },
      {
        id: `split_${id}_binh`,
        expenseId: id,
        participantId: "participant_binh",
        amount: amount / 2,
        weight: null,
      },
    ]);
  }

  it("them roi doc lai, moi nhat tren cung", async () => {
    await addExpense("expense_1", "Nước");
    await addExpense("expense_2", "Sân");

    expect((await repo.expenses.listByGame(GAME_ID)).map((row) => row.title)).toEqual([
      "Sân",
      "Nước",
    ]);
  });

  it("getWithGame kem cuoc chia", async () => {
    await addExpense("expense_1", "Nước");

    expect(await repo.expenses.getWithGame("expense_1")).toMatchObject({
      expense: { title: "Nước" },
      game: { id: GAME_ID },
    });
  });

  it("getWithGame khong co thi null", async () => {
    expect(await repo.expenses.getWithGame("expense_la")).toBeNull();
  });

  it("update doi truong da gui", async () => {
    await addExpense("expense_1", "Nước");

    await repo.expenses.update("expense_1", {
      amount: 60_000,
      updatedAt: "2026-08-02T00:00:00.000Z",
    });

    expect((await repo.expenses.getById("expense_1"))?.amount).toBe(60_000);
  });

  it("xoa khoan chi thi split di theo", async () => {
    await addExpense("expense_1", "Nước");

    await repo.expenses.delete("expense_1");

    expect(await repo.splits.listByExpense("expense_1")).toEqual([]);
  });

  it("listIdsSplitWith tim cac khoan co phan cua mot nguoi", async () => {
    await addExpense("expense_1", "Nước");

    expect(await repo.expenses.listIdsSplitWith("participant_binh")).toEqual(["expense_1"]);
  });

  it("listByExpenseIds lay split cua nhieu khoan mot luot", async () => {
    await addExpense("expense_1", "Nước");
    await addExpense("expense_2", "Sân");

    expect(await repo.splits.listByExpenseIds(["expense_1", "expense_2"])).toHaveLength(4);
  });

  it("listByExpenseIds voi danh sach rong khong nem", async () => {
    expect(await repo.splits.listByExpenseIds([])).toEqual([]);
  });

  it("replace ghi de toan bo split cu", async () => {
    await addExpense("expense_1", "Nước");

    await repo.splits.replace("expense_1", [
      {
        id: "split_moi",
        expenseId: "expense_1",
        participantId: "participant_an",
        amount: 90_000,
        weight: null,
      },
    ]);

    expect(await repo.splits.listByExpense("expense_1")).toHaveLength(1);
  });

  it("listLiveByExpense bo split cua nguoi da bi xoa", async () => {
    await addExpense("expense_1", "Nước");

    await repo.participants.delete("participant_binh");

    expect(await repo.splits.listLiveByExpense("expense_1")).toHaveLength(1);
  });

  it("listByGameIds lay khoan chi cua nhieu cuoc trong mot truy van", async () => {
    await addExpense("expense_1", "Nước");

    expect(await repo.expenses.listByGameIds([GAME_ID])).toHaveLength(1);
  });

  it("sap lai thu tu: id dau tien hien tren cung", async () => {
    await addExpense("expense_1", "Nước");
    await addExpense("expense_2", "Sân");

    await repo.expenses.reorder(GAME_ID, ["expense_1", "expense_2"]);

    expect((await repo.expenses.listByGame(GAME_ID)).map((row) => row.title)).toEqual([
      "Nước",
      "Sân",
    ]);
  });
});

describe("share links", () => {
  beforeEach(async () => {
    await repo.games.insert(gameRow());
  });

  it("tao link roi tim lai bang token", async () => {
    await repo.shareLinks.replace(GAME_ID, {
      id: "share_1",
      gameId: GAME_ID,
      token: "abcd",
      enabled: true,
      createdAt: "2026-08-01T00:00:00.000Z",
      expiresAt: null,
    });

    expect(await repo.shareLinks.findByToken("abcd")).toMatchObject({
      link: { token: "abcd", enabled: true },
      game: { id: GAME_ID },
    });
  });

  it("token khong ton tai thi null", async () => {
    expect(await repo.shareLinks.findByToken("xxxx")).toBeNull();
  });

  it("quay link moi thi link cu bien mat", async () => {
    await repo.shareLinks.replace(GAME_ID, {
      id: "share_1",
      gameId: GAME_ID,
      token: "abcd",
      enabled: true,
      createdAt: "2026-08-01T00:00:00.000Z",
      expiresAt: null,
    });
    await repo.shareLinks.replace(GAME_ID, {
      id: "share_2",
      gameId: GAME_ID,
      token: "efgh",
      enabled: true,
      createdAt: "2026-08-02T00:00:00.000Z",
      expiresAt: null,
    });

    expect(await repo.shareLinks.findByToken("abcd")).toBeNull();
    expect(await repo.shareLinks.getLatestByGame(GAME_ID)).toMatchObject({ token: "efgh" });
  });

  it("tat link", async () => {
    await repo.shareLinks.replace(GAME_ID, {
      id: "share_1",
      gameId: GAME_ID,
      token: "abcd",
      enabled: true,
      createdAt: "2026-08-01T00:00:00.000Z",
      expiresAt: null,
    });

    await repo.shareLinks.setEnabled(GAME_ID, false);

    expect((await repo.shareLinks.getLatestByGame(GAME_ID))?.enabled).toBe(false);
  });

  it("chua co link thi null", async () => {
    expect(await repo.shareLinks.getLatestByGame(GAME_ID)).toBeNull();
  });
});

describe("photos", () => {
  beforeEach(async () => {
    await repo.games.insert(gameRow());
  });

  async function addPhoto(id: string, caption = "") {
    await repo.photos.insert({
      id,
      gameId: GAME_ID,
      expenseId: null,
      caption,
      mimeType: "image/webp",
      width: 100,
      height: 100,
      thumbData: "AAAA",
      data: "BBBB",
      createdAt: "2026-08-01T00:00:00.000Z",
    });
  }

  it("danh sach khong kem du lieu anh goc", async () => {
    await addPhoto("photo_1");

    const photos = await repo.photos.listByGame(GAME_ID);
    expect(photos).toHaveLength(1);
    expect(photos[0]).not.toHaveProperty("data");
  });

  it("getDetail moi kem anh goc", async () => {
    await addPhoto("photo_1");

    expect((await repo.photos.getDetail("photo_1"))?.data).toBe("BBBB");
  });

  it("dem so anh", async () => {
    await addPhoto("photo_1");
    await addPhoto("photo_2");

    expect(await repo.photos.countByGame(GAME_ID)).toBe(2);
  });

  it("doi chu thich", async () => {
    await addPhoto("photo_1");

    await repo.photos.update("photo_1", { caption: "Hoá đơn" });

    expect((await repo.photos.getById("photo_1"))?.caption).toBe("Hoá đơn");
  });

  it("getWithGame kem cuoc chia", async () => {
    await addPhoto("photo_1");

    expect(await repo.photos.getWithGame("photo_1")).toMatchObject({ game: { id: GAME_ID } });
  });

  it("xoa anh", async () => {
    await addPhoto("photo_1");

    await repo.photos.delete("photo_1");

    expect(await repo.photos.getById("photo_1")).toBeNull();
  });
});

describe("game events", () => {
  beforeEach(async () => {
    await repo.games.insert(gameRow());
  });

  it("ghi roi doc lai, moi nhat truoc", async () => {
    for (const [id, kind] of [
      ["event_1", "game_created"],
      ["event_2", "expense_added"],
    ]) {
      await repo.gameEvents.insert({
        id,
        gameId: GAME_ID,
        kind,
        payload: "{}",
        createdAt: id === "event_1" ? "2026-08-01T00:00:00.000Z" : "2026-08-02T00:00:00.000Z",
        undoneAt: null,
      });
    }

    expect((await repo.gameEvents.listByGame(GAME_ID, 10)).map((row) => row.id)).toEqual([
      "event_2",
      "event_1",
    ]);
  });

  it("gioi han so dong doc ve", async () => {
    for (const id of ["event_1", "event_2", "event_3"]) {
      await repo.gameEvents.insert({
        id,
        gameId: GAME_ID,
        kind: "expense_added",
        payload: "{}",
        createdAt: `2026-08-0${id.slice(-1)}T00:00:00.000Z`,
        undoneAt: null,
      });
    }

    expect(await repo.gameEvents.listByGame(GAME_ID, 2)).toHaveLength(2);
  });

  it("danh dau da hoan tac", async () => {
    await repo.gameEvents.insert({
      id: "event_1",
      gameId: GAME_ID,
      kind: "expense_removed",
      payload: "{}",
      createdAt: "2026-08-01T00:00:00.000Z",
      undoneAt: null,
    });

    await repo.gameEvents.markUndone("event_1", "2026-08-02T00:00:00.000Z");

    expect((await repo.gameEvents.getWithGame("event_1"))?.event.undoneAt).toBe(
      "2026-08-02T00:00:00.000Z",
    );
  });

  it("dong khong ton tai thi null", async () => {
    expect(await repo.gameEvents.getWithGame("event_la")).toBeNull();
  });
});

describe("users va collaborators", () => {
  beforeEach(async () => {
    await repo.games.insert(gameRow());
    seedUser("user_ban", "ban@example.com");
  });

  it("tim user theo email, khong phan biet hoa thuong", async () => {
    expect(await repo.users.findIdByEmail("CHU@Example.com")).toMatchObject({ id: OWNER });
  });

  it("email chua co tai khoan thi null", async () => {
    expect(await repo.users.findIdByEmail("la@example.com")).toBeNull();
  });

  it("liet ke user khac de chon nhanh khi chia se", async () => {
    // Moi user tru chinh nguoi goi (harness da tao san "user_khac").
    const ids = (await repo.users.listAllExceptOwner(OWNER)).map((row) => row.id);
    expect(ids).toContain("user_ban");
    expect(ids).not.toContain(OWNER);
  });

  it("doi ten hien thi", async () => {
    await repo.users.updateName(OWNER, "Tên mới", new Date());

    expect((await repo.users.findIdByEmail("chu@example.com"))?.name).toBe("Tên mới");
  });

  it("them nguoi duoc chia se, lan hai bao da co", async () => {
    const first = await repo.gameCollaborators.add({
      id: "collab_1",
      gameId: GAME_ID,
      userId: "user_ban",
      invitedEmail: "ban@example.com",
      createdAt: "2026-08-01T00:00:00.000Z",
    });
    const second = await repo.gameCollaborators.add({
      id: "collab_2",
      gameId: GAME_ID,
      userId: "user_ban",
      invitedEmail: "ban@example.com",
      createdAt: "2026-08-01T00:00:00.000Z",
    });

    expect([first, second]).toEqual([true, false]);
    expect(await repo.gameCollaborators.listByGame(GAME_ID)).toHaveLength(1);
  });

  it("isCollaborator dung cho nguoi da duoc chia se", async () => {
    await repo.gameCollaborators.add({
      id: "collab_1",
      gameId: GAME_ID,
      userId: "user_ban",
      invitedEmail: "ban@example.com",
      createdAt: "2026-08-01T00:00:00.000Z",
    });

    expect(await repo.gameCollaborators.isCollaborator(GAME_ID, "user_ban")).toBe(true);
    expect(await repo.gameCollaborators.isCollaborator(GAME_ID, "user_la")).toBe(false);
  });

  it("go quyen theo userId", async () => {
    await repo.gameCollaborators.add({
      id: "collab_1",
      gameId: GAME_ID,
      userId: "user_ban",
      invitedEmail: "ban@example.com",
      createdAt: "2026-08-01T00:00:00.000Z",
    });

    await repo.gameCollaborators.remove(GAME_ID, { userId: "user_ban" });

    expect(await repo.gameCollaborators.listByGame(GAME_ID)).toEqual([]);
  });

  it("invite dang cho duoc dien userId khi nguoi do dang nhap lan dau", async () => {
    await repo.gameCollaborators.add({
      id: "collab_1",
      gameId: GAME_ID,
      userId: null,
      invitedEmail: "ban@example.com",
      createdAt: "2026-08-01T00:00:00.000Z",
    });

    await repo.gameCollaborators.resolvePendingByEmail("BAN@example.com", "user_ban");

    expect(await repo.gameCollaborators.isCollaborator(GAME_ID, "user_ban")).toBe(true);
  });

  it("go invite dang cho theo email", async () => {
    await repo.gameCollaborators.add({
      id: "collab_1",
      gameId: GAME_ID,
      userId: null,
      invitedEmail: "moi@example.com",
      createdAt: "2026-08-01T00:00:00.000Z",
    });

    await repo.gameCollaborators.remove(GAME_ID, { invitedEmail: "moi@example.com" });

    expect(await repo.gameCollaborators.listByGame(GAME_ID)).toEqual([]);
  });

  it("cuoc duoc chia se hien trong danh sach cua nguoi nhan", async () => {
    await repo.gameCollaborators.add({
      id: "collab_1",
      gameId: GAME_ID,
      userId: "user_ban",
      invitedEmail: "ban@example.com",
      createdAt: "2026-08-01T00:00:00.000Z",
    });

    expect((await repo.games.listSharedWithUser("user_ban")).map((row) => row.id)).toEqual([
      GAME_ID,
    ]);
  });
});

describe("tuy chon nguoi dung", () => {
  it("ghi de gia tri cu tren cung key", async () => {
    await repo.userPreferences.upsert(OWNER, "summaryShowQr", "true", "2026-08-01T00:00:00.000Z");
    await repo.userPreferences.upsert(OWNER, "summaryShowQr", "false", "2026-08-02T00:00:00.000Z");

    expect(await repo.userPreferences.listByUser(OWNER)).toEqual([
      { key: "summaryShowQr", value: "false" },
    ]);
  });
});

describe("danh ba", () => {
  const contact = {
    id: "contact_1",
    ownerUserId: OWNER,
    name: "Hồng",
    nameKey: "hong",
    bankId: "970436",
    accountNo: "0123",
    accountName: "HONG",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };

  it("them roi doc lai", async () => {
    await repo.contacts.upsert(contact);

    expect(await repo.contacts.listByOwner(OWNER)).toHaveLength(1);
  });

  it("cung nameKey thi ghi de dong cu", async () => {
    await repo.contacts.upsert(contact);
    await repo.contacts.upsert({ ...contact, id: "contact_2", accountNo: "999" });

    const rows = await repo.contacts.listByOwner(OWNER);
    expect(rows).toHaveLength(1);
    expect(rows[0].accountNo).toBe("999");
  });

  it("getOwned chan doc danh ba nguoi khac", async () => {
    await repo.contacts.upsert(contact);

    expect(await repo.contacts.getOwned("contact_1", OWNER)).not.toBeNull();
    expect(await repo.contacts.getOwned("contact_1", "user_la")).toBeNull();
  });

  it("sua va xoa", async () => {
    await repo.contacts.upsert(contact);

    await repo.contacts.update("contact_1", { name: "Lan", nameKey: "lan" }, "2026-08-02T00:00:00.000Z");
    expect((await repo.contacts.listByOwner(OWNER))[0].name).toBe("Lan");

    await repo.contacts.delete("contact_1");
    expect(await repo.contacts.listByOwner(OWNER)).toEqual([]);
  });
});

describe("token MCP", () => {
  const token = {
    id: "token_1",
    userId: OWNER,
    name: "Claude",
    tokenHash: "hash-abc",
    tokenPrefix: "mcp_ab",
    scopes: "games:read",
    createdAt: "2026-08-01T00:00:00.000Z",
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
  };

  it("tao roi tim lai bang hash", async () => {
    await repo.mcpTokens.insert(token);

    expect(await repo.mcpTokens.findByHash("hash-abc")).toMatchObject({ id: "token_1" });
  });

  it("hash khong khop thi null", async () => {
    expect(await repo.mcpTokens.findByHash("hash-la")).toBeNull();
  });

  it("dem token con hieu luc", async () => {
    await repo.mcpTokens.insert(token);

    expect(await repo.mcpTokens.countActiveByUser(OWNER)).toBe(1);

    await repo.mcpTokens.revoke("token_1", OWNER, "2026-08-02T00:00:00.000Z");
    expect(await repo.mcpTokens.countActiveByUser(OWNER)).toBe(0);
  });

  it("khong thu hoi duoc token cua nguoi khac", async () => {
    await repo.mcpTokens.insert(token);

    expect(await repo.mcpTokens.revoke("token_1", "user_la", "2026-08-02T00:00:00.000Z")).toBe(
      false,
    );
  });

  it("ghi lai lan dung gan nhat", async () => {
    await repo.mcpTokens.insert(token);

    await repo.mcpTokens.touchLastUsed("token_1", "2026-08-02T00:00:00.000Z");

    expect((await repo.mcpTokens.listByUser(OWNER))[0].lastUsedAt).toBe(
      "2026-08-02T00:00:00.000Z",
    );
  });
});
