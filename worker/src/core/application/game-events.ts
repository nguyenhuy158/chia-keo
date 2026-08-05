import type { ApiGameDetail } from "../../../../shared/api-types";
import {
  type ApiGameEvent,
  canUndoEvent,
  type GameEventPayload,
} from "../../../../shared/game-events";
import { createId, nowIso } from "../../lib/ids";
import type { GameEventRow, GameRepository } from "../ports/game-repository";
import { InvalidInputError, NotFoundError } from "./errors";
import { getOwnedGame, loadGameDetail } from "./game-detail";

/** Doc toi day roi thoi: lich su cu hon the khong ai cuon tay den. */
export const GAME_EVENT_PAGE_SIZE = 200;

/**
 * Ghi mot dong lich su. Loi ghi log khong duoc lam that bai thao tac chinh:
 * them duoc khoan chi ma khong ghi duoc lich su thi van la them duoc, con bao
 * loi ve cho nguoi dung se khien ho nhap lai va thanh hai khoan trung.
 */
export async function recordEvent(
  repo: GameRepository,
  gameId: string,
  payload: GameEventPayload,
): Promise<void> {
  try {
    await repo.gameEvents.insert({
      id: createId("event"),
      gameId,
      kind: payload.kind,
      payload: JSON.stringify(payload),
      createdAt: nowIso(),
      undoneAt: null,
    });
  } catch {
    // Bo qua: lich su la thong tin phu.
  }
}

/** Dong DB co payload la JSON; hong thi bo dong do chu khong lam vo ca tab. */
function toApiEvent(row: GameEventRow): ApiGameEvent | null {
  try {
    return {
      id: row.id,
      createdAt: row.createdAt,
      undoneAt: row.undoneAt,
      payload: JSON.parse(row.payload) as GameEventPayload,
    };
  } catch {
    return null;
  }
}

export async function listGameEvents(
  repo: GameRepository,
  userId: string,
  gameId: string,
): Promise<{ events: ApiGameEvent[] }> {
  const game = await getOwnedGame(repo, gameId, userId);
  if (!game) throw new NotFoundError();

  const rows = await repo.gameEvents.listByGame(game.id, GAME_EVENT_PAGE_SIZE);
  return { events: rows.map(toApiEvent).filter((event): event is ApiGameEvent => event !== null) };
}

/**
 * Hoan tac: hien chi ap dung cho khoan chi da xoa — dung lai khoan chi cung
 * cac phan chia da luu trong payload.
 *
 * Khoan duoc dung lai co id moi va nam o dau danh sach (createdAt = luc hoan
 * tac). Giu lai id cu se lam thu tu danh sach nhay ve giua, kho tim.
 */
export async function undoGameEvent(
  repo: GameRepository,
  userId: string,
  eventId: string,
): Promise<ApiGameDetail> {
  const row = await repo.gameEvents.getWithGame(eventId);
  if (!row || row.game.ownerUserId !== userId) throw new NotFoundError();

  const event = toApiEvent(row.event);
  if (!event || !canUndoEvent(event)) throw new InvalidInputError();
  // canUndoEvent da bao dam kind va restore, day chi de TypeScript hep kieu.
  if (event.payload.kind !== "expense_removed" || !event.payload.restore) {
    throw new InvalidInputError();
  }

  const restore = event.payload.restore;

  // Nguoi tra hoac nguoi chia co the da bi xoa sau do; dung lai se vi pham
  // khoa ngoai, nen tu choi ro rang thay vi de loi DB tro len.
  const participantIds = new Set(await repo.participants.listIdsByGame(row.game.id));
  const membersAlive =
    participantIds.has(restore.payerParticipantId) &&
    restore.splits.every((split) => participantIds.has(split.participantId));
  if (!membersAlive) throw new InvalidInputError();

  const now = nowIso();
  const expenseId = createId("expense");

  await repo.expenses.insert({
    id: expenseId,
    gameId: row.game.id,
    payerParticipantId: restore.payerParticipantId,
    kind: restore.kind,
    title: restore.title,
    amount: restore.amount,
    note: restore.note,
    splitMode: restore.splitMode,
    createdAt: now,
    updatedAt: now,
  });
  await repo.splits.replace(
    expenseId,
    restore.splits.map((split) => ({
      id: createId("split"),
      expenseId,
      participantId: split.participantId,
      amount: split.amount,
      weight: split.weight,
    })),
  );

  await repo.gameEvents.markUndone(event.id, now);
  await recordEvent(repo, row.game.id, {
    kind: "expense_restored",
    title: restore.title,
    amount: restore.amount,
  });

  return loadGameDetail(repo, row.game);
}
