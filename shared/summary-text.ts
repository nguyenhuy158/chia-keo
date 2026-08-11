import type { ApiExpense, ApiParticipant, ApiSummary } from "./api-types";
import type { SettlementMode } from "./schemas";
import {
  type BalanceRow,
  calculateHostTransfers,
  pickHostParticipantId,
  resolveHostParticipantId,
} from "./split";

export type { SettlementMode };

/**
 * "compact": ban goc, ngan de dan nhanh.
 * "detailed": moi nguoi kem so da ung va ket luan nhan lai / phai tra, phan
 * chuyen tien tach theo chieu. Dai hon nhung khong con canh nguoi ung tien
 * nhieu nhat lai hien mot con so trong giong het nguoi con no.
 */
export type SummaryVariant = "compact" | "detailed";

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
  /** Dau moi da chon; chi dung khi settlementMode la "pick". */
  settlementHostId?: string;
};

export type SummarySectionId = "expenses" | "people" | "settlements";

export type SummarySection = {
  id: SummarySectionId;
  heading: string;
  lines: string[];
  /** Nguoi ung voi tung dong (de ve avatar); undefined o dong tieu de nhom. */
  lineParticipantIds?: (string | undefined)[];
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
  /** Chi co o che do gom mot nguoi: nguoi nhan tien, chu nhan cua QR duy nhat. */
  hostParticipantId?: string;
};

/** 90000 -> "90", 8500 -> "8,5", 1043000 -> "1.043". Don vi nghin dong. */
export function formatThousands(value: number) {
  const scale = 10 ** SHORT_MONEY_FRACTION_DIGITS;
  return shortMoneyFormat.format(Math.round((value / THOUSAND) * scale) / scale);
}

