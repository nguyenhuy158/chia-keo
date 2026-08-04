import { describe, expect, it } from "vitest";
import { fakeRepo, OWNER } from "../../mcp/fixtures";
import {
  getBalancesAcrossGames,
  MAX_CROSS_GAME_GAMES,
} from "./cross-game-balances";
import { BadRequestError, NotFoundError } from "./errors";

/**
 * Tool MCP da chan hai truong hop nay truoc khi goi xuong day (de bao loi model
 * doc duoc), nen test truc tiep o tang application: neu sau nay co endpoint REST
 * dung chung ham nay thi tran van con hieu luc.
 */
describe("getBalancesAcrossGames — chan dau vao", () => {
  it("chan khi gop qua nhieu cuoc: moi cuoc ton 3 truy van D1", async () => {
    const gameIds = Array.from(
      { length: MAX_CROSS_GAME_GAMES + 1 },
      (_unused, index) => `game_${index}`,
    );

    await expect(
      getBalancesAcrossGames(fakeRepo({ twoGames: true }), OWNER, { gameIds }),
    ).rejects.toThrow(BadRequestError);
  });

  it("bao khong tim thay khi id khong thuoc ve minh", async () => {
    await expect(
      getBalancesAcrossGames(fakeRepo({ twoGames: true }), OWNER, {
        gameIds: ["game_khong_ton_tai"],
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
