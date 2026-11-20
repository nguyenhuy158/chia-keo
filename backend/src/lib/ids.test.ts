import { describe, expect, it, vi } from "vitest";
import { createGameCode, createId, createShareToken, nowIso } from "./ids";

describe("identifier helpers", () => {
  it("tạo ID có tiền tố và UUID khác nhau", () => {
    const first = createId("game");
    const second = createId("game");

    expect(first).toMatch(/^game_[0-9a-f-]{36}$/);
    expect(second).not.toBe(first);
  });

  it("tạo mã cuộc và share token đúng bảng ký tự dễ đọc", () => {
    expect(createGameCode()).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    expect(createShareToken()).toMatch(
      /^[23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ]{4}$/,
    );
  });

  it("ghi thời điểm UTC dưới dạng ISO", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-24T05:00:00.000Z"));
      expect(nowIso()).toBe("2026-10-24T05:00:00.000Z");
    } finally {
      vi.useRealTimers();
    }
  });
});
