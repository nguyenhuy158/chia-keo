import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { aiRouter } from "./ai";
import { gamesRouter } from "./games";
import { mcpTokensRouter } from "./mcp-tokens";
import { photosRouter } from "./photos";

/**
 * Cac router can dang nhap deu cam requireUser bang path cua chinh no. Neu ai
 * doi lai thanh `use("*")`, middleware se phu len ca `/api/*` va lam route
 * public duoc mount sau do tra 401 - dung loi da xay ra voi `/api/share/:token`
 * khi router mcp-tokens duoc mount truoc router share.
 */
const PROTECTED_ROUTERS: [string, Hono<never>][] = [
  ["mcp-tokens", mcpTokensRouter as unknown as Hono<never>],
  ["ai", aiRouter as unknown as Hono<never>],
  ["photos", photosRouter as unknown as Hono<never>],
  ["games", gamesRouter as unknown as Hono<never>],
];

/** Cac path public phai qua duoc, ke ca khi mount sau router can dang nhap. */
const PUBLIC_PATHS = ["/api/share/tok", "/api/share/tok/photos", "/api/qr", "/api/health"];

describe("pham vi cua requireUser", () => {
  for (const [name, router] of PROTECTED_ROUTERS) {
    it(`router ${name} khong chan route public duoc mount sau`, async () => {
      const app = new Hono();
      app.route("/api", router);
      // Mount sau: day la truong hop de vo nhat.
      for (const path of PUBLIC_PATHS) app.get(path, (c) => c.json({ ok: true }));

      for (const path of PUBLIC_PATHS) {
        const response = await app.request(path);
        expect(response.status, `${name} chan ${path}`).toBe(200);
      }
    });
  }
});
