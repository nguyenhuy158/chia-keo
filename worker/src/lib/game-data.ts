import { asc, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type {
  ApiExpense,
  ApiGameDetail,
  ApiParticipant,
  ApiShareLink,
  ApiShareView,
  ApiSummary,
} from "../../../shared/api-types";
import { calculateBalances, calculateSettlements } from "../../../shared/split";
import * as schema from "../db/schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

export function createDb(d1: D1Database): Db {
  return drizzle(d1, { schema });
}

type GameRow = typeof schema.games.$inferSelect;

type GameData = {
  participants: ApiParticipant[];
  expenses: ApiExpense[];
  summary: ApiSummary;
};

async function loadGameData(db: Db, gameId: string): Promise<GameData> {
  const participantRows = await db
    .select()
    .from(schema.participants)
    .where(eq(schema.participants.gameId, gameId))
    .orderBy(asc(schema.participants.createdAt));

  const participantIds = participantRows.map((row) => row.id);

  const paymentRows = participantIds.length
    ? await db
        .select()
        .from(schema.paymentProfiles)
        .where(inArray(schema.paymentProfiles.participantId, participantIds))
    : [];
  const paymentByParticipantId = new Map(paymentRows.map((row) => [row.participantId, row]));

  const expenseRows = await db
    .select()
    .from(schema.expenses)
    .where(eq(schema.expenses.gameId, gameId))
    .orderBy(desc(schema.expenses.createdAt));

  const expenseIds = expenseRows.map((row) => row.id);
  const splitRows = expenseIds.length
    ? await db
        .select()
        .from(schema.expenseSplits)
        .where(inArray(schema.expenseSplits.expenseId, expenseIds))
    : [];

  const splitsByExpenseId = new Map<string, typeof splitRows>();
  for (const split of splitRows) {
    const list = splitsByExpenseId.get(split.expenseId) || [];
    list.push(split);
    splitsByExpenseId.set(split.expenseId, list);
  }

  const participants: ApiParticipant[] = participantRows.map((row) => {
    const payment = paymentByParticipantId.get(row.id);
    return {
      id: row.id,
      name: row.name,
      bankId: payment?.bankId || "",
      accountNo: payment?.accountNo || "",
      accountName: payment?.accountName || "",
    };
  });

  const expenses: ApiExpense[] = expenseRows.map((row) => ({
    id: row.id,
    title: row.title,
    amount: row.amount,
    note: row.note,
    payerParticipantId: row.payerParticipantId,
    splitParticipantIds: (splitsByExpenseId.get(row.id) || []).map((split) => split.participantId),
    createdAt: row.createdAt,
  }));

  const balances = calculateBalances(
    participantIds,
    expenseRows.map((row) => ({
      payerParticipantId: row.payerParticipantId,
      amount: row.amount,
      shares: (splitsByExpenseId.get(row.id) || []).map((split) => ({
        participantId: split.participantId,
        amount: split.amount,
      })),
    })),
  );

  const summary: ApiSummary = {
    totalExpense: expenseRows.reduce((total, row) => total + row.amount, 0),
    balances,
    settlements: calculateSettlements(balances),
  };

  return { participants, expenses, summary };
}

export async function loadShareLink(db: Db, gameId: string): Promise<ApiShareLink | null> {
  const rows = await db
    .select()
    .from(schema.shareLinks)
    .where(eq(schema.shareLinks.gameId, gameId))
    .orderBy(desc(schema.shareLinks.createdAt))
    .limit(1);

  const link = rows[0];
  return link ? { token: link.token, enabled: link.enabled } : null;
}

export async function loadGameDetail(db: Db, game: GameRow): Promise<ApiGameDetail> {
  const [data, shareLink] = await Promise.all([
    loadGameData(db, game.id),
    loadShareLink(db, game.id),
  ]);

  return {
    id: game.id,
    code: game.code,
    name: game.name,
    createdAt: game.createdAt,
    shareLink,
    ...data,
  };
}

export async function loadShareView(db: Db, game: GameRow): Promise<ApiShareView> {
  const data = await loadGameData(db, game.id);

  return {
    code: game.code,
    name: game.name,
    ...data,
  };
}

export async function loadOwnedGame(db: Db, gameId: string, userId: string) {
  const rows = await db
    .select()
    .from(schema.games)
    .where(eq(schema.games.id, gameId))
    .limit(1);

  const game = rows[0];
  if (!game || game.ownerUserId !== userId) return null;
  return game;
}
