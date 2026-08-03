import type { ApiPhoto, ApiPhotoDetail } from "../../../../shared/api-types";
import {
  MAX_PHOTOS_PER_GAME,
  type PhotoInput,
  type PhotoUpdateInput,
} from "../../../../shared/schemas";
import { createId, nowIso } from "../../lib/ids";
import type { GameRepository, PhotoDetailRow, PhotoRow } from "../ports/game-repository";
import { BadRequestError, InvalidInputError, NotFoundError } from "./errors";
import { getOwnedGame } from "./game-detail";
import { getSharedGame } from "./share-links";

export const PHOTO_LIMIT_ERROR = "too_many_photos";

function toApiPhoto(row: PhotoRow): ApiPhoto {
  return {
    id: row.id,
    expenseId: row.expenseId,
    caption: row.caption,
    mimeType: row.mimeType,
    width: row.width,
    height: row.height,
    thumbData: row.thumbData,
    createdAt: row.createdAt,
  };
}

function toApiPhotoDetail(row: PhotoDetailRow): ApiPhotoDetail {
  return { ...toApiPhoto(row), data: row.data };
}

/** Anh chi duoc gan vao khoan chi cua chinh cuoc chia do. */
async function assertExpenseInGame(repo: GameRepository, expenseId: string, gameId: string) {
  const expense = await repo.expenses.getById(expenseId);
  if (!expense || expense.gameId !== gameId) throw new InvalidInputError();
}

/** Anh + cuoc chia, chi khi nguoi dung la chu cuoc chia. */
async function getOwnedPhoto(repo: GameRepository, photoId: string, userId: string) {
  const row = await repo.photos.getWithGame(photoId);
  if (!row || row.game.ownerUserId !== userId) throw new NotFoundError();
  return row;
}

export async function listGamePhotos(
  repo: GameRepository,
  userId: string,
  gameId: string,
): Promise<ApiPhoto[]> {
  const game = await getOwnedGame(repo, gameId, userId);
  if (!game) throw new NotFoundError();

  return (await repo.photos.listByGame(game.id)).map(toApiPhoto);
}

export async function addGamePhoto(
  repo: GameRepository,
  userId: string,
  gameId: string,
  input: PhotoInput,
): Promise<ApiPhoto> {
  const game = await getOwnedGame(repo, gameId, userId);
  if (!game) throw new NotFoundError();

  if ((await repo.photos.countByGame(game.id)) >= MAX_PHOTOS_PER_GAME) {
    throw new BadRequestError(PHOTO_LIMIT_ERROR);
  }
  if (input.expenseId) await assertExpenseInGame(repo, input.expenseId, game.id);

  const row: PhotoDetailRow = {
    id: createId("photo"),
    gameId: game.id,
    expenseId: input.expenseId,
    caption: input.caption,
    mimeType: input.mimeType,
    width: input.width,
    height: input.height,
    thumbData: input.thumbData,
    data: input.data,
    createdAt: nowIso(),
  };
  await repo.photos.insert(row);

  return toApiPhoto(row);
}

export async function getPhotoForOwner(
  repo: GameRepository,
  userId: string,
  photoId: string,
): Promise<ApiPhotoDetail> {
  await getOwnedPhoto(repo, photoId, userId);

  const photo = await repo.photos.getDetail(photoId);
  if (!photo) throw new NotFoundError();

  return toApiPhotoDetail(photo);
}

export async function updatePhoto(
  repo: GameRepository,
  userId: string,
  photoId: string,
  input: PhotoUpdateInput,
): Promise<ApiPhoto> {
  const row = await getOwnedPhoto(repo, photoId, userId);
  if (input.expenseId) await assertExpenseInGame(repo, input.expenseId, row.game.id);

  const fields = {
    ...(input.caption !== undefined ? { caption: input.caption } : {}),
    ...(input.expenseId !== undefined ? { expenseId: input.expenseId } : {}),
  };
  if (Object.keys(fields).length > 0) await repo.photos.update(photoId, fields);

  const photo = await repo.photos.getById(photoId);
  if (!photo) throw new NotFoundError();

  return toApiPhoto(photo);
}

export async function removePhoto(
  repo: GameRepository,
  userId: string,
  photoId: string,
): Promise<{ ok: true }> {
  await getOwnedPhoto(repo, photoId, userId);
  await repo.photos.delete(photoId);

  return { ok: true };
}

export async function listSharedPhotos(
  repo: GameRepository,
  token: string,
): Promise<ApiPhoto[]> {
  const game = await getSharedGame(repo, token);

  return (await repo.photos.listByGame(game.id)).map(toApiPhoto);
}

export async function getSharedPhoto(
  repo: GameRepository,
  token: string,
  photoId: string,
): Promise<ApiPhotoDetail> {
  const game = await getSharedGame(repo, token);

  const photo = await repo.photos.getDetail(photoId);
  if (!photo || photo.gameId !== game.id) throw new NotFoundError();

  return toApiPhotoDetail(photo);
}
