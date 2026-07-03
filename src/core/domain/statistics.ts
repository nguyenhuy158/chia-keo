import { normalizeExpenseCategoryId, getExpenseCategoryLabel } from "./expense-categories";
import { calculateBalances } from "./split";
import type { ExpenseCategoryId, Game, Participant } from "./types";

export type GameStatistics = {
  averagePerParticipant: number;
  topPayer: {
    participant: Participant;
    amount: number;
  } | null;
  topCategory: {
    categoryId: ExpenseCategoryId;
    label: string;
    amount: number;
  } | null;
  transactionCount: number;
};

export function calculateGameStatistics(game: Game): GameStatistics {
  const balances = calculateBalances(game);
  const participantPaidTotals = new Map(game.participants.map((participant) => [participant.id, 0]));
  const categoryTotals = new Map<ExpenseCategoryId, number>();
  const totalExpense = game.expenses.reduce((total, expense) => total + expense.amount, 0);

  for (const expense of game.expenses) {
    participantPaidTotals.set(expense.payerId, (participantPaidTotals.get(expense.payerId) || 0) + expense.amount);
    const categoryId = normalizeExpenseCategoryId(expense.categoryId);
    categoryTotals.set(categoryId, (categoryTotals.get(categoryId) || 0) + expense.amount);
  }

  const topPayerEntry = Array.from(participantPaidTotals.entries()).sort((a, b) => b[1] - a[1])[0];
  const topCategoryEntry = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])[0];
  const topPayerParticipant = topPayerEntry
    ? game.participants.find((participant) => participant.id === topPayerEntry[0])
    : null;

  return {
    averagePerParticipant: game.participants.length > 0 ? Math.round(totalExpense / game.participants.length) : 0,
    topPayer:
      topPayerParticipant && topPayerEntry
        ? {
            participant: topPayerParticipant,
            amount: topPayerEntry[1],
          }
        : null,
    topCategory: topCategoryEntry
      ? {
          categoryId: topCategoryEntry[0],
          label: getExpenseCategoryLabel(topCategoryEntry[0]),
          amount: topCategoryEntry[1],
        }
      : null,
    transactionCount: balances.filter((row) => row.balance < 0).length,
  };
}
