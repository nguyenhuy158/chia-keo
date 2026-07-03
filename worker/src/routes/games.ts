import { eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { ApiGame } from "../../../shared/api-types";
import {
  expenseInputSchema,
  gameInputSchema,
  participantInputSchema,
  shareLinkInputSchema,
} from "../../../shared/schemas";
import { allocateAmount } from "../../../shared/split";
import * as schema from "../db/schema";
import { loadGameDetail, loadOwnedGame, type Db } from "../lib/game-data";
import { invalidInput, notFound, readJson } from "../lib/http";
import { createGameCode, createId, createShareToken, nowIso } from "../lib/ids";
import { requireUser, type AuthedEnv } from "../lib/require-user";

const participantUpdateSchema = participantInputSchema.partial();
const expenseUpdateSchema = expenseInputSchema.partial();

async function loadGameParticipantIds(db: Db, gameId: string) {
  const rows = await db
    .select({ id: schema.participants.id })
    .from(schema.participants)
    .where(eq(schema.participants.gameId, gameId));
  return new Set(rows.map((row) => row.id));
}

/**
 * Xoa splits cu va ghi lai splits moi cho mot khoan chi. Thu tu participantIds
 * quyet dinh ai nhan phan du khi so tien le.
 */
async function writeExpenseSplits(
  db: Db,
  expenseId: string,
  amount: number,
  participantIds: string[],
) {
  await db.delete(schema.expenseSplits).where(eq(schema.expenseSplits.expenseId, expenseId));
  const shares = allocateAmount(amount, participantIds);
  if (shares.length > 0) {
    await db.insert(schema.expenseSplits).values(
      shares.map((share) => ({
        id: createId("split"),
        expenseId,
        participantId: share.participantId,
        amount: share.amount,
      })),
    );
  }
}

/**
 * Sau khi mot participant bi xoa, chia lai cac khoan chi bi anh huong cho
 * nhung nguoi con lai; khoan chi khong con ai chiu thi xoa luon.
 */
async function reallocateExpenses(db: Db, expenseIds: string[]) {
  for (const expenseId of expenseIds) {
    const expenseRows = await db
      .select()
      .from(schema.expenses)
      .where(eq(schema.expenses.id, expenseId))
      .limit(1);
    const expense = expenseRows[0];
    if (!expense) continue;

    const splitRows = await db
      .select({ participantId: schema.expenseSplits.participantId })
      .from(schema.expenseSplits)
      .innerJoin(
        schema.participants,
        eq(schema.participants.id, schema.expenseSplits.participantId),
      )
      .where(eq(schema.expenseSplits.expenseId, expenseId))
      .orderBy(schema.participants.createdAt);

    const participantIds = splitRows.map((row) => row.participantId);
    if (participantIds.length === 0) {
      await db.delete(schema.expenses).where(eq(schema.expenses.id, expenseId));
    } else {
      await writeExpenseSplits(db, expenseId, expense.amount, participantIds);
    }
  }
}

async function loadOwnedParticipant(db: Db, participantId: string, userId: string) {
  const rows = await db
    .select({ participant: schema.participants, game: schema.games })
    .from(schema.participants)
    .innerJoin(schema.games, eq(schema.games.id, schema.participants.gameId))
    .where(eq(schema.participants.id, participantId))
    .limit(1);

  const row = rows[0];
  if (!row || row.game.ownerUserId !== userId) return null;
  return row;
}

async function loadOwnedExpense(db: Db, expenseId: string, userId: string) {
  const rows = await db
    .select({ expense: schema.expenses, game: schema.games })
    .from(schema.expenses)
    .innerJoin(schema.games, eq(schema.games.id, schema.expenses.gameId))
    .where(eq(schema.expenses.id, expenseId))
    .limit(1);

  const row = rows[0];
  if (!row || row.game.ownerUserId !== userId) return null;
  return row;
}

export const gamesRouter = new Hono<AuthedEnv>();

gamesRouter.use("*", requireUser);

gamesRouter.get("/games", async (c) => {
  const db = c.get("db");
  const gameRows = await db
    .select()
    .from(schema.games)
    .where(eq(schema.games.ownerUserId, c.get("userId")))
    .orderBy(sql`${schema.games.createdAt} desc`);

  const gameIds = gameRows.map((row) => row.id);

  const participantCounts = gameIds.length
    ? await db
        .select({
          gameId: schema.participants.gameId,
          value: sql<number>`count(*)`,
        })
        .from(schema.participants)
        .where(inArray(schema.participants.gameId, gameIds))
        .groupBy(schema.participants.gameId)
    : [];

  const expenseCounts = gameIds.length
    ? await db
        .select({
          gameId: schema.expenses.gameId,
          value: sql<number>`count(*)`,
        })
        .from(schema.expenses)
        .where(inArray(schema.expenses.gameId, gameIds))
        .groupBy(schema.expenses.gameId)
    : [];

  const participantCountByGameId = new Map(participantCounts.map((row) => [row.gameId, row.value]));
  const expenseCountByGameId = new Map(expenseCounts.map((row) => [row.gameId, row.value]));

  const games: ApiGame[] = gameRows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    createdAt: row.createdAt,
    participantCount: participantCountByGameId.get(row.id) || 0,
    expenseCount: expenseCountByGameId.get(row.id) || 0,
  }));

  return c.json(games);
});

