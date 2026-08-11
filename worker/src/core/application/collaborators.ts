import type { ApiGameDetail } from "../../../../shared/api-types";
import { createId, nowIso } from "../../lib/ids";
import type { GameRepository } from "../ports/game-repository";
import { BadRequestError, NotFoundError } from "./errors";
import { getOwnedGame, loadGameDetail } from "./game-detail";

export const COLLABORATOR_ERROR = {
  userNotFound: "user_not_found",
  isOwner: "is_owner",
  alreadyShared: "already_shared",
} as const;

/**
 * Chia se cuoc choi cho mot nguoi khac qua email. Nguoi do phai da co tai
 * khoan trong he thong — khong gui loi moi qua email cho nguoi chua dung app.
 * Chi chu moi duoc them/xoa nguoi duoc chia se.
 */
export async function shareGame(
  repo: GameRepository,
  userId: string,
  gameId: string,
  email: string,
): Promise<ApiGameDetail> {
  const game = await getOwnedGame(repo, gameId, userId);
  if (!game) throw new NotFoundError();

  const invited = await repo.users.findIdByEmail(email.trim());
  if (!invited) throw new BadRequestError(COLLABORATOR_ERROR.userNotFound);
  if (invited.id === game.ownerUserId) throw new BadRequestError(COLLABORATOR_ERROR.isOwner);

  const added = await repo.gameCollaborators.add({
    id: createId("collab"),
    gameId: game.id,
    userId: invited.id,
    createdAt: nowIso(),
  });
  if (!added) throw new BadRequestError(COLLABORATOR_ERROR.alreadyShared);

  return loadGameDetail(repo, game, userId);
}

export async function unshareGame(
  repo: GameRepository,
  userId: string,
  gameId: string,
  collaboratorUserId: string,
): Promise<ApiGameDetail> {
  const game = await getOwnedGame(repo, gameId, userId);
  if (!game) throw new NotFoundError();

  await repo.gameCollaborators.remove(game.id, collaboratorUserId);

  return loadGameDetail(repo, game, userId);
}
