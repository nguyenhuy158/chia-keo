import { describe, expect, it } from "vitest";
import { formatDateTime, formatTime } from "./format-datetime";

const ISO = "2026-08-23T09:05:00.000Z";

describe("formatDateTime", () => {
  it("mac dinh co nam", () => {
    expect(formatDateTime(ISO)).toContain("2026");
  });

  it("bo nam khi khong can", () => {
    expect(formatDateTime(ISO, { includeYear: false })).not.toContain("2026");
  });

  it("luon co gio va phut", () => {
    expect(formatDateTime(ISO)).toMatch(/\d{2}:\d{2}/);
  });
});

describe("formatTime", () => {
  it("chi tra ve gio:phut", () => {
    expect(formatTime(ISO)).toMatch(/^\d{2}:\d{2}$/);
  });
});
