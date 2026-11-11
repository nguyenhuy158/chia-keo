import { describe, expect, it, vi } from "vitest";
import type { Env } from "../env";

vi.mock("../adapters/d1/game-repository", () => ({
  createD1GameRepository: () => "d1-repo",
}));
vi.mock("../adapters/sepay/sepay-bank-feed", () => ({
  createSepayBankFeed: (token: string, base?: string) => ({ token, base }),
}));

import { createPaymentContext } from "./payment-context";

describe("createPaymentContext", () => {
  it("chi bat SePay khi co token", () => {
    expect(createPaymentContext({ DB: {} } as Env)).toEqual({
      repo: "d1-repo",
      bankFeed: null,
    });
    expect(
      createPaymentContext(
        { DB: {}, SEPAY_API: "t", SEPAY_API_BASE: "b" } as Env,
        "given" as never,
      ),
    ).toEqual({ repo: "given", bankFeed: { token: "t", base: "b" } });
  });
});
