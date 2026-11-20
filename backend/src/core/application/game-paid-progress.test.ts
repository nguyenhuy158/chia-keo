import { describe, expect, it } from "vitest";
import type { ExpenseRow } from "../ports/game-repository";
import {
  createFakeRepo,
  FAKE_GAME_ID,
  FAKE_OWNER,
  gameRow,
} from "./fake-game-repository";
import { loadPaidProgress } from "./game-paid-progress";
import { listClosedGames, listGames } from "./games";

function expenseRow(
  id: string,
  payer: string,
  amount: number,
  overrides: Partial<ExpenseRow> = {},
): ExpenseRow {
  return {
    id,
    gameId: FAKE_GAME_ID,
    payerParticipantId: payer,
    kind: "expense",
    category: "",
    title: id,
    amount,
    note: "",
    splitMode: "equal",
    excluded: false,
    sequence: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function split(expenseId: string, participantId: string, amount: number) {
  return { expenseId, participantId, amount, weight: null };
}

const sharedExpense = [
  expenseRow("e1", "a", 300),
  split("e1", "a", 100),
  split("e1", "b", 100),
  split("e1", "c", 100),
];

function seed(extra: (ExpenseRow | ReturnType<typeof split>)[] = []) {
  const all = [...sharedExpense, ...extra];
  return createFakeRepo({
    expenses: all.filter((item): item is ExpenseRow => "id" in item),
    splits: all.filter(
      (item): item is ReturnType<typeof split> => "expenseId" in item,
    ),
  });
}

describe("loadPaidProgress", () => {
  it("counts every debtor as unpaid until a payment is recorded", async () => {
    const fake = seed();
    const result = await loadPaidProgress(fake.repo, [FAKE_GAME_ID]);
    expect(result.get(FAKE_GAME_ID)).toEqual({ paid: 0, total: 2 });
  });

  it("counts a debtor as paid once a transfer settles their balance", async () => {
    const fake = seed([
      expenseRow("t1", "b", 100, { kind: "transfer" }),
      split("t1", "a", 100),
    ]);
    const result = await loadPaidProgress(fake.repo, [FAKE_GAME_ID]);
    expect(result.get(FAKE_GAME_ID)).toEqual({ paid: 1, total: 2 });
  });

  it("keeps a partial payment unpaid and ignores excluded expenses", async () => {
    const fake = seed([
      expenseRow("t1", "b", 40, { kind: "transfer" }),
      split("t1", "a", 40),
      expenseRow("x1", "c", 900, { excluded: true }),
      split("x1", "a", 900),
    ]);
    const result = await loadPaidProgress(fake.repo, [FAKE_GAME_ID]);
    expect(result.get(FAKE_GAME_ID)).toEqual({ paid: 0, total: 2 });
  });

  it("returns nothing when nobody owes money or there are no games", async () => {
    const solo = createFakeRepo({
      expenses: [expenseRow("e1", "a", 100)],
      splits: [split("e1", "a", 100)],
    });
    expect((await loadPaidProgress(solo.repo, [FAKE_GAME_ID])).size).toBe(0);
    expect((await loadPaidProgress(solo.repo, [])).size).toBe(0);
  });

  it("reads expenses and splits in chunks for many games", async () => {
    const manyIds = Array.from({ length: 120 }, (_, index) => `g${index}`);
    const fake = seed();
    const result = await loadPaidProgress(fake.repo, [
      ...manyIds,
      FAKE_GAME_ID,
    ]);
    expect(result.get(FAKE_GAME_ID)).toEqual({ paid: 0, total: 2 });
  });
});

describe("game lists", () => {
  it("adds the paid progress only to the active game list", async () => {
    const fake = createFakeRepo({
      games: [gameRow()],
      expenses: [expenseRow("e1", "a", 300)],
      splits: sharedExpense.filter(
        (item): item is ReturnType<typeof split> => "expenseId" in item,
      ),
    });
    const [active] = await listGames(fake.repo, FAKE_OWNER);
    expect(active.paidProgress).toEqual({ paid: 0, total: 2 });

    fake.state.games[0].closedAt = "2026-08-02T00:00:00.000Z";
    const [closed] = await listClosedGames(fake.repo, FAKE_OWNER);
    expect(closed.paidProgress).toBeUndefined();
  });
});
