import { describe, expect, it } from "vitest";
import {
  buildCategoryBreakdown,
  categoryLabel,
  normalizeCategory,
  UNCATEGORIZED_LABEL,
} from "./expense-categories";

function expense(category: string, amount: number, kind = "expense") {
  return { kind, amount, category };
}

describe("normalizeCategory", () => {
  it("giu lai danh muc hop le", () => {
    expect(normalizeCategory("food")).toBe("food");
  });

  it("coi danh muc la / rong / null la chua phan loai", () => {
    expect(normalizeCategory("khong-co-that")).toBe("");
    expect(normalizeCategory("")).toBe("");
    expect(normalizeCategory(null)).toBe("");
    expect(normalizeCategory(undefined)).toBe("");
  });

  it("nhan nhan tieng Viet cho danh muc, mac dinh la chua phan loai", () => {
    expect(categoryLabel("transport")).toBe("Đi lại");
    expect(categoryLabel("")).toBe(UNCATEGORIZED_LABEL);
  });
});

describe("buildCategoryBreakdown", () => {
  it("gop tien theo danh muc va tinh phan tram", () => {
    const result = buildCategoryBreakdown([
      expense("food", 60_000),
      expense("food", 40_000),
      expense("transport", 100_000),
    ]);

    expect(result.total).toBe(200_000);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ category: "food", total: 100_000, count: 2, percent: 50 });
    expect(result.rows[1]).toMatchObject({ category: "transport", total: 100_000, percent: 50 });
  });

  it("bo qua khoan thu va khoan tra no", () => {
    const result = buildCategoryBreakdown([
      expense("food", 100_000),
      expense("food", 500_000, "income"),
      expense("food", 700_000, "transfer"),
    ]);

    expect(result.total).toBe(100_000);
    expect(result.rows[0]).toMatchObject({ total: 100_000, count: 1, percent: 100 });
  });

  it("day nhom chua phan loai xuong cuoi du no lon nhat", () => {
    const result = buildCategoryBreakdown([
      expense("", 900_000),
      expense("food", 100_000),
      expense("khong-co-that", 50_000),
    ]);

    expect(result.rows.map((row) => row.category)).toEqual(["food", ""]);
    // Danh muc la gop chung vao nhom chua phan loai chu khong thanh nhom rieng.
    expect(result.rows[1]).toMatchObject({ total: 950_000, count: 2, label: UNCATEGORIZED_LABEL });
  });

  it("giu nhom chua phan loai o cuoi khi no duoc nhap sau cac nhom khac", () => {
    const result = buildCategoryBreakdown([
      expense("food", 10_000),
      expense("", 50_000),
      expense("transport", 30_000),
    ]);

    expect(result.rows.map((row) => row.category)).toEqual(["transport", "food", ""]);
  });

  it("khong hien phan tram duong khi du lieu chi phi am lam tong khong duong", () => {
    const result = buildCategoryBreakdown([expense("food", 100), expense("transport", -200)]);

    expect(result.total).toBe(-100);
    expect(result.rows[0].percent).toBe(0);
  });

  it("khong co khoan chi nao thi tra ve rong, khong chia cho 0", () => {
    expect(buildCategoryBreakdown([])).toEqual({ total: 0, rows: [] });
    expect(buildCategoryBreakdown([expense("food", 1000, "transfer")])).toEqual({
      total: 0,
      rows: [],
    });
  });
});
