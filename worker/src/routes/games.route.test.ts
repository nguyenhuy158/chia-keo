import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeRepo,
  FAKE_GAME_ID,
  FAKE_OWNER,
  gameRow,
  participantRow,
} from "../core/application/fake-game-repository";
import { callApi, jsonBody, TEST_ORIGIN } from "../test-support/route-harness";

const state = vi.hoisted(() => ({
  userId: "user_owner" as string | null,
  repo: null as unknown,
}));

vi.mock("../auth", () => ({
  AUTH_BASE_PATH: "/api/auth",
  createAuth: () => ({
    api: { getSession: async () => (state.userId ? { user: { id: state.userId } } : null) },
    handler: async () => new Response("{}"),
  }),
  getTrustedOrigins: () => [TEST_ORIGIN],
}));

vi.mock("../adapters/d1/game-repository", () => ({
  createD1GameRepository: () => state.repo,
}));

const { default: app } = await import("../index");

const AN = "participant_an";
const BINH = "participant_binh";

let fake: ReturnType<typeof createFakeRepo>;

function useRepo(next: ReturnType<typeof createFakeRepo>) {
  fake = next;
  state.repo = next.repo;
  return next;
}

beforeEach(() => {
  state.userId = FAKE_OWNER;
  useRepo(
    createFakeRepo({
      participants: [participantRow(AN, "An"), participantRow(BINH, "Bình", { sequence: 1 })],
      users: [
        { id: FAKE_OWNER, name: "Chủ", email: "chu@example.com" },
        { id: "user_ban", name: "Bạn", email: "ban@example.com" },
      ],
    }),
  );
});