gamesRouter.post("/games", async (c) => {
  const input = await readJson(c, gameInputSchema);
  if (!input) return invalidInput(c);

  const db = c.get("db");
  const now = nowIso();
  const game = {
    id: createId("game"),
    ownerUserId: c.get("userId"),
    code: createGameCode(),
    name: input.name,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(schema.games).values(game);

  return c.json(await loadGameDetail(db, game), 201);
});

gamesRouter.get("/games/:gameId", async (c) => {
  const db = c.get("db");
  const game = await loadOwnedGame(db, c.req.param("gameId"), c.get("userId"));
  if (!game) return notFound(c);

  return c.json(await loadGameDetail(db, game));
});

gamesRouter.patch("/games/:gameId", async (c) => {
  const input = await readJson(c, gameInputSchema);
  if (!input) return invalidInput(c);

  const db = c.get("db");
  const game = await loadOwnedGame(db, c.req.param("gameId"), c.get("userId"));
  if (!game) return notFound(c);

  await db
    .update(schema.games)
    .set({ name: input.name, updatedAt: nowIso() })
    .where(eq(schema.games.id, game.id));

  return c.json(await loadGameDetail(db, { ...game, name: input.name }));
});

gamesRouter.delete("/games/:gameId", async (c) => {
  const db = c.get("db");
  const game = await loadOwnedGame(db, c.req.param("gameId"), c.get("userId"));
  if (!game) return notFound(c);

  await db.delete(schema.games).where(eq(schema.games.id, game.id));

  return c.json({ ok: true });
});

gamesRouter.get("/games/:gameId/summary", async (c) => {
  const db = c.get("db");
  const game = await loadOwnedGame(db, c.req.param("gameId"), c.get("userId"));
  if (!game) return notFound(c);

  const detail = await loadGameDetail(db, game);
  return c.json(detail.summary);
});

gamesRouter.post("/games/:gameId/participants", async (c) => {
  const input = await readJson(c, participantInputSchema);
  if (!input) return invalidInput(c);

  const db = c.get("db");
  const game = await loadOwnedGame(db, c.req.param("gameId"), c.get("userId"));
  if (!game) return notFound(c);

  const now = nowIso();
  const participantId = createId("participant");

  await db.insert(schema.participants).values({
    id: participantId,
    gameId: game.id,
    name: input.name,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(schema.paymentProfiles).values({
    id: createId("payment"),
    participantId,
    bankId: input.bankId,
    accountNo: input.accountNo,
    accountName: input.accountName,
    createdAt: now,
    updatedAt: now,
  });

  return c.json(await loadGameDetail(db, game), 201);
});

gamesRouter.patch("/participants/:participantId", async (c) => {
  const input = await readJson(c, participantUpdateSchema);
  if (!input) return invalidInput(c);

  const db = c.get("db");
  const row = await loadOwnedParticipant(db, c.req.param("participantId"), c.get("userId"));
  if (!row) return notFound(c);

  const now = nowIso();
  if (input.name !== undefined) {
    await db
      .update(schema.participants)
      .set({ name: input.name, updatedAt: now })
      .where(eq(schema.participants.id, row.participant.id));
  }

  const paymentFields = {
    ...(input.bankId !== undefined ? { bankId: input.bankId } : {}),
    ...(input.accountNo !== undefined ? { accountNo: input.accountNo } : {}),
    ...(input.accountName !== undefined ? { accountName: input.accountName } : {}),
  };

  if (Object.keys(paymentFields).length > 0) {
    await db
      .insert(schema.paymentProfiles)
      .values({
        id: createId("payment"),
        participantId: row.participant.id,
        bankId: input.bankId || "",
        accountNo: input.accountNo || "",
        accountName: input.accountName || "",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.paymentProfiles.participantId,
        set: { ...paymentFields, updatedAt: now },
      });
  }

  return c.json(await loadGameDetail(db, row.game));
});

gamesRouter.delete("/participants/:participantId", async (c) => {
  const db = c.get("db");
  const row = await loadOwnedParticipant(db, c.req.param("participantId"), c.get("userId"));
  if (!row) return notFound(c);

  const affectedSplits = await db
    .select({ expenseId: schema.expenseSplits.expenseId })
    .from(schema.expenseSplits)
    .where(eq(schema.expenseSplits.participantId, row.participant.id));
  const affectedExpenseIds = [...new Set(affectedSplits.map((split) => split.expenseId))];

  await db.delete(schema.participants).where(eq(schema.participants.id, row.participant.id));
  await reallocateExpenses(db, affectedExpenseIds);

  return c.json(await loadGameDetail(db, row.game));
});

gamesRouter.post("/games/:gameId/expenses", async (c) => {
  const input = await readJson(c, expenseInputSchema);
  if (!input) return invalidInput(c);

  const db = c.get("db");
  const game = await loadOwnedGame(db, c.req.param("gameId"), c.get("userId"));
  if (!game) return notFound(c);

  const participantIds = await loadGameParticipantIds(db, game.id);
  const splitParticipantIds = [...new Set(input.splitParticipantIds)];
  const validMembers =
    participantIds.has(input.payerParticipantId) &&
    splitParticipantIds.every((id) => participantIds.has(id));
  if (!validMembers) return invalidInput(c);

  const now = nowIso();
  const expenseId = createId("expense");

  await db.insert(schema.expenses).values({
    id: expenseId,
    gameId: game.id,
    payerParticipantId: input.payerParticipantId,
    title: input.title,
    amount: input.amount,
    note: input.note,
    createdAt: now,
    updatedAt: now,
  });
  await writeExpenseSplits(db, expenseId, input.amount, splitParticipantIds);

  return c.json(await loadGameDetail(db, game), 201);
});

gamesRouter.patch("/expenses/:expenseId", async (c) => {
  const input = await readJson(c, expenseUpdateSchema);
  if (!input) return invalidInput(c);

  const db = c.get("db");
  const row = await loadOwnedExpense(db, c.req.param("expenseId"), c.get("userId"));
  if (!row) return notFound(c);

  const participantIds = await loadGameParticipantIds(db, row.game.id);

  const currentSplits = await db
    .select({ participantId: schema.expenseSplits.participantId })
    .from(schema.expenseSplits)
    .where(eq(schema.expenseSplits.expenseId, row.expense.id));

  const amount = input.amount ?? row.expense.amount;
  const splitParticipantIds = [
    ...new Set(input.splitParticipantIds ?? currentSplits.map((split) => split.participantId)),
  ];

  const payerParticipantId = input.payerParticipantId ?? row.expense.payerParticipantId;
  const validMembers =
    participantIds.has(payerParticipantId) &&
    splitParticipantIds.length > 0 &&
    splitParticipantIds.every((id) => participantIds.has(id));
  if (!validMembers) return invalidInput(c);

  await db
    .update(schema.expenses)
    .set({
      title: input.title ?? row.expense.title,
      note: input.note ?? row.expense.note,
      amount,
      payerParticipantId,
      updatedAt: nowIso(),
    })
    .where(eq(schema.expenses.id, row.expense.id));
  await writeExpenseSplits(db, row.expense.id, amount, splitParticipantIds);

  return c.json(await loadGameDetail(db, row.game));
});

gamesRouter.delete("/expenses/:expenseId", async (c) => {
  const db = c.get("db");
  const row = await loadOwnedExpense(db, c.req.param("expenseId"), c.get("userId"));
  if (!row) return notFound(c);

  await db.delete(schema.expenses).where(eq(schema.expenses.id, row.expense.id));

  return c.json(await loadGameDetail(db, row.game));
});

gamesRouter.post("/games/:gameId/share-links", async (c) => {
  const db = c.get("db");
  const game = await loadOwnedGame(db, c.req.param("gameId"), c.get("userId"));
  if (!game) return notFound(c);

  await db.delete(schema.shareLinks).where(eq(schema.shareLinks.gameId, game.id));
  await db.insert(schema.shareLinks).values({
    id: createId("share"),
    gameId: game.id,
    token: createShareToken(),
    enabled: true,
    createdAt: nowIso(),
    expiresAt: null,
  });

  return c.json(await loadGameDetail(db, game), 201);
});

gamesRouter.patch("/games/:gameId/share-link", async (c) => {
  const input = await readJson(c, shareLinkInputSchema);
  if (!input) return invalidInput(c);

  const db = c.get("db");
  const game = await loadOwnedGame(db, c.req.param("gameId"), c.get("userId"));
  if (!game) return notFound(c);

  await db
    .update(schema.shareLinks)
    .set({ enabled: input.enabled })
    .where(eq(schema.shareLinks.gameId, game.id));

  return c.json(await loadGameDetail(db, game));
});
