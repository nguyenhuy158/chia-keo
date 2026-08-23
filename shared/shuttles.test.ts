import { describe, expect, it } from "vitest";
import {
  MAX_SHUTTLE_STOCK,
  computeShuttleStock,
  shuttleDelta,
  shuttleStockError,
} from "./shuttles";

describe("computeShuttleStock", () => {
  it("cong don moi thay doi theo thu tu nao cung ra mot ket qua", () => {
    expect(computeShuttleStock([{ delta: 12 }, { delta: -3 }, { delta: -2 }])).toBe(7);
    expect(computeShuttleStock([{ delta: -2 }, { delta: 12 }, { delta: -3 }])).toBe(7);
  });

  it("kho trong la 0", () => {
    expect(computeShuttleStock([])).toBe(0);
  });
});

describe("shuttleDelta", () => {
  it("them thi cong, dung thi tru", () => {
    expect(shuttleDelta("add", 12, 5)).toBe(12);
    expect(shuttleDelta("use", 3, 5)).toBe(-3);
  });

  it("chot lai so cau la hieu so voi kho hien tai", () => {
    expect(shuttleDelta("set", 8, 5)).toBe(3);
    expect(shuttleDelta("set", 2, 5)).toBe(-3);
    expect(shuttleDelta("set", 5, 5)).toBe(0);
  });
});

describe("shuttleStockError", () => {
  it("khong cho kho am", () => {
    expect(shuttleStockError(-1)).toBe("shuttle_stock_negative");
    expect(shuttleStockError(0)).toBeNull();
  });

  it("khong cho vuot tran", () => {
    expect(shuttleStockError(MAX_SHUTTLE_STOCK)).toBeNull();
    expect(shuttleStockError(MAX_SHUTTLE_STOCK + 1)).toBe("shuttle_stock_too_large");
  });
});
