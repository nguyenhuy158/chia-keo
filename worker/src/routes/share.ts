import { Hono } from "hono";
import { createD1GameRepository } from "../adapters/d1/game-repository";
import { getShareViewByToken } from "../core/application/share-links";
import type { Env } from "../env";
import { respond } from "../lib/http";

export const shareRouter = new Hono<{ Bindings: Env }>();

shareRouter.get("/share/:token", (c) =>
  respond(c, () => getShareViewByToken(createD1GameRepository(c.env.DB), c.req.param("token"))),
);
