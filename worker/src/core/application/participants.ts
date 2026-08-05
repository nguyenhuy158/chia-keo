import type { ApiGameDetail } from "../../../../shared/api-types";
import type { ParticipantBatchInput, ParticipantInput } from "../../../../shared/schemas";
import { createId, nowIso } from "../../lib/ids";
import type { GameRepository } from "../ports/game-repository";
import { NotFoundError } from "./errors";
import { reallocateExpenses } from "./expenses";
import { getOwnedGame, loadGameDetail } from "./game-detail";
import { recordEvent } from "./game-events";

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

  await recordEvent(repo, game.id, { kind: "participant_added", names: [input.name] });

  return loadGameDetail(repo, game);
}

/**
 * Them nhieu nguoi mot luot (chon tu danh ba). Tra ve game detail mot lan sau
 * khi chen het, thay vi tinh lai sau tung nguoi.
 */
export async function addParticipants(
  repo: GameRepository,
  userId: string,
  gameId: string,
  input: ParticipantBatchInput,
): Promise<ApiGameDetail> {
  const game = await getOwnedGame(repo, gameId, userId);
  if (!game) throw new NotFoundError();

  for (const person of input.people) {
    const now = nowIso();
    await repo.participants.insert(
      {
        id: createId("participant"),
        gameId: game.id,
        name: person.name,
        createdAt: now,
        updatedAt: now,
      },
      {
        bankId: person.bankId,
        accountNo: person.accountNo,
        accountName: person.accountName,
      },
    );
  }

  await recordEvent(repo, game.id, {
    kind: "participant_added",
    names: input.people.map((person) => person.name),
  });

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
  if (input.name !== undefined && input.name !== row.participant.name) {
    await repo.participants.rename(row.participant.id, input.name, now);
    await recordEvent(repo, row.game.id, {
      kind: "participant_renamed",
      from: row.participant.name,
      to: input.name,
    });
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

  await recordEvent(repo, row.game.id, {
    kind: "participant_removed",
    name: row.participant.name,
  });

  return loadGameDetail(repo, row.game);
}
