import { describe, expect, it } from "vitest";
import { gameInputSchema, gameUpdateSchema } from "./schemas";

describe("gameUpdateSchema", () => {
  it("khong tu bồi thêm field nao ngoai field duoc gui", () => {
    // Bug that: khi schema sua duoc dung tu `gameInputSchema.partial()`, mot
    // PATCH chi doi ten hoac chi doi dau moi van keo theo settlementMode mac
    // dinh va am tham dua che do chuyen tien ve "host".
    expect(gameUpdateSchema.parse({ settlementHostId: "participant_1" })).toEqual({
      settlementHostId: "participant_1",
    });
    expect(gameUpdateSchema.parse({ name: "Ăn chơi" })).toEqual({ name: "Ăn chơi" });
    expect(gameUpdateSchema.parse({})).toEqual({});
  });

  it("van nhan tung field khi duoc gui va chan gia tri sai", () => {
    expect(gameUpdateSchema.parse({ settlementMode: "pick" })).toEqual({
      settlementMode: "pick",
    });
    expect(gameUpdateSchema.safeParse({ settlementMode: "khong-co" }).success).toBe(false);
    expect(gameUpdateSchema.safeParse({ name: "  " }).success).toBe(false);
  });
});

describe("gameInputSchema", () => {
  it("luc tao van dien san mac dinh", () => {
    expect(gameInputSchema.parse({ name: "Cầu lông" })).toEqual({
      name: "Cầu lông",
      settlementMode: "host",
      settlementHostId: "",
      participantCount: 0,
    });
  });
});
