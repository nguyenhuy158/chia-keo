import type { ApiPaidProgress } from "../../../../shared/api-types";
import { calculateBalances } from "../../../../shared/split";
import type { GameRepository } from "../ports/game-repository";
import { groupSplitsByExpenseId, toExpenseInputs } from "./game-detail";

const TRANSFER_KIND = "transfer";
/** D1 gioi han so tham so rang buoc moi truy van, nen chia lo khi IN (...). */
const IN_QUERY_CHUNK_SIZE = 50;

function chunk<T>(items: T[]): T[][] {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += IN_QUERY_CHUNK_SIZE) {
    chunks.push(items.slice(start, start + IN_QUERY_CHUNK_SIZE));
  }
  return chunks;
}

/**
 * Tien do thu tien cua tung cuoc: bao nhieu nguoi no da tra du / tong so nguoi
 * no. Nguoi no la nguoi co so du am TRUOC khi tinh cac khoan "da tra"
 * (kind transfer); ho tinh la da tra khi sau do so du ve 0 tro len. Cuoc khong
 * ai no thi khong co dong (de the khong hien thanh).
 *
 * Doc theo lo (IN ...) de N cuoc chi ton vai truy van chu khong phai N lan.
 * Danh sach nguoi lay tu khoan chi/split: nguoi khong co khoan nao thi so du 0,
 * khong the la nguoi no.
 */
export async function loadPaidProgress(
  repo: GameRepository,
  gameIds: string[],
): Promise<Map<string, ApiPaidProgress>> {
  const progress = new Map<string, ApiPaidProgress>();
  if (gameIds.length === 0) return progress;

  const expenseRows = (
    await Promise.all(
      chunk(gameIds).map((ids) => repo.expenses.listByGameIds(ids)),
    )
  ).flat();
  const splitRows = (
    await Promise.all(
      chunk(expenseRows.map((row) => row.id)).map((ids) =>
        repo.splits.listByExpenseIds(ids),
      ),
    )
  ).flat();
  const splitsByExpenseId = groupSplitsByExpenseId(splitRows);

  const expensesByGameId = new Map<string, typeof expenseRows>();
  for (const row of expenseRows) {
    const list = expensesByGameId.get(row.gameId) || [];
    list.push(row);
    expensesByGameId.set(row.gameId, list);
  }

  for (const [gameId, rows] of expensesByGameId) {
    const inputs = toExpenseInputs(rows, splitsByExpenseId);
    const participantIds = [
      ...new Set(
        inputs.flatMap((input) => [
          input.payerParticipantId,
          ...input.shares.map((share) => share.participantId),
        ]),
      ),
    ];
    const debtors = calculateBalances(
      participantIds,
      inputs.filter((input) => input.kind !== TRANSFER_KIND),
    ).filter((row) => row.balance < 0);
    if (debtors.length === 0) continue;

    const current = new Map(
      calculateBalances(participantIds, inputs).map((row) => [
        row.participantId,
        row.balance,
      ]),
    );
    progress.set(gameId, {
      paid: debtors.filter(
        (row) => (current.get(row.participantId) as number) >= 0,
      ).length,
      total: debtors.length,
    });
  }

  return progress;
}
