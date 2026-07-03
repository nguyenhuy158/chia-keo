import { eq } from "drizzle-orm";
import { Hono } from "hono";
import * as schema from "../db/schema";
import type { Env } from "../env";
import { createDb, loadShareView } from "../lib/game-data";

export const shareRouter = new Hono<{ Bindings: Env }>();

shareRouter.get("/share/:token", async (c) => {
  const db = createDb(c.env.DB);

  const rows = await db
    .select({ link: schema.shareLinks, game: schema.games })
    .from(schema.shareLinks)
    .innerJoin(schema.games, eq(schema.games.id, schema.shareLinks.gameId))
    .where(eq(schema.shareLinks.token, c.req.param("token")))
    .limit(1);

  const row = rows[0];
  const expired = Boolean(row?.link.expiresAt && row.link.expiresAt < new Date().toISOString());
  if (!row || !row.link.enabled || expired) {
    return c.json({ error: "not_found" }, 404);
  }

  return c.json(await loadShareView(db, row.game));
});
