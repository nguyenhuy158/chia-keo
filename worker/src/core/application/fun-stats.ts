import type { ApiFunStats } from "../../../../shared/api-types";
import { buildFunStats, type FunStatsGameInput } from "../../../../shared/fun-stats";
import type { GameRepository } from "../ports/game-repository";

/**
 * Tran so cuoc chia gop mot luot — giong MAX_CROSS_GAME_GAMES o
 * cross-game-balances.ts. Day chi la con so vui nen khong can chinh xac tuyet
 * doi: cu cap o mot so an toan cho subrequest limit, moi nhat truoc.
 */
export const MAX_FUN_STATS_GAMES = 20;

/**
 * Thong ke vui gop tat ca cuoc chia dang dung cua user. Chi doc, khong tinh
 * settlements — xem shared/fun-stats.ts.
 */
export async function getFunStats(repo: GameRepository, userId: string): Promise<ApiFunStats> {
  const allGames = await repo.games.listByOwner(userId);
  const selected = allGames.slice(0, MAX_FUN_STATS_GAMES);
  const omittedGameCount = allGames.length - selected.length;

  if (selected.length === 0) {
    return {
      gameCount: 0,
      totalExpense: 0,
      topPayer: null,
      mostActive: null,
      biggestExpense: null,
      biggestGame: null,
      favoriteWeekday: null,
      omittedGameCount: 0,
    };
  }

  const gameIds = selected.map((game) => game.id);

  // 3 truy van tong cong bat ke selected.length la bao nhieu: dung
  // listByGameIds/listIdNamesByOwner (IN...) thay vi vong lap tung cuoc.
  const [participantCounts, expenseRows, participantNames] = await Promise.all([
    repo.games.countParticipants(gameIds),
    repo.expenses.listByGameIds(gameIds),
    repo.participants.listIdNamesByOwner(userId),
  ]);

  const gameInputs: FunStatsGameInput[] = selected.map((game) => ({
    code: game.code,
    name: game.name,
    createdAt: game.createdAt,
    participantCount: participantCounts.get(game.id) || 0,
  }));
  const gameById = new Map(selected.map((game, index) => [game.id, gameInputs[index]]));

  return buildFunStats(
    gameInputs,
    expenseRows.map((row) => ({
      gameId: row.gameId,
      kind: row.kind,
      title: row.title,
      amount: row.amount,
      payerParticipantId: row.payerParticipantId,
    })),
    gameById,
    participantNames,
    omittedGameCount,
  );
}
