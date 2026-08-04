import type { ApiCrossGameBalances, ApiCrossGamePerson } from "../../../../shared/api-types";
import { capitalizeName } from "../../../../shared/schemas";
import type { BalanceRow } from "../../../../shared/split";
import { calculateBalances, calculateSettlements } from "../../../../shared/split";
import type { GameRepository, GameRow } from "../ports/game-repository";
import { BadRequestError, NotFoundError } from "./errors";
import { groupSplitsByExpenseId, sumTotalExpense, toExpenseInputs } from "./game-detail";

/**
 * Tran so cuoc chia gop mot luot. Moi cuoc ton 3 truy van D1, va Workers gioi
 * han so subrequest moi request (50 o goi mien phi), nen phai co tran cung
 * thay vi de nguoi dung gop het lich su lai.
 */
export const MAX_CROSS_GAME_GAMES = 8;

/**
 * Khoa gop nguoi giua cac cuoc chia. Chi chuan hoa hoa/thuong va khoang trang;
 * KHONG bo dau, vi "Hương" va "Huong" co the la hai nguoi khac nhau that va
 * gop sai thi ra so tien sai chu khong chi hien thi xau.
 */
function personKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

type PersonAccumulator = {
  name: string;
  paid: number;
  owed: number;
  games: { code: string; name: string; balance: number }[];
};

/** Balance cua mot cuoc, kem ten nguoi thay cho participantId. */
async function loadGameBalances(repo: GameRepository, game: GameRow) {
  const participantRows = await repo.participants.listByGame(game.id);
  const expenseRows = await repo.expenses.listByGame(game.id);
  const splitRows = await repo.splits.listByExpenseIds(expenseRows.map((row) => row.id));

  const balances = calculateBalances(
    participantRows.map((row) => row.id),
    toExpenseInputs(expenseRows, groupSplitsByExpenseId(splitRows)),
  );

  // Ten trong DB cu co the chua viet hoa; chuan hoa giong duong doc day du.
  const nameByParticipantId = new Map(
    participantRows.map((row) => [row.id, capitalizeName(row.name)]),
  );

  return {
    totalExpense: sumTotalExpense(expenseRows),
    rows: balances.map((row) => ({
      name: nameByParticipantId.get(row.participantId) || "",
      paid: row.paid,
      owed: row.owed,
      balance: row.balance,
    })),
  };
}

/**
 * Gop so du cua nhieu cuoc chia lai theo tung nguoi, roi tinh mot bo chuyen
 * tien duy nhat cho toan bo.
 *
 * Chi co nghia khi nhung nguoi nay that su muon tat toan chung voi nhau: gop
 * hai nhom khong lien quan thi con so van ra nhung khong dung de lam gi.
 * Nguoi goi chon `gameIds` de gioi han, bo trong thi lay cac cuoc gan nhat.
 */
export async function getBalancesAcrossGames(
  repo: GameRepository,
  userId: string,
  options: { gameIds?: string[] } = {},
): Promise<ApiCrossGameBalances> {
  const allGames = await repo.games.listByOwner(userId);
  // Truyen trung id thi cong doi so tien len — loai trung truoc khi tinh.
  const gameIds = [...new Set(options.gameIds ?? [])];

  if (gameIds.length > MAX_CROSS_GAME_GAMES) {
    throw new BadRequestError("too_many_games");
  }

  let selected: GameRow[];
  let omittedCount = 0;

  if (gameIds.length > 0) {
    selected = gameIds.map((gameId) => {
      const match = allGames.find((game) => game.id === gameId);
      if (!match) throw new NotFoundError();
      return match;
    });
  } else {
    selected = allGames.slice(0, MAX_CROSS_GAME_GAMES);
    omittedCount = allGames.length - selected.length;
  }

  const loaded = await Promise.all(selected.map((game) => loadGameBalances(repo, game)));

  const byPerson = new Map<string, PersonAccumulator>();
  let totalExpense = 0;

  selected.forEach((game, index) => {
    const { totalExpense: gameTotal, rows } = loaded[index];
    totalExpense += gameTotal;

    for (const row of rows) {
      const key = personKey(row.name);
      if (key === "") continue;

      const person = byPerson.get(key) || { name: row.name, paid: 0, owed: 0, games: [] };
      person.paid += row.paid;
      person.owed += row.owed;
      person.games.push({ code: game.code, name: game.name, balance: row.balance });
      byPerson.set(key, person);
    }
  });

  const people: ApiCrossGamePerson[] = [...byPerson.values()]
    .map((person) => ({
      name: person.name,
      paid: person.paid,
      owed: person.owed,
      net: person.paid - person.owed,
      games: person.games,
    }))
    .sort((a, b) => b.net - a.net || a.name.localeCompare(b.name, "vi"));

  // Tinh chuyen tien tren so du da gop: dung lai dung thuat toan cua tung
  // cuoc, chi thay participantId bang ten.
  const aggregated: BalanceRow[] = people.map((person) => ({
    participantId: person.name,
    paid: person.paid,
    owed: person.owed,
    balance: person.net,
  }));

  return {
    games: selected.map((game) => ({ code: game.code, name: game.name })),
    // Noi ro da bo bot: im lang thi nguoi doc tuong day la toan bo lich su.
    omittedGameCount: omittedCount,
    totalExpense,
    people,
    settlements: calculateSettlements(aggregated).map((row) => ({
      from: row.fromParticipantId,
      to: row.toParticipantId,
      amount: row.amount,
    })),
    // Ten chi thay o mot cuoc trong khi dang gop nhieu cuoc: hoac nguoi do that
    // su chi tham gia mot cuoc, hoac ten bi go khac nhau nen khong gop duoc.
    namesInOneGameOnly:
      selected.length > 1
        ? people.filter((person) => person.games.length === 1).map((person) => person.name)
        : [],
  };
}
