import type { ApiExpense, ApiParticipant, ApiSummary } from "./api-types";

export const SHEET_PAID_LABEL = "Đã chi";
export const SHEET_TOTAL_LABEL = "Tổng";
export const SHEET_AMOUNT_HEADER = "Số tiền ";
export const SHEET_COUNT_HEADER = "Người";
export const SHEET_FIRST_PERSON_COLUMN = 5;
export const SHEET_FIRST_EXPENSE_ROW = 4;
const EQUAL_SPLIT_MODE = "equal";
const TRANSFER_KIND = "transfer";

export type ExpenseSheetRow = {
  title: string;
  amount: number;
  count: number;
  perPerson: number;
  isEqual: boolean;
  included: boolean[];
};

export type ExpenseSheetModel = {
  names: string[];
  paid: number[];
  owed: number[];
  rows: ExpenseSheetRow[];
};

export type ExpenseSheetInput = {
  participants: ApiParticipant[];
  expenses: ApiExpense[];
  summary: ApiSummary;
};

export function buildExpenseSheetModel(
  input: ExpenseSheetInput,
): ExpenseSheetModel {
  const { participants, expenses, summary } = input;
  const balanceById = new Map(
    summary.balances.map((row) => [row.participantId, row]),
  );

  const rows = [...expenses]
    .reverse()
    .filter((expense) => expense.kind !== TRANSFER_KIND && !expense.excluded)
    .map((expense): ExpenseSheetRow => {
      const members = new Set(expense.splitParticipantIds);
      const count = members.size;
      return {
        title: expense.title,
        amount: expense.amount,
        count,
        perPerson: count > 0 ? expense.amount / count : 0,
        isEqual: expense.splitMode === EQUAL_SPLIT_MODE,
        included: participants.map((person) => members.has(person.id)),
      };
    });

  return {
    names: participants.map((person) => person.name),
    paid: participants.map((p) => balanceById.get(p.id)?.paid ?? 0),
    owed: participants.map((p) => balanceById.get(p.id)?.owed ?? 0),
    rows,
  };
}

export function buildExpenseSheetFileName(gameName: string, code: string) {
  const safe = gameName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${safe || code}.xlsx`;
}
