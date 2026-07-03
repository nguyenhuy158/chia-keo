import { describe, expect, it } from "vitest";
import { formatMoney, parseMoney } from "./money";

describe("parseMoney", () => {
  it("doc so tu chuoi co ky tu phan tach", () => {
    expect(parseMoney("500000")).toBe(500000);
    expect(parseMoney("500.000")).toBe(500000);
    expect(parseMoney("500,000 d")).toBe(500000);
  });

  it("tra ve 0 khi chuoi khong co chu so", () => {
    expect(parseMoney("")).toBe(0);
    expect(parseMoney("abc")).toBe(0);
  });
});

describe("formatMoney", () => {
  it("dinh dang VND khong co phan thap phan", () => {
    const formatted = formatMoney(500000);
    expect(formatted).toContain("500.000");
    expect(formatted).toContain("₫");
  });
});
