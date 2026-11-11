import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { rateLimitNotFound } from "./rate-limit-middleware";

function appWith(limit: number) {
  const app = new Hono();
  app.use(
    "/x/:code",
    rateLimitNotFound(["GET"], "miss", { limit, windowMs: 60_000 }),
  );
  app.get("/x/:code", (c) =>
    c.req.param("code") === "ok" ? c.json({ ok: true }) : c.json({}, 404),
  );
  app.post("/x/:code", (c) => c.json({ posted: true }));
  return app;
}

const headers = { "cf-connecting-ip": "198.51.100.9" };

describe("rateLimitNotFound", () => {
  it("chi dem lan tra 404, du nguong thi chan ca lan hop le", async () => {
    const app = appWith(2);
    for (let index = 0; index < 5; index++) {
      expect((await app.request("/x/ok", { headers })).status).toBe(200);
    }
    expect((await app.request("/x/bad", { headers })).status).toBe(404);
    expect((await app.request("/x/bad", { headers })).status).toBe(404);
    expect((await app.request("/x/ok", { headers })).status).toBe(429);
    expect(
      (await app.request("/x/ok", { method: "POST", headers })).status,
    ).toBe(200);
  });

  it("dem request song song ngay luc toi", async () => {
    const app = new Hono();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    app.use(
      "/y",
      rateLimitNotFound(["GET"], "race", { limit: 2, windowMs: 60_000 }),
    );
    app.get("/y", async (c) => {
      await gate;
      return c.json({}, 404);
    });
    const pending = [1, 2, 3].map(() => app.request("/y", { headers }));
    release();
    const statuses = (await Promise.all(pending)).map(
      (response) => response.status,
    );
    expect(statuses.filter((status) => status === 429)).toHaveLength(1);
  });
});
