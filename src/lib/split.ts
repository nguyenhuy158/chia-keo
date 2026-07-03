import type { Game, ParticipantBalance, Settlement } from "../types";

function allocateAmount(amount: number, participantIds: string[]) {
  const base = Math.floor(amount / participantIds.length);
  const remainder = amount % participantIds.length;

  return participantIds.map((participantId, index) => ({
    participantId,
    amount: base + (index < remainder ? 1 : 0),
  }));
}

export function calculateBalances(game: Game): ParticipantBalance[] {
  const rows = game.participants.map((participant) => ({
    participant,
    paid: 0,
    owed: 0,
    balance: 0,
  }));

  const byId = new Map(rows.map((row) => [row.participant.id, row]));

  for (const expense of game.expenses) {
    const payer = byId.get(expense.payerId);
    if (!payer || expense.splitParticipantIds.length === 0) continue;

    payer.paid += expense.amount;

    for (const split of allocateAmount(expense.amount, expense.splitParticipantIds)) {
      const participant = byId.get(split.participantId);
      if (participant) {
        participant.owed += split.amount;
      }
    }
  }

  return rows.map((row) => ({
    ...row,
    balance: row.paid - row.owed,
  }));
}

export function calculateSettlements(balances: ParticipantBalance[]): Settlement[] {
  const debtors = balances
    .filter((row) => row.balance < 0)
    .map((row) => ({ participant: row.participant, amount: -row.balance }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = balances
    .filter((row) => row.balance > 0)
    .map((row) => ({ participant: row.participant, amount: row.balance }))
    .sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0) {
      settlements.push({
        from: debtor.participant,
        to: creditor.participant,
        amount,
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount === 0) debtorIndex += 1;
    if (creditor.amount === 0) creditorIndex += 1;
  }

  return settlements;
}
