import { Hono } from "hono";
import { paymentRequestInputSchema } from "../../../shared/schemas";
import {
  createPaymentRequest,
  getPaymentOptions,
  getPaymentRequest,
} from "../core/application/payments";
import type { Env } from "../env";
import { invalidInput, readJson, respond } from "../lib/http";
import { createPaymentContext } from "../lib/payment-context";

export const paymentsRouter = new Hono<{ Bindings: Env }>();

paymentsRouter.get("/share/:token/payments", (c) =>
  respond(c, () =>
    getPaymentOptions(createPaymentContext(c.env), c.req.param("token")),
  ),
);

paymentsRouter.post("/share/:token/payments", async (c) => {
  const input = await readJson(c, paymentRequestInputSchema);
  if (!input) return invalidInput(c);
  return respond(c, () =>
    createPaymentRequest(
      createPaymentContext(c.env),
      c.req.param("token"),
      input,
    ),
  );
});

paymentsRouter.get("/share/:token/payments/:code", (c) =>
  respond(c, () =>
    getPaymentRequest(
      createPaymentContext(c.env),
      c.req.param("token"),
      c.req.param("code"),
    ),
  ),
);