export function formatShortMoney(value: number) {
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

/**
 * Phan chia tien cua mot khoan, viet nhu mot phep tinh nham kiem lai duoc:
 * - chia deu: "425/5 = 85k" (don vi nghin, chi ket qua mang chu "k")
 * - chia tuy chinh: "305k = 5 (Huy) + 200 (Kiet)" — moi nguoi mot muc nen khong
 *   dung dau chia, viet "305/3" o day la mot phep tinh sai
 * - dung mot nguoi: bo han phep chia, chia cho mot nguoi thi phep chia la rac
 */
function describeExpenseSplit(expense: ApiExpense, nameById: Map<string, string>) {
  const total = formatShortMoney(expense.amount);
  const splitCount = expense.splits.length;
  if (splitCount <= 1) return total;

  if (expense.splitMode !== "equal") {
    const shares = expense.splits
      .map(
        (split) =>
          `${formatThousands(split.amount)} (${nameById.get(split.participantId) || UNKNOWN_NAME})`,
      )
      .join(" + ");
    return `${total} = ${shares}`;
  }

  const perPerson = expense.amount / splitCount;
  return `${formatThousands(expense.amount)}/${splitCount} = ${formatShortMoney(perPerson)}`;
}

function buildExpenseLines(
  expenses: ApiExpense[],
  nameById: Map<string, string>,
  participantCount: number,
) {
  return expenses.map((expense, index) => {
    const splitCount = expense.splits.length;
    const payerName = nameById.get(expense.payerParticipantId) || UNKNOWN_NAME;
    const isWholeGroup = splitCount > 0 && splitCount === participantCount;
    const who = isWholeGroup
      ? "cả nhóm"
      : expense.splits.map((split) => nameById.get(split.participantId) || UNKNOWN_NAME).join(", ");

    // Nguoi tra nam ngay sau ten khoan: doc thanh "Lau bo Hong tra", dung thu tu
    // nguoi ta van noi, va khoi mot cum "· X tra" o cuoi dong.
    const parts = [
      `${index + 1}. ${expense.title} (${payerName} trả) — ${describeExpenseSplit(expense, nameById)}`,
    ];
    // Danh sach nguoi chia trong ngoac: tach han khoi phep tinh o truoc no.
    if (who) parts.push(`(${who})`);

    return parts.join(" · ");
  });
}

/**
 * Ket luan cua mot nguoi sau khi tru phan da ung. Thieu cau nay thi con so
 * "phai chiu" de bi doc thanh "phai chuyen", du nguoi ung tien la nguoi duoc
 * nhan lai chu khong phai tra them.
 */
function describeSettleState(row: BalanceRow | undefined) {
  if (!row) return "";
  if (row.balance > 0) {
    return `đã ứng ${formatShortMoney(row.paid)} → nhận lại ${formatShortMoney(row.balance)}`;
  }
  if (row.balance < 0) return `phải trả ${formatShortMoney(-row.balance)}`;

  return row.paid > 0 ? `đã ứng ${formatShortMoney(row.paid)} → vừa đủ` : "";
}

function buildPersonLines(
  participants: ApiParticipant[],
  expenses: ApiExpense[],
  summary: ApiSummary,
  variant: SummaryVariant,
) {
  const balanceByParticipantId = new Map(
    summary.balances.map((balance) => [balance.participantId, balance]),
  );

  return participants.map((participant) => {
    const terms: string[] = [];
    for (const expense of expenses) {
      const share = expense.splits.find((row) => row.participantId === participant.id);
      if (share && share.amount > 0) terms.push(formatThousands(share.amount));
    }

    const row = balanceByParticipantId.get(participant.id);
    const owed = row?.owed || 0;
    const head =
      terms.length === 0
        ? `- ${participant.name}: 0k`
        : `- ${participant.name}: ${terms.join(" + ")} = ${formatShortMoney(owed)}`;

    if (variant !== "detailed") return head;

    const settleState = describeSettleState(row);

    return settleState ? `${head} · ${settleState}` : head;
  });
}

function buildSettlementLines(summary: ApiSummary, nameById: Map<string, string>) {
  const lines = summary.settlements.map((settlement) => {
    const from = nameById.get(settlement.fromParticipantId) || UNKNOWN_NAME;
    const to = nameById.get(settlement.toParticipantId) || UNKNOWN_NAME;
    return `- ${from} → ${to}: ${formatShortMoney(settlement.amount)}`;
  });
  const participantIds = summary.settlements.map((settlement) => settlement.fromParticipantId);
  return { lines, participantIds };
}

/**
 * Ban goc: mot danh sach phang, da sort theo so tien giam dan nen dong "host tra
 * lai" hay chen vao giua nhung dong chuyen vao.
 */
function buildFlatHostLines(
  transfers: ReturnType<typeof calculateHostTransfers>,
  hostName: string,
  nameById: Map<string, string>,
) {
  const lines = transfers.map((transfer) => {
    const name = nameById.get(transfer.participantId) || UNKNOWN_NAME;
    const amount = formatShortMoney(transfer.amount);
    return transfer.toHost
      ? `- ${name} → ${hostName}: ${amount}`
      : `- ${hostName} → ${name}: ${amount}`;
  });
  const participantIds = transfers.map((transfer) => transfer.participantId);
  return { lines, participantIds };
}

/**
 * Ban chi tiet: tach hai chieu ra hai nhom co tieu de rieng, kem tong tien vao
 * va ly do host phai tra lai (nguoi do cung da ung tien).
 */
function buildGroupedHostLines(
  transfers: ReturnType<typeof calculateHostTransfers>,
  hostName: string,
  nameById: Map<string, string>,
  paidById: Map<string, number>,
) {
  const lines: string[] = [];
  const participantIds: (string | undefined)[] = [];
  const incoming = transfers.filter((transfer) => transfer.toHost);
  const outgoing = transfers.filter((transfer) => !transfer.toHost);

  if (incoming.length > 0) {
    const total = incoming.reduce((sum, transfer) => sum + transfer.amount, 0);
    lines.push(`Chuyển vào ${hostName} — tổng ${formatShortMoney(total)}:`);
    participantIds.push(undefined);
    for (const transfer of incoming) {
      const name = nameById.get(transfer.participantId) || UNKNOWN_NAME;
      lines.push(`- ${name} → ${hostName}: ${formatShortMoney(transfer.amount)}`);
      participantIds.push(transfer.participantId);
    }
  }

  if (outgoing.length > 0) {
    lines.push(`${hostName} chuyển ra:`);
    participantIds.push(undefined);
    for (const transfer of outgoing) {
      const name = nameById.get(transfer.participantId) || UNKNOWN_NAME;
      const paid = paidById.get(transfer.participantId) || 0;
      const reason = paid > 0 ? ` (${name} đã ứng ${formatShortMoney(paid)})` : "";
      lines.push(`- ${hostName} → ${name}: ${formatShortMoney(transfer.amount)}${reason}`);
      participantIds.push(transfer.participantId);
    }
  }

  return { lines, participantIds };
}

function buildHostSection(
  summary: ApiSummary,
  nameById: Map<string, string>,
  variant: SummaryVariant,
  hostParticipantId: string,
): { section: SummarySection; hostParticipantId: string } | null {
  const transfers = calculateHostTransfers(summary.balances, hostParticipantId);
  if (!hostParticipantId || transfers.length === 0) return null;

  const hostName = nameById.get(hostParticipantId) || UNKNOWN_NAME;
  const detailed = variant === "detailed";
  const paidById = new Map(summary.balances.map((row) => [row.participantId, row.paid]));
  const { lines, participantIds } = detailed
    ? buildGroupedHostLines(transfers, hostName, nameById, paidById)
    : buildFlatHostLines(transfers, hostName, nameById);

  return {
    hostParticipantId,
    section: {
      id: "settlements",
      // Chi khoe "ung nhieu nhat" khi dung the that; che do "pick" co the chon
      // nguoi khac lam dau moi.
      heading: detailed
        ? `GOM VỀ ${hostName.toUpperCase()} (${
            hostParticipantId === pickHostParticipantId(summary.balances)
              ? `${hostName} ứng nhiều nhất, cả nhóm quét 1 QR`
              : "cả nhóm quét 1 QR"
          })`
        : `GOM VỀ ${hostName.toUpperCase()}`,
      lines,
      lineParticipantIds: participantIds,
    },
  };
}

export function buildSummaryDocument(
  input: SummaryTextInput,
  variant: SummaryVariant = "compact",
): SummaryDocument {
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
      heading: variant === "detailed" ? "TỪNG NGƯỜI (phần phải chịu)" : "TỪNG NGƯỜI",
      lines: buildPersonLines(participants, expenses, summary, variant),
    });
  }

  let hostParticipantId: string | undefined;

  if (input.settlementMode === "host" || input.settlementMode === "pick") {
    const host = buildHostSection(
      summary,
      nameById,
      variant,
      resolveHostParticipantId(summary.balances, input.settlementMode, input.settlementHostId),
    );
    if (host) {
      sections.push(host.section);
      hostParticipantId = host.hostParticipantId;
    }
  } else if (input.settlementMode !== "off") {
    const { lines: settlementLines, participantIds } = buildSettlementLines(summary, nameById);
    if (settlementLines.length > 0) {
      sections.push({
        id: "settlements",
        heading: "CẦN CHUYỂN",
        lines: settlementLines,
        lineParticipantIds: participantIds,
      });
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
export function buildSummaryText(
  input: SummaryTextInput,
  variant: SummaryVariant = "compact",
): string {
  const doc = buildSummaryDocument(input, variant);

  const blocks = [`${doc.title} · ${doc.subtitle}`];
  for (const section of doc.sections) {
    blocks.push([section.heading, ...section.lines].join("\n"));
  }
  if (doc.footer) blocks.push(doc.footer);

  return blocks.join("\n\n");
}
