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

/** Route can dang nhap: khong co session phai bi chan tu middleware. */
const GUARDED_PATHS = ["/api/games", "/api/contacts", "/api/contacts/abc"];

describe("pham vi cua requireUser", () => {
  for (const path of GUARDED_PATHS) {
    it(`${path} chan request khong co session`, async () => {
      const app = new Hono();
      app.route("/api", gamesRouter as unknown as Hono<never>);

      // D1 gia: khong co session nao trong bang nen getSession tra null.
      const statement = {
        bind: () => statement,
        all: async () => ({ results: [], success: true, meta: {} }),
        first: async () => null,
        run: async () => ({ success: true, meta: {} }),
        raw: async () => [],
      };
      const env = { DB: { prepare: () => statement, batch: async () => [] } };

      // Danh ba la du lieu ca nhan (ten + so tai khoan cua ban be), khong
      // duoc phep tra ve khi chua biet nguoi goi la ai.
      expect((await app.request(path, undefined, env)).status).toBe(401);
    });
  }


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
