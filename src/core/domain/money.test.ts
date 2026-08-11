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

  it("tinh dung bieu thuc cong tru nhan chia", () => {
    expect(parseMoney("20000+30000")).toBe(50000);
    expect(parseMoney("2*30000")).toBe(60000);
    expect(parseMoney("100000/4")).toBe(25000);
  });

  it("dau . la phan nhom nghin, khong phai dau thap phan", () => {
    expect(parseMoney("3.000+4000")).toBe(7000);
    expect(parseMoney("3.000+4.000")).toBe(7000);
    expect(parseMoney("1.000.000-500.000")).toBe(500000);
  });

  it("tra ve 0 cho bieu thuc sai cu phap hoac ket qua am", () => {
    expect(parseMoney("100-200")).toBe(0);
    expect(parseMoney("+1000")).toBe(0);
    expect(parseMoney("1000++2000")).toBe(0);
  });
});

describe("formatMoney", () => {
  it("dinh dang VND khong co phan thap phan", () => {
    const formatted = formatMoney(500000);
    expect(formatted).toContain("500.000");
    expect(formatted).toContain("₫");
  });
});
