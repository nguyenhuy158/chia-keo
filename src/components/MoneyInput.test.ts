import { describe, expect, it } from "vitest";
import { evaluateMoneyExpression, formatMoneyInput } from "./MoneyInput";

describe("evaluateMoneyExpression", () => {
  it("tinh dung khi so co dau phan nhom nghin", () => {
    // "." la dau phan nhom (vi-VN), khong phai dau thap phan.
    expect(evaluateMoneyExpression("3.000+4000")).toBe(7000);
    expect(evaluateMoneyExpression("3.000+4.000")).toBe(7000);
    expect(evaluateMoneyExpression("1.000.000-500.000")).toBe(500000);
  });

  it("tinh dung so khong co dau phan nhom", () => {
    expect(evaluateMoneyExpression("20000+30000")).toBe(50000);
    expect(evaluateMoneyExpression("2*30000")).toBe(60000);
    expect(evaluateMoneyExpression("100000/4")).toBe(25000);
  });

  it("tra null cho bieu thuc rong hoac ket qua am", () => {
    expect(evaluateMoneyExpression("")).toBeNull();
    expect(evaluateMoneyExpression("100-200")).toBeNull();
    expect(evaluateMoneyExpression("+1000")).toBeNull();
    expect(evaluateMoneyExpression("1000++2000")).toBeNull();
  });
});

describe("formatMoneyInput", () => {
  it("nhom chu so theo dinh dang vi-VN", () => {
    expect(formatMoneyInput("500000")).toBe("500.000");
    expect(formatMoneyInput("")).toBe("");
  });
});
