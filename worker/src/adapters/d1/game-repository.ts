import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type {
  CollaboratorRow,
  ExpenseRow,
  ExpenseSplitRow,
  ExpenseUpdate,
  GameRepository,
  GameRow,
  GameEventRow,
  McpTokenRow,
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
          .where(and(eq(schema.games.ownerUserId, userId), isNull(schema.games.deletedAt)))
          .orderBy(sql`${schema.games.createdAt} desc`);
      },
      async listSharedWithUser(userId): Promise<GameRow[]> {
        const rows = await db
          .select({ game: schema.games })
          .from(schema.gameCollaborators)
          .innerJoin(schema.games, eq(schema.games.id, schema.gameCollaborators.gameId))
          .where(
            and(eq(schema.gameCollaborators.userId, userId), isNull(schema.games.deletedAt)),
          )
          .orderBy(sql`${schema.games.createdAt} desc`);
        return rows.map((row) => row.game);
      },
      async listDeletedByOwner(userId): Promise<GameRow[]> {
        return db
          .select()
          .from(schema.games)
          .where(and(eq(schema.games.ownerUserId, userId), isNotNull(schema.games.deletedAt)))
          .orderBy(sql`${schema.games.deletedAt} desc`);
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
      async update(gameId, changes, updatedAt) {
        await db
          .update(schema.games)
          .set({ ...changes, updatedAt })
          .where(eq(schema.games.id, gameId));
      },
      async setDeletedAt(gameId, deletedAt) {
        await db
          .update(schema.games)
          .set({ deletedAt })
          .where(eq(schema.games.id, gameId));
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
          .orderBy(asc(schema.participants.sequence), asc(schema.participants.createdAt));
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
        await db.insert(schema.participants).values({
          ...row,
          sequence: sql`(SELECT COALESCE(MAX(${schema.participants.sequence}), 0) + 1 FROM ${schema.participants} WHERE ${schema.participants.gameId} = ${row.gameId})`,
        });
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
      async reorder(gameId, orderedIds) {
        const [{ minSequence }] = await db
          .select({ minSequence: sql<number>`COALESCE(MIN(${schema.participants.sequence}), 0)` })
          .from(schema.participants)
          .where(eq(schema.participants.gameId, gameId));

        const base = minSequence - orderedIds.length;
        await Promise.all(
          orderedIds.map((id, index) =>
            db
              .update(schema.participants)
              .set({ sequence: base + index })
              .where(and(eq(schema.participants.id, id), eq(schema.participants.gameId, gameId))),
          ),
        );
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
      async listByOwner(userId) {
        // leftJoin: nguoi chua nhap QR van phai co trong danh ba.
        const rows = await db
          .select({
            name: schema.participants.name,
            gameId: schema.participants.gameId,
            createdAt: schema.participants.createdAt,
            bankId: schema.paymentProfiles.bankId,
            accountNo: schema.paymentProfiles.accountNo,
            accountName: schema.paymentProfiles.accountName,
          })
          .from(schema.participants)
          .innerJoin(schema.games, eq(schema.games.id, schema.participants.gameId))
          .leftJoin(
            schema.paymentProfiles,
            eq(schema.paymentProfiles.participantId, schema.participants.id),
          )
          .where(eq(schema.games.ownerUserId, userId));

        return rows.map((row) => ({
          name: row.name,
          gameId: row.gameId,
          createdAt: row.createdAt,
          bankId: row.bankId || "",
          accountNo: row.accountNo || "",
          accountName: row.accountName || "",
        }));
      },
      async listIdNamesByOwner(userId) {
        return db
          .select({
            id: schema.participants.id,
            name: schema.participants.name,
            gameId: schema.participants.gameId,
          })
          .from(schema.participants)
          .innerJoin(schema.games, eq(schema.games.id, schema.participants.gameId))
          .where(eq(schema.games.ownerUserId, userId));
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
          .orderBy(desc(schema.expenses.sequence), desc(schema.expenses.createdAt));
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
        await db.insert(schema.expenses).values({
          ...row,
          sequence: sql`(SELECT COALESCE(MAX(${schema.expenses.sequence}), 0) + 1 FROM ${schema.expenses} WHERE ${schema.expenses.gameId} = ${row.gameId})`,
        });
      },
      async update(expenseId, fields: ExpenseUpdate) {
        await db.update(schema.expenses).set(fields).where(eq(schema.expenses.id, expenseId));
      },
      async delete(expenseId) {
        await db.delete(schema.expenses).where(eq(schema.expenses.id, expenseId));
      },
      async listByGameIds(gameIds) {
        if (gameIds.length === 0) return [];
        return db.select().from(schema.expenses).where(inArray(schema.expenses.gameId, gameIds));
      },
      async reorder(gameId, orderedIds) {
        const [{ maxSequence }] = await db
          .select({ maxSequence: sql<number>`COALESCE(MAX(${schema.expenses.sequence}), 0)` })
          .from(schema.expenses)
          .where(eq(schema.expenses.gameId, gameId));

        const base = maxSequence + orderedIds.length;
        await Promise.all(
          orderedIds.map((id, index) =>
            db
              .update(schema.expenses)
              .set({ sequence: base - index })
              .where(and(eq(schema.expenses.id, id), eq(schema.expenses.gameId, gameId))),
          ),
        );
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

    mcpTokens: {
      async listByUser(userId): Promise<McpTokenRow[]> {
        return db
          .select()
          .from(schema.mcpTokens)
          .where(eq(schema.mcpTokens.userId, userId))
          .orderBy(desc(schema.mcpTokens.createdAt));
      },
      async countActiveByUser(userId) {
        const rows = await db
          .select({ value: sql<number>`count(*)` })
          .from(schema.mcpTokens)
          .where(
            and(eq(schema.mcpTokens.userId, userId), isNull(schema.mcpTokens.revokedAt)),
          );
        return Number(rows[0]?.value || 0);
      },
      async findByHash(tokenHash): Promise<McpTokenRow | null> {
        const rows = await db
          .select()
          .from(schema.mcpTokens)
          .where(eq(schema.mcpTokens.tokenHash, tokenHash))
          .limit(1);
        return rows[0] || null;
      },
      async insert(row) {
        await db.insert(schema.mcpTokens).values(row);
      },
      async revoke(tokenId, userId, revokedAt) {
        // Loc ca userId trong WHERE: khong the thu hoi token cua nguoi khac du
        // co doan dung id. isNull(revokedAt) de lan thu hoi thu hai tra false.
        const rows = await db
          .update(schema.mcpTokens)
          .set({ revokedAt })
          .where(
            and(
              eq(schema.mcpTokens.id, tokenId),
              eq(schema.mcpTokens.userId, userId),
              isNull(schema.mcpTokens.revokedAt),
            ),
          )
          .returning({ id: schema.mcpTokens.id });
        return rows.length > 0;
      },
      async touchLastUsed(tokenId, lastUsedAt) {
        await db
          .update(schema.mcpTokens)
          .set({ lastUsedAt })
          .where(eq(schema.mcpTokens.id, tokenId));
      },
    },

    userPreferences: {
      async listByUser(userId) {
        return db
          .select({ key: schema.userPreferences.key, value: schema.userPreferences.value })
          .from(schema.userPreferences)
          .where(eq(schema.userPreferences.userId, userId));
      },
      async upsert(userId, key, value, updatedAt) {
        await db
          .insert(schema.userPreferences)
          .values({ id: createId("pref"), userId, key, value, updatedAt })
          .onConflictDoUpdate({
            target: [schema.userPreferences.userId, schema.userPreferences.key],
            set: { value, updatedAt },
          });
      },
    },

    contacts: {
      async listByOwner(userId) {
        return db
          .select({
            id: schema.contacts.id,
            name: schema.contacts.name,
            bankId: schema.contacts.bankId,
            accountNo: schema.contacts.accountNo,
            accountName: schema.contacts.accountName,
            updatedAt: schema.contacts.updatedAt,
          })
          .from(schema.contacts)
          .where(eq(schema.contacts.ownerUserId, userId))
          .orderBy(asc(schema.contacts.name));
      },
      async getOwned(contactId, userId) {
        const rows = await db
          .select({
            id: schema.contacts.id,
            name: schema.contacts.name,
            bankId: schema.contacts.bankId,
            accountNo: schema.contacts.accountNo,
            accountName: schema.contacts.accountName,
            updatedAt: schema.contacts.updatedAt,
          })
          .from(schema.contacts)
          .where(and(eq(schema.contacts.id, contactId), eq(schema.contacts.ownerUserId, userId)))
          .limit(1);
        return rows[0] || null;
      },
      async upsert(row) {
        await db
          .insert(schema.contacts)
          .values({
            id: row.id,
            ownerUserId: row.ownerUserId,
            name: row.name,
            nameKey: row.nameKey,
            bankId: row.bankId,
            accountNo: row.accountNo,
            accountName: row.accountName,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          })
          // Them lai nguoi da co trong danh ba la y muon cap nhat, khong phai loi.
          .onConflictDoUpdate({
            target: [schema.contacts.ownerUserId, schema.contacts.nameKey],
            set: {
              name: row.name,
              bankId: row.bankId,
              accountNo: row.accountNo,
              accountName: row.accountName,
              updatedAt: row.updatedAt,
            },
          });
      },
      async update(contactId, fields, updatedAt) {
        await db
          .update(schema.contacts)
          .set({ ...fields, updatedAt })
          .where(eq(schema.contacts.id, contactId));
      },
      async delete(contactId) {
        await db.delete(schema.contacts).where(eq(schema.contacts.id, contactId));
      },
    },

    gameEvents: {
      async listByGame(gameId, limit) {
        return db
          .select()
          .from(schema.gameEvents)
          .where(eq(schema.gameEvents.gameId, gameId))
          .orderBy(desc(schema.gameEvents.createdAt))
          .limit(limit);
      },
      async getWithGame(eventId) {
        const rows = await db
          .select({ event: schema.gameEvents, game: schema.games })
          .from(schema.gameEvents)
          .innerJoin(schema.games, eq(schema.games.id, schema.gameEvents.gameId))
          .where(eq(schema.gameEvents.id, eventId))
          .limit(1);
        return rows[0] || null;
      },
      async insert(row) {
        await db.insert(schema.gameEvents).values(row);
      },
      async markUndone(eventId, undoneAt) {
        await db
          .update(schema.gameEvents)
          .set({ undoneAt })
          .where(eq(schema.gameEvents.id, eventId));
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

    users: {
      async findIdByEmail(email) {
        const rows = await db
          .select({ id: schema.user.id, name: schema.user.name, email: schema.user.email })
          .from(schema.user)
          .where(sql`lower(${schema.user.email}) = lower(${email})`)
          .limit(1);
        return rows[0] || null;
      },
      async listAllExceptOwner(ownerUserId) {
        return db
          .select({ id: schema.user.id, name: schema.user.name, email: schema.user.email })
          .from(schema.user)
          .where(sql`${schema.user.id} != ${ownerUserId}`)
          .orderBy(asc(schema.user.name));
      },
      async updateName(userId, name, updatedAt) {
        await db.update(schema.user).set({ name, updatedAt }).where(eq(schema.user.id, userId));
      },
    },

    gameCollaborators: {
      async listByGame(gameId): Promise<CollaboratorRow[]> {
        const rows = await db
          .select({
            id: schema.gameCollaborators.id,
            gameId: schema.gameCollaborators.gameId,
            userId: schema.gameCollaborators.userId,
            invitedEmail: schema.gameCollaborators.invitedEmail,
            createdAt: schema.gameCollaborators.createdAt,
            name: schema.user.name,
            email: schema.user.email,
          })
          .from(schema.gameCollaborators)
          // leftJoin: invite "cho" (userId null) van phai hien trong danh sach.
          .leftJoin(schema.user, eq(schema.user.id, schema.gameCollaborators.userId))
          .where(eq(schema.gameCollaborators.gameId, gameId))
          .orderBy(asc(schema.gameCollaborators.createdAt));

        return rows.map((row) => ({
          ...row,
          name: row.name || "",
          email: row.email || row.invitedEmail,
        }));
      },
      async isCollaborator(gameId, userId) {
        const rows = await db
          .select({ id: schema.gameCollaborators.id })
          .from(schema.gameCollaborators)
          .where(
            and(
              eq(schema.gameCollaborators.gameId, gameId),
              eq(schema.gameCollaborators.userId, userId),
            ),
          )
          .limit(1);
        return rows.length > 0;
      },
      async add(row) {
        const existing = await db
          .select({ id: schema.gameCollaborators.id })
          .from(schema.gameCollaborators)
          .where(
            and(
              eq(schema.gameCollaborators.gameId, row.gameId),
              eq(schema.gameCollaborators.invitedEmail, row.invitedEmail),
            ),
          )
          .limit(1);
        if (existing.length > 0) return false;

        await db.insert(schema.gameCollaborators).values(row);
        return true;
      },
      async remove(gameId, target) {
        const matchTarget = target.userId
          ? eq(schema.gameCollaborators.userId, target.userId)
          : eq(schema.gameCollaborators.invitedEmail, target.invitedEmail || "");
        await db
          .delete(schema.gameCollaborators)
          .where(and(eq(schema.gameCollaborators.gameId, gameId), matchTarget));
      },
      async resolvePendingByEmail(email, userId) {
        await db
          .update(schema.gameCollaborators)
          .set({ userId })
          .where(
            and(
              sql`lower(${schema.gameCollaborators.invitedEmail}) = lower(${email})`,
              isNull(schema.gameCollaborators.userId),
            ),
          );
      },
    },
  };
}
