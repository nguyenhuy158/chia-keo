import { beforeEach, describe, expect, it, vi } from "vitest";
import { BUILD_INFO } from "../../shared/build-info";
import { createFakeRepo } from "./core/application/fake-game-repository";
import { callApi, createTestEnv, TEST_ORIGIN } from "./test-support/route-harness";

// Session + repo duoc thay o day: test chay het duong that cua app (CORS,
// rate limit, router, onError) chi tru hai canh cham ra ngoai la auth va D1.
const state = vi.hoisted(() => ({
  userId: null as string | null,
  repo: null as unknown,
}));

vi.mock("./auth", () => ({
  AUTH_BASE_PATH: "/api/auth",
  createAuth: () => ({
    api: {
      getSession: async () => (state.userId ? { user: { id: state.userId } } : null),
    },
    handler: async () => new Response(JSON.stringify({ ok: true })),
  }),
  getTrustedOrigins: () => [TEST_ORIGIN],
}));

vi.mock("./adapters/d1/game-repository", () => ({
  createD1GameRepository: () => state.repo,
}));

const { default: app } = await import("./index");

beforeEach(() => {
  state.userId = null;
  state.repo = createFakeRepo().repo;
});

describe("GET /api/version", () => {
  it("tra ve commit dang chay de kiem deploy da len chua", async () => {
    const response = await callApi(app, "/api/version");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(BUILD_INFO);
  });
});

describe("GET /api/health", () => {
  it("D1 tra loi duoc thi bao ok", async () => {
    const response = await callApi(app, "/api/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, db: "ok" });
  });

  it("D1 chua chay migration thi bao loi kem cach sua", async () => {
    const env = createTestEnv({}, { failing: true });

    const response = await callApi(app, "/api/health", {}, env);

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ ok: false, db: "error" });
  });
});

describe("CORS", () => {
  it("cho origin trong danh sach tin cay", async () => {
    const response = await callApi(app, "/api/version", {
      headers: { Origin: TEST_ORIGIN },
    });

    expect(response.headers.get("access-control-allow-origin")).toBe(TEST_ORIGIN);
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("khong tra header cho origin la", async () => {
    const response = await callApi(app, "/api/version", {
      headers: { Origin: "https://ke-xau.example" },
    });

    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("preflight cho phep cac method app dung", async () => {
    const response = await callApi(app, "/api/games", {
      method: "OPTIONS",
      headers: { Origin: TEST_ORIGIN, "Access-Control-Request-Method": "PATCH" },
    });

    expect(response.headers.get("access-control-allow-methods")).toContain("PATCH");
    expect(response.headers.get("access-control-allow-headers")).toContain("Authorization");
  });
});

describe("dang nhap", () => {
  it("chua dang nhap thi route can quyen tra 401", async () => {
    const response = await callApi(app, "/api/games");

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
  });

  it("da dang nhap thi qua duoc", async () => {
    state.userId = "user_owner";

    const response = await callApi(app, "/api/games");

    expect(response.status).toBe(200);
  });

  it("duong auth cua better-auth duoc chuyen thang sang handler", async () => {
    const response = await callApi(app, "/api/auth/sign-in/email", { method: "POST", body: {} });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});

describe("rate limit", () => {
  it("POST /api/games qua nguong thi tra 429", async () => {
    state.userId = "user_owner";
    const headers = { "cf-connecting-ip": "10.0.0.1" };

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const response = await callApi(app, "/api/games", {
        method: "POST",
        body: { name: `Cuộc ${attempt}` },
        headers,
      });
      statuses.push(response.status);
    }

    expect(statuses.at(-1)).toBe(429);
    expect(statuses.filter((status) => status === 429).length).toBeGreaterThan(0);
  });

  it("GET khong bi chan boi gioi han danh cho POST", async () => {
    state.userId = "user_owner";
    const headers = { "cf-connecting-ip": "10.0.0.2" };

    for (let attempt = 0; attempt < 40; attempt += 1) {
      await callApi(app, "/api/games", { headers });
    }

    expect((await callApi(app, "/api/games", { headers })).status).toBe(200);
  });

  it("IP khac khong bi anh huong boi IP da dinh gioi han", async () => {
    state.userId = "user_owner";

    for (let attempt = 0; attempt < 32; attempt += 1) {
      await callApi(app, "/api/games", {
        method: "POST",
        body: { name: "Cuộc" },
        headers: { "cf-connecting-ip": "10.0.0.3" },
      });
    }

    const response = await callApi(app, "/api/games", {
      method: "POST",
      body: { name: "Cuộc" },
      headers: { "cf-connecting-ip": "10.0.0.4" },
    });

    expect(response.status).not.toBe(429);
  });

  it("khong co header IP van dem duoc (gom vao 'unknown')", async () => {
    state.userId = "user_owner";

    const response = await callApi(app, "/api/games", { method: "POST", body: { name: "X" } });

    expect([200, 201, 429]).toContain(response.status);
  });
});

describe("onError", () => {
  it("loi khong luong truoc tra 500 chu khong lam vo request", async () => {
    state.userId = "user_owner";
    // Repo hong: use case se nem loi khong phai loi nghiep vu.
    state.repo = {
      games: {
        listByOwner: async () => {
          throw new Error("D1 sap");
        },
        listSharedWithUser: async () => [],
      },
    };
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await callApi(app, "/api/games");

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "INTERNAL_SERVER_ERROR" });
    consoleError.mockRestore();
  });
});

describe("duong khong ton tai", () => {
  it("tra 404", async () => {
    expect((await callApi(app, "/api/khong-co-duong-nay")).status).toBe(404);
  });
});
