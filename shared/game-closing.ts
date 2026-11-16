/**
 * Dong cuoc choi. Hai kieu dong:
 *
 * - "auto": moi nguoi da tra xong (khong con ai no ai) thi cuoc tu dong dong.
 *   Cuoc tu dong dong cung tu mo lai khi so du lech tro lai — vi day la suy
 *   ra tu so tien chu khong phai y muon cua nguoi dung.
 * - "manual": nguoi dung bam nut dong va xac nhan. Da la y muon thi giu nguyen:
 *   them khoan chi moi cung khong tu mo lai, phai bam "Mo lai".
 * - "archived": nhu "manual" nhung nam o muc rieng "Da luu tru".
 *
 * Cuoc da dong chi bien khoi danh sach mac dinh, van sua duoc binh thuong.
 */

import type { BalanceRow } from "./split";

/**
 * Luu tru: cuoc da dong nhung ve rieng muc "Da luu tru", khong nam trong danh
 * sach "Da dong", bao cao thang va thong ke. Khong can cot moi trong DB: dung
 * closed_at co san cung close_mode ARCHIVED_CLOSE_MODE. Khong bao gio tu mo lai
 * (chi "auto" moi tu mo lai), khoi phuc bang "Mo lai".
 */
export const ARCHIVED_CLOSE_MODE = "archived";

export const CLOSE_MODES = ["auto", "manual", ARCHIVED_CLOSE_MODE] as const;

export type CloseMode = (typeof CLOSE_MODES)[number];

/** Gia tri cot close_mode khi cuoc dang choi. */
export const CLOSE_MODE_NONE = "";

export type CloseModeValue = CloseMode | typeof CLOSE_MODE_NONE;

/** Cot TEXT tu do trong DB, ep ve mot gia tri hop le truoc khi dung. */
export function toCloseMode(value: string): CloseModeValue {
  return value === "auto" || value === "manual" || value === ARCHIVED_CLOSE_MODE
    ? value
    : CLOSE_MODE_NONE;
}

/** Trang thai dong cua mot cuoc choi, du de quyet dinh moi thu ben duoi. */
export type ClosingState = {
  /** null la dang choi. */
  closedAt: string | null;
  closeMode: CloseModeValue;
};

export function isClosed(state: ClosingState): boolean {
  return state.closedAt !== null;
}

/**
 * "Moi nguoi da thanh toan xong": co it nhat mot khoan chi va khong con ai
 * lech so du. Cuoc chua co khoan chi nao khong tinh la da tra xong — no chi
 * la cuoc vua tao, dong nham thi nguoi dung mat luon cuoc do khoi danh sach.
 */
export function isFullySettled(
  balances: BalanceRow[],
  expenseCount: number,
): boolean {
  if (expenseCount === 0) return false;
  return balances.every((row) => row.balance === 0);
}

/** Cuoc dang choi va vua tra xong het: den luc tu dong dong. */
export function shouldAutoClose(
  state: ClosingState,
  settled: boolean,
): boolean {
  return settled && !isClosed(state);
}

/** Cuoc tu dong dong nhung so du lech tro lai: mo ra cho nguoi dung chia tiep. */
export function shouldAutoReopen(
  state: ClosingState,
  settled: boolean,
): boolean {
  return !settled && isClosed(state) && state.closeMode === "auto";
}

const CLOSE_MODE_LABELS: Record<CloseMode, string> = {
  auto: "tự đóng",
  manual: "đóng tay",
  [ARCHIVED_CLOSE_MODE]: "lưu trữ",
};

/** Nhan hien canh cuoc da dong; cuoc dang choi khong co nhan nao. */
export function describeCloseMode(mode: CloseModeValue): string {
  return mode === CLOSE_MODE_NONE ? "" : CLOSE_MODE_LABELS[mode];
}
