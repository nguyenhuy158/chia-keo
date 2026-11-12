import { Hono } from "hono";
import { SHARE_PREVIEW_MIME_TYPE } from "../../../shared/schemas";
import { createD1GameRepository } from "../adapters/d1/game-repository";
import { NotFoundError } from "../core/application/errors";
import { getSharedPhoto, listSharedPhotos } from "../core/application/photos";
import { reconcileSharedPayments } from "../core/application/payments";
import { getSharePreviewData, getShareViewByToken } from "../core/application/share-links";
import type { Env } from "../env";
import { notFound, respond } from "../lib/http";
import { createPaymentContext } from "../lib/payment-context";

const SHARE_PREVIEW_CACHE_SECONDS = 3600;

export const shareRouter = new Hono<{ Bindings: Env }>();

shareRouter.get("/share/:token", (c) =>
  respond(c, async () => {
    const context = createPaymentContext(c.env);
    await reconcileSharedPayments(context, c.req.param("token"));
    return getShareViewByToken(context.repo, c.req.param("token"));
  }),
);

shareRouter.get("/share/:token/preview.jpg", async (c) => {
  try {
    const data = await getSharePreviewData(
      createD1GameRepository(c.env.DB),
      c.req.param("token"),
    );
    return new Response(Uint8Array.from(atob(data), (char) => char.charCodeAt(0)), {
      headers: {
        "Content-Type": SHARE_PREVIEW_MIME_TYPE,
        "Cache-Control": `public, max-age=${SHARE_PREVIEW_CACHE_SECONDS}`,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(c);
    throw error;
  }
});

shareRouter.get("/share/:token/photos", (c) =>
  respond(c, () => listSharedPhotos(createD1GameRepository(c.env.DB), c.req.param("token"))),
);

shareRouter.get("/share/:token/photos/:photoId", (c) =>
  respond(c, () =>
    getSharedPhoto(
      createD1GameRepository(c.env.DB),
      c.req.param("token"),
      c.req.param("photoId"),
    ),
  ),
);
