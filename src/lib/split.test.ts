import { describe, expect, it } from "vitest";
import { calculateBalances } from "./split";
import type { Game } from "../types";

const game: Game = {
  id: "game_1",
  code: "ABC123",
  name: "Cuộc chơi mẫu",
  participants: [
    { id: "p1", name: "A" },
    { id: "p2", name: "B" },
    { id: "p3", name: "C" },
  ],
  expenses: [
    {
      id: "e1",
      title: "Bữa tối",
      amount: 100,
      categoryId: "food",
      payerId: "p1",
      splitParticipantIds: ["p1", "p2", "p3"],
      createdAt: "2026-07-03T00:00:00.000Z",
    },
  ],
  shareToken: "share_1",
  createdAt: "2026-07-03T00:00:00.000Z",
};

describe("calculateBalances", () => {
  it("chia phần dư cho người tham gia đứng trước", () => {
    const balances = calculateBalances(game);

    expect(balances.map((row) => row.balance)).toEqual([66, -33, -33]);
  });
});
