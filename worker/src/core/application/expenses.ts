import type { ApiGameDetail } from "../../../../shared/api-types";
import {
  DEFAULT_TRANSFER_TITLE,
  defaultTitleForKind,
  type ExpenseInput,
  type ExpenseKindInput,
  type TransferInput,
} from "../../../../shared/schemas";
import {
  allocateByWeights,
  computeSplitRows,
  type ComputedSplit,
  type SplitMode,
} from "../../../../shared/split";
import { createId, nowIso } from "../../lib/ids";
import type { GameRepository } from "../ports/game-repository";
import { InvalidInputError, NotFoundError } from "./errors";
import { getOwnedGame, loadGameDetail } from "./game-detail";
import { recordEvent } from "./game-events";

async function loadOwnedExpense(repo: GameRepository, expenseId: string, userId: string) {
  const row = await repo.expenses.getWithGame(expenseId);
  if (!row || row.game.ownerUserId !== userId) return null;
  return row;
}

function toNewSplitRows(expenseId: string, rows: ComputedSplit[]) {
  return rows.map((row) => ({
    id: createId("split"),
    expenseId,
    participantId: row.participantId,
    amount: row.amount,
    weight: row.weight,
  }));
}

async function assertMembers(
  repo: GameRepository,
  gameId: string,
  payerParticipantId: string,
  rows: ComputedSplit[],
) {
  const participantIds = new Set(await repo.participants.listIdsByGame(gameId));
  const valid =
    participantIds.has(payerParticipantId) &&
    rows.every((row) => participantIds.has(row.participantId));
  if (!valid) throw new InvalidInputError();
  return participantIds;
}

export async function addExpense(
  repo: GameRepository,
  userId: string,
  gameId: string,
  input: ExpenseInput,
): Promise<ApiGameDetail> {
  const game = await getOwnedGame(repo, gameId, userId);
  if (!game) throw new NotFoundError();

  const rows = computeSplitRows(input.amount, input.splitMode, input.splitParticipantIds, input.splits);
  if (!rows) throw new InvalidInputError();

  await assertMembers(repo, game.id, input.payerParticipantId, rows);

  const now = nowIso();
  const expenseId = createId("expense");
  const kind = input.kind ?? "expense";
  const title = input.title || defaultTitleForKind(kind);

  await repo.expenses.insert({
    id: expenseId,
    gameId: game.id,
    payerParticipantId: input.payerParticipantId,
    kind,
    title,
    amount: input.amount,
    note: input.note,
    splitMode: input.splitMode,
    createdAt: now,
    updatedAt: now,
  });
  await repo.splits.replace(expenseId, toNewSplitRows(expenseId, rows));

  const detail = await loadGameDetail(repo, game);
  // Ten nguoi lay tu detail vua tai, khong query them.
  const nameById = new Map(detail.participants.map((row) => [row.id, row.name]));
  await recordEvent(repo, game.id, {
    kind: "expense_added",
    title,
    amount: input.amount,
    payerName: nameById.get(input.payerParticipantId) || "Không rõ",
    splitNames: rows.map((row) => nameById.get(row.participantId) || "Không rõ"),
  });

  return detail;
}

export async function updateExpense(
  repo: GameRepository,
  userId: string,
  expenseId: string,
  input: Partial<ExpenseInput>,
): Promise<ApiGameDetail> {
  const row = await loadOwnedExpense(repo, expenseId, userId);
  if (!row) throw new NotFoundError();
  // Khoan tra no chi cho phep xoa roi ghi lai, khong sua truc tiep.
  if (row.expense.kind === "transfer") throw new InvalidInputError();

  const currentSplits = await repo.splits.listByExpense(row.expense.id);

  const amount = input.amount ?? row.expense.amount;
  const storedMode: SplitMode =
    row.expense.splitMode === "shares" || row.expense.splitMode === "amount"
      ? row.expense.splitMode
      : "equal";
  const splitMode = input.splitMode ?? storedMode;

  // Khong gui splits moi thi dung lai splits dang luu; mode "amount" ma doi
  // tong tien nhung khong gui splits se bi computeSplitRows chan vi lech tong.
  const splitParticipantIds =
    input.splitParticipantIds ?? currentSplits.map((split) => split.participantId);
  const splits =
    input.splits ??
    currentSplits.map((split) => ({
      participantId: split.participantId,
      value: splitMode === "shares" ? split.weight || 1 : split.amount,
    }));

  const rows = computeSplitRows(amount, splitMode, splitParticipantIds, splits);
  if (!rows) throw new InvalidInputError();

  const payerParticipantId = input.payerParticipantId ?? row.expense.payerParticipantId;
  await assertMembers(repo, row.game.id, payerParticipantId, rows);

  // Doi qua lai giua chi va thu duoc; "transfer" da bi chan o tren.
  const storedKind: ExpenseKindInput = row.expense.kind === "income" ? "income" : "expense";
  const kind = input.kind ?? storedKind;
  const title = input.title ?? row.expense.title;

  await repo.expenses.update(row.expense.id, {
    kind,
    title: title || defaultTitleForKind(kind),
    note: input.note ?? row.expense.note,
    amount,
    payerParticipantId,
    splitMode,
    updatedAt: nowIso(),
  });
  await repo.splits.replace(row.expense.id, toNewSplitRows(row.expense.id, rows));

  await recordEvent(repo, row.game.id, {
    kind: "expense_updated",
    title: title || defaultTitleForKind(kind),
    amount,
    beforeTitle: row.expense.title,
    beforeAmount: row.expense.amount,
  });

  return loadGameDetail(repo, row.game);
}