describe("cuoc chia", () => {
  it("GET /api/games liet ke", async () => {
    const response = await callApi(app, "/api/games");

    expect(response.status).toBe(200);
    expect((await response.json()) as unknown[]).toHaveLength(1);
  });

  it("POST /api/games tra 201 kem detail", async () => {
    const response = await callApi(app, "/api/games", {
      method: "POST",
      body: { name: "Bóng bàn", participantCount: 2 },
      headers: { "cf-connecting-ip": "10.1.0.1" },
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ name: "Bóng bàn" });
  });

  it("POST /api/games body sai tra 400", async () => {
    const response = await callApi(app, "/api/games", {
      method: "POST",
      body: { name: "" },
      headers: { "cf-connecting-ip": "10.1.0.2" },
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_input" });
  });

  it("GET /api/games/:id cuoc khong ton tai tra 404", async () => {
    expect((await callApi(app, "/api/games/game_la")).status).toBe(404);
  });

  it("PATCH /api/games/:id doi ten", async () => {
    const response = await callApi(app, `/api/games/${FAKE_GAME_ID}`, {
      method: "PATCH",
      body: { name: "Tên mới" },
    });

    expect(await response.json()).toMatchObject({ name: "Tên mới" });
  });

  it("DELETE /api/games/:id cho vao thung rac", async () => {
    const response = await callApi(app, `/api/games/${FAKE_GAME_ID}`, { method: "DELETE" });

    expect(await response.json()).toEqual({ ok: true });
    expect(fake.state.games[0].deletedAt).not.toBeNull();
  });

  it("GET /api/games/trash + POST restore + DELETE purge", async () => {
    useRepo(createFakeRepo({ games: [gameRow({ deletedAt: "2026-08-02T00:00:00.000Z" })] }));

    expect(((await (await callApi(app, "/api/games/trash")).json()) as unknown[])).toHaveLength(1);

    const restored = await callApi(app, `/api/games/${FAKE_GAME_ID}/restore`, { method: "POST" });
    expect(restored.status).toBe(200);

    fake.state.games[0].deletedAt = "2026-08-02T00:00:00.000Z";
    const purged = await callApi(app, `/api/games/${FAKE_GAME_ID}/purge`, { method: "DELETE" });
    expect(await purged.json()).toEqual({ ok: true });
    expect(fake.state.games).toEqual([]);
  });

  it("POST /api/games/:id/duplicate tra 201", async () => {
    const response = await callApi(app, `/api/games/${FAKE_GAME_ID}/duplicate`, {
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ name: "Cầu lông (bản sao)" });
  });

  it("GET /api/games/:id/summary chi tra phan tong ket", async () => {
    const response = await callApi(app, `/api/games/${FAKE_GAME_ID}/summary`);

    expect(await response.json()).toMatchObject({ totalExpense: 0, settlements: [] });
  });
});

describe("nguoi tham gia", () => {
  it("POST them mot nguoi", async () => {
    const response = await callApi(app, `/api/games/${FAKE_GAME_ID}/participants`, {
      method: "POST",
      body: { name: "Cường", bankId: "", accountNo: "", accountName: "" },
    });

    expect(response.status).toBe(201);
    expect((await jsonBody<{ participants: { id: string; name: string }[] }>(response)).participants).toHaveLength(3);
  });

  it("POST batch them nhieu nguoi", async () => {
    const response = await callApi(app, `/api/games/${FAKE_GAME_ID}/participants/batch`, {
      method: "POST",
      body: { people: [{ name: "Cường" }, { name: "Dung" }] },
    });

    expect(response.status).toBe(201);
    expect((await jsonBody<{ participants: { id: string; name: string }[] }>(response)).participants).toHaveLength(4);
  });

  it("PATCH doi ten nguoi", async () => {
    const response = await callApi(app, `/api/participants/${AN}`, {
      method: "PATCH",
      body: { name: "An Anh" },
    });

    expect((await jsonBody<{ participants: { id: string; name: string }[] }>(response)).participants[0].name).toBe("An Anh");
  });

  it("PATCH reorder", async () => {
    const response = await callApi(app, `/api/games/${FAKE_GAME_ID}/participants/reorder`, {
      method: "PATCH",
      body: { participantIds: [BINH, AN] },
    });

    expect((await jsonBody<{ participants: { id: string; name: string }[] }>(response)).participants.map((row: { id: string }) => row.id)).toEqual([
      BINH,
      AN,
    ]);
  });

  it("PATCH reorder danh sach sai tra 400", async () => {
    const response = await callApi(app, `/api/games/${FAKE_GAME_ID}/participants/reorder`, {
      method: "PATCH",
      body: { participantIds: ["participant_la"] },
    });

    expect(response.status).toBe(400);
  });

  it("DELETE xoa nguoi", async () => {
    const response = await callApi(app, `/api/participants/${AN}`, { method: "DELETE" });

    expect((await jsonBody<{ participants: { id: string; name: string }[] }>(response)).participants).toHaveLength(1);
  });
});

describe("khoan chi", () => {
  async function addExpense() {
    return callApi(app, `/api/games/${FAKE_GAME_ID}/expenses`, {
      method: "POST",
      body: {
        title: "Nước",
        amount: 90_000,
        payerParticipantId: AN,
        splitMode: "equal",
        splitParticipantIds: [AN, BINH],
      },
    });
  }

  it("POST tra 201 va tinh lai tong", async () => {
    const response = await addExpense();

    expect(response.status).toBe(201);
    expect((await jsonBody<{ summary: { totalExpense: number } }>(response)).summary.totalExpense).toBe(90_000);
  });

  it("POST body sai tra 400", async () => {
    const response = await callApi(app, `/api/games/${FAKE_GAME_ID}/expenses`, {
      method: "POST",
      body: { amount: -5 },
    });

    expect(response.status).toBe(400);
  });

  it("PATCH sua khoan chi", async () => {
    await addExpense();
    const expenseId = fake.state.expenses[0].id;

    const response = await callApi(app, `/api/expenses/${expenseId}`, {
      method: "PATCH",
      body: {
        title: "Nước",
        amount: 60_000,
        payerParticipantId: AN,
        splitMode: "equal",
        splitParticipantIds: [AN, BINH],
      },
    });

    expect((await jsonBody<{ summary: { totalExpense: number } }>(response)).summary.totalExpense).toBe(60_000);
  });

  it("PATCH chi gui mot truong bi tu choi (xem ghi chu duoi)", async () => {
    await addExpense();

    const response = await callApi(app, `/api/expenses/${fake.state.expenses[0].id}`, {
      method: "PATCH",
      body: { amount: 60_000 },
    });

    // `expenseInputSchema.partial()` VAN ap default, nen body chi co `amount`
    // den tay use case voi splitParticipantIds: [] -> computeSplitRows tra
    // null -> 400. Giao dien hien luon gui du truong nen chua ai gap; day la
    // ghi lai hanh vi THUC TE de lan sua sau khong pha vo im lang.
    expect(response.status).toBe(400);
    // Tuong tu, title/note rong trong body partial se ghi de gia tri cu.
    expect(fake.state.expenses[0].amount).toBe(90_000);
  });

  it("PATCH reorder khoan chi", async () => {
    await addExpense();
    await addExpense();
    const ids = fake.state.expenses.map((row) => row.id);

    const response = await callApi(app, `/api/games/${FAKE_GAME_ID}/expenses/reorder`, {
      method: "PATCH",
      body: { expenseIds: ids },
    });

    expect(response.status).toBe(200);
  });

  it("DELETE xoa khoan chi", async () => {
    await addExpense();

    const response = await callApi(app, `/api/expenses/${fake.state.expenses[0].id}`, {
      method: "DELETE",
    });

    expect((await jsonBody<{ expenses: unknown[] }>(response)).expenses).toEqual([]);
  });

  it("POST transfer ghi tra no", async () => {
    const response = await callApi(app, `/api/games/${FAKE_GAME_ID}/transfers`, {
      method: "POST",
      body: { fromParticipantId: AN, toParticipantId: BINH, amount: 10_000 },
    });

    expect(response.status).toBe(201);
  });

  it("POST transfer nguoi tra trung nguoi nhan tra 400", async () => {
    const response = await callApi(app, `/api/games/${FAKE_GAME_ID}/transfers`, {
      method: "POST",
      body: { fromParticipantId: AN, toParticipantId: AN, amount: 10_000 },
    });

    expect(response.status).toBe(400);
  });
});

describe("lich su va hoan tac", () => {
  it("GET events + POST undo", async () => {
    await callApi(app, `/api/games/${FAKE_GAME_ID}/expenses`, {
      method: "POST",
      body: {
        title: "Nước",
        amount: 90_000,
        payerParticipantId: AN,
        splitMode: "equal",
        splitParticipantIds: [AN, BINH],
      },
    });
    await callApi(app, `/api/expenses/${fake.state.expenses[0].id}`, { method: "DELETE" });

    const events = (await jsonBody<{ events: { id: string; payload: { kind: string } }[] }>(await callApi(app, `/api/games/${FAKE_GAME_ID}/events`))).events;
    expect(events[0].payload.kind).toBe("expense_removed");

    const undone = await callApi(app, `/api/events/${events[0].id}/undo`, { method: "POST" });
    expect((await jsonBody<{ expenses: unknown[] }>(undone)).expenses).toHaveLength(1);
  });

  it("undo dong khong hoan tac duoc tra 400", async () => {
    fake.state.events.push({
      id: "event_1",
      gameId: FAKE_GAME_ID,
      kind: "game_created",
      payload: JSON.stringify({ kind: "game_created", name: "Cầu lông" }),
      createdAt: "2026-08-01T00:00:00.000Z",
      undoneAt: null,
    });

    expect((await callApi(app, "/api/events/event_1/undo", { method: "POST" })).status).toBe(400);
  });
});

describe("danh ba", () => {
  it("GET rong luc dau, POST them, PATCH sua, DELETE xoa", async () => {
    useRepo(createFakeRepo());

    expect((await jsonBody<{ contacts: unknown[] }>(await callApi(app, "/api/contacts"))).contacts).toEqual([]);

    const created = await callApi(app, "/api/contacts", {
      method: "POST",
      body: { name: "Hồng", bankId: "970436", accountNo: "0123", accountName: "HONG" },
    });
    expect(created.status).toBe(201);

    const contactId = fake.state.contacts[0].id;
    const updated = await callApi(app, `/api/contacts/${contactId}`, {
      method: "PATCH",
      body: { accountNo: "999" },
    });
    expect((await jsonBody<{ contacts: { accountNo: string }[] }>(updated)).contacts[0].accountNo).toBe("999");

    const deleted = await callApi(app, `/api/contacts/${contactId}`, { method: "DELETE" });
    expect((await jsonBody<{ contacts: unknown[] }>(deleted)).contacts).toEqual([]);
  });

  it("POST danh ba body sai tra 400", async () => {
    expect(
      (await callApi(app, "/api/contacts", { method: "POST", body: { name: "" } })).status,
    ).toBe(400);
  });

  it("PATCH danh ba khong ton tai tra 404", async () => {
    const response = await callApi(app, "/api/contacts/contact_la", {
      method: "PATCH",
      body: { name: "X" },
    });

    expect(response.status).toBe(404);
  });
});

describe("chia se va link share", () => {
  it("GET candidates bo chinh chu", async () => {
    const response = await callApi(app, `/api/games/${FAKE_GAME_ID}/collaborators/candidates`);

    expect(await response.json()).toEqual([
      { id: "user_ban", name: "Bạn", email: "ban@example.com" },
    ]);
  });

  it("POST chia se roi DELETE go quyen", async () => {
    const shared = await callApi(app, `/api/games/${FAKE_GAME_ID}/collaborators`, {
      method: "POST",
      body: { email: "ban@example.com" },
    });
    expect(shared.status).toBe(201);

    const removed = await callApi(app, `/api/games/${FAKE_GAME_ID}/collaborators/user_ban`, {
      method: "DELETE",
    });
    expect((await jsonBody<{ collaborators: unknown[] }>(removed)).collaborators).toEqual([]);
  });

  it("DELETE invite dang cho theo email da url-encode", async () => {
    await callApi(app, `/api/games/${FAKE_GAME_ID}/collaborators`, {
      method: "POST",
      body: { email: "moi@example.com" },
    });

    const removed = await callApi(
      app,
      `/api/games/${FAKE_GAME_ID}/collaborators/pending/${encodeURIComponent("moi@example.com")}`,
      { method: "DELETE" },
    );

    expect((await jsonBody<{ collaborators: unknown[] }>(removed)).collaborators).toEqual([]);
  });

  it("POST chia se cho chinh minh tra 400 kem ma loi", async () => {
    const response = await callApi(app, `/api/games/${FAKE_GAME_ID}/collaborators`, {
      method: "POST",
      body: { email: "chu@example.com" },
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "is_owner" });
  });

  it("POST share-link tao link, PATCH tat link", async () => {
    const created = await callApi(app, `/api/games/${FAKE_GAME_ID}/share-links`, {
      method: "POST",
      headers: { "cf-connecting-ip": "10.2.0.1" },
    });
    expect(created.status).toBe(201);
    expect((await jsonBody<{ shareLink: { enabled: boolean } }>(created)).shareLink.enabled).toBe(true);

    const disabled = await callApi(app, `/api/games/${FAKE_GAME_ID}/share-link`, {
      method: "PATCH",
      body: { enabled: false },
    });
    expect((await jsonBody<{ shareLink: { enabled: boolean } }>(disabled)).shareLink.enabled).toBe(false);
  });

  it("PATCH share-link body sai tra 400", async () => {
    const response = await callApi(app, `/api/games/${FAKE_GAME_ID}/share-link`, {
      method: "PATCH",
      body: {},
    });

    expect(response.status).toBe(400);
  });
});
