import { describe, expect, it } from "vitest";
import {
  formatPlayedRange,
  isIsoDate,
  isValidPlayedRange,
} from "./played-dates";

describe("played dates", () => {
  it("nhận ngày thật và từ chối ngày không tồn tại", () => {
    expect(isIsoDate("2026-11-19")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("19/11/2026")).toBe(false);
  });

  it("kiểm tra khoảng ngày", () => {
    expect(isValidPlayedRange("", "")).toBe(true);
    expect(isValidPlayedRange("2026-11-16", "")).toBe(true);
    expect(isValidPlayedRange("2026-11-16", "2026-11-16")).toBe(true);
    expect(isValidPlayedRange("2026-11-16", "2026-11-18")).toBe(true);
    expect(isValidPlayedRange("", "2026-11-16")).toBe(false);
    expect(isValidPlayedRange("2026-13-01", "")).toBe(false);
    expect(isValidPlayedRange("2026-11-16", "2026-02-30")).toBe(false);
    expect(isValidPlayedRange("2026-11-18", "2026-11-16")).toBe(false);
  });

  it("định dạng một ngày và khoảng ngày", () => {
    expect(formatPlayedRange("", "")).toBe("");
    expect(formatPlayedRange("2026-11-16", "")).toBe("16/11/2026");
    expect(formatPlayedRange("2026-11-16", "2026-11-16")).toBe("16/11/2026");
    expect(formatPlayedRange("2026-11-16", "2026-11-18")).toBe(
      "16/11 - 18/11/2026",
    );
  });
});
