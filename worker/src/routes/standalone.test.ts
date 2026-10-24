import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeRepo,
  FAKE_OWNER,
} from "../core/application/fake-game-repository";
import type { AuthedEnv } from "../lib/require-user";
import { crossBalancesRouter } from "./cross-balances";
import { funStatsRouter } from "./fun-stats";
import { profileRouter } from "./profile";
import { shuttlesRouter } from "./shuttles";

vi.mock("../lib/require-user", () => ({ protectPaths: vi.fn() }));

let fake: ReturnType<typeof createFakeRepo>;
let app: Hono<AuthedEnv>;

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

beforeEach(() => {
  fake = createFakeRepo();
  app = new Hono<AuthedEnv>();
  app.use("*", async (c, next) => {
    c.set("repo", fake.repo);
    c.set("userId", FAKE_OWNER);
    await next();
  });
  app.route("/api", crossBalancesRouter);
  app.route("/api", funStatsRouter);
  app.route("/api", profileRouter);
  app.route("/api", shuttlesRouter);
});

describe("account level HTTP routes", () => {
  it("returns cross game balances and fun stats", async () => {
    const balances = await request("GET", "/cross-balances");
    expect(balances.status).toBe(200);
    expect(await balances.json()).toMatchObject({ games: [{ code: "DSKVUF" }], totalExpense: 0 });
    const stats = await request("GET", "/fun-stats");
    expect(stats.status).toBe(200);
    expect(await stats.json()).toMatchObject({ gameCount: 1, totalExpense: 0 });
  });

  it("validates and updates the current profile name", async () => {
    expect((await request("PATCH", "/profile", { name: " " })).status).toBe(
      400,
    );
    fake.state.users.push({
      id: FAKE_OWNER,
      name: "Old",
      email: "owner@example.com",
    });
    const response = await request("PATCH", "/profile", { name: " New " });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ name: "New" });
    expect(fake.state.users[0].name).toBe("New");
  });

  it("creates, reads and removes a shuttle stock entry", async () => {
    const empty = await request("GET", "/shuttles");
    expect(await empty.json()).toEqual({ stock: 0, entries: [] });
    expect(
      (
        await request("POST", "/shuttles/entries", {
          kind: "add",
          quantity: -1,
        })
      ).status,
    ).toBe(400);
    const added = await request("POST", "/shuttles/entries", {
      kind: "add",
      quantity: 12,
    });
    expect(added.status).toBe(200);
    expect(await added.json()).toMatchObject({ stock: 12 });
    expect(fake.state.shuttleEntries).toHaveLength(1);
    const id = fake.state.shuttleEntries[0].id;
    expect((await request("GET", "/shuttles")).status).toBe(200);
    const removed = await request("DELETE", `/shuttles/entries/${id}`);
    expect(removed.status).toBe(200);
    expect(await removed.json()).toEqual({ stock: 0, entries: [] });
  });
});
