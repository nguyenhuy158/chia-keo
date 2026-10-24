import { drizzle } from "drizzle-orm/d1";
import { migrate } from "drizzle-orm/d1/migrator";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { shareGame } from "../../core/application/collaborators";
import { addExpense, recordTransfer } from "../../core/application/expenses";
import {
  closeGame,
  createGame,
  deleteGame,
  duplicateGame,
  listClosedGames,
  listDeletedGames,
  listGames,
  reopenGame,
  restoreGame,
} from "../../core/application/games";
import { createD1GameRepository } from "./game-repository";
import * as schema from "./schema";

let miniflare: Miniflare;
let database: D1Database;

beforeAll(async () => {
  miniflare = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok'); } }",
    compatibilityDate: "2026-07-01",
    d1Databases: { DB: "test-game-repository" },
    d1Persist: false,
  });
  database = await miniflare.getD1Database("DB");
  await migrate(drizzle(database), { migrationsFolder: "./drizzle" });
  await drizzle(database)
    .insert(schema.user)
    .values({
      id: "owner",
      name: "Owner",
      email: "owner@example.test",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    });
  await drizzle(database)
    .insert(schema.user)
    .values({
      id: "friend",
      name: "Friend",
      email: "friend@example.test",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    });
});

afterAll(async () => {
  await miniflare.dispose();
});

