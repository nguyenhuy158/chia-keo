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
});
