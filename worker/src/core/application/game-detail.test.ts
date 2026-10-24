import { describe, expect, it } from "vitest";
import type { ExpenseRow } from "../ports/game-repository";
import {
  createFakeRepo,
  FAKE_GAME_ID,
  FAKE_OWNER,
  gameRow,
} from "./fake-game-repository";
import {
  loadGameDetail,
  sumTotalExpense,
  toExpenseInputs,
} from "./game-detail";

const expense: ExpenseRow = {
  id: "expense-1",
  gameId: FAKE_GAME_ID,
  payerParticipantId: "p1",
  kind: "expense",
  category: "",
  title: "Sân",
  amount: 1000,
  note: "",
  splitMode: "equal",
  sequence: 0,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

describe("game detail mapping", () => {
  it("counts income as a deduction and ignores transfers", () => {
    expect(
      sumTotalExpense([
        expense,
        { ...expense, id: "income", kind: "income", amount: 200 },
        { ...expense, id: "transfer", kind: "transfer", amount: 500 },
      ]),
    ).toBe(800);
    expect(
      toExpenseInputs(
        [
          { ...expense, kind: "income" },
          { ...expense, kind: "transfer" },
          { ...expense, kind: "unexpected" },
        ],
        new Map(),
      ),
    ).toHaveLength(3);
  });

  it("normalizes an old settlement mode from storage", async () => {
    const oldGame = gameRow({ settlementMode: "legacy" });
    const { repo } = createFakeRepo({ games: [oldGame] });
    const detail = await loadGameDetail(repo, oldGame, FAKE_OWNER);
    expect(detail.settlementMode).toBe("host");
  });
});
