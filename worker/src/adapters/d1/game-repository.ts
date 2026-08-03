import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type {
  ExpenseRow,
  ExpenseSplitRow,
  ExpenseUpdate,
  GameRepository,
  GameRow,
  NewSplitRow,
  ParticipantRow,
  PhotoDetailRow,
  PhotoRow,
  PaymentProfileRow,
  ShareLinkRow,
} from "../../core/ports/game-repository";
import { createId } from "../../lib/ids";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

export function createDb(d1: D1Database): Db {
  return drizzle(d1, { schema });
}

async function countBy(
  db: Db,
  table: typeof schema.participants | typeof schema.expenses,
  gameIds: string[],
  onlyExpenseKind?: string,
): Promise<Map<string, number>> {
  if (gameIds.length === 0) return new Map();

  const where =
    table === schema.expenses && onlyExpenseKind
      ? and(inArray(table.gameId, gameIds), eq(schema.expenses.kind, onlyExpenseKind))
      : inArray(table.gameId, gameIds);

  const rows = await db
    .select({ gameId: table.gameId, value: sql<number>`count(*)` })
    .from(table)
    .where(where)
    .groupBy(table.gameId);

  return new Map(rows.map((row) => [row.gameId, row.value]));
}

/** Cot cua mot anh khi khong can du lieu anh goc (cot `data` rat nang). */
const PHOTO_COLUMNS = {
  id: schema.gamePhotos.id,
  gameId: schema.gamePhotos.gameId,
  expenseId: schema.gamePhotos.expenseId,
  caption: schema.gamePhotos.caption,
  mimeType: schema.gamePhotos.mimeType,
  width: schema.gamePhotos.width,
  height: schema.gamePhotos.height,
  thumbData: schema.gamePhotos.thumbData,
  createdAt: schema.gamePhotos.createdAt,
};

