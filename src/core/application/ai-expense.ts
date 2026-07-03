import { DEFAULT_EXPENSE_CATEGORY_ID, normalizeExpenseCategoryId } from "../domain/expense-categories";
import type { ExpenseCategoryId } from "../domain/types";

export type AiExpenseDraft = {
  title: string;
  amount: number;
  categoryId: ExpenseCategoryId;
  payerName: string;
  splitNames: string[];
  note: string;
  confidence: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);

  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value) ? value.flatMap((item) => (typeof item === "string" ? [item.trim()] : [])) : [];
}

export function parseAiExpenseDraft(value: unknown): AiExpenseDraft {
  if (!isRecord(value)) {
    return {
      title: "",
      amount: 0,
      categoryId: DEFAULT_EXPENSE_CATEGORY_ID,
      payerName: "",
      splitNames: [],
      note: "",
      confidence: 0,
    };
  }

  const confidence = Number(value.confidence);

  return {
    title: stringValue(value.title),
    amount: numberValue(value.amount),
    categoryId: normalizeExpenseCategoryId(stringValue(value.categoryId)),
    payerName: stringValue(value.payerName),
    splitNames: stringArrayValue(value.splitNames),
    note: stringValue(value.note),
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
  };
}
