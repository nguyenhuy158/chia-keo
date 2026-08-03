import type { ApiExpense, ApiParticipant, ApiSummary } from "./api-types";

const THOUSAND = 1000;
const SHORT_MONEY_FRACTION_DIGITS = 1;
const UNKNOWN_NAME = "Không rõ";

const shortMoneyFormat = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: SHORT_MONEY_FRACTION_DIGITS,
});

export type SummaryTextInput = {
  code: string;
  name: string;
  participants: ApiParticipant[];
  expenses: ApiExpense[];
  summary: ApiSummary;
  /** Link xem chi tiet, bo qua neu cuoc choi chua bat share. */
  shareUrl?: string;
};

/** 90000 -> "90", 8500 -> "8,5", 1043000 -> "1.043". Don vi nghin dong. */
export function formatThousands(value: number) {
  const scale = 10 ** SHORT_MONEY_FRACTION_DIGITS;
  return shortMoneyFormat.format(Math.round((value / THOUSAND) * scale) / scale);
}

function formatShortMoney(value: number) {
  return `${formatThousands(value)}k`;
}

/**
 * Expense list tu API sap xep moi nhat truoc; doc bang chu thi de theo doi hon
 * khi di tu khoan cu nhat.
 */
function toChronologicalOrder(expenses: ApiExpense[]) {
  return [...expenses].reverse();
}

function buildExpenseLines(
  expenses: ApiExpense[],
  nameById: Map<string, string>,
  participantCount: number,
) {
  return expenses.map((expense, index) => {
    const splitCount = expense.splitParticipantIds.length;
    const perPerson = splitCount > 0 ? expense.amount / splitCount : 0;
    const payerName = nameById.get(expense.payerParticipantId) || UNKNOWN_NAME;
    const isWholeGroup = splitCount > 0 && splitCount === participantCount;
    const who = isWholeGroup
      ? "cả nhóm"
      : expense.splitParticipantIds.map((id) => nameById.get(id) || UNKNOWN_NAME).join(", ");

    const parts = [
      `${index + 1}. ${expense.title} — ${formatShortMoney(expense.amount)}`,
      `${splitCount} người = ${formatShortMoney(perPerson)}`,
    ];
    if (who) parts.push(who);
    parts.push(`${payerName} trả`);

    return parts.join(" · ");
  });
}

function buildPersonLines(
  participants: ApiParticipant[],
  expenses: ApiExpense[],
  summary: ApiSummary,
) {
  const owedByParticipantId = new Map(
    summary.balances.map((balance) => [balance.participantId, balance.owed]),
  );

  return participants.map((participant) => {
    const terms: string[] = [];
    for (const expense of expenses) {
      const share = expense.shares.find((row) => row.participantId === participant.id);
      if (share && share.amount > 0) terms.push(formatThousands(share.amount));
    }

    const owed = owedByParticipantId.get(participant.id) || 0;
    if (terms.length === 0) return `- ${participant.name}: 0k`;

    return `- ${participant.name}: ${terms.join(" + ")} = ${formatShortMoney(owed)}`;
  });
}

function buildSettlementLines(summary: ApiSummary, nameById: Map<string, string>) {
  return summary.settlements.map((settlement) => {
    const from = nameById.get(settlement.fromParticipantId) || UNKNOWN_NAME;
    const to = nameById.get(settlement.toParticipantId) || UNKNOWN_NAME;
    return `- ${from} → ${to}: ${formatShortMoney(settlement.amount)}`;
  });
}

/**
 * Dung ban tom tat dang text de dan thang vao Zalo/Messenger: liet ke tung
 * khoan chi kem so nguoi chia, roi den phan cua tung nguoi va link xem chi tiet.
 */
export function buildSummaryText(input: SummaryTextInput): string {
  const { code, name, participants, summary, shareUrl } = input;
  const expenses = toChronologicalOrder(input.expenses);
  const nameById = new Map(participants.map((participant) => [participant.id, participant.name]));

  const blocks: string[] = [`${name} · ${code}`];

  if (expenses.length > 0) {
    const header = `CÁC KHOẢN CHI (${expenses.length} khoản · tổng ${formatShortMoney(summary.totalExpense)})`;
    blocks.push(
      [header, ...buildExpenseLines(expenses, nameById, participants.length)].join("\n"),
    );
  } else {
    blocks.push("Chưa có khoản chi nào.");
  }

  if (participants.length > 0) {
    blocks.push(["TỪNG NGƯỜI", ...buildPersonLines(participants, expenses, summary)].join("\n"));
  }

  const settlementLines = buildSettlementLines(summary, nameById);
  if (settlementLines.length > 0) {
    blocks.push(["CẦN CHUYỂN", ...settlementLines].join("\n"));
  }

  if (shareUrl) blocks.push(`Chi tiết: ${shareUrl}`);

  return blocks.join("\n\n");
}