export function createD1GameRepository(d1: D1Database): GameRepository {
  const db = createDb(d1);

  const selectPhotos = () => db.select(PHOTO_COLUMNS).from(schema.gamePhotos);

  return {
    games: {
      async listByOwner(userId): Promise<GameRow[]> {
        return db
          .select()
          .from(schema.games)
          .where(eq(schema.games.ownerUserId, userId))
          .orderBy(sql`${schema.games.createdAt} desc`);
      },
      countParticipants: (gameIds) => countBy(db, schema.participants, gameIds),
      countExpenses: (gameIds) => countBy(db, schema.expenses, gameIds, "expense"),
      async insert(row) {
        await db.insert(schema.games).values(row);
      },
      async getById(gameId) {
        const rows = await db
          .select()
          .from(schema.games)
          .where(eq(schema.games.id, gameId))
          .limit(1);
        return rows[0] || null;
      },
      async rename(gameId, name, updatedAt) {
        await db.update(schema.games).set({ name, updatedAt }).where(eq(schema.games.id, gameId));
      },
      async delete(gameId) {
        await db.delete(schema.games).where(eq(schema.games.id, gameId));
      },
    },

    participants: {
      async listByGame(gameId): Promise<ParticipantRow[]> {
        return db
          .select()
          .from(schema.participants)
          .where(eq(schema.participants.gameId, gameId))
          .orderBy(asc(schema.participants.createdAt));
      },
      async listIdsByGame(gameId) {
        const rows = await db
          .select({ id: schema.participants.id })
          .from(schema.participants)
          .where(eq(schema.participants.gameId, gameId));
        return rows.map((row) => row.id);
      },
      async getWithGame(participantId) {
        const rows = await db
          .select({ participant: schema.participants, game: schema.games })
          .from(schema.participants)
          .innerJoin(schema.games, eq(schema.games.id, schema.participants.gameId))
          .where(eq(schema.participants.id, participantId))
          .limit(1);
        return rows[0] || null;
      },
      async insert(row, payment) {
        await db.insert(schema.participants).values(row);
        await db.insert(schema.paymentProfiles).values({
          id: createId("payment"),
          participantId: row.id,
          bankId: payment.bankId,
          accountNo: payment.accountNo,
          accountName: payment.accountName,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        });
      },
      async rename(participantId, name, updatedAt) {
        await db
          .update(schema.participants)
          .set({ name, updatedAt })
          .where(eq(schema.participants.id, participantId));
      },
      async upsertPaymentProfile(participantId, fields, updatedAt) {
        await db
          .insert(schema.paymentProfiles)
          .values({
            id: createId("payment"),
            participantId,
            bankId: fields.bankId || "",
            accountNo: fields.accountNo || "",
            accountName: fields.accountName || "",
            createdAt: updatedAt,
            updatedAt,
          })
          .onConflictDoUpdate({
            target: schema.paymentProfiles.participantId,
            set: { ...fields, updatedAt },
          });
      },
      async delete(participantId) {
        await db.delete(schema.participants).where(eq(schema.participants.id, participantId));
      },
    },

    paymentProfiles: {
      async listByParticipantIds(participantIds): Promise<PaymentProfileRow[]> {
        if (participantIds.length === 0) return [];
        return db
          .select({
            participantId: schema.paymentProfiles.participantId,
            bankId: schema.paymentProfiles.bankId,
            accountNo: schema.paymentProfiles.accountNo,
            accountName: schema.paymentProfiles.accountName,
          })
          .from(schema.paymentProfiles)
          .where(inArray(schema.paymentProfiles.participantId, participantIds));
      },
    },

    expenses: {
      async listByGame(gameId): Promise<ExpenseRow[]> {
        return db
          .select()
          .from(schema.expenses)
          .where(eq(schema.expenses.gameId, gameId))
          .orderBy(desc(schema.expenses.createdAt));
      },
      async getById(expenseId) {
        const rows = await db
          .select()
          .from(schema.expenses)
          .where(eq(schema.expenses.id, expenseId))
          .limit(1);
        return rows[0] || null;
      },
      async getWithGame(expenseId) {
        const rows = await db
          .select({ expense: schema.expenses, game: schema.games })
          .from(schema.expenses)
          .innerJoin(schema.games, eq(schema.games.id, schema.expenses.gameId))
          .where(eq(schema.expenses.id, expenseId))
          .limit(1);
        return rows[0] || null;
      },
      async insert(row) {
        await db.insert(schema.expenses).values(row);
      },
      async update(expenseId, fields: ExpenseUpdate) {
        await db.update(schema.expenses).set(fields).where(eq(schema.expenses.id, expenseId));
      },
      async delete(expenseId) {
        await db.delete(schema.expenses).where(eq(schema.expenses.id, expenseId));
      },
      async listIdsSplitWith(participantId) {
        const rows = await db
          .select({ expenseId: schema.expenseSplits.expenseId })
          .from(schema.expenseSplits)
          .where(eq(schema.expenseSplits.participantId, participantId));
        return [...new Set(rows.map((row) => row.expenseId))];
      },
    },

    splits: {
      async listByExpenseIds(expenseIds): Promise<ExpenseSplitRow[]> {
        if (expenseIds.length === 0) return [];
        return db
          .select({
            expenseId: schema.expenseSplits.expenseId,
            participantId: schema.expenseSplits.participantId,
            amount: schema.expenseSplits.amount,
            weight: schema.expenseSplits.weight,
          })
          .from(schema.expenseSplits)
          .where(inArray(schema.expenseSplits.expenseId, expenseIds));
      },
      async listByExpense(expenseId): Promise<ExpenseSplitRow[]> {
        return db
          .select({
            expenseId: schema.expenseSplits.expenseId,
            participantId: schema.expenseSplits.participantId,
            amount: schema.expenseSplits.amount,
            weight: schema.expenseSplits.weight,
          })
          .from(schema.expenseSplits)
          .where(eq(schema.expenseSplits.expenseId, expenseId));
      },
      async listLiveByExpense(expenseId): Promise<ExpenseSplitRow[]> {
        return db
          .select({
            expenseId: schema.expenseSplits.expenseId,
            participantId: schema.expenseSplits.participantId,
            amount: schema.expenseSplits.amount,
            weight: schema.expenseSplits.weight,
          })
          .from(schema.expenseSplits)
          .innerJoin(
            schema.participants,
            eq(schema.participants.id, schema.expenseSplits.participantId),
          )
          .where(eq(schema.expenseSplits.expenseId, expenseId))
          .orderBy(schema.participants.createdAt);
      },
      async replace(expenseId, rows: NewSplitRow[]) {
        await db.delete(schema.expenseSplits).where(eq(schema.expenseSplits.expenseId, expenseId));
        if (rows.length > 0) {
          await db.insert(schema.expenseSplits).values(rows);
        }
      },
    },

    photos: {
      listByGame: (gameId) => selectPhotos().where(eq(schema.gamePhotos.gameId, gameId))
        .orderBy(desc(schema.gamePhotos.createdAt)),
      async countByGame(gameId) {
        const rows = await db
          .select({ value: sql<number>`count(*)` })
          .from(schema.gamePhotos)
          .where(eq(schema.gamePhotos.gameId, gameId));
        return rows[0]?.value || 0;
      },
      async getById(photoId): Promise<PhotoRow | null> {
        const rows = await selectPhotos().where(eq(schema.gamePhotos.id, photoId)).limit(1);
        return rows[0] || null;
      },
      async getWithGame(photoId) {
        const rows = await db
          .select({ photo: PHOTO_COLUMNS, game: schema.games })
          .from(schema.gamePhotos)
          .innerJoin(schema.games, eq(schema.games.id, schema.gamePhotos.gameId))
          .where(eq(schema.gamePhotos.id, photoId))
          .limit(1);
        return rows[0] || null;
      },
      async getDetail(photoId): Promise<PhotoDetailRow | null> {
        const rows = await db
          .select({ ...PHOTO_COLUMNS, data: schema.gamePhotos.data })
          .from(schema.gamePhotos)
          .where(eq(schema.gamePhotos.id, photoId))
          .limit(1);
        return rows[0] || null;
      },
      async insert(row) {
        await db.insert(schema.gamePhotos).values(row);
      },
      async update(photoId, fields) {
        await db.update(schema.gamePhotos).set(fields).where(eq(schema.gamePhotos.id, photoId));
      },
      async delete(photoId) {
        await db.delete(schema.gamePhotos).where(eq(schema.gamePhotos.id, photoId));
      },
    },

    shareLinks: {
      async getLatestByGame(gameId): Promise<ShareLinkRow | null> {
        const rows = await db
          .select()
          .from(schema.shareLinks)
          .where(eq(schema.shareLinks.gameId, gameId))
          .orderBy(desc(schema.shareLinks.createdAt))
          .limit(1);
        return rows[0] || null;
      },
      async replace(gameId, row) {
        await db.delete(schema.shareLinks).where(eq(schema.shareLinks.gameId, gameId));
        await db.insert(schema.shareLinks).values(row);
      },
      async setEnabled(gameId, enabled) {
        await db
          .update(schema.shareLinks)
          .set({ enabled })
          .where(eq(schema.shareLinks.gameId, gameId));
      },
      async findByToken(token) {
        const rows = await db
          .select({ link: schema.shareLinks, game: schema.games })
          .from(schema.shareLinks)
          .innerJoin(schema.games, eq(schema.games.id, schema.shareLinks.gameId))
          .where(eq(schema.shareLinks.token, token))
          .limit(1);
        return rows[0] || null;
      },
    },
  };
}
