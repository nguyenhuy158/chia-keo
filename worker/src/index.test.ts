import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "./env";

const { authHandler } = vi.hoisted(() => ({ authHandler: vi.fn() }));
vi.mock("./auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./auth")>()),
  createAuth: () => ({ handler: authHandler }),
}));

import app from "./index";

let first: ReturnType<typeof vi.fn>;
let env: Env;

beforeEach(() => {
  first = vi.fn().mockResolvedValue({ one: 1 });
  const statement = { first };
  env = { DB: { prepare: vi.fn(() => statement) } } as unknown as Env;
  authHandler.mockReset().mockResolvedValue(new Response("auth ok"));
});

afterEach(() => vi.restoreAllMocks());

describe("Worker entrypoint", () => {
  it("serves version and health and includes credentials for an allowed origin", async () => {
    const version = await app.request(
      "/api/version",
      { headers: { Origin: "http://localhost:5173" } },
      env,
    );
    expect(version.status).toBe(200);
    expect(await version.json()).toHaveProperty("commit");
    expect(version.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:5173",
    );
    expect(version.headers.get("access-control-allow-credentials")).toBe(
      "true",
    );
    const health = await app.request("/api/health", undefined, env);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ ok: true, db: "ok" });
    expect(first).toHaveBeenCalledOnce();
  });

  it("does not grant CORS to an untrusted origin", async () => {
    const response = await app.request(
      "/api/version",
      { headers: { Origin: "https://other.example" } },
      env,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("returns an actionable database health error", async () => {
    first.mockRejectedValue(new Error("no table"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await app.request("/api/health", undefined, env);
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ ok: false, db: "error" });
  });

  it("routes auth requests and reports uncaught errors", async () => {
    const ok = await app.request(
      "/api/auth/sign-in/email",
      { method: "POST" },
      env,
    );
    expect(ok.status).toBe(200);
    expect(authHandler).toHaveBeenCalledOnce();
    authHandler.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = await app.request(
      "/api/auth/sign-in/email",
      { method: "POST" },
      env,
    );
    expect(failure.status).toBe(500);
    expect(await failure.json()).toEqual({ error: "INTERNAL_SERVER_ERROR" });
  });

  it("limits repeated sign-in attempts by IP", async () => {
    for (let index = 0; index < 10; index++) {
      expect(
        (
          await app.request(
            "/api/auth/sign-up/email",
            { method: "POST", headers: { "cf-connecting-ip": "192.0.2.42" } },
            env,
          )
        ).status,
      ).toBe(200);
    }
    const blocked = await app.request(
      "/api/auth/sign-up/email",
      { method: "POST", headers: { "cf-connecting-ip": "192.0.2.42" } },
      env,
    );
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ error: "rate_limited" });
  });
});
