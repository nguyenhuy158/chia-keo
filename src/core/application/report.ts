import { formatMoney } from "../domain/money";
import { calculateBalances, calculateReceiptTotals, getRemainingPayable } from "../domain/split";
import type { Game } from "../domain/types";
import { REPORT_TEXT } from "./report-messages";

function formatExpenseDateTime(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return REPORT_TEXT.unknownDate;

  return date.toLocaleString("vi-VN");
}

export function createGameReportText(game: Game) {
  const totalExpense = game.expenses.reduce((total, expense) => total + expense.amount, 0);
  const balances = calculateBalances(game);
  const receiptTotals = calculateReceiptTotals(game);
  const lines = [
    REPORT_TEXT.gameName(game.name),
    REPORT_TEXT.gameCode(game.code),
    REPORT_TEXT.totalExpense(formatMoney(totalExpense)),
    REPORT_TEXT.participantCount(game.participants.length),
    REPORT_TEXT.expenseCount(game.expenses.length),
    "",
    REPORT_TEXT.expensesTitle,
    ...game.expenses.map(
      (expense) => `- ${formatExpenseDateTime(expense.createdAt)} - ${expense.title}: ${formatMoney(expense.amount)}`,
    ),
    "",
    REPORT_TEXT.balancesTitle,
    ...balances.map((row) => {
      const collected = receiptTotals.get(row.participant.id) || 0;
      const remaining = getRemainingPayable(row.balance, collected);

      if (row.balance > 0) return REPORT_TEXT.receive(row.participant.name, formatMoney(row.balance));
      if (row.balance < 0) return REPORT_TEXT.pay(row.participant.name, formatMoney(remaining));

      return REPORT_TEXT.settled(row.participant.name);
    }),
  ];

  return lines.join("\n");
}
