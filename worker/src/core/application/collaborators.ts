import type { ApiGameDetail } from "../../../../shared/api-types";
import { createId, nowIso } from "../../lib/ids";
import type { GameRepository } from "../ports/game-repository";
import { BadRequestError, NotFoundError } from "./errors";
import { getOwnedGame, loadGameDetail } from "./game-detail";

export const COLLABORATOR_ERROR = {
  isOwner: "is_owner",
  alreadyShared: "already_shared",
} as const;

/**
 * Chia se cuoc choi cho mot email. Email co the chua tung dang nhap he thong
 * — luu nhu invite "cho" (userId null), tu dien vao ngay luc nguoi do dang
 * nhap lan dau (xem resolvePendingByEmail o sso-user.ts). Chi chu moi duoc
 * them/xoa nguoi duoc chia se.
 */
export async function shareGame(
  repo: GameRepository,
  userId: string,
  gameId: string,
  email: string,
): Promise<ApiGameDetail> {
  const game = await getOwnedGame(repo, gameId, userId);
  if (!game) throw new NotFoundError();

  const normalizedEmail = email.trim().toLowerCase();
  const invited = await repo.users.findIdByEmail(normalizedEmail);
  if (invited && invited.id === game.ownerUserId) throw new BadRequestError(COLLABORATOR_ERROR.isOwner);

  const added = await repo.gameCollaborators.add({
    id: createId("collab"),
    gameId: game.id,
    userId: invited?.id ?? null,
    invitedEmail: normalizedEmail,
    createdAt: nowIso(),
  });
  if (!added) throw new BadRequestError(COLLABORATOR_ERROR.alreadyShared);

  return loadGameDetail(repo, game, userId);
}

/**
 * Goi y user de chia se nhanh (click chon thay go email): toan bo user da
 * dang nhap he thong, tru chinh chu va nhung nguoi da duoc chia se roi.
 */
export async function listShareCandidates(
  repo: GameRepository,
  userId: string,
  gameId: string,
): Promise<{ id: string; name: string; email: string }[]> {
  const game = await getOwnedGame(repo, gameId, userId);
  if (!game) throw new NotFoundError();

  const [users, collaborators] = await Promise.all([
    repo.users.listAllExceptOwner(userId),
    repo.gameCollaborators.listByGame(game.id),
  ]);

  const sharedUserIds = new Set(
    collaborators.map((collaborator) => collaborator.userId).filter((id): id is string => !!id),
  );
  return users.filter((user) => !sharedUserIds.has(user.id));
}

export async function unshareGame(
  repo: GameRepository,
  userId: string,
  gameId: string,
  collaboratorUserId: string,
): Promise<ApiGameDetail> {
  const game = await getOwnedGame(repo, gameId, userId);
  if (!game) throw new NotFoundError();

  await repo.gameCollaborators.remove(game.id, { userId: collaboratorUserId });

  return loadGameDetail(repo, game, userId);
}

export async function unshareGameByEmail(
  repo: GameRepository,
  userId: string,
  gameId: string,
  email: string,
): Promise<ApiGameDetail> {
  const game = await getOwnedGame(repo, gameId, userId);
  if (!game) throw new NotFoundError();

  await repo.gameCollaborators.remove(game.id, { invitedEmail: email.trim().toLowerCase() });

  return loadGameDetail(repo, game, userId);
}
