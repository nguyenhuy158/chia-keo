import { describe, expect, it, vi } from "vitest";
import type { Env } from "./env";

const mocks = vi.hoisted(() => ({
  betterAuth: vi.fn(),
  drizzleAdapter: vi.fn(),
  drizzle: vi.fn(),
  username: vi.fn(),
}));

vi.mock("better-auth", () => ({ betterAuth: mocks.betterAuth }));
vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: mocks.drizzleAdapter,
}));
vi.mock("better-auth/plugins", () => ({ username: mocks.username }));
vi.mock("drizzle-orm/d1", () => ({ drizzle: mocks.drizzle }));

import { createAuth, getTrustedOrigins, parseAllowedOrigins } from "./auth";

describe("auth configuration", () => {
  it("parses trusted origins and drops malformed URLs", () => {
    expect(
      parseAllowedOrigins(" https://a.example, ,https://b.example "),
    ).toEqual(["https://a.example", "https://b.example"]);
    expect(parseAllowedOrigins(undefined)).toEqual([]);
    expect(
      getTrustedOrigins(
        {
          ALLOWED_ORIGINS: "https://a.example",
          BETTER_AUTH_URL: "invalid",
        } as Env,
        "https://request.example/path",
      ),
    ).toContain("https://request.example");
    expect(getTrustedOrigins({} as Env)).toEqual([
      "http://127.0.0.1:5173",
      "http://localhost:5173",
    ]);
  });

  it("configures Better Auth and reports API errors", () => {
    const db = {} as Env["DB"];
    const env = {
      DB: db,
      BETTER_AUTH_SECRET: "test-secret",
      BETTER_AUTH_URL: "",
    } as Env;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.drizzle.mockReturnValue("db");
    mocks.drizzleAdapter.mockReturnValue("adapter");
    mocks.username.mockReturnValue("username-plugin");
    mocks.betterAuth.mockReturnValue("auth");
    expect(createAuth(env, "https://request.example/path")).toBe("auth");
    expect(mocks.drizzle).toHaveBeenCalledWith(
      db,
      expect.objectContaining({ schema: expect.anything() }),
    );
    expect(mocks.betterAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        database: "adapter",
        baseURL: "https://request.example",
        basePath: "/api/auth",
        plugins: ["username-plugin"],
      }),
    );
    const options = mocks.betterAuth.mock.calls[0][0];
    options.onAPIError.onError(new Error("broken"));
    expect(errorSpy).toHaveBeenCalledWith(
      "Better Auth error:",
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });
});
