import { createD1GameRepository } from "../adapters/d1/game-repository";
import { createSepayBankFeed } from "../adapters/sepay/sepay-bank-feed";
import type { PaymentContext } from "../core/application/payments";
import type { GameRepository } from "../core/ports/game-repository";
import type { Env } from "../env";

export function createPaymentContext(
  env: Env,
  repo: GameRepository = createD1GameRepository(env.DB),
): PaymentContext {
  return {
    repo,
    bankFeed: env.SEPAY_API
      ? createSepayBankFeed(env.SEPAY_API, env.SEPAY_API_BASE)
      : null,
  };
}
