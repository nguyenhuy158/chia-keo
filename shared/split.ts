export type SplitMode = "equal" | "shares" | "amount";

export type SplitShare = {
  participantId: string;
  amount: number;
};

export type WeightedShare = {
  participantId: string;
  weight: number;
};

export type ExpenseInput = {
  payerParticipantId: string;
  amount: number;
  shares: SplitShare[];
};

export type BalanceRow = {
  participantId: string;
  paid: number;
  owed: number;
  balance: number;
};

export type SettlementRow = {
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
};

/**
 * Chia `amount` cho danh sach nguoi tham gia. Phan du (neu tien le) duoc cong
 * lan luot cho cac nguoi dau danh sach de tong split luon bang tong tien goc.
 */
export function allocateAmount(amount: number, participantIds: string[]): SplitShare[] {
  if (participantIds.length === 0) return [];

  const base = Math.floor(amount / participantIds.length);
  const remainder = amount % participantIds.length;

  return participantIds.map((participantId, index) => ({
    participantId,
    amount: base + (index < remainder ? 1 : 0),
  }));
}

/**
 * Chia `amount` theo trong so (so phan) cua tung nguoi. Phan du sau khi lay
 * phan nguyen duoc cong lan luot cho cac nguoi dau danh sach, cung quy uoc
 * voi `allocateAmount` de tong split luon bang tong tien goc.
 */
export function allocateByWeights(amount: number, entries: WeightedShare[]): SplitShare[] {
  const validEntries = entries.filter((entry) => entry.weight > 0);
  if (validEntries.length === 0) return [];

  // Dung BigInt cho phep nhan de khong tran so khi amount va weight deu lon
  // (vi du chia lai theo ty le so tien cu).
  const totalWeight = validEntries.reduce((sum, entry) => sum + entry.weight, 0);
  const shares = validEntries.map((entry) => ({
    participantId: entry.participantId,
    amount: Number((BigInt(amount) * BigInt(entry.weight)) / BigInt(totalWeight)),
  }));

  let remainder = amount - shares.reduce((sum, share) => sum + share.amount, 0);
  for (let index = 0; remainder > 0; index = (index + 1) % shares.length) {
    shares[index].amount += 1;
    remainder -= 1;
  }

  return shares;
}

export function calculateBalances(
  participantIds: string[],
  expenses: ExpenseInput[],
): BalanceRow[] {
  const rows = participantIds.map((participantId) => ({
    participantId,
    paid: 0,
    owed: 0,
    balance: 0,
  }));
  const byId = new Map(rows.map((row) => [row.participantId, row]));

  for (const expense of expenses) {
    const payer = byId.get(expense.payerParticipantId);
    if (!payer || expense.shares.length === 0) continue;

    payer.paid += expense.amount;

    for (const share of expense.shares) {
      const participant = byId.get(share.participantId);
      if (participant) {
        participant.owed += share.amount;
      }
    }
  }

  return rows.map((row) => ({
    ...row,
    balance: row.paid - row.owed,
  }));
}

/**
 * Ghep nguoi no (balance am) voi nguoi nhan (balance duong) theo so tien giam
 * dan, moi lan chuyen so tien nho hon giua hai ben, den khi can bang het.
 */
export function calculateSettlements(balances: BalanceRow[]): SettlementRow[] {
  const debtors = balances
    .filter((row) => row.balance < 0)
    .map((row) => ({ participantId: row.participantId, amount: -row.balance }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = balances
    .filter((row) => row.balance > 0)
    .map((row) => ({ participantId: row.participantId, amount: row.balance }))
    .sort((a, b) => b.amount - a.amount);

  const settlements: SettlementRow[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0) {
      settlements.push({
        fromParticipantId: debtor.participantId,
        toParticipantId: creditor.participantId,
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
