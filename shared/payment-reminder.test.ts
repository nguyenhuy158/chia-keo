import { describe, expect, it } from "vitest";
import { buildPaymentReminder } from "./payment-reminder";

describe("buildPaymentReminder", () => {
  it("nêu đúng người chuyển, số tiền VND, người nhận và tên cuộc chia", () => {
    expect(buildPaymentReminder("Kèo sân thứ 7", "Bình", "An", 40_000)).toBe(
      'Bình ơi, bạn chuyển 40.000 ₫ cho An cho kèo "Kèo sân thứ 7" nhé.',
    );
  });
});
