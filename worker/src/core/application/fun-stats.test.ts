import { describe, expect, it } from "vitest";
import type { ExpenseRow } from "../ports/game-repository";
import {
  createFakeRepo,
  FAKE_GAME_ID,
  FAKE_OWNER,
  gameRow,
  participantRow,
} from "./fake-game-repository";
import { getFunStats, MAX_FUN_STATS_GAMES } from "./fun-stats";

const AN = "participant_an";
const BINH = "participant_binh";

function expenseRow(overrides: Partial<ExpenseRow> = {}): ExpenseRow {
  return {
    id: "expense_1",
    gameId: FAKE_GAME_ID,
    payerParticipantId: AN,
    kind: "expense",
    title: "Nước",
    amount: 90_000,
    note: "",
    splitMode: "equal",
    sequence: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("getFunStats", () => {
  it("chua co cuoc nao thi tra ve bang rong, khong phai loi", async () => {
    const fake = createFakeRepo({ games: [] });

    expect(await getFunStats(fake.repo, FAKE_OWNER)).toMatchObject({
      gameCount: 0,
      totalExpense: 0,
      topPayer: null,
      biggestExpense: null,
      omittedGameCount: 0,
    });
  });

  it("tong chi va nguoi ung nhieu nhat", async () => {
    const fake = createFakeRepo({
      participants: [participantRow(AN, "An"), participantRow(BINH, "Bình", { sequence: 1 })],
      expenses: [
        expenseRow({ id: "expense_1", payerParticipantId: AN, amount: 200_000 }),
        expenseRow({ id: "expense_2", payerParticipantId: BINH, amount: 50_000 }),
      ],
    });

    const stats = await getFunStats(fake.repo, FAKE_OWNER);

    expect(stats.gameCount).toBe(1);
    expect(stats.totalExpense).toBe(250_000);
    expect(stats.topPayer).toMatchObject({ name: "An", totalPaid: 200_000, gameCount: 1 });
    expect(stats.biggestExpense).toMatchObject({ title: "Nước", amount: 200_000 });
  });

  it("cuoc dong nguoi nhat", async () => {
    const fake = createFakeRepo({
      participants: [participantRow(AN, "An"), participantRow(BINH, "Bình", { sequence: 1 })],
      expenses: [expenseRow()],
    });

    expect((await getFunStats(fake.repo, FAKE_OWNER)).biggestGame).toMatchObject({
      name: "Cầu lông",
      participantCount: 2,
    });
  });

  it("cap so cuoc gop lai va bao so cuoc bi bo qua", async () => {
    const games = Array.from({ length: MAX_FUN_STATS_GAMES + 3 }, (_, index) =>
      gameRow({ id: `game_${index}`, code: `CODE${index}` }),
    );
    const fake = createFakeRepo({ games });

    const stats = await getFunStats(fake.repo, FAKE_OWNER);

    expect(stats.gameCount).toBe(MAX_FUN_STATS_GAMES);
    expect(stats.omittedGameCount).toBe(3);
  });

  it("khong tinh cuoc chia cua nguoi khac", async () => {
    const fake = createFakeRepo({ games: [gameRow({ ownerUserId: "user_khac" })] });

    expect((await getFunStats(fake.repo, FAKE_OWNER)).gameCount).toBe(0);
  });
});
