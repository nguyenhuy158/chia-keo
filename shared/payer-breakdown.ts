import type { ApiExpense, ApiParticipant } from "./api-types";

const EXPENSE_KIND = "expense";
export const UNKNOWN_PAYER_NAME = "Người đã xóa";

export type PayerExpenseRow = {
  id: string;
  title: string;
  amount: number;
};

export type PayerBreakdownRow = {
  participantId: string;
  name: string;
  count: number;
  total: number;
  percent: number;
  expenses: PayerExpenseRow[];
};

export type PayerBreakdown = {
  total: number;
  count: number;
  rows: PayerBreakdownRow[];
};

type PayerExpenseInput = Pick<
  ApiExpense,
  "id" | "kind" | "title" | "amount" | "payerParticipantId" | "excluded"
>;

/**
 * Ai da tra nhung khoan nao: gom khoan chi theo nguoi tra, nhieu tien nhat
 * truoc. Chi tinh khoan chi (khong tinh khoan thu, tra no, khoan da loai) de
 * cung mot tong voi "Chi theo danh muc". Trong moi nguoi, khoan lon xep truoc.
 */
export function buildPayerBreakdown(
  expenses: PayerExpenseInput[],
  participants: Pick<ApiParticipant, "id" | "name">[],
): PayerBreakdown {
  const order = new Map(
    participants.map((person, index) => [person.id, index]),
  );
  const nameById = new Map(
    participants.map((person) => [person.id, person.name]),
  );
  const byPayer = new Map<string, PayerExpenseRow[]>();
  let total = 0;
  let count = 0;

  for (const row of expenses) {
    if (row.kind !== EXPENSE_KIND || row.excluded) continue;
    const list = byPayer.get(row.payerParticipantId) || [];
    list.push({ id: row.id, title: row.title, amount: row.amount });
    byPayer.set(row.payerParticipantId, list);
    total += row.amount;
    count += 1;
  }

  const rows = [...byPayer.entries()]
    .map(([participantId, list]): PayerBreakdownRow => {
      const payerTotal = list.reduce((sum, item) => sum + item.amount, 0);
      return {
        participantId,
        name: nameById.get(participantId) || UNKNOWN_PAYER_NAME,
        count: list.length,
        total: payerTotal,
        percent: total > 0 ? Math.round((payerTotal / total) * 100) : 0,
        expenses: [...list].sort((left, right) => right.amount - left.amount),
      };
    })
    .sort((left, right) => {
      if (right.total !== left.total) return right.total - left.total;
      return (
        (order.get(left.participantId) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(right.participantId) ?? Number.MAX_SAFE_INTEGER)
      );
    });

  return { total, count, rows };
}
