import { Hono } from "hono";
import { createD1GameRepository } from "../adapters/d1/game-repository";
import { getSharedPhoto, listSharedPhotos } from "../core/application/photos";
import { reconcileSharedPayments } from "../core/application/payments";
import { getShareViewByToken } from "../core/application/share-links";
import type { Env } from "../env";
import { respond } from "../lib/http";
import { createPaymentContext } from "../lib/payment-context";

export const shareRouter = new Hono<{ Bindings: Env }>();

shareRouter.get("/share/:token", (c) =>
  respond(c, async () => {
    const context = createPaymentContext(c.env);
    await reconcileSharedPayments(context, c.req.param("token"));
    return getShareViewByToken(context.repo, c.req.param("token"));
  }),
);

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
