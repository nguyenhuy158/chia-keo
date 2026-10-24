import { describe, expect, it, vi } from "vitest";
import { createFakeRepo, FAKE_OWNER, gameRow } from "./fake-game-repository";
import { getFunStats, MAX_FUN_STATS_GAMES } from "./fun-stats";

describe("getFunStats", () => {
  it("returns an empty summary without querying related tables", async () => {
    const { repo } = createFakeRepo({ games: [] });
    const counts = vi.spyOn(repo.games, "countParticipants");
    const rows = vi.spyOn(repo.expenses, "listByGameIds");
    const result = await getFunStats(repo, FAKE_OWNER);
    expect(result).toEqual({
      gameCount: 0,
      totalExpense: 0,
      topPayer: null,
      mostActive: null,
      biggestExpense: null,
      biggestGame: null,
      favoriteWeekday: null,
      omittedGameCount: 0,
    });
    expect(counts).not.toHaveBeenCalled();
    expect(rows).not.toHaveBeenCalled();
  });

  it("caps old games and aggregates selected games in three batch reads", async () => {
    const games = Array.from({ length: MAX_FUN_STATS_GAMES + 1 }, (_, index) =>
      gameRow({ id: `game-${index}`, name: `Kèo ${index}` }),
    );
    const { repo } = createFakeRepo({ games });
    const countParticipants = vi
      .spyOn(repo.games, "countParticipants")
      .mockResolvedValue(new Map([[games[0].id, 3]]));
    const listByGameIds = vi
      .spyOn(repo.expenses, "listByGameIds")
      .mockResolvedValue([
        {
          id: "expense",
          gameId: games[0].id,
          payerParticipantId: "payer",
          kind: "expense",
          category: "food",
          title: "Ăn tối",
          amount: 90_000,
          note: "",
          splitMode: "equal",
          sequence: 0,
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
      ]);
    const listIdNamesByOwner = vi
      .spyOn(repo.participants, "listIdNamesByOwner")
      .mockResolvedValue([{ id: "payer", name: "An", gameId: games[0].id }]);
    const result = await getFunStats(repo, FAKE_OWNER);
    const ids = games.slice(0, MAX_FUN_STATS_GAMES).map((game) => game.id);
    expect(countParticipants).toHaveBeenCalledOnce();
    expect(countParticipants).toHaveBeenCalledWith(ids);
    expect(listByGameIds).toHaveBeenCalledWith(ids);
    expect(listIdNamesByOwner).toHaveBeenCalledWith(FAKE_OWNER);
    expect(result.gameCount).toBe(MAX_FUN_STATS_GAMES);
    expect(result.omittedGameCount).toBe(1);
    expect(result.totalExpense).toBe(90_000);
    expect(result.topPayer?.name).toBe("An");
  });
});
