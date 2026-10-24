import { drizzle } from "drizzle-orm/d1";
import { migrate } from "drizzle-orm/d1/migrator";
import { Hono } from "hono";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "../adapters/d1/schema";
import type { Env } from "../env";

const { resolveUserId } = vi.hoisted(() => ({ resolveUserId: vi.fn() }));
vi.mock("../lib/require-user", () => ({ resolveUserId }));

import { sessionRouter } from "./session";

let miniflare: Miniflare;
let env: Env;
const app = new Hono<{ Bindings: Env }>();
app.route("/api", sessionRouter);

beforeAll(async () => {
  miniflare = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok'); } }",
    compatibilityDate: "2026-07-01",
    d1Databases: { DB: "test-session-route" },
    d1Persist: false,
  });
  const DB = await miniflare.getD1Database("DB");
  await migrate(drizzle(DB), { migrationsFolder: "./drizzle" });
  await drizzle(DB)
    .insert(schema.user)
    .values([
      {
        id: "display",
        name: "Real Name",
        email: "display@example.test",
        displayUsername: "Screen Name",
        image: "avatar.png",
        createdAt: new Date(0),
        updatedAt: new Date(0),
      },
      {
        id: "fallback",
        name: "Real Name",
        email: "fallback@example.test",
        createdAt: new Date(0),
        updatedAt: new Date(0),
      },
    ]);
  env = { DB } as Env;
});

afterAll(async () => miniflare.dispose());

describe("GET /api/session", () => {
  it("returns anonymous before login or when the user no longer exists", async () => {
    resolveUserId.mockResolvedValueOnce(null).mockResolvedValueOnce("deleted");
    const anonymous = await app.request("/api/session", undefined, env);
    expect(anonymous.status).toBe(200);
    expect(await anonymous.json()).toEqual({ user: null });
    const deleted = await app.request("/api/session", undefined, env);
    expect(await deleted.json()).toEqual({ user: null });
  });

  it("uses display username and image when present", async () => {
    resolveUserId.mockResolvedValue("display");
    const response = await app.request("/api/session", undefined, env);
    expect(await response.json()).toEqual({
      user: { id: "display", name: "Screen Name", image: "avatar.png" },
    });
  });

  it("falls back to the account name", async () => {
    resolveUserId.mockResolvedValue("fallback");
    const response = await app.request("/api/session", undefined, env);
    expect(await response.json()).toEqual({
      user: { id: "fallback", name: "Real Name", image: null },
    });
  });
});
