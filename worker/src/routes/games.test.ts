import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ApiGame,
  ApiGameDetail,
  ApiTrashGame,
} from "../../../shared/api-types";
import {
  createFakeRepo,
  FAKE_GAME_ID,
  FAKE_OWNER,
  gameRow,
} from "../core/application/fake-game-repository";
import type { AuthedEnv } from "../lib/require-user";
import { gamesRouter } from "./games";

vi.mock("../lib/require-user", () => ({
  protectPaths: vi.fn(),
}));

let app: Hono<AuthedEnv>;
let fake: ReturnType<typeof createFakeRepo>;

function request(method: string, path: string, body?: unknown) {
  return app.request(`/api${path}`, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
}

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

beforeEach(() => {
  fake = createFakeRepo();
  app = new Hono<AuthedEnv>();
  app.use("*", async (c, next) => {
    c.set("repo", fake.repo);
    c.set("userId", FAKE_OWNER);
    await next();
  });
  app.route("/api", gamesRouter);
});

describe("gamesRouter", () => {
  it("liệt kê, tạo và đọc chi tiết cuộc chia", async () => {
    const list = await request("GET", "/games");
    expect(list.status).toBe(200);
    expect((await json<ApiGame[]>(list)).map((game) => game.id)).toContain(
      FAKE_GAME_ID,
    );

    const invalid = await request("POST", "/games", {});
    expect(invalid.status).toBe(400);
    const created = await request("POST", "/games", {
      name: "Cầu tối",
      participantCount: 2,
    });
    expect(created.status).toBe(201);
    const detail = await json<ApiGameDetail>(created);
    expect(detail.participants).toHaveLength(2);
    expect(
      (await json<ApiGameDetail>(await request("GET", `/games/${detail.id}`)))
        .name,
    ).toBe("Cầu tối");
    expect(
      await (await request("GET", `/games/${detail.id}/summary`)).json(),
    ).toBeDefined();
  });

  it("sửa, nhân bản, đóng và mở lại cuộc chia", async () => {
    expect((await request("PATCH", `/games/${FAKE_GAME_ID}`, {})).status).toBe(
      400,
    );
    const changed = await request("PATCH", `/games/${FAKE_GAME_ID}`, {
      name: "Tên mới",
    });
    expect(changed.status).toBe(200);
    expect((await json<ApiGameDetail>(changed)).name).toBe("Tên mới");

    const copy = await request("POST", `/games/${FAKE_GAME_ID}/duplicate`);
    expect(copy.status).toBe(201);
    expect((await json<ApiGameDetail>(copy)).name).toBe("Tên mới (bản sao)");

    const closed = await request("POST", `/games/${FAKE_GAME_ID}/close`);
    expect(closed.status).toBe(200);
    expect(
      (await json<ApiGame[]>(await request("GET", "/games/closed"))).length,
    ).toBeGreaterThan(0);
    const reopened = await request("POST", `/games/${FAKE_GAME_ID}/reopen`);
    expect(reopened.status).toBe(200);
    expect((await json<ApiGameDetail>(reopened)).closedAt).toBeNull();
    expect(
      (
        await json<{ events: unknown[] }>(
          await request("GET", `/games/${FAKE_GAME_ID}/events`),
        )
      ).events.length,
    ).toBeGreaterThan(0);
  });

  it("chuyển vào thùng rác, khôi phục và xóa hẳn", async () => {
    const removed = await request("DELETE", `/games/${FAKE_GAME_ID}`);
    expect(removed.status).toBe(200);
    expect(await removed.json()).toEqual({ ok: true });
    expect(
      (await json<ApiTrashGame[]>(await request("GET", "/games/trash")))[0].id,
    ).toBe(FAKE_GAME_ID);
    const restored = await request("POST", `/games/${FAKE_GAME_ID}/restore`);
    expect(restored.status).toBe(200);
    expect(fake.state.games[0].deletedAt).toBeNull();
    await request("DELETE", `/games/${FAKE_GAME_ID}`);
    const purged = await request("DELETE", `/games/${FAKE_GAME_ID}/purge`);
    expect(purged.status).toBe(200);
    expect(fake.state.games).toEqual([]);
  });

  it("trả lỗi khi truy cập cuộc không tồn tại", async () => {
    const missing = await request("GET", "/games/missing");
    expect(missing.status).toBe(404);
    expect((await request("POST", "/games/missing/close")).status).toBe(404);
    expect((await request("POST", "/games/missing/reopen")).status).toBe(404);
    expect((await request("DELETE", "/games/missing")).status).toBe(404);
  });

  it("không hiện cuộc đã xóa trong danh sách đang chơi", async () => {
    fake = createFakeRepo({
      games: [gameRow({ deletedAt: "2026-08-02T00:00:00.000Z" })],
    });
    const list = await request("GET", "/games");
    expect(await list.json()).toEqual([]);
  });

  it.each([
    ["POST", "/contacts"],
    ["PATCH", "/contacts/contact-1"],
    ["PATCH", `/games/${FAKE_GAME_ID}`],
    ["POST", `/games/${FAKE_GAME_ID}/participants`],
    ["POST", `/games/${FAKE_GAME_ID}/participants/batch`],
    ["PATCH", `/games/${FAKE_GAME_ID}/participants/reorder`],
    ["PATCH", "/participants/person-1"],
    ["POST", `/games/${FAKE_GAME_ID}/expenses`],
    ["PATCH", `/games/${FAKE_GAME_ID}/expenses/reorder`],
    ["PATCH", "/expenses/expense-1"],
    ["POST", `/games/${FAKE_GAME_ID}/transfers`],
    ["POST", `/games/${FAKE_GAME_ID}/collaborators`],
    ["PATCH", `/games/${FAKE_GAME_ID}/share-link`],
  ])("trả 400 cho JSON không hợp lệ tại %s %s", async (method, path) => {
    expect((await request(method, path, null)).status).toBe(400);
  });

  it("tạo danh bạ và xử lý đường sửa hoặc xóa ID không tồn tại", async () => {
    expect((await request("GET", "/contacts")).status).toBe(200);
    const created = await request("POST", "/contacts", { name: "An" });
    expect(created.status).toBe(201);
    expect(
      (await request("PATCH", "/contacts/missing", { name: "Bình" })).status,
    ).toBe(404);
    expect((await request("DELETE", "/contacts/missing")).status).toBe(404);
  });

  it("thêm, sửa, sắp xếp và xóa người tham gia qua HTTP", async () => {
    const first = await request("POST", `/games/${FAKE_GAME_ID}/participants`, {
      name: "An",
    });
    expect(first.status).toBe(201);
    const firstId = (await json<ApiGameDetail>(first)).participants[0].id;
    const batch = await request(
      "POST",
      `/games/${FAKE_GAME_ID}/participants/batch`,
      {
        people: [{ name: "Bình" }],
      },
    );
    expect(batch.status).toBe(201);
    const secondId = (await json<ApiGameDetail>(batch)).participants[1].id;
    const changed = await request("PATCH", `/participants/${firstId}`, {
      name: "Anh An",
    });
    expect(changed.status).toBe(200);
    expect((await json<ApiGameDetail>(changed)).participants[0].name).toBe(
      "Anh An",
    );
    const ordered = await request(
      "PATCH",
      `/games/${FAKE_GAME_ID}/participants/reorder`,
      {
        participantIds: [secondId, firstId],
      },
    );
    expect(ordered.status).toBe(200);
    expect((await json<ApiGameDetail>(ordered)).participants[0].id).toBe(
      secondId,
    );
    const removed = await request("DELETE", `/participants/${secondId}`);
    expect(removed.status).toBe(200);
    expect((await json<ApiGameDetail>(removed)).participants).toHaveLength(1);
  });

  it("ghi, sửa, sắp xếp, xóa khoản chi rồi hoàn tác qua HTTP", async () => {
    const first = await request("POST", `/games/${FAKE_GAME_ID}/participants`, {
      name: "An",
    });
    const payerId = (await json<ApiGameDetail>(first)).participants[0].id;
    const second = await request(
      "POST",
      `/games/${FAKE_GAME_ID}/participants`,
      { name: "Bình" },
    );
    const otherId = (await json<ApiGameDetail>(second)).participants[1].id;
    const expense = await request("POST", `/games/${FAKE_GAME_ID}/expenses`, {
      title: "Tiền sân",
      amount: 100_000,
      payerParticipantId: payerId,
      splitParticipantIds: [payerId, otherId],
    });
    expect(expense.status).toBe(201);
    const expenseId = (await json<ApiGameDetail>(expense)).expenses[0].id;
    const updated = await request("PATCH", `/expenses/${expenseId}`, {
      title: "Sân tối",
    });
    expect(updated.status).toBe(200);
    const updatedExpense = (await json<ApiGameDetail>(updated)).expenses[0];
    expect(updatedExpense.title).toBe("Sân tối");
    expect(updatedExpense.amount).toBe(100_000);
    expect(updatedExpense.payerParticipantId).toBe(payerId);
    expect(
      (
        await request("PATCH", `/games/${FAKE_GAME_ID}/expenses/reorder`, {
          expenseIds: [expenseId],
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await request("POST", `/games/${FAKE_GAME_ID}/transfers`, {
          fromParticipantId: otherId,
          toParticipantId: payerId,
          amount: 50_000,
        })
      ).status,
    ).toBe(201);
    expect((await request("DELETE", `/expenses/${expenseId}`)).status).toBe(
      200,
    );
    const removalEvent = fake.state.events.find(
      (event) => event.kind === "expense_removed",
    );
    expect(removalEvent).toBeDefined();
    expect(
      (await request("POST", `/events/${removalEvent?.id}/undo`)).status,
    ).toBe(200);
  });

  it("chia sẻ cho email mới, hủy lời mời và bật tắt link xem", async () => {
    const candidates = await request(
      "GET",
      `/games/${FAKE_GAME_ID}/collaborators/candidates`,
    );
    expect(candidates.status).toBe(200);
    expect(await candidates.json()).toEqual([]);

    const invited = await request(
      "POST",
      `/games/${FAKE_GAME_ID}/collaborators`,
      {
        email: "friend@example.com",
      },
    );
    expect(invited.status).toBe(201);
    expect(fake.state.collaborators[0].invitedEmail).toBe("friend@example.com");
    const unshared = await request(
      "DELETE",
      `/games/${FAKE_GAME_ID}/collaborators/pending/friend%40example.com`,
    );
    expect(unshared.status).toBe(200);
    expect(fake.state.collaborators).toEqual([]);

    const rotated = await request("POST", `/games/${FAKE_GAME_ID}/share-links`);
    expect(rotated.status).toBe(201);
    expect(fake.state.shareLinks).toHaveLength(1);
    const disabled = await request(
      "PATCH",
      `/games/${FAKE_GAME_ID}/share-link`,
      {
        enabled: false,
      },
    );
    expect(disabled.status).toBe(200);
    expect(fake.state.shareLinks[0].enabled).toBe(false);
  });

  it("bỏ chia sẻ với user đã đăng ký", async () => {
    fake.state.users.push({
      id: "friend",
      name: "Bình",
      email: "friend@example.com",
    });
    expect(
      (
        await request("POST", `/games/${FAKE_GAME_ID}/collaborators`, {
          email: "friend@example.com",
        })
      ).status,
    ).toBe(201);
    expect(
      (await request("DELETE", `/games/${FAKE_GAME_ID}/collaborators/friend`))
        .status,
    ).toBe(200);
    expect(fake.state.collaborators).toEqual([]);
  });
});
