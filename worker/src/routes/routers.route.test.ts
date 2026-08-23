import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeRepo,
  FAKE_GAME_ID,
  FAKE_OWNER,
  participantRow,
} from "../core/application/fake-game-repository";
import { callApi, createTestEnv, jsonBody, TEST_ORIGIN } from "../test-support/route-harness";

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
const PHOTO_DATA = "data:image/webp;base64,AAAA";

let fake: ReturnType<typeof createFakeRepo>;

beforeEach(() => {
  state.userId = FAKE_OWNER;
  fake = createFakeRepo({
    participants: [participantRow(AN, "An")],
    users: [{ id: FAKE_OWNER, name: "Chủ", email: "chu@example.com" }],
  });
  state.repo = fake.repo;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("anh", () => {
  function photoBody() {
    return {
      caption: "Hoá đơn",
      mimeType: "image/webp",
      width: 800,
      height: 600,
      thumbData: PHOTO_DATA,
      data: PHOTO_DATA,
    };
  }

  it("POST tra 201 roi GET liet ke", async () => {
    const created = await callApi(app, `/api/games/${FAKE_GAME_ID}/photos`, {
      method: "POST",
      body: photoBody(),
      headers: { "cf-connecting-ip": "10.3.0.1" },
    });
    expect(created.status).toBe(201);

    const listed = await callApi(app, `/api/games/${FAKE_GAME_ID}/photos`);
    expect((await listed.json()) as unknown[]).toHaveLength(1);
  });

  it("POST body sai tra 400", async () => {
    const response = await callApi(app, `/api/games/${FAKE_GAME_ID}/photos`, {
      method: "POST",
      body: { caption: "thiếu dữ liệu ảnh" },
      headers: { "cf-connecting-ip": "10.3.0.2" },
    });

    expect(response.status).toBe(400);
  });

  it("GET /photos/:id kem du lieu goc, PATCH chu thich, DELETE xoa", async () => {
    await callApi(app, `/api/games/${FAKE_GAME_ID}/photos`, {
      method: "POST",
      body: photoBody(),
      headers: { "cf-connecting-ip": "10.3.0.3" },
    });
    const photoId = fake.state.photos[0].id;

    expect((await jsonBody<{ data: string }>(await callApi(app, `/api/photos/${photoId}`))).data).toBe(PHOTO_DATA);

    const patched = await callApi(app, `/api/photos/${photoId}`, {
      method: "PATCH",
      body: { caption: "Sân" },
    });
    expect((await jsonBody<{ caption: string }>(patched)).caption).toBe("Sân");

    const deleted = await callApi(app, `/api/photos/${photoId}`, { method: "DELETE" });
    expect(await deleted.json()).toEqual({ ok: true });
  });

  it("PATCH body sai tra 400", async () => {
    const response = await callApi(app, "/api/photos/photo_1", {
      method: "PATCH",
      body: { caption: 123 },
    });

    expect(response.status).toBe(400);
  });

  it("anh khong ton tai tra 404", async () => {
    expect((await callApi(app, "/api/photos/photo_la")).status).toBe(404);
  });
});

describe("AI", () => {
  it("thieu GEMINI_API_KEY thi tra 400 kem ma loi de client hien thong bao", async () => {
    const response = await callApi(
      app,
      "/api/ai/expense",
      { method: "POST", body: { gameId: FAKE_GAME_ID, text: "an ứng 90k" } },
      createTestEnv({ GEMINI_API_KEY: undefined }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "gemini_not_configured" });
  });

  it("goi duoc khi co key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: '{"title":"Nước","amount":90000,"payerName":"An"}' }],
                },
              },
            ],
          }),
        ),
      ),
    );

    const response = await callApi(
      app,
      "/api/ai/expense",
      { method: "POST", body: { gameId: FAKE_GAME_ID, text: "an ứng 90k" } },
      createTestEnv({ GEMINI_API_KEY: "key" }),
    );

    expect(response.status).toBe(200);
    expect((await jsonBody<{ suggestion: { amount: number } }>(response)).suggestion).toMatchObject({ amount: 90_000 });
  });

  it("body sai tra 400", async () => {
    const response = await callApi(app, "/api/ai/expense", {
      method: "POST",
      body: { gameId: "", text: "" },
    });

    expect(response.status).toBe(400);
  });

  it("/api/ai/receipt kiem tra dinh dang anh", async () => {
    const response = await callApi(app, "/api/ai/receipt", {
      method: "POST",
      body: { gameId: FAKE_GAME_ID, image: { mimeType: "image/gif", data: "AAAA" } },
    });

    expect(response.status).toBe(400);
  });

  it("/api/ai/receipt goi duoc voi anh hop le", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: '{"title":"Hóa đơn","amount":250000}' }] } }],
          }),
        ),
      ),
    );

    const response = await callApi(
      app,
      "/api/ai/receipt",
      {
        method: "POST",
        body: { gameId: FAKE_GAME_ID, image: { mimeType: "image/webp", data: "AAAA" } },
      },
      createTestEnv({ GEMINI_API_KEY: "key" }),
    );

    expect((await jsonBody<{ suggestion: { amount: number } }>(response)).suggestion).toMatchObject({ amount: 250_000 });
  });

  it("chua dang nhap thi khong goi duoc AI", async () => {
    state.userId = null;

    const response = await callApi(app, "/api/ai/expense", {
      method: "POST",
      body: { gameId: FAKE_GAME_ID, text: "x" },
    });

    expect(response.status).toBe(401);
  });
});

