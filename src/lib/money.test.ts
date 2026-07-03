import { describe, expect, it } from "vitest";
import { formatMoneyInput, parseMoney } from "./money";

describe("hàm xử lý tiền", () => {
  it("đọc được ô nhập VND đã định dạng", () => {
    expect(parseMoney("500.000 VND")).toBe(500000);
  });

  it("định dạng tiền khi người dùng nhập", () => {
    expect(formatMoneyInput("500000")).toContain("500.000");
  });
});
