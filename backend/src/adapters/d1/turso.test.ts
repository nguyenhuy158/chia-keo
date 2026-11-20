import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import { addExpense, recordTransfer } from "../../core/application/expenses";
import { createGame, listGames } from "../../core/application/games";
import { createDb, createGameRepository, type Db } from "./game-repository";
import * as schema from "./schema";

const OWNER = "owner";
const SEED_TIME = new Date("2026-01-01T00:00:00Z");

let db: Db;

beforeAll(async () => {
  const libsql = drizzle(createClient({ url: ":memory:" }), { schema });
  await migrate(libsql, { migrationsFolder: "./drizzle-shared" });
  await libsql.insert(schema.user).values({
    id: OWNER,
    name: "Owner",
    email: "owner@example.test",
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  });
  db = libsql;
});

describe("game repository on libsql (Turso)", () => {
  it("creates a game, adds an expense and records a transfer", async () => {
    const repo = createGameRepository(db);
    const created = await createGame(repo, OWNER, {
      name: "Kèo Turso",
      participantCount: 2,
    });
    const [payer, other] = created.participants;
    await addExpense(repo, OWNER, created.id, {
      kind: "expense",
      category: "",
      title: "Tiền sân",
      amount: 100_000,
      note: "",
      payerParticipantId: payer.id,
      splitMode: "equal",
      splitParticipantIds: [payer.id, other.id],
      splits: [],
    });
    const transferred = await recordTransfer(repo, OWNER, created.id, {
      fromParticipantId: other.id,
      toParticipantId: payer.id,
      amount: 50_000,
      note: "",
    });

    expect(transferred.expenses.map((expense) => expense.kind).sort()).toEqual([
      "expense",
      "transfer",
    ]);
    expect(transferred.closeMode).toBe("auto");
    expect((await listGames(repo, OWNER)).map((game) => game.id)).toEqual([]);
  });

  it("uses Turso instead of the D1 binding when a Turso URL is set", () => {
    const turso = createDb({
      DB: undefined as unknown as D1Database,
      TURSO_DATABASE_URL: "libsql://chiakeo.example.turso.io",
      TURSO_AUTH_TOKEN: "test-token",
    });

    expect(turso).toHaveProperty("$client.protocol", "http");
  });
});
