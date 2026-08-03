import type { ApiExpense, ApiParticipant, ApiSummary } from "./api-types";
import type { SettlementMode } from "./schemas";
import { calculateHostTransfers, pickHostParticipantId } from "./split";

export type { SettlementMode };

const THOUSAND = 1000;
const SHORT_MONEY_FRACTION_DIGITS = 1;
const UNKNOWN_NAME = "Không rõ";
const EMPTY_EXPENSES_LINE = "Chưa có khoản chi nào.";

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
  settlementMode?: SettlementMode;
};

export type SummarySectionId = "expenses" | "people" | "settlements";

export type SummarySection = {
  id: SummarySectionId;
  heading: string;
  lines: string[];
};

/**
 * Ban tom tat da tach san thanh tung phan, de text va anh cung dung mot noi
 * dung nhung render theo cach rieng.
 */
export type SummaryDocument = {
  title: string;
  subtitle: string;
  sections: SummarySection[];
  footer?: string;
  /** Chi co o che do "host": nguoi nhan tien, tuc chu nhan cua QR duy nhat. */
  hostParticipantId?: string;
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
 * khi di tu khoan cu nhat. Khoan tra no (kind "transfer") da phan anh vao
 * balance nen khong liet ke chung voi cac khoan chi.
 */
function toListedExpenses(expenses: ApiExpense[]) {
  return expenses.filter((expense) => expense.kind !== "transfer").reverse();
}

function buildExpenseLines(
  expenses: ApiExpense[],
  nameById: Map<string, string>,
  participantCount: number,
) {
  return expenses.map((expense, index) => {
    const splitCount = expense.splits.length;
    const perPerson = splitCount > 0 ? expense.amount / splitCount : 0;
    const payerName = nameById.get(expense.payerParticipantId) || UNKNOWN_NAME;
    const isWholeGroup = splitCount > 0 && splitCount === participantCount;
    const who = isWholeGroup
      ? "cả nhóm"
      : expense.splits.map((split) => nameById.get(split.participantId) || UNKNOWN_NAME).join(", ");

    const perPersonLabel =
      expense.splitMode === "equal" ? formatShortMoney(perPerson) : "chia tùy chỉnh";
    const parts = [
      `${index + 1}. ${expense.title} — ${formatShortMoney(expense.amount)}`,
      `${splitCount} người = ${perPersonLabel}`,
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
      const share = expense.splits.find((row) => row.participantId === participant.id);
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

function buildHostSection(
  summary: ApiSummary,
  nameById: Map<string, string>,
): { section: SummarySection; hostParticipantId: string } | null {
  const hostParticipantId = pickHostParticipantId(summary.balances);
  const transfers = calculateHostTransfers(summary.balances, hostParticipantId);
  if (!hostParticipantId || transfers.length === 0) return null;

  const hostName = nameById.get(hostParticipantId) || UNKNOWN_NAME;
  const lines = transfers.map((transfer) => {
    const name = nameById.get(transfer.participantId) || UNKNOWN_NAME;
    const amount = formatShortMoney(transfer.amount);
    return transfer.toHost
      ? `- ${name} → ${hostName}: ${amount}`
      : `- ${hostName} trả lại ${name}: ${amount}`;
  });

  return {
    hostParticipantId,
    section: { id: "settlements", heading: `GOM VỀ ${hostName.toUpperCase()}`, lines },
  };
}

export function buildSummaryDocument(input: SummaryTextInput): SummaryDocument {
  const { code, name, participants, summary, shareUrl } = input;
  const expenses = toListedExpenses(input.expenses);
  const nameById = new Map(participants.map((participant) => [participant.id, participant.name]));

  const sections: SummarySection[] = [
    {
      id: "expenses",
      heading:
        expenses.length > 0
          ? `CÁC KHOẢN CHI (${expenses.length} khoản · tổng ${formatShortMoney(summary.totalExpense)})`
          : "CÁC KHOẢN CHI",
      lines:
        expenses.length > 0
          ? buildExpenseLines(expenses, nameById, participants.length)
          : [EMPTY_EXPENSES_LINE],
    },
  ];

  if (participants.length > 0) {
    sections.push({
      id: "people",
      heading: "TỪNG NGƯỜI",
      lines: buildPersonLines(participants, expenses, summary),
    });
  }

  let hostParticipantId: string | undefined;

  if (input.settlementMode === "host") {
    const host = buildHostSection(summary, nameById);
    if (host) {
      sections.push(host.section);
      hostParticipantId = host.hostParticipantId;
    }
  } else if (input.settlementMode !== "off") {
    const settlementLines = buildSettlementLines(summary, nameById);
    if (settlementLines.length > 0) {
      sections.push({ id: "settlements", heading: "CẦN CHUYỂN", lines: settlementLines });
    }
  }

  return {
    title: name,
    subtitle: code,
    sections,
    footer: shareUrl ? `Chi tiết: ${shareUrl}` : undefined,
    hostParticipantId,
  };
}

/**
 * Dung ban tom tat dang text de dan thang vao Zalo/Messenger: liet ke tung
 * khoan chi kem so nguoi chia, roi den phan cua tung nguoi va link xem chi tiet.
 */
export function buildSummaryText(input: SummaryTextInput): string {
  const doc = buildSummaryDocument(input);

  const blocks = [`${doc.title} · ${doc.subtitle}`];
  for (const section of doc.sections) {
    blocks.push([section.heading, ...section.lines].join("\n"));
  }
  if (doc.footer) blocks.push(doc.footer);

  return blocks.join("\n\n");
}
