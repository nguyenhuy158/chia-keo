import { describe, expect, it } from "vitest";
import { parseGames } from "./schema";

describe("schema cuộc chơi", () => {
  it("giữ cuộc chơi hợp lệ và bỏ dòng dữ liệu sai", () => {
    const games = parseGames([
      {
        id: "game_1",
        code: "ABC123",
        name: "Chuyến đi",
        participants: [{ id: "p1", name: "nguyen huy", avatarSeed: "huy-0" }],
        expenses: [],
        shareToken: "token",
        createdAt: "2026-07-03T00:00:00.000Z",
      },
      { id: "broken" },
    ]);

    expect(games).toHaveLength(1);
    expect(games[0]?.participants[0]?.name).toBe("Nguyen Huy");
    expect(games[0]?.participants[0]?.avatarSeed).toBe("huy-0");
  });
});
