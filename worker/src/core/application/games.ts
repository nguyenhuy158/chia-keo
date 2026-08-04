import type { ApiGame, ApiGameDetail } from "../../../../shared/api-types";
import type { GameInput, GameUpdateInput } from "../../../../shared/schemas";
import {
  DEFAULT_SETTLEMENT_MODE,
  QUICK_PARTICIPANT_PREFIX,
} from "../../../../shared/schemas";
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

/**
 * Dò cuộc chia theo mã hoặc id trong một danh sách đã tải. Nhận cả hai vì
 * người dùng (và model) thường chỉ thấy mã in trên thẻ tóm tắt chứ không biết
 * id; mã đối chiếu không phân biệt hoa thường.
 */
export function findGameByRef<T extends { id: string; code: string }>(
  games: T[],
  ref: string,
): T | undefined {
  const wanted = ref.trim().toLowerCase();
  return games.find((game) => game.id === ref.trim() || game.code.toLowerCase() === wanted);
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

  // Tao san "Người 1", "Người 2"... de vao viec ngay; sua ten sau bang cach
  // sua participant binh thuong. participantCount = 0 thi bo qua (hanh vi cu).
  const quickCount = input.participantCount ?? 0;
  for (let index = 1; index <= quickCount; index += 1) {
    const participantNow = nowIso();
    await repo.participants.insert(
      {
        id: createId("participant"),
        gameId: game.id,
        name: `${QUICK_PARTICIPANT_PREFIX} ${index}`,
        createdAt: participantNow,
        updatedAt: participantNow,
      },
      { bankId: "", accountNo: "", accountName: "" },
    );
  }

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

/** Nhan ban cuoc choi: giu ten, settlementMode, participant + tai khoan nhan.
 * Khong copy khoan chi/anh - cuoc choi moi bat dau sach. */
export async function duplicateGame(
  repo: GameRepository,
  userId: string,
  gameId: string,
): Promise<ApiGameDetail> {
  const source = await getOwnedGame(repo, gameId, userId);
  if (!source) throw new NotFoundError();

  const participantRows = await repo.participants.listByGame(source.id);
  const paymentRows = await repo.paymentProfiles.listByParticipantIds(
    participantRows.map((row) => row.id),
  );
  const paymentByParticipantId = new Map(paymentRows.map((row) => [row.participantId, row]));

  const now = nowIso();
  const game = {
    id: createId("game"),
    ownerUserId: userId,
    code: createGameCode(),
    name: `${source.name} (bản sao)`,
    settlementMode: source.settlementMode,
    createdAt: now,
    updatedAt: now,
  };

  await repo.games.insert(game);

  for (const participant of participantRows) {
    const payment = paymentByParticipantId.get(participant.id);
    const participantNow = nowIso();
    await repo.participants.insert(
      {
        id: createId("participant"),
        gameId: game.id,
        name: participant.name,
        createdAt: participantNow,
        updatedAt: participantNow,
      },
      {
        bankId: payment?.bankId || "",
        accountNo: payment?.accountNo || "",
        accountName: payment?.accountName || "",
      },
    );
  }

  return loadGameDetail(repo, game);
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
