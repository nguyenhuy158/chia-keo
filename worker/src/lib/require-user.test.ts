import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../env";

const {
  getSession,
  createAuth,
  readSsoCookie,
  verifySsoToken,
  resolveSsoUserId,
  createRepo,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  createAuth: vi.fn(),
  readSsoCookie: vi.fn(),
  verifySsoToken: vi.fn(),
  resolveSsoUserId: vi.fn(),
  createRepo: vi.fn(),
}));

vi.mock("../auth", () => ({ createAuth }));
vi.mock("../sso", () => ({ readSsoCookie, verifySsoToken }));
vi.mock("../sso-user", () => ({ resolveSsoUserId }));
vi.mock("../adapters/d1/game-repository", () => ({
  createD1GameRepository: createRepo,
}));

import { type AuthedEnv, protectPaths, resolveUserId } from "./require-user";

const env = { DB: { kind: "test-database" } } as unknown as Env;

beforeEach(() => {
  getSession.mockReset().mockResolvedValue(null);
  createAuth.mockReset().mockReturnValue({ api: { getSession } });
  readSsoCookie.mockReset().mockReturnValue(null);
  verifySsoToken.mockReset().mockResolvedValue(null);
  resolveSsoUserId.mockReset().mockResolvedValue("sso-user");
  createRepo.mockReset().mockReturnValue({ kind: "test-repo" });
});

describe("resolveUserId", () => {
  it("uses a Better Auth session before looking for SSO", async () => {
    getSession.mockResolvedValue({ user: { id: "password-user" } });
    const request = new Request("https://example.test/api/private");
    expect(await resolveUserId(env, request)).toBe("password-user");
    expect(createAuth).toHaveBeenCalledWith(env, request.url);
    expect(getSession).toHaveBeenCalledWith({ headers: request.headers });
    expect(readSsoCookie).not.toHaveBeenCalled();
  });

  it("returns anonymous without a session or valid SSO cookie", async () => {
    const request = new Request("https://example.test/api/private");
    expect(await resolveUserId(env, request)).toBeNull();
    readSsoCookie.mockReturnValue("bad-token");
    expect(await resolveUserId(env, request)).toBeNull();
    expect(verifySsoToken).toHaveBeenCalledWith("bad-token");
    expect(resolveSsoUserId).not.toHaveBeenCalled();
  });

  it("maps valid SSO claims to the local user", async () => {
    const claims = { sub: "google-user", email: "owner@example.test" };
    readSsoCookie.mockReturnValue("signed-token");
    verifySsoToken.mockResolvedValue(claims);
    expect(
      await resolveUserId(env, new Request("https://example.test/api/private")),
    ).toBe("sso-user");
    expect(resolveSsoUserId).toHaveBeenCalledWith(env.DB, claims);
  });
});

describe("requireUser and protectPaths", () => {
  it("protects only named paths and attaches the user and repository", async () => {
    const app = new Hono<AuthedEnv>();
    protectPaths(app, "/private");
    app.get("/private", (c) =>
      c.json({ userId: c.get("userId"), repo: c.get("repo") }),
    );
    app.get("/public", (c) => c.json({ public: true }));
    const denied = await app.request("/private", undefined, env);
    expect(denied.status).toBe(401);
    expect(await denied.json()).toEqual({ error: "unauthorized" });
    expect((await app.request("/public", undefined, env)).status).toBe(200);
    getSession.mockResolvedValue({ user: { id: "owner" } });
    const allowed = await app.request("/private", undefined, env);
    expect(await allowed.json()).toEqual({
      userId: "owner",
      repo: { kind: "test-repo" },
    });
    expect(createRepo).toHaveBeenCalledWith(env.DB);
  });
});
