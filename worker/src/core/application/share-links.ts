import type { ApiGameDetail, ApiShareView } from "../../../../shared/api-types";
import { createId, createShareToken, nowIso } from "../../lib/ids";
import type { GameRepository, GameRow } from "../ports/game-repository";
import { NotFoundError } from "./errors";
import { getOwnedGame, loadGameDetail, loadShareView } from "./game-detail";

export async function rotateShareLink(
  repo: GameRepository,
  userId: string,
  gameId: string,
): Promise<ApiGameDetail> {
  const game = await getOwnedGame(repo, gameId, userId);
  if (!game) throw new NotFoundError();

  await repo.shareLinks.replace(game.id, {
    id: createId("share"),
    gameId: game.id,
    token: createShareToken(),
    enabled: true,
    createdAt: nowIso(),
    expiresAt: null,
  });

  return loadGameDetail(repo, game);
}

export async function setShareLinkEnabled(
  repo: GameRepository,
  userId: string,
  gameId: string,
  enabled: boolean,
): Promise<ApiGameDetail> {
  const game = await getOwnedGame(repo, gameId, userId);
  if (!game) throw new NotFoundError();

  await repo.shareLinks.setEnabled(game.id, enabled);
  return loadGameDetail(repo, game);
}

/** Cuoc chia dang sau mot token share con hieu luc. */
export async function getSharedGame(repo: GameRepository, token: string): Promise<GameRow> {
  const row = await repo.shareLinks.findByToken(token);
  const expired = Boolean(row?.link.expiresAt && row.link.expiresAt < nowIso());
  // Cuoc chia trong thung rac thi link share tat theo: khong the vua "da xoa"
  // voi chu vua con xem duoc voi ca nhom.
  if (!row || !row.link.enabled || expired || row.game.deletedAt) throw new NotFoundError();

  return row.game;
}

export async function getShareViewByToken(
  repo: GameRepository,
  token: string,
): Promise<ApiShareView> {
  return loadShareView(repo, await getSharedGame(repo, token));
}
