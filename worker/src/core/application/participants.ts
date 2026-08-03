import type { ApiGameDetail } from "../../../../shared/api-types";
import type { ParticipantInput } from "../../../../shared/schemas";
import { createId, nowIso } from "../../lib/ids";
import type { GameRepository } from "../ports/game-repository";
import { NotFoundError } from "./errors";
import { reallocateExpenses } from "./expenses";
import { getOwnedGame, loadGameDetail } from "./game-detail";

async function loadOwnedParticipant(repo: GameRepository, participantId: string, userId: string) {
  const row = await repo.participants.getWithGame(participantId);
  if (!row || row.game.ownerUserId !== userId) return null;
  return row;
}

export async function addParticipant(
  repo: GameRepository,
  userId: string,
  gameId: string,
  input: ParticipantInput,
): Promise<ApiGameDetail> {
  const game = await getOwnedGame(repo, gameId, userId);
  if (!game) throw new NotFoundError();

  const now = nowIso();
  await repo.participants.insert(
    {
      id: createId("participant"),
      gameId: game.id,
      name: input.name,
      createdAt: now,
      updatedAt: now,
    },
    {
      bankId: input.bankId,
      accountNo: input.accountNo,
      accountName: input.accountName,
    },
  );

  return loadGameDetail(repo, game);
}

export async function updateParticipant(
  repo: GameRepository,
  userId: string,
  participantId: string,
  input: Partial<ParticipantInput>,
): Promise<ApiGameDetail> {
  const row = await loadOwnedParticipant(repo, participantId, userId);
  if (!row) throw new NotFoundError();

  const now = nowIso();
  if (input.name !== undefined) {
    await repo.participants.rename(row.participant.id, input.name, now);
  }

  const paymentFields = {
    ...(input.bankId !== undefined ? { bankId: input.bankId } : {}),
    ...(input.accountNo !== undefined ? { accountNo: input.accountNo } : {}),
    ...(input.accountName !== undefined ? { accountName: input.accountName } : {}),
  };

  if (Object.keys(paymentFields).length > 0) {
    await repo.participants.upsertPaymentProfile(row.participant.id, paymentFields, now);
  }

  return loadGameDetail(repo, row.game);
}

export async function removeParticipant(
  repo: GameRepository,
  userId: string,
  participantId: string,
): Promise<ApiGameDetail> {
  const row = await loadOwnedParticipant(repo, participantId, userId);
  if (!row) throw new NotFoundError();

  const affectedExpenseIds = await repo.expenses.listIdsSplitWith(row.participant.id);

  await repo.participants.delete(row.participant.id);
  await reallocateExpenses(repo, affectedExpenseIds);

  return loadGameDetail(repo, row.game);
}
