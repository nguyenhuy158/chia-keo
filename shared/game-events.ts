/**
 * Lich su thao tac cua mot cuoc chia.
 *
 * Payload luu *anh chup* luc thao tac xay ra (ten nguoi, so tien) chu khong
 * luu id roi tra cuu lai luc doc: doi ten nguoi hay xoa khoan chi thi dong
 * lich su cu phai giu nguyen y nghia cua no. Cau chu hien ra cho nguoi dung
 * thi dung sinh o day (`describeGameEvent`) chu khong luu vao DB, de sua cach
 * dien dat khong phai viet migration.
 */

import { formatShortMoney } from "./summary-text";

/** Anh chup du de dung lai mot khoan chi da xoa. */
export type RestorableExpense = {
  payerParticipantId: string;
  kind: string;
  title: string;
  amount: number;
  note: string;
  splitMode: string;
  splits: { participantId: string; amount: number; weight: number | null }[];
};

export type GameEventPayload =
  | { kind: "game_created"; name: string }
  | { kind: "game_renamed"; from: string; to: string }
  | { kind: "settlement_changed"; mode: string; hostName: string }
  | { kind: "participant_added"; names: string[] }
  | { kind: "participant_renamed"; from: string; to: string }
  | { kind: "participant_removed"; name: string }
  | {
      kind: "expense_added";
      title: string;
      amount: number;
      payerName: string;
      splitNames: string[];
    }
  | {
      kind: "expense_updated";
      title: string;
      amount: number;
      beforeTitle: string;
      beforeAmount: number;
    }
  | {
      kind: "expense_removed";
      title: string;
      amount: number;
      payerName: string;
      /** null khi khong dung lai duoc (vi du khoan bi xoa keo theo khi xoa nguoi). */
      restore: RestorableExpense | null;
    }
  | { kind: "expense_restored"; title: string; amount: number }
  | { kind: "transfer_added"; fromName: string; toName: string; amount: number };

export type GameEventKind = GameEventPayload["kind"];

export type ApiGameEvent = {
  id: string;
  createdAt: string;
  /** Luc bam hoan tac; da hoan tac roi thi khong hoan tac lai lan nua. */
  undoneAt: string | null;
  payload: GameEventPayload;
};

const SETTLEMENT_LABELS: Record<string, string> = {
  p2p: "ai nợ ai trả người đó",
  host: "gom về người ứng nhiều nhất",
  pick: "gom về một người tự chọn",
  off: "không gợi ý chuyển tiền",
};

/** Chi khoan chi da xoa moi hoan tac duoc, va chi khi con du du lieu de dung lai. */
export function canUndoEvent(event: ApiGameEvent): boolean {
  return (
    event.undoneAt === null &&
    event.payload.kind === "expense_removed" &&
    event.payload.restore !== null
  );
}

/** Mot dong lich su: `title` la viec da lam, `detail` la chi tiet phu (co the rong). */
export function describeGameEvent(payload: GameEventPayload): {
  title: string;
  detail: string;
} {
  switch (payload.kind) {
    case "game_created":
      return { title: `Tạo cuộc chia "${payload.name}"`, detail: "" };

    case "game_renamed":
      return { title: `Đổi tên cuộc chia`, detail: `${payload.from} → ${payload.to}` };

    case "settlement_changed":
      return {
        title: "Đổi cách chuyển tiền",
        detail: payload.hostName
          ? `${SETTLEMENT_LABELS[payload.mode] || payload.mode} · ${payload.hostName}`
          : SETTLEMENT_LABELS[payload.mode] || payload.mode,
      };

    case "participant_added":
      return {
        title: payload.names.length > 1 ? `Thêm ${payload.names.length} người` : "Thêm người",
        detail: payload.names.join(", "),
      };

    case "participant_renamed":
      return { title: "Đổi tên người", detail: `${payload.from} → ${payload.to}` };

    case "participant_removed":
      return { title: "Xóa người", detail: payload.name };

    case "expense_added":
      return {
        title: `Thêm khoản ${payload.title} — ${formatShortMoney(payload.amount)}`,
        detail: payload.splitNames.length
          ? `${payload.payerName} trả · chia cho ${payload.splitNames.join(", ")}`
          : `${payload.payerName} trả`,
      };

    case "expense_updated": {
      const renamed = payload.beforeTitle !== payload.title;
      const repriced = payload.beforeAmount !== payload.amount;
      const changes = [
        renamed ? `${payload.beforeTitle} → ${payload.title}` : "",
        repriced
          ? `${formatShortMoney(payload.beforeAmount)} → ${formatShortMoney(payload.amount)}`
          : "",
      ].filter(Boolean);

      return {
        title: `Sửa khoản ${payload.title}`,
        // Sua nguoi tra hoac cach chia thi khong co gi de so sanh gon; noi chung chung.
        detail: changes.length ? changes.join(" · ") : "cập nhật người trả hoặc cách chia",
      };
    }

    case "expense_removed":
      return {
        title: `Xóa khoản ${payload.title} — ${formatShortMoney(payload.amount)}`,
        detail: `${payload.payerName} trả`,
      };

    case "expense_restored":
      return {
        title: `Hoàn tác xóa khoản ${payload.title}`,
        detail: `${formatShortMoney(payload.amount)} đã được dựng lại`,
      };

    case "transfer_added":
      return {
        title: `Ghi nhận trả nợ ${formatShortMoney(payload.amount)}`,
        detail: `${payload.fromName} → ${payload.toName}`,
      };
  }
}
