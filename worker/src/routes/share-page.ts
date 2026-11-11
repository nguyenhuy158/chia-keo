import { Hono } from "hono";
import { createD1GameRepository } from "../adapters/d1/game-repository";
import { findSharePageMeta } from "../core/application/share-links";
import type { Env } from "../env";
import { buildShareMetaTags } from "../lib/share-meta";

export const sharePageRouter = new Hono<{ Bindings: Env }>();

sharePageRouter.get("/share/:token", async (c) => {
  const page = await c.env.ASSETS.fetch(new URL("/", c.req.url));
  const meta = await findSharePageMeta(
    createD1GameRepository(c.env.DB),
    c.req.param("token"),
  ).catch((error) => {
    console.error("Share page meta lookup failed:", error);
    return null;
  });
  if (!meta) return page;

  const tags = buildShareMetaTags(meta, c.req.url);
  return new HTMLRewriter()
    .on("head", {
      element(head) {
        head.append(tags, { html: true });
      },
    })
    .transform(page);
});