export async function removeExpense(
  repo: GameRepository,
  userId: string,
  expenseId: string,
): Promise<ApiGameDetail> {
  const row = await loadOwnedExpense(repo, expenseId, userId);
  if (!row) throw new NotFoundError();

  // Chup lai truoc khi xoa: day la du lieu duy nhat de hoan tac.
  const splits = await repo.splits.listByExpense(row.expense.id);
  const participants = await repo.participants.listByGame(row.game.id);
  const payerName =
    participants.find((person) => person.id === row.expense.payerParticipantId)?.name || "Không rõ";

  await repo.expenses.delete(row.expense.id);

  await recordEvent(repo, row.game.id, {
    kind: "expense_removed",
    title: row.expense.title,
    amount: row.expense.amount,
    payerName,
    restore: {
      payerParticipantId: row.expense.payerParticipantId,
      kind: row.expense.kind,
      title: row.expense.title,
      amount: row.expense.amount,
      note: row.expense.note,
      splitMode: row.expense.splitMode,
      splits: splits.map((split) => ({
        participantId: split.participantId,
        amount: split.amount,
        weight: split.weight,
      })),
    },
  });

  return loadGameDetail(repo, row.game);
}

export async function recordTransfer(
  repo: GameRepository,
  userId: string,
  gameId: string,
  input: TransferInput,
): Promise<ApiGameDetail> {
  const game = await getOwnedGame(repo, gameId, userId);
  if (!game) throw new NotFoundError();

  const participantIds = new Set(await repo.participants.listIdsByGame(game.id));
  if (!participantIds.has(input.fromParticipantId) || !participantIds.has(input.toParticipantId)) {
    throw new InvalidInputError();
  }

  const now = nowIso();
  const expenseId = createId("expense");

  // Tra no duoc luu nhu mot khoan chi kind "transfer": nguoi tra la payer,
  // nguoi nhan chiu toan bo -> balance hai ben tu can bang lai.
  await repo.expenses.insert({
    id: expenseId,
    gameId: game.id,
    payerParticipantId: input.fromParticipantId,
    kind: "transfer",
    title: DEFAULT_TRANSFER_TITLE,
    amount: input.amount,
    note: input.note,
    splitMode: "amount",
    createdAt: now,
    updatedAt: now,
  });
  await repo.splits.replace(expenseId, [
    {
      id: createId("split"),
      expenseId,
      participantId: input.toParticipantId,
      amount: input.amount,
      weight: null,
    },
  ]);

  const detail = await loadGameDetail(repo, game);
  const nameById = new Map(detail.participants.map((person) => [person.id, person.name]));
  await recordEvent(repo, game.id, {
    kind: "transfer_added",
    fromName: nameById.get(input.fromParticipantId) || "Không rõ",
    toName: nameById.get(input.toParticipantId) || "Không rõ",
    amount: input.amount,
  });

  return detail;
}

/**
 * Sau khi mot participant bi xoa, chia lai cac khoan chi bi anh huong cho
 * nhung nguoi con lai theo dung mode cu (mode "amount" chia lai theo ty le
 * phan cu); khoan chi khong con ai chiu thi xoa luon.
 */
export async function reorderExpenses(
  repo: GameRepository,
  userId: string,
  gameId: string,
  orderedIds: string[],
): Promise<ApiGameDetail> {
  const game = await getOwnedGame(repo, gameId, userId);
  if (!game) throw new NotFoundError();

  const existingIds = new Set((await repo.expenses.listByGame(gameId)).map((row) => row.id));
  const valid = new Set(orderedIds).size === orderedIds.length && orderedIds.every((id) => existingIds.has(id));
  if (!valid) throw new InvalidInputError();

  await repo.expenses.reorder(game.id, orderedIds);

  return loadGameDetail(repo, game);
}

export async function reallocateExpenses(repo: GameRepository, expenseIds: string[]) {
  for (const expenseId of expenseIds) {
    const expense = await repo.expenses.getById(expenseId);
    if (!expense) continue;

    const splitRows = await repo.splits.listLiveByExpense(expenseId);

    if (splitRows.length === 0) {
      await repo.expenses.delete(expenseId);
      continue;
    }

    // Khoan tra no chi co mot nguoi nhan: nguoi nhan con thi giu nguyen.
    if (expense.kind === "transfer") continue;

    let rows: ComputedSplit[] | null = null;
    if (expense.splitMode === "shares") {
      rows = computeSplitRows(
        expense.amount,
        "shares",
        [],
        splitRows.map((row) => ({ participantId: row.participantId, value: row.weight || 1 })),
      );
    } else if (expense.splitMode === "amount") {
      // Tong phan con lai khong con khop tong tien, chia lai theo ty le cu.
      rows = allocateByWeights(
        expense.amount,
        splitRows.map((row) => ({ participantId: row.participantId, weight: row.amount })),
      ).map((share) => ({ ...share, weight: null }));
      if (rows.length === 0) rows = null;
    } else {
      rows = computeSplitRows(
        expense.amount,
        "equal",
        splitRows.map((row) => row.participantId),
        [],
      );
    }

    if (rows) {
      await repo.splits.replace(expenseId, toNewSplitRows(expenseId, rows));
    } else {
      await repo.expenses.delete(expenseId);
    }
  }
}
