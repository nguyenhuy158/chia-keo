import type { ApiGame, ApiGameDetail } from "../../../../shared/api-types";
import type { GameInput, GameUpdateInput } from "../../../../shared/schemas";
import { DEFAULT_SETTLEMENT_MODE } from "../../../../shared/schemas";
import { createGameCode, createId, nowIso } from "../../lib/ids";
import type { GameChanges, GameRepository } from "../ports/game-repository";
import { InvalidInputError, NotFoundError } from "./errors";
import { getOwnedGame, loadGameDetail } from "./game-detail";

export async function listGames(repo: GameRepository, userId: string): Promise<ApiGame[]> {
  const gameRows = await repo.games.listByOwner(userId);
  const gameIds = gameRows.map((row) => row.id);

  const [participantCounts, expenseCounts] = await Promise.all([
    repo.games.countParticipants(gameIds),
    repo.games.countExpenses(gameIds),
  ]);

  return gameRows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    createdAt: row.createdAt,
    participantCount: participantCounts.get(row.id) || 0,
    expenseCount: expenseCounts.get(row.id) || 0,
  }));
}

export async function createGame(
  repo: GameRepository,
  userId: string,
  input: GameInput,
): Promise<ApiGameDetail> {
  const now = nowIso();
  const game = {
    id: createId("game"),
    ownerUserId: userId,
    code: createGameCode(),
    name: input.name,
    settlementMode: input.settlementMode ?? DEFAULT_SETTLEMENT_MODE,
    createdAt: now,
    updatedAt: now,
  };

  await repo.games.insert(game);
  return loadGameDetail(repo, game);
}

export async function getGameDetailForOwner(
  repo: GameRepository,
  userId: string,
  gameId: string,
): Promise<ApiGameDetail> {
  const game = await getOwnedGame(repo, gameId, userId);
  if (!game) throw new NotFoundError();
  return loadGameDetail(repo, game);
}

export async function updateGame(
  repo: GameRepository,
  userId: string,
  gameId: string,
  input: GameUpdateInput,
): Promise<ApiGameDetail> {
  const game = await getOwnedGame(repo, gameId, userId);
  if (!game) throw new NotFoundError();

  const changes: GameChanges = {
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.settlementMode === undefined ? {} : { settlementMode: input.settlementMode }),
  };

  if (Object.keys(changes).length === 0) throw new InvalidInputError();

  await repo.games.update(game.id, changes, nowIso());
  return loadGameDetail(repo, { ...game, ...changes });
}

export async function deleteGame(
  repo: GameRepository,
  userId: string,
  gameId: string,
): Promise<void> {
  const game = await getOwnedGame(repo, gameId, userId);
  if (!game) throw new NotFoundError();

  await repo.games.delete(game.id);
}
