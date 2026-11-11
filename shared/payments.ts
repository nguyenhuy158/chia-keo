import type { ApiSummary } from "./api-types";
import type { SettlementMode } from "./schemas";
import {
  calculateHostTransfers,
  resolveHostParticipantId,
  type SettlementRow,
} from "./split";

export const PAYMENT_CODE_PREFIX = "CK";
export const PAYMENT_CODE_SUFFIX_LENGTH = 8;
export const PAYMENT_CODE_PATTERN = new RegExp(
  `^${PAYMENT_CODE_PREFIX}[A-Z0-9]{${PAYMENT_CODE_SUFFIX_LENGTH}}$`,
);

export type PaymentStatus = "pending" | "paid";

export type PaymentItem = {
  participantId: string;
  amount: number;
};

export function listDueTransfers(
  summary: ApiSummary,
  settlementMode: SettlementMode,
  settlementHostId: string,
): SettlementRow[] {
  if (settlementMode === "off") return [];
  if (settlementMode === "p2p") return summary.settlements;

  const hostId = resolveHostParticipantId(
    summary.balances,
    settlementMode,
    settlementHostId,
  );
  return calculateHostTransfers(summary.balances, hostId)
    .filter((row) => row.toHost)
    .map((row) => ({
      fromParticipantId: row.participantId,
      toParticipantId: hostId,
      amount: row.amount,
    }));
}

export function sumPaymentItems(items: PaymentItem[]) {
  return items.reduce((total, item) => total + item.amount, 0);
}

export function samePaymentItems(left: PaymentItem[], right: PaymentItem[]) {
  const key = (items: PaymentItem[]) =>
    items
      .map((item) => `${item.participantId}:${item.amount}`)
      .sort()
      .join("|");
  return key(left) === key(right);
}
