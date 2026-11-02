import { drizzle } from "drizzle-orm/d1";
import { migrate } from "drizzle-orm/d1/migrator";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Env } from "./env";
import app from "./index";

let runtime: Miniflare;
let env: Env;

beforeAll(async () => {
  runtime = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok'); } }",
    compatibilityDate: "2026-07-03",
    d1Databases: { DB: "shared-prefix-isolation" },
    d1Persist: false,
  });
  const DB = await runtime.getD1Database("DB");
  await DB.exec("CREATE TABLE user (id TEXT PRIMARY KEY, marker TEXT NOT NULL)");
  await DB.prepare("INSERT INTO user VALUES (?, ?)").bind("other-app", "preserve").run();
  await migrate(drizzle(DB), { migrationsFolder: "./drizzle-shared" });
  env = { DB, BETTER_AUTH_SECRET: crypto.randomUUID() + crypto.randomUUID() } as Env;
});

afterAll(async () => runtime.dispose());

describe("shared D1 isolation", () => {
  it("keeps auth, game writes and sessions inside the app prefix", async () => {
    const password = crypto.randomUUID();
    const post = (path: string, body: unknown, cookie = "") => app.request(
      `http://localhost${path}`,
      { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify(body) },
      env,
    );
    const signup = await post("/api/auth/sign-up/email", {
      email: "prefix@example.test", name: "Prefix", username: "prefixuser", password,
    });
    expect(signup.status).toBe(200);
    const login = await post("/api/auth/sign-in/username", { username: "prefixuser", password });
    expect(login.status).toBe(200);
    const cookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";
    expect(cookie.length).toBeGreaterThan(0);
    const session = await app.request("http://localhost/api/session", { headers: { cookie } }, env);
    expect(session.status).toBe(200);
    expect((await session.json<{ user: { name: string } }>()).user.name).toBe("prefixuser");
    const game = await post("/api/games", { name: "Prefix isolation", participantCount: 2 }, cookie);
    expect(game.status).toBe(201);
    const health = await app.request("http://localhost/api/health", undefined, env);
    expect(await health.json()).toEqual({ ok: true, db: "ok" });
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM chiakeo_games").first("n")).toBe(1);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM chiakeo_user").first("n")).toBe(1);
    expect(await env.DB.prepare("SELECT marker FROM user WHERE id = 'other-app'").first("marker")).toBe("preserve");
  });
});
