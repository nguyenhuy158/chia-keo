import type { ExpenseCategoryId } from "./types";

export type ExpenseCategory = {
  id: ExpenseCategoryId;
  label: string;
};

export const DEFAULT_EXPENSE_CATEGORY_ID: ExpenseCategoryId = "other";
export const EXPENSE_CATEGORY_IDS = [
  "food",
  "transport",
  "lodging",
  "shopping",
  "entertainment",
  "other",
] as const satisfies readonly ExpenseCategoryId[];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: "food", label: "Ăn uống" },
  { id: "transport", label: "Di chuyển" },
  { id: "lodging", label: "Lưu trú" },
  { id: "shopping", label: "Mua sắm" },
  { id: "entertainment", label: "Giải trí" },
  { id: "other", label: "Khác" },
];

export function normalizeExpenseCategoryId(categoryId?: string): ExpenseCategoryId {
  const category = EXPENSE_CATEGORIES.find((item) => item.id === categoryId);

  return category?.id || DEFAULT_EXPENSE_CATEGORY_ID;
}

export function getExpenseCategoryLabel(categoryId?: string) {
  return EXPENSE_CATEGORIES.find((category) => category.id === categoryId)?.label || "Khác";
}