describe("link share (public)", () => {
  beforeEach(() => {
    fake.state.shareLinks.push({
      gameId: FAKE_GAME_ID,
      token: "abcd",
      enabled: true,
      createdAt: "2026-08-01T00:00:00.000Z",
      expiresAt: null,
    });
    fake.state.photos.push({
      id: "photo_1",
      gameId: FAKE_GAME_ID,
      expenseId: null,
      caption: "",
      mimeType: "image/webp",
      width: 10,
      height: 10,
      thumbData: PHOTO_DATA,
      data: PHOTO_DATA,
      createdAt: "2026-08-01T00:00:00.000Z",
    });
  });

  it("xem duoc cuoc chia khong can dang nhap", async () => {
    state.userId = null;

    const response = await callApi(app, "/api/share/abcd");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ name: "Cầu lông" });
  });

  it("xem duoc danh sach anh va mot anh cu the", async () => {
    state.userId = null;

    expect(((await (await callApi(app, "/api/share/abcd/photos")).json()) as unknown[])).toHaveLength(
      1,
    );
    expect((await jsonBody<{ data: string }>(await callApi(app, "/api/share/abcd/photos/photo_1"))).data).toBe(
      PHOTO_DATA,
    );
  });

  it("token sai tra 404", async () => {
    expect((await callApi(app, "/api/share/xxxx")).status).toBe(404);
  });

  it("qua nguong doan token thi tra 429", async () => {
    const headers = { "cf-connecting-ip": "10.9.9.9" };

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 22; attempt += 1) {
      statuses.push((await callApi(app, "/api/share/xxxx", { headers })).status);
    }

    // Token chi 4 ky tu nen bat buoc phai chan brute-force.
    expect(statuses.at(-1)).toBe(429);
  });
});

describe("/api/session", () => {
  it("chua dang nhap tra 200 kem user: null, khong phai 401", async () => {
    state.userId = null;

    const response = await callApi(app, "/api/session");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ user: null });
  });

  it("da dang nhap tra ve user tu DB", async () => {
    const env = createTestEnv({}, {
      rows: [{ id: FAKE_OWNER, name: "Chủ", image: null, displayUsername: "chu.nguyen" }],
    });

    const response = await callApi(app, "/api/session", {}, env);

    // displayUsername duoc uu tien lam ten hien thi.
    expect(await response.json()).toEqual({
      user: { id: FAKE_OWNER, name: "chu.nguyen", image: null },
    });
  });

  it("user bien mat khoi DB thi coi nhu chua dang nhap", async () => {
    const response = await callApi(app, "/api/session", {}, createTestEnv({}, { rows: [] }));

    expect(await response.json()).toEqual({ user: null });
  });
});

describe("/api/profile", () => {
  it("PATCH doi ten hien thi", async () => {
    const response = await callApi(app, "/api/profile", {
      method: "PATCH",
      body: { name: "Tên mới" },
    });

    expect(await response.json()).toEqual({ name: "Tên mới" });
  });

  it("PATCH body sai tra 400", async () => {
    expect(
      (await callApi(app, "/api/profile", { method: "PATCH", body: { name: "" } })).status,
    ).toBe(400);
  });
});

