/**
 * Thong ke vui gop nhieu cuoc chia. Thuan tinh toan, khong dung IO — ham
 * application chi co nhiem vu lay du lieu tho tu D1 roi dua vao day, giong
 * cach `shared/contacts.ts` tach khoi worker/src/core/application/contacts.ts.
 *
 * Khong tinh vao cai gi ca (khong phai settlements): day la con so vui, sai
 * lech vai phan tram khong sao, khac voi so du dung de chuyen tien that.
 */

import type { ApiFunStats, ApiFunStatsBadge } from "./api-types";
import { capitalizeName } from "./schemas";

export type FunStatsGameInput = {
  code: string;
  name: string;
  createdAt: string;
  participantCount: number;
};

export type FunStatsExpenseInput = {
  gameId: string;
  kind: string;
  title: string;
  amount: number;
  payerParticipantId: string;
};

/** id -> ten, tu moi cuoc chia cua user (participants.listIdNamesByOwner). */
export type ParticipantNameRow = { id: string; name: string };

/** "hồng" va "Hồng" la mot nguoi; khong bo dau — xem shared/contacts.ts. */
function personKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildFunStats(
  games: FunStatsGameInput[],
  expenses: FunStatsExpenseInput[],
  gameById: Map<string, FunStatsGameInput>,
  participantNames: ParticipantNameRow[],
  omittedGameCount: number,
): ApiFunStats {
  const nameById = new Map(participantNames.map((row) => [row.id, capitalizeName(row.name)]));

  const totalExpense = expenses
    .filter((row) => row.kind === "expense" || row.kind === "income")
    .reduce((sum, row) => sum + (row.kind === "income" ? -row.amount : row.amount), 0);

  // Nguoi ung tien: tinh tren tat ca khoan "expense" (bo transfer/income vi
  // do khong phai tien nguoi do bo ra ung truoc cho nhom).
  const paidByPerson = new Map<string, { name: string; total: number; games: Set<string> }>();
  let biggestExpense: FunStatsExpenseInput | null = null;

  for (const row of expenses) {
    if (row.kind !== "expense") continue;
    if (!biggestExpense || row.amount > biggestExpense.amount) biggestExpense = row;

    const name = nameById.get(row.payerParticipantId);
    if (!name) continue;

    const key = personKey(name);
    const entry = paidByPerson.get(key) || { name, total: 0, games: new Set<string>() };
    entry.total += row.amount;
    entry.games.add(row.gameId);
    paidByPerson.set(key, entry);
  }

  const topPayer = toBadge([...paidByPerson.values()].sort((a, b) => b.total - a.total)[0]);

  // Nguoi co mat nhieu cuoc nhat: dem tren so cuoc co it nhat 1 khoan chi cua
  // nguoi do lam payer — dung participant that su xuat hien trong danh sach
  // khoan chi thi don gian hon phai lay them participants moi cuoc.
  const gamesByPerson = new Map<string, { name: string; games: Set<string> }>();
  for (const row of expenses) {
    const name = nameById.get(row.payerParticipantId);
    if (!name) continue;
    const key = personKey(name);
    const entry = gamesByPerson.get(key) || { name, games: new Set<string>() };
    entry.games.add(row.gameId);
    gamesByPerson.set(key, entry);
  }
  const mostActive = toBadge(
    [...gamesByPerson.values()]
      .map((entry) => ({ name: entry.name, total: 0, games: entry.games }))
      .sort((a, b) => b.games.size - a.games.size)[0],
  );

  const biggestGame = [...games].sort((a, b) => b.participantCount - a.participantCount)[0];

  const weekdayCounts = new Map<number, number>();
  for (const game of games) {
    const day = new Date(game.createdAt).getDay();
    if (Number.isNaN(day)) continue;
    weekdayCounts.set(day, (weekdayCounts.get(day) || 0) + 1);
  }
  const favoriteWeekday =
    [...weekdayCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const biggestExpenseGame = biggestExpense ? gameById.get(biggestExpense.gameId) : null;

  return {
    gameCount: games.length,
    totalExpense,
    topPayer,
    mostActive,
    biggestExpense:
      biggestExpense && biggestExpenseGame
        ? {
            title: biggestExpense.title,
            amount: biggestExpense.amount,
            gameName: biggestExpenseGame.name,
            gameCode: biggestExpenseGame.code,
          }
        : null,
    biggestGame: biggestGame
      ? {
          name: biggestGame.name,
          code: biggestGame.code,
          participantCount: biggestGame.participantCount,
        }
      : null,
    favoriteWeekday,
    omittedGameCount,
  };
}

function toBadge(
  entry: { name: string; total: number; games: Set<string> } | undefined,
): ApiFunStatsBadge | null {
  if (!entry) return null;
  return { name: entry.name, totalPaid: entry.total, gameCount: entry.games.size };
}