describe("D1 game repository", () => {
  it("khởi tạo schema và trả danh sách rỗng khi chưa có game", async () => {
    const repo = createD1GameRepository(database);
    expect(await repo.games.listByOwner("user-empty")).toEqual([]);
  });

  it("tạo cuộc chia và đọc lại từ D1 qua use case", async () => {
    const repo = createD1GameRepository(database);
    const detail = await createGame(repo, "owner", {
      name: "Kèo D1",
      participantCount: 2,
    });
    expect(detail.participants.map((person) => person.name)).toEqual([
      "Người 1",
      "Người 2",
    ]);
    expect((await listGames(repo, "owner")).map((game) => game.id)).toContain(
      detail.id,
    );
    expect((await repo.games.getById(detail.id))?.name).toBe("Kèo D1");
  });

  it("lưu khoản chi, giao dịch và chuyển trạng thái cuộc chia", async () => {
    const repo = createD1GameRepository(database);
    const created = await createGame(repo, "owner", {
      name: "Kèo thanh toán",
      participantCount: 2,
    });
    const [payer, other] = created.participants;
    const withExpense = await addExpense(repo, "owner", created.id, {
      kind: "expense",
      category: "",
      title: "Tiền sân",
      amount: 100_000,
      note: "",
      payerParticipantId: payer.id,
      splitMode: "equal",
      splitParticipantIds: [payer.id, other.id],
      splits: [],
    });
    expect(withExpense.expenses).toHaveLength(1);
    expect((await repo.games.countExpenses([created.id])).get(created.id)).toBe(
      1,
    );
    expect(
      (await repo.games.countParticipants([created.id])).get(created.id),
    ).toBe(2);
    const transferred = await recordTransfer(repo, "owner", created.id, {
      fromParticipantId: other.id,
      toParticipantId: payer.id,
      amount: 50_000,
      note: "",
    });
    expect(transferred.closeMode).toBe("auto");
    expect(
      (await listClosedGames(repo, "owner")).some(
        (game) => game.id === created.id,
      ),
    ).toBe(true);
    const reopened = await reopenGame(repo, "owner", created.id);
    expect(reopened.closeMode).toBe("auto");
    const manuallyClosed = await createGame(repo, "owner", {
      name: "Kèo đóng tay",
    });
    const closed = await closeGame(repo, "owner", manuallyClosed.id);
    expect(closed.closeMode).toBe("manual");
  });

  it("xóa mềm, khôi phục, nhân bản và chia sẻ game qua D1", async () => {
    const repo = createD1GameRepository(database);
    const created = await createGame(repo, "owner", { name: "Kèo lưu trữ" });
    await shareGame(repo, "owner", created.id, "friend@example.test");
    expect(
      (await repo.games.listSharedWithUser("friend")).map((game) => game.id),
    ).toContain(created.id);
    await deleteGame(repo, "owner", created.id);
    expect(
      (await listGames(repo, "owner")).some((game) => game.id === created.id),
    ).toBe(false);
    expect(
      (await listDeletedGames(repo, "owner")).map((game) => game.id),
    ).toContain(created.id);
    await restoreGame(repo, "owner", created.id);
    const copy = await duplicateGame(repo, "owner", created.id);
    expect(copy.id).not.toBe(created.id);
    expect(copy.name).toBe("Kèo lưu trữ (bản sao)");
  });

  it("lưu tùy chọn và lịch sử cầu theo từng chủ sở hữu", async () => {
    const repo = createD1GameRepository(database);
    const now = "2026-07-01T00:00:00.000Z";
    expect(await repo.userPreferences.listByUser("owner")).toEqual([]);
    await repo.userPreferences.upsert("owner", "theme", '"light"', now);
    await repo.userPreferences.upsert("owner", "theme", '"dark"', now);
    expect(await repo.userPreferences.listByUser("owner")).toEqual([
      { key: "theme", value: '"dark"' },
    ]);
    expect(await repo.userPreferences.listByUser("friend")).toEqual([]);

    const entry = {
      id: "shuttle-d1",
      ownerUserId: "owner",
      kind: "add" as const,
      delta: 3,
      note: "Mua cầu",
      createdAt: now,
    };
    await repo.shuttleEntries.insert(entry);
    expect(await repo.shuttleEntries.getOwned(entry.id, "friend")).toBeNull();
    expect(await repo.shuttleEntries.getOwned(entry.id, "owner")).toMatchObject(
      entry,
    );
    expect(
      (await repo.shuttleEntries.listByOwner("owner")).map((row) => row.id),
    ).toContain(entry.id);
    await repo.shuttleEntries.delete(entry.id);
    expect(await repo.shuttleEntries.getOwned(entry.id, "owner")).toBeNull();
  });

  it("upsert danh bạ theo tên chuẩn hóa và cách ly theo chủ sở hữu", async () => {
    const repo = createD1GameRepository(database);
    const now = "2026-07-01T00:00:00.000Z";
    const contact = {
      id: "contact-d1",
      ownerUserId: "owner",
      name: "An",
      nameKey: "an",
      bankId: "bank-a",
      accountNo: "123",
      accountName: "AN",
      createdAt: now,
      updatedAt: now,
    };
    await repo.contacts.upsert(contact);
    await repo.contacts.upsert({
      ...contact,
      id: "contact-other",
      accountNo: "456",
    });
    expect(await repo.contacts.getOwned(contact.id, "friend")).toBeNull();
    expect(
      (await repo.contacts.listByOwner("owner")).filter(
        (row) => row.name === "An",
      ),
    ).toHaveLength(1);
    expect((await repo.contacts.getOwned(contact.id, "owner"))?.accountNo).toBe(
      "456",
    );
    await repo.contacts.update(contact.id, { name: "Anh" }, now);
    expect((await repo.contacts.getOwned(contact.id, "owner"))?.name).toBe(
      "Anh",
    );
    await repo.contacts.delete(contact.id);
    expect(await repo.contacts.getOwned(contact.id, "owner")).toBeNull();
  });

  it("giới hạn và thu hồi MCP token theo tài khoản", async () => {
    const repo = createD1GameRepository(database);
    const now = "2026-07-01T00:00:00.000Z";
    const token = {
      id: "token-d1",
      userId: "owner",
      name: "Test",
      tokenHash: "hash-d1",
      tokenPrefix: "ck_test",
      scopes: "games:read",
      createdAt: now,
      lastUsedAt: null,
      expiresAt: null,
      revokedAt: null,
    };
    expect(await repo.mcpTokens.findByHash(token.tokenHash)).toBeNull();
    await repo.mcpTokens.insert(token);
    expect(await repo.mcpTokens.countActiveByUser("owner")).toBe(1);
    expect(await repo.mcpTokens.countActiveByUser("friend")).toBe(0);
    expect((await repo.mcpTokens.listByUser("owner"))[0]?.id).toBe(token.id);
    await repo.mcpTokens.touchLastUsed(token.id, now);
    expect((await repo.mcpTokens.findByHash(token.tokenHash))?.lastUsedAt).toBe(
      now,
    );
    expect(await repo.mcpTokens.revoke(token.id, "friend", now)).toBe(false);
    expect(await repo.mcpTokens.revoke(token.id, "owner", now)).toBe(true);
    expect(await repo.mcpTokens.revoke(token.id, "owner", now)).toBe(false);
    expect(await repo.mcpTokens.countActiveByUser("owner")).toBe(0);
  });

  it("lưu ảnh, link chia sẻ và lịch sử trên D1", async () => {
    const repo = createD1GameRepository(database);
    const game = await createGame(repo, "owner", { name: "Kèo media" });
    const now = "2026-07-01T00:00:00.000Z";
    expect(await repo.photos.countByGame(game.id)).toBe(0);
    expect(await repo.photos.getById("missing")).toBeNull();
    expect(await repo.photos.getDetail("missing")).toBeNull();
    expect(await repo.photos.getWithGame("missing")).toBeNull();
    const photo = {
      id: "photo-d1",
      gameId: game.id,
      expenseId: null,
      caption: "Ảnh sân",
      mimeType: "image/png",
      width: 2,
      height: 2,
      data: "full-image",
      thumbData: "thumbnail",
      createdAt: now,
    };
    await repo.photos.insert(photo);
    expect(await repo.photos.countByGame(game.id)).toBe(1);
    expect((await repo.photos.listByGame(game.id))[0]).not.toHaveProperty(
      "data",
    );
    expect((await repo.photos.getById(photo.id))?.caption).toBe("Ảnh sân");
    expect((await repo.photos.getWithGame(photo.id))?.game.id).toBe(game.id);
    expect((await repo.photos.getDetail(photo.id))?.data).toBe("full-image");
    await repo.photos.update(photo.id, { caption: "Ảnh mới" });
    expect((await repo.photos.getById(photo.id))?.caption).toBe("Ảnh mới");
    await repo.photos.delete(photo.id);
    expect(await repo.photos.countByGame(game.id)).toBe(0);

    expect(await repo.shareLinks.getLatestByGame(game.id)).toBeNull();
    const link = {
      id: "link-d1",
      gameId: game.id,
      token: "share-d1",
      enabled: true,
      createdAt: now,
      expiresAt: null,
    };
    await repo.shareLinks.replace(game.id, link);
    expect((await repo.shareLinks.findByToken(link.token))?.game.id).toBe(
      game.id,
    );
    await repo.shareLinks.setEnabled(game.id, false);
    expect((await repo.shareLinks.getLatestByGame(game.id))?.enabled).toBe(
      false,
    );
    await repo.shareLinks.replace(game.id, {
      ...link,
      id: "link-new",
      token: "share-new",
    });
    expect(await repo.shareLinks.findByToken(link.token)).toBeNull();

    const event = (await repo.gameEvents.listByGame(game.id, 1))[0];
    expect(event?.kind).toBe("game_created");
    expect((await repo.gameEvents.getWithGame(event.id))?.game.id).toBe(
      game.id,
    );
    await repo.gameEvents.markUndone(event.id, now);
    expect((await repo.gameEvents.getWithGame(event.id))?.event.undoneAt).toBe(
      now,
    );
    expect(await repo.gameEvents.getWithGame("missing")).toBeNull();
  });

  it("đọc, cập nhật và sắp xếp người cùng khoản chi trong D1", async () => {
    const repo = createD1GameRepository(database);
    const game = await createGame(repo, "owner", {
      name: "Kèo sắp xếp",
      participantCount: 2,
    });
    const [first, second] = game.participants;
    const now = "2026-07-01T00:00:00.000Z";
    expect(await repo.participants.getWithGame("missing")).toBeNull();
    expect(await repo.games.getById("missing")).toBeNull();
    expect(await repo.games.countParticipants([])).toEqual(new Map());
    expect(await repo.games.countExpenses([])).toEqual(new Map());
    expect((await repo.participants.getWithGame(first.id))?.game.id).toBe(
      game.id,
    );
    expect(await repo.participants.listIdsByGame(game.id)).toEqual([
      first.id,
      second.id,
    ]);
    await repo.participants.rename(first.id, "Người trả", now);
    await repo.participants.upsertPaymentProfile(
      first.id,
      { bankId: "bank-a" },
      now,
    );
    expect(
      (await repo.paymentProfiles.listByParticipantIds([first.id]))[0]?.bankId,
    ).toBe("bank-a");
    await repo.participants.upsertPaymentProfile(first.id, { bankId: "" }, now);
    expect(await repo.paymentProfiles.listByParticipantIds([])).toEqual([]);
    await repo.participants.reorder(game.id, [second.id, first.id]);
    expect(
      (await repo.participants.listByGame(game.id)).map((row) => row.id),
    ).toEqual([second.id, first.id]);
    expect(
      (await repo.participants.listByOwner("owner")).map((row) => row.name),
    ).toContain("Người trả");
    expect(
      (await repo.participants.listIdNamesByOwner("owner")).map(
        (row) => row.id,
      ),
    ).toContain(first.id);

    const expenseInput = (title: string) => ({
      kind: "expense" as const,
      category: "",
      title,
      amount: 100_000,
      note: "",
      payerParticipantId: first.id,
      splitMode: "equal" as const,
      splitParticipantIds: [first.id, second.id],
      splits: [],
    });
    const firstExpense = (
      await addExpense(repo, "owner", game.id, expenseInput("Sân"))
    ).expenses[0];
    const secondExpense = (
      await addExpense(repo, "owner", game.id, expenseInput("Cầu"))
    ).expenses.find((row) => row.title === "Cầu");
    expect(secondExpense).toBeDefined();
    const secondExpenseId = secondExpense?.id || "";
    expect(await repo.expenses.getById("missing")).toBeNull();
    expect(await repo.expenses.getWithGame("missing")).toBeNull();
    expect((await repo.expenses.getWithGame(firstExpense.id))?.game.id).toBe(
      game.id,
    );
    expect(
      (await repo.expenses.listByGameIds([game.id])).map((row) => row.id),
    ).toContain(firstExpense.id);
    expect(await repo.expenses.listByGameIds([])).toEqual([]);
    expect(await repo.expenses.listIdsSplitWith(second.id)).toContain(
      firstExpense.id,
    );
    expect(
      (await repo.splits.listByExpense(firstExpense.id)).map(
        (row) => row.participantId,
      ),
    ).toEqual(expect.arrayContaining([first.id, second.id]));
    expect(
      (await repo.splits.listLiveByExpense(firstExpense.id)).map(
        (row) => row.participantId,
      ),
    ).toHaveLength(2);
    expect(await repo.splits.listByExpenseIds([firstExpense.id])).toHaveLength(
      2,
    );
    expect(await repo.splits.listByExpenseIds([])).toEqual([]);
    await repo.splits.replace(firstExpense.id, [
      {
        id: "split-replacement",
        expenseId: firstExpense.id,
        participantId: second.id,
        amount: 100_000,
        weight: null,
      },
    ]);
    expect((await repo.splits.listByExpense(firstExpense.id))[0]?.amount).toBe(
      100_000,
    );
    await repo.splits.replace(firstExpense.id, []);
    expect(await repo.splits.listByExpense(firstExpense.id)).toEqual([]);
    await repo.expenses.update(firstExpense.id, {
      title: "Sân mới",
      updatedAt: now,
    });
    expect((await repo.expenses.getById(firstExpense.id))?.title).toBe(
      "Sân mới",
    );
    await repo.expenses.reorder(game.id, [firstExpense.id, secondExpenseId]);
    expect((await repo.expenses.listByGame(game.id))[0]?.id).toBe(
      firstExpense.id,
    );
    await repo.expenses.delete(secondExpenseId);
    expect(await repo.expenses.getById(secondExpenseId)).toBeNull();
    await repo.games.update(game.id, { name: "Kèo mới" }, now);
    expect((await repo.games.getById(game.id))?.name).toBe("Kèo mới");
    await repo.participants.delete(second.id);
    expect(await repo.participants.getWithGame(second.id)).toBeNull();
    await repo.games.delete(game.id);
    expect(await repo.games.getById(game.id)).toBeNull();
  });

  it("xử lý lời mời chờ và quyền cộng tác theo email", async () => {
    const repo = createD1GameRepository(database);
    const game = await createGame(repo, "owner", { name: "Kèo mời" });
    const now = "2026-07-01T00:00:00.000Z";
    expect(await repo.users.findIdByEmail("missing@example.test")).toBeNull();
    expect((await repo.users.findIdByEmail("FRIEND@example.test"))?.id).toBe(
      "friend",
    );
    expect(
      (await repo.users.listAllExceptOwner("owner")).map((user) => user.id),
    ).toContain("friend");
    await repo.users.updateName("friend", "Bạn", new Date(now));
    expect((await repo.users.findIdByEmail("friend@example.test"))?.name).toBe(
      "Bạn",
    );

    const invite = {
      id: "invite-d1",
      gameId: game.id,
      userId: null,
      invitedEmail: "friend@example.test",
      createdAt: now,
    };
    expect(await repo.gameCollaborators.add(invite)).toBe(true);
    expect(
      await repo.gameCollaborators.add({ ...invite, id: "invite-again" }),
    ).toBe(false);
    expect(await repo.gameCollaborators.isCollaborator(game.id, "friend")).toBe(
      false,
    );
    expect((await repo.gameCollaborators.listByGame(game.id))[0]?.email).toBe(
      "friend@example.test",
    );
    await repo.gameCollaborators.resolvePendingByEmail(
      "FRIEND@example.test",
      "friend",
    );
    expect(await repo.gameCollaborators.isCollaborator(game.id, "friend")).toBe(
      true,
    );
    expect((await repo.gameCollaborators.listByGame(game.id))[0]?.name).toBe(
      "Bạn",
    );
    await repo.gameCollaborators.remove(game.id, { userId: "friend" });
    expect(await repo.gameCollaborators.isCollaborator(game.id, "friend")).toBe(
      false,
    );
    expect(
      await repo.gameCollaborators.add({ ...invite, id: "invite-new" }),
    ).toBe(true);
    await repo.gameCollaborators.remove(game.id, {
      invitedEmail: "friend@example.test",
    });
    expect(await repo.gameCollaborators.listByGame(game.id)).toEqual([]);
    await repo.gameCollaborators.remove(game.id, {});
  });
});
