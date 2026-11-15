import { buildCategoryBreakdown } from "./expense-categories";

const VN_UTC_OFFSET_MS = 7 * 3_600_000;
const MONTH_KEY_LENGTH = 7;
const EXPENSE_KIND = "expense";
const CSV_BOM = "\uFEFF";
const CSV_LINE_BREAK = "\r\n";
const CSV_FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

export const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
export const ALL_MONTHS = "";

export const CSV_HEADER = ["Nhóm", "Tên", "Số tiền (VND)"];
export const CSV_GROUP_TOTAL = "Tổng chi";
export const CSV_GROUP_CATEGORY = "Danh mục";
export const CSV_GROUP_PAID = "Người đã chi";
export const CSV_GROUP_SHARE = "Người phải chịu";

export function monthKeyOf(iso: string) {
  return new Date(Date.parse(iso) + VN_UTC_OFFSET_MS)
    .toISOString()
    .slice(0, MONTH_KEY_LENGTH);
}

export function listMonthKeys(closedAtList: (string | null)[]) {
  const keys = new Set<string>();
  for (const closedAt of closedAtList) {
    if (closedAt) keys.add(monthKeyOf(closedAt));
  }
  return [...keys].sort().reverse();
}

export function filterByMonth<T extends { closedAt: string | null }>(
  games: T[],
  month: string,
) {
  if (month === ALL_MONTHS) return games;
  return games.filter(
    (game) => game.closedAt && monthKeyOf(game.closedAt) === month,
  );
}

export function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-");
  return `${monthNumber}/${year}`;
}

export type ReportExpense = {
  id: string;
  kind: string;
  category: string;
  amount: number;
  payerParticipantId: string;
};

export type ReportSplit = {
  expenseId: string;
  participantId: string;
  amount: number;
};

export type ReportParticipant = { id: string; name: string };

function csvCell(value: string | number) {
  let text = String(value);
  if (
    typeof value === "string" &&
    CSV_FORMULA_PREFIXES.some((prefix) => text.startsWith(prefix))
  ) {
    text = `'${text}`;
  }
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function sumByName(
  amounts: Map<string, number>,
  participantNames: Map<string, string>,
) {
  const totals = new Map<string, number>();
  for (const [participantId, amount] of amounts) {
    const name = participantNames.get(participantId)?.trim() || participantId;
    totals.set(name, (totals.get(name) || 0) + amount);
  }
  return [...totals.entries()].sort(
    (left, right) =>
      right[1] - left[1] || left[0].localeCompare(right[0], "vi"),
  );
}

export function buildMonthlyCsv(
  expenses: ReportExpense[],
  splits: ReportSplit[],
  participants: ReportParticipant[],
) {
  const spending = expenses.filter((row) => row.kind === EXPENSE_KIND);
  const spendingIds = new Set(spending.map((row) => row.id));
  const participantNames = new Map(
    participants.map((row) => [row.id, row.name]),
  );

  const paid = new Map<string, number>();
  for (const row of spending) {
    paid.set(
      row.payerParticipantId,
      (paid.get(row.payerParticipantId) || 0) + row.amount,
    );
  }
  const shares = new Map<string, number>();
  for (const row of splits) {
    if (!spendingIds.has(row.expenseId)) continue;
    shares.set(
      row.participantId,
      (shares.get(row.participantId) || 0) + row.amount,
    );
  }

  const breakdown = buildCategoryBreakdown(spending);
  const rows: (string | number)[][] = [
    CSV_HEADER,
    [CSV_GROUP_TOTAL, "", breakdown.total],
    ...breakdown.rows.map((row) => [CSV_GROUP_CATEGORY, row.label, row.total]),
    ...sumByName(paid, participantNames).map(([name, amount]) => [
      CSV_GROUP_PAID,
      name,
      amount,
    ]),
    ...sumByName(shares, participantNames).map(([name, amount]) => [
      CSV_GROUP_SHARE,
      name,
      amount,
    ]),
  ];

  return (
    CSV_BOM +
    rows.map((row) => row.map(csvCell).join(",")).join(CSV_LINE_BREAK) +
    CSV_LINE_BREAK
  );
}
