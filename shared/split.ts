export type SplitMode = "equal" | "shares" | "amount";

export type SplitShare = {
  participantId: string;
  amount: number;
};

export type WeightedShare = {
  participantId: string;
  weight: number;
};

/** Mot dong split day du de luu: weight chi co nghia voi mode "shares". */
export type ComputedSplit = {
  participantId: string;
  amount: number;
  weight: number | null;
};

/** Gia tri nhap cho mode "shares" (so phan) hoac "amount" (so tien). */
export type SplitValueInput = {
  participantId: string;
  value: number;
};

/**
 * Ba loai ban ghi tien, giong Tricount:
 * - "expense": ai do ung tien, nhung nguoi trong split no lai
 * - "income": nhom nhan tien (hoan tien, thuong, ban do...), lam giam so no
 * - "transfer": mot nguoi tra no cho mot nguoi khac
 */
export const EXPENSE_KINDS = ["expense", "income", "transfer"] as const;
export type ExpenseKind = (typeof EXPENSE_KINDS)[number];

/**
 * Dau cua mot ban ghi khi vao balance. "income" la khoan chi dao nguoc: nguoi
 * nhan giu tien cua nhom (paid am), nhung nguoi duoc chia bot no (owed am).
 * Nho lam dau o day, moi ham chia tien ben tren van chi lam viec voi so duong.
 */
export function kindSign(kind: ExpenseKind | undefined) {
  return kind === "income" ? -1 : 1;
}

export type ExpenseInput = {
  payerParticipantId: string;
  amount: number;
  shares: SplitShare[];
  /** Bo trong hieu la "expense" (goi cu chi co mot loai). */
  kind?: ExpenseKind;
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

export const MAX_SPLIT_WEIGHT = 1000;

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

/**
 * Tinh danh sach dong split day du theo mode. Tra ve null khi input khong hop
 * le: khong co ai chia, trung nguoi, so phan qua lon, hoac tong tien tuy chinh
 * khong khop tong khoan chi.
 */
export function computeSplitRows(
  amount: number,
  mode: SplitMode,
  participantIds: string[],
  splits: SplitValueInput[],
): ComputedSplit[] | null {
  if (mode === "equal") {
    const ids = [...new Set(participantIds)];
    if (ids.length === 0) return null;
    return allocateAmount(amount, ids).map((share) => ({ ...share, weight: null }));
  }

  if (splits.length === 0) return null;
  if (new Set(splits.map((split) => split.participantId)).size !== splits.length) return null;

  if (mode === "shares") {
    if (splits.some((split) => split.value > MAX_SPLIT_WEIGHT)) return null;
    return allocateByWeights(
      amount,
      splits.map((split) => ({ participantId: split.participantId, weight: split.value })),
    ).map((share, index) => ({ ...share, weight: splits[index].value }));
  }

  const total = splits.reduce((sum, split) => sum + split.value, 0);
  if (total !== amount) return null;
  return splits.map((split) => ({
    participantId: split.participantId,
    amount: split.value,
    weight: null,
  }));
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

    const sign = kindSign(expense.kind);
    payer.paid += sign * expense.amount;

    for (const share of expense.shares) {
      const participant = byId.get(share.participantId);
      if (participant) {
        participant.owed += sign * share.amount;
      }
    }
  }

  return rows.map((row) => ({
    ...row,
    balance: row.paid - row.owed,
  }));
}

export type HostTransferRow = {
  participantId: string;
  amount: number;
  /** true: nguoi nay chuyen cho host; false: host tra lai nguoi nay. */
  toHost: boolean;
};

/**
 * Chon host la nguoi ung nhieu tien nhat. Hoa thi lay nguoi dung truoc trong
 * danh sach de ket qua on dinh giua cac lan goi.
 */
export function pickHostParticipantId(balances: BalanceRow[]): string {
  let host: BalanceRow | undefined;
  for (const row of balances) {
    if (!host || row.balance > host.balance) host = row;
  }

  return host?.participantId || "";
}

/**
 * Kieu gom mot dau moi: ai con thieu thi chuyen thang cho host, ai ung du thi
 * host tra lai. Doi lai nhieu luot chuyen hon P2P nhung chi can mot QR.
 */
export function calculateHostTransfers(
  balances: BalanceRow[],
  hostParticipantId: string,
): HostTransferRow[] {
  return balances
    .filter((row) => row.participantId !== hostParticipantId && row.balance !== 0)
    .map((row) => ({
      participantId: row.participantId,
      amount: Math.abs(row.balance),
      toHost: row.balance < 0,
    }))
    .sort((a, b) => b.amount - a.amount);
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
