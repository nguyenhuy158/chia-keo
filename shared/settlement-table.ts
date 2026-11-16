import type { ApiParticipant, ApiSummary } from "./api-types";
import { calculateHostTransfers, resolveHostParticipantId } from "./split";

const MONEY_FORMAT = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});
const TSV_CELL_SEPARATOR = "\t";
const TSV_ROW_SEPARATOR = "\n";
const TSV_UNSAFE_CHARACTERS = /[\t\r\n]+/g;
const NAME_HEADER = "Người";
const OWED_HEADER = "Phải chịu";
const PAID_HEADER = "Đã trả";
const REMAINING_HEADER = "Còn lại";
const RECEIVE_PREFIX = "nhận";
const PAY_PREFIX = "trả";

export function formatPlainMoney(amount: number): string {
  return MONEY_FORMAT.format(amount);
}

export type SettlementTableCell = {
  kind: "pay" | "receive" | "zero";
  amount: number;
};

export type SettlementTableRow = {
  participantId: string;
  name: string;
  owed: number;
  paid: number;
  last: SettlementTableCell;
  isHost: boolean;
};

export type SettlementTable = {
  hasHost: boolean;
  lastHeader: string;
  rows: SettlementTableRow[];
};

type SettlementTableInput = {
  participants: Pick<ApiParticipant, "id" | "name">[];
  summary: Pick<ApiSummary, "balances">;
  settlementMode?: string;
  settlementHostId?: string;
  roundDownRefunds?: boolean;
};

function receiveOrZero(amount: number): SettlementTableCell {
  return amount > 0 ? { kind: "receive", amount } : { kind: "zero", amount: 0 };
}

/**
 * Bang "ai phai chiu bao nhieu, da tra bao nhieu, con phai chuyen gi". O che
 * do gom ve mot dau moi, cot cuoi la so tien chuyen cho dau moi (dung so trong
 * phan "Gom ve", ke ca lam tron); che do khac la so con lai (tra/nhan).
 */
export function buildSettlementTable(
  input: SettlementTableInput,
): SettlementTable {
  const { participants, summary } = input;
  const nameById = new Map(
    participants.map((person) => [person.id, person.name]),
  );
  const hostId = resolveHostParticipantId(
    summary.balances,
    input.settlementMode ?? "",
    input.settlementHostId,
  );
  const transferById = new Map(
    hostId
      ? calculateHostTransfers(
          summary.balances,
          hostId,
          Boolean(input.roundDownRefunds),
        ).map((row) => [row.participantId, row])
      : [],
  );

  const rows = summary.balances.flatMap((row): SettlementTableRow[] => {
    const name = nameById.get(row.participantId);
    if (name === undefined) return [];

    let last: SettlementTableCell;
    if (!hostId) {
      last =
        row.balance < 0
          ? { kind: "pay", amount: -row.balance }
          : receiveOrZero(row.balance);
    } else if (row.participantId === hostId) {
      last = receiveOrZero(row.balance);
    } else {
      const transfer = transferById.get(row.participantId);
      if (!transfer) last = { kind: "zero", amount: 0 };
      else if (transfer.toHost) last = { kind: "pay", amount: transfer.amount };
      else last = { kind: "receive", amount: transfer.amount };
    }

    return [
      {
        participantId: row.participantId,
        name,
        owed: row.owed,
        paid: row.paid,
        last,
        isHost: row.participantId === hostId,
      },
    ];
  });

  return {
    hasHost: Boolean(hostId),
    lastHeader: hostId
      ? `Chuyển cho ${nameById.get(hostId) ?? ""}`.trim()
      : REMAINING_HEADER,
    rows,
  };
}

export function formatLastCell(
  hasHost: boolean,
  cell: SettlementTableCell,
): string {
  if (cell.kind === "zero") return "0";
  const amount = formatPlainMoney(cell.amount);
  if (hasHost) {
    return cell.kind === "receive" ? `(${RECEIVE_PREFIX} ${amount})` : amount;
  }
  return `${cell.kind === "receive" ? RECEIVE_PREFIX : PAY_PREFIX} ${amount}`;
}

export function buildSettlementTableTsv(input: SettlementTableInput): string {
  const table = buildSettlementTable(input);
  const lines = [
    [NAME_HEADER, OWED_HEADER, PAID_HEADER, table.lastHeader],
    ...table.rows.map((row) => [
      row.name,
      String(row.owed),
      String(row.paid),
      formatLastCell(table.hasHost, row.last),
    ]),
  ];

  return lines
    .map((line) =>
      line
        .map((cell) => cell.replace(TSV_UNSAFE_CHARACTERS, " "))
        .join(TSV_CELL_SEPARATOR),
    )
    .join(TSV_ROW_SEPARATOR);
}
