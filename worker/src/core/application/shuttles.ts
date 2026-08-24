import type { ApiShuttleEntry, ApiShuttleStock } from "../../../../shared/api-types";
import type { ShuttleEntryInput } from "../../../../shared/schemas";
import {
  SHUTTLE_ENTRY_LIST_LIMIT,
  computeShuttleStock,
  shuttleDelta,
  shuttleStockError,
  type ShuttleEntryKind,
} from "../../../../shared/shuttles";
import { createId, nowIso } from "../../lib/ids";
import type { GameRepository, ShuttleEntryRow } from "../ports/game-repository";
import { BadRequestError, NotFoundError } from "./errors";

/**
 * Kho cau ung truoc cho team. Chi co chu tai khoan thay kho cua minh — day la
 * tien rieng cua nguoi ung cau, khong gan vao mot cuoc chia nao.
 */

/**
 * Cong don tu dong cu nhat len de moi dong biet kho ngay sau no, roi dao lai
 * cho FE (moi nhat truoc) va cat bot phan qua dai.
 */
function toView(rows: ShuttleEntryRow[]): ApiShuttleStock {
  const entries: ApiShuttleEntry[] = [];
  let running = 0;

  for (const row of rows) {
    running += row.delta;
    entries.push({
      id: row.id,
      kind: row.kind as ShuttleEntryKind,
      delta: row.delta,
      stockAfter: running,
      note: row.note,
      createdAt: row.createdAt,
    });
  }

  return { stock: running, entries: entries.reverse().slice(0, SHUTTLE_ENTRY_LIST_LIMIT) };
}

export async function getShuttleStock(
  repo: GameRepository,
  userId: string,
): Promise<ApiShuttleStock> {
  return toView(await repo.shuttleEntries.listByOwner(userId));
}

/**
 * Ghi mot thao tac (+ / - / chot lai so cau). Kiem tran o day chu khong o
 * schema: gioi han phu thuoc kho hien tai, ma schema thi khong biet DB.
 */
export async function createShuttleEntry(
  repo: GameRepository,
  userId: string,
  input: ShuttleEntryInput,
): Promise<ApiShuttleStock> {
  const rows = await repo.shuttleEntries.listByOwner(userId);
  const kind = input.kind;
  const quantity = input.quantity;
  const delta = shuttleDelta(kind, quantity, computeShuttleStock(rows));

  const error = shuttleStockError(computeShuttleStock(rows) + delta);
  if (error) throw new BadRequestError(error);

  // Bam "+0" hoac chot lai dung so dang co: khong co gi doi, khong ghi dong rac.
  if (delta === 0) return toView(rows);

  const row: ShuttleEntryRow = {
    id: createId("shuttle"),
    ownerUserId: userId,
    kind,
    delta,
    note: input.note?.trim() || "",
    createdAt: nowIso(),
  };

  await repo.shuttleEntries.insert(row);
  return toView([...rows, row]);
}

/**
 * Xoa mot lan bam sai. Cac dong khac giu nguyen delta nen kho tu tinh lai dung;
 * chi chan truong hop xoa xong kho thanh am (vd xoa lan mua 12 trai da dung
 * mat 3) — luc do nguoi dung nen chot lai so cau thay vi xoa lich su.
 */
export async function deleteShuttleEntry(
  repo: GameRepository,
  userId: string,
  entryId: string,
): Promise<ApiShuttleStock> {
  const existing = await repo.shuttleEntries.getOwned(entryId, userId);
  if (!existing) throw new NotFoundError();

  const rows = await repo.shuttleEntries.listByOwner(userId);
  const remaining = rows.filter((row) => row.id !== entryId);
  const error = shuttleStockError(computeShuttleStock(remaining));
  if (error) throw new BadRequestError(error);

  await repo.shuttleEntries.delete(entryId);
  return toView(remaining);
}
