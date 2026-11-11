import { Hono } from "hono";
import { paymentRequestInputSchema } from "../../../shared/schemas";
import { createD1GameRepository } from "../adapters/d1/game-repository";
import { createSepayBankFeed } from "../adapters/sepay/sepay-bank-feed";
import {
  createPaymentRequest,
  getPaymentOptions,
  getPaymentRequest,
} from "../core/application/payments";
import type { Env } from "../env";
import { invalidInput, readJson, respond } from "../lib/http";

export const paymentsRouter = new Hono<{ Bindings: Env }>();

function paymentContext(env: Env) {
  return {
    repo: createD1GameRepository(env.DB),
    bankFeed: env.SEPAY_API ? createSepayBankFeed(env.SEPAY_API, env.SEPAY_API_BASE) : null,
  };
}

paymentsRouter.get("/share/:token/payments", (c) =>
  respond(c, () => getPaymentOptions(paymentContext(c.env), c.req.param("token"))),
);

paymentsRouter.post("/share/:token/payments", async (c) => {
  const input = await readJson(c, paymentRequestInputSchema);
  if (!input) return invalidInput(c);
  return respond(c, () => createPaymentRequest(paymentContext(c.env), c.req.param("token"), input));
});

paymentsRouter.get("/share/:token/payments/:code", (c) =>
  respond(c, () =>
    getPaymentRequest(paymentContext(c.env), c.req.param("token"), c.req.param("code")),
  ),
);
