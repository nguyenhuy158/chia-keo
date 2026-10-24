import { drizzle } from "drizzle-orm/d1";
import { migrate } from "drizzle-orm/d1/migrator";
import { Hono } from "hono";
import { Miniflare } from "miniflare";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as schema from "../adapters/d1/schema";
import {
  createFakeRepo,
  FAKE_GAME_ID,
  FAKE_OWNER,
  gameRow,
} from "../core/application/fake-game-repository";
import type { Env } from "../env";
import type { AuthedEnv } from "../lib/require-user";

vi.mock("../lib/require-user", () => ({ protectPaths: vi.fn() }));

import { emailSummaryRouter } from "./email-summary";

let miniflare: Miniflare;
let env: Env;
let fake: ReturnType<typeof createFakeRepo>;
let app: Hono<AuthedEnv>;
let mailer: ReturnType<typeof vi.fn>;
let userId: string;

function request(gameId = FAKE_GAME_ID) {
  return app.request(
    `https://chia-keo.example/api/games/${gameId}/email-summary`,
    { method: "POST" },
    env,
  );
}

beforeAll(async () => {
  miniflare = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok'); } }",
    compatibilityDate: "2026-07-01",
    d1Databases: { DB: "test-email-summary-route" },
    d1Persist: false,
  });
  const DB = await miniflare.getD1Database("DB");
  await migrate(drizzle(DB), { migrationsFolder: "./drizzle" });
  await drizzle(DB)
    .insert(schema.user)
    .values({
      id: FAKE_OWNER,
      name: "Owner",
      email: "owner@example.test",
      createdAt: new Date(0),
      updatedAt: new Date(0),
    });
  env = { DB, MAILER_KEY: "test-key" } as Env;
});

afterAll(async () => miniflare.dispose());

beforeEach(() => {
  userId = FAKE_OWNER;
  fake = createFakeRepo();
  mailer = vi.fn().mockResolvedValue(Response.json({ id: "sent" }));
  env.MAILER = { fetch: mailer } as unknown as Env["MAILER"];
  app = new Hono<AuthedEnv>();
  app.use("*", async (c, next) => {
    c.set("repo", fake.repo);
    c.set("userId", userId);
    await next();
  });
  app.route("/api", emailSummaryRouter);
});

describe("POST /api/games/:gameId/email-summary", () => {
  it("returns 404 for a game the user does not own", async () => {
    const response = await request("missing");
    expect(response.status).toBe(404);
    expect(mailer).not.toHaveBeenCalled();
  });

  it("propagates a repository failure", async () => {
    fake.repo.games.getById = async () => {
      throw new Error("database unavailable");
    };
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await request();
    expect(response.status).toBe(500);
    expect(mailer).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("requires an email on the owner account", async () => {
    userId = "missing-user";
    fake.state.games = [gameRow({ ownerUserId: userId })];
    const response = await request();
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "user_has_no_email" });
    expect(mailer).not.toHaveBeenCalled();
  });

  it("sends an escaped summary to the owner with an enabled share link", async () => {
    fake.state.games[0].name = "Court <Night> & Friends";
    fake.state.shareLinks.push({
      gameId: FAKE_GAME_ID,
      token: "share-token",
      enabled: true,
      createdAt: "2026-08-01T00:00:00.000Z",
      expiresAt: null,
    });
    const response = await request();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sent: true });
    expect(mailer).toHaveBeenCalledOnce();
    const [url, options] = mailer.mock.calls[0];
    expect(url).toBe("https://mailer/send");
    expect(options.headers.Authorization).toBe("Bearer test-key");
    const body = JSON.parse(options.body);
    expect(body.to).toBe("owner@example.test");
    expect(body.subject).toContain("Court <Night> & Friends");
    expect(body.text).toContain("https://chia-keo.example/share/share-token");
    expect(body.html).toContain("Court &lt;Night&gt; &amp; Friends");
  });

  it("does not include a disabled share link", async () => {
    fake.state.shareLinks.push({
      gameId: FAKE_GAME_ID,
      token: "private-token",
      enabled: false,
      createdAt: "2026-08-01T00:00:00.000Z",
      expiresAt: null,
    });
    expect((await request()).status).toBe(200);
    const body = JSON.parse(mailer.mock.calls[0][1].body);
    expect(body.text).not.toContain("private-token");
  });

  it("reports mailer rejection with its response detail", async () => {
    mailer.mockResolvedValue(
      Response.json({ reason: "blocked" }, { status: 429 }),
    );
    const response = await request();
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "mailer_failed",
      detail: { reason: "blocked" },
    });
  });
});
