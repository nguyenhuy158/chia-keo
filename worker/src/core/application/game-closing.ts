/**
 * Dong / mo lai cuoc choi.
 *
 * `syncAutoClose` la duong tu dong: goi tu `loadGameDetail` — cho duy nhat da
 * tinh xong so du sau moi thao tac — nen khong phai rai lai o tung use case
 * (them khoan chi, ghi nhan tra no, xoa nguoi...) va khong the quen mot cho.
 * Duong dong tay nam o `games.ts` cung nhom voi xoa/phuc hoi.
 */

import {
  CLOSE_MODE_NONE,
  isFullySettled,
  shouldAutoClose,
  shouldAutoReopen,
  toCloseMode,
} from "../../../../shared/game-closing";
import type { BalanceRow } from "../../../../shared/split";
import { nowIso } from "../../lib/ids";
import type { GameRepository, GameRow } from "../ports/game-repository";
import { recordEvent } from "./game-events";

/** Chi khoan chi/khoan thu tinh la "co phat sinh"; tra no thi khong. */
export function countRealExpenses(expenseKinds: string[]): number {
  return expenseKinds.filter((kind) => kind !== "transfer").length;
}

/**
 * Cap nhat trang thai dong theo so du hien tai. Tra ve phan thay doi de nguoi
 * goi ghep vao detail dang tra ve, `null` la khong co gi doi.
 */
export async function syncAutoClose(
  repo: GameRepository,
  game: GameRow,
  balances: BalanceRow[],
  expenseCount: number,
): Promise<Pick<GameRow, "closedAt" | "closeMode"> | null> {
  const state = { closedAt: game.closedAt, closeMode: toCloseMode(game.closeMode) };
  const settled = isFullySettled(balances, expenseCount);

  if (shouldAutoClose(state, settled)) {
    const closedAt = nowIso();
    await repo.games.setClosed(game.id, closedAt, "auto");
    await recordEvent(repo, game.id, { kind: "game_closed", mode: "auto" });
    return { closedAt, closeMode: "auto" };
  }

  if (shouldAutoReopen(state, settled)) {
    await repo.games.setClosed(game.id, null, CLOSE_MODE_NONE);
    await recordEvent(repo, game.id, { kind: "game_reopened", mode: "auto" });
    return { closedAt: null, closeMode: CLOSE_MODE_NONE };
  }

  return null;
}
