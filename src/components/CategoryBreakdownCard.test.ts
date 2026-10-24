import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ApiExpense } from "../../shared/api-types";
import { CategoryBreakdownCard } from "./CategoryBreakdownCard";

function expense(
  category: string,
  amount: number,
  kind = "expense",
): ApiExpense {
  return { category, amount, kind } as ApiExpense;
}

describe("CategoryBreakdownCard", () => {
  it("không hiển thị thẻ rỗng khi chỉ có khoản thu", () => {
    const html = renderToStaticMarkup(
      createElement(CategoryBreakdownCard, {
        expenses: [expense("food", 1000, "income")],
      }),
    );

    expect(html).toBe("");
  });

  it("hiển thị nhóm chi cùng tỷ lệ có nhãn cho người dùng", () => {
    const html = renderToStaticMarkup(
      createElement(CategoryBreakdownCard, {
        expenses: [
          expense("food", 100),
          expense("transport", 9900),
          expense("", 200),
        ],
      }),
    );

    expect(html).toContain("Chi theo danh mục");
    expect(html).toContain('aria-label="Ăn uống: 1% tổng chi"');
    expect(html).toContain('style="width:2%"');
    expect(html).toContain("Chưa phân loại");
    expect(html).toContain("không tính khoản thu và trả nợ");
  });
});
