import { ARCHIVED_CLOSE_MODE } from "../../../../shared/game-closing";
import {
  buildMonthlyCsv,
  MONTH_KEY_PATTERN,
  monthKeyOf,
} from "../../../../shared/monthly-report";
import type { GameRepository } from "../ports/game-repository";
import { InvalidInputError } from "./errors";

/** Cung ly do voi MAX_FUN_STATS_GAMES: tran cung cho subrequest limit. */
export const MAX_REPORT_GAMES = 20;

/**
 * CSV tong ket cac cuoc da dong trong mot thang (gio VN). Chi tinh cuoc do user
 * tao: ten nguoi choi lay theo chu so huu, cuoc duoc chia se vao khong co ten.
 */
export async function getClosedMonthCsv(
  repo: GameRepository,
  userId: string,
  month: string,
): Promise<string> {
  if (!MONTH_KEY_PATTERN.test(month)) throw new InvalidInputError();

  const ownedGames = await repo.games.listByOwner(userId);
  const gameIds = ownedGames
    .filter(
      (row) =>
        row.closedAt !== null &&
        row.closeMode !== ARCHIVED_CLOSE_MODE &&
        monthKeyOf(row.closedAt) === month,
    )
    .sort((left, right) =>
      (right.closedAt as string).localeCompare(left.closedAt as string),
    )
    .slice(0, MAX_REPORT_GAMES)
    .map((row) => row.id);

  if (gameIds.length === 0) return buildMonthlyCsv([], [], []);

  const [expenses, participants] = await Promise.all([
    repo.expenses.listByGameIds(gameIds),
    repo.participants.listIdNamesByOwner(userId),
  ]);
  const splits = await repo.splits.listByExpenseIds(
    expenses.map((row) => row.id),
  );

  return buildMonthlyCsv(expenses, splits, participants);
}
