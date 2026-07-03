import { formatMoney } from "../domain/money";
import { calculateBalances, calculateReceiptTotals, getRemainingPayable } from "../domain/split";
import type { Game } from "../domain/types";

export function createGameReportText(game: Game) {
  const totalExpense = game.expenses.reduce((total, expense) => total + expense.amount, 0);
  const balances = calculateBalances(game);
  const receiptTotals = calculateReceiptTotals(game);
  const lines = [
    `Chia kèo: ${game.name}`,
    `Mã: ${game.code}`,
    `Tổng chi: ${formatMoney(totalExpense)}`,
    `Số người: ${game.participants.length}`,
    `Số khoản chi: ${game.expenses.length}`,
    "",
    "Khoản chi:",
    ...game.expenses.map((expense) => `- ${expense.title}: ${formatMoney(expense.amount)}`),
    "",
    "Cân bằng:",
    ...balances.map((row) => {
      const collected = receiptTotals.get(row.participant.id) || 0;
      const remaining = getRemainingPayable(row.balance, collected);

      if (row.balance > 0) return `- ${row.participant.name}: nhận ${formatMoney(row.balance)}`;
      if (row.balance < 0) return `- ${row.participant.name}: còn trả ${formatMoney(remaining)}`;

      return `- ${row.participant.name}: đủ`;
    }),
  ];

  return lines.join("\n");
}