describe("/api/preferences", () => {
  it("GET tra mac dinh, PATCH luu lai", async () => {
    expect((await callApi(app, "/api/preferences")).status).toBe(200);

    const patched = await callApi(app, "/api/preferences", {
      method: "PATCH",
      body: { summaryShowQr: false },
    });

    expect(patched.status).toBe(200);
    expect(await patched.json()).toMatchObject({
      preferences: { summaryShowQr: false, summaryShowAvatar: true },
    });
  });

  it("PATCH gia tri sai kieu tra 400", async () => {
    const response = await callApi(app, "/api/preferences", {
      method: "PATCH",
      body: { summaryShowQr: "co" },
    });

    expect(response.status).toBe(400);
  });
});

describe("/api/fun-stats va /api/cross-balances", () => {
  it("fun-stats tra ve bang thong ke", async () => {
    const response = await callApi(app, "/api/fun-stats");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ gameCount: 1 });
  });

  it("cross-balances tra ve so du gop", async () => {
    expect((await callApi(app, "/api/cross-balances")).status).toBe(200);
  });

  it("ca hai deu can dang nhap", async () => {
    state.userId = null;

    expect((await callApi(app, "/api/fun-stats")).status).toBe(401);
    expect((await callApi(app, "/api/cross-balances")).status).toBe(401);
  });
});

describe("/api/qr", () => {
  it("thieu tai khoan hop le tra 400", async () => {
    const response = await callApi(app, "/api/qr?bank=vcb&account=&amount=1000");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_account" });
  });

  it("so tien khong hop le tra 400", async () => {
    const response = await callApi(app, "/api/qr?bank=vcb&account=0123456789&amount=-5");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_amount" });
  });

  it("proxy anh QR khi tham so hop le", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("PNGDATA", { headers: { "Content-Type": "image/png" } }),
      ),
    );

    const response = await callApi(app, "/api/qr?bank=vcb&account=0123456789&amount=90000");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toContain("max-age=");
  });

  it("upstream tra loi thi bao qr_unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));

    const response = await callApi(app, "/api/qr?bank=vcb&account=0123456789&amount=90000");

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "qr_unavailable" });
  });

  it("upstream timeout/loi mang cung bao qr_unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect((await callApi(app, "/api/qr?bank=vcb&account=0123456789&amount=90000")).status).toBe(
      502,
    );
    consoleError.mockRestore();
  });

  it("khong can dang nhap", async () => {
    state.userId = null;

    expect((await callApi(app, "/api/qr?bank=vcb&account=&amount=0")).status).toBe(400);
  });
});

describe("/api/games/:gameId/email-summary", () => {
  it("gui tom tat toi email cua chu cuoc", async () => {
    const mailerFetch = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ id: "msg_1" })),
    );
    const env = createTestEnv(
      { MAILER: { fetch: mailerFetch } as unknown as Fetcher },
      { rows: [{ email: "chu@example.com" }] },
    );

    const response = await callApi(
      app,
      `/api/games/${FAKE_GAME_ID}/email-summary`,
      { method: "POST" },
      env,
    );

    expect(await response.json()).toEqual({ sent: true });
    const body = JSON.parse(String(mailerFetch.mock.calls[0][1]?.body));
    expect(body).toMatchObject({ to: "chu@example.com" });
    expect(body.subject).toContain("Cầu lông");
  });

  it("tai khoan khong co email thi tra 400", async () => {
    const env = createTestEnv({}, { rows: [{ email: null }] });

    const response = await callApi(
      app,
      `/api/games/${FAKE_GAME_ID}/email-summary`,
      { method: "POST" },
      env,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "user_has_no_email" });
  });

  it("mailer loi thi tra 502", async () => {
    const env = createTestEnv(
      {
        MAILER: {
          fetch: async () => new Response(JSON.stringify({ error: "smtp" }), { status: 500 }),
        } as unknown as Fetcher,
      },
      { rows: [{ email: "chu@example.com" }] },
    );

    const response = await callApi(
      app,
      `/api/games/${FAKE_GAME_ID}/email-summary`,
      { method: "POST" },
      env,
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: "mailer_failed" });
  });

  it("cuoc chia khong ton tai tra 404", async () => {
    const env = createTestEnv({}, { rows: [{ email: "chu@example.com" }] });

    const response = await callApi(
      app,
      "/api/games/game_la/email-summary",
      { method: "POST" },
      env,
    );

    expect(response.status).toBe(404);
  });
});
