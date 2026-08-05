import { describe, expect, it } from "vitest";
import type { GameRepository, GameRow } from "../ports/game-repository";
import { NotFoundError } from "./errors";
import { getOwnedGame } from "./game-detail";
import { deleteGame, listDeletedGames, purgeGame, restoreGame } from "./games";
import { getSharedGame } from "./share-links";
import { TRASH_RETENTION_DAYS } from "../../../../shared/schemas";

const OWNER = "user_1";

function gameRow(overrides: Partial<GameRow> = {}): GameRow {
  return {
    id: "game_1",
    ownerUserId: OWNER,
    code: "DSKVUF",
    name: "Cầu lông",
    settlementMode: "host",
    settlementHostId: "",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** Repo toi thieu: chi cai dat method cac use case thung rac that su dung. */
function stubRepo(rows: GameRow[]) {
  const softDeleted: [string, string | null][] = [];
  const hardDeleted: string[] = [];

  const repo = {
    games: {
      getById: async (gameId: string) => rows.find((row) => row.id === gameId) || null,
      listDeletedByOwner: async (userId: string) =>
        rows.filter((row) => row.ownerUserId === userId && row.deletedAt),
      countParticipants: async () => new Map<string, number>(),
      countExpenses: async () => new Map<string, number>(),
      setDeletedAt: async (gameId: string, deletedAt: string | null) => {
        softDeleted.push([gameId, deletedAt]);
      },
      delete: async (gameId: string) => {
        hardDeleted.push(gameId);
      },
    },
    participants: { listByGame: async () => [] },
    expenses: { listByGame: async () => [] },
    splits: { listByExpenseIds: async () => [] },
    paymentProfiles: { listByParticipantIds: async () => [] },
    photos: { countByGame: async () => 0 },
    shareLinks: { getLatestByGame: async () => null },
  } as unknown as GameRepository;

  return { repo, softDeleted, hardDeleted };
}

describe("cho vao thung rac", () => {
  it("xoa la danh dau deletedAt, khong xoa that", async () => {
    const stub = stubRepo([gameRow()]);

    await deleteGame(stub.repo, OWNER, "game_1");

    // Xoa that se cascade mat ca khoan chi va anh.
    expect(stub.hardDeleted).toEqual([]);
    expect(stub.softDeleted).toHaveLength(1);
    expect(stub.softDeleted[0][0]).toBe("game_1");
    expect(stub.softDeleted[0][1]).not.toBeNull();
  });

  it("khong xoa duoc cuoc chia cua nguoi khac", async () => {
    const stub = stubRepo([gameRow({ ownerUserId: "user_khac" })]);

    await expect(deleteGame(stub.repo, OWNER, "game_1")).rejects.toThrow(NotFoundError);
    expect(stub.softDeleted).toEqual([]);
  });
});

describe("getOwnedGame — chot an toan", () => {
  it("cuoc trong thung rac coi nhu khong ton tai", async () => {
    const stub = stubRepo([gameRow({ deletedAt: daysAgo(1) })]);

    // Day la choke point cua moi thao tac: chan o day la chan het.
    expect(await getOwnedGame(stub.repo, "game_1", OWNER)).toBeNull();
  });

  it("cuoc dang dung thi tra ve binh thuong", async () => {
    const stub = stubRepo([gameRow()]);

    expect(await getOwnedGame(stub.repo, "game_1", OWNER)).not.toBeNull();
  });
});

describe("link share cua cuoc trong thung rac", () => {
  function shareRepo(deletedAt: string | null) {
    return {
      shareLinks: {
        findByToken: async () => ({
          link: {
            gameId: "game_1",
            token: "tok",
            enabled: true,
            createdAt: "2026-08-01T00:00:00.000Z",
            expiresAt: null,
          },
          game: gameRow({ deletedAt }),
        }),
      },
    } as unknown as GameRepository;
  }

  it("tat theo khi cuoc chia bi xoa", async () => {
    // Khong the vua "da xoa" voi chu vua con xem duoc voi ca nhom.
    await expect(getSharedGame(shareRepo(daysAgo(1)), "tok")).rejects.toThrow(NotFoundError);
  });

  it("van xem duoc khi cuoc chia con dung", async () => {
    await expect(getSharedGame(shareRepo(null), "tok")).resolves.toMatchObject({ id: "game_1" });
  });
});

describe("phuc hoi va xoa han", () => {
  it("phuc hoi xoa deletedAt", async () => {
    const stub = stubRepo([gameRow({ deletedAt: daysAgo(2) })]);

    await restoreGame(stub.repo, OWNER, "game_1");

    expect(stub.softDeleted).toEqual([["game_1", null]]);
  });

  it("xoa han chi ap dung cho cuoc da nam trong thung rac", async () => {
    // Chan mot request lam mat cuoc chia dang dung.
    const stub = stubRepo([gameRow()]);

    await expect(purgeGame(stub.repo, OWNER, "game_1")).rejects.toThrow(NotFoundError);
    expect(stub.hardDeleted).toEqual([]);
  });

  it("xoa han cuoc trong thung rac thi xoa that", async () => {
    const stub = stubRepo([gameRow({ deletedAt: daysAgo(2) })]);

    await purgeGame(stub.repo, OWNER, "game_1");

    expect(stub.hardDeleted).toEqual(["game_1"]);
  });

  it("khong xoa han duoc cuoc cua nguoi khac", async () => {
    const stub = stubRepo([gameRow({ ownerUserId: "user_khac", deletedAt: daysAgo(2) })]);

    await expect(purgeGame(stub.repo, OWNER, "game_1")).rejects.toThrow(NotFoundError);
    expect(stub.hardDeleted).toEqual([]);
  });
});

describe("listDeletedGames", () => {
  it("don cuoc qua han giu va khong tra ve nua", async () => {
    const stub = stubRepo([
      gameRow({ id: "cu", deletedAt: daysAgo(TRASH_RETENTION_DAYS + 1) }),
      gameRow({ id: "moi", deletedAt: daysAgo(1) }),
    ]);

    const trash = await listDeletedGames(stub.repo, OWNER);

    expect(stub.hardDeleted).toEqual(["cu"]);
    expect(trash.map((game) => game.id)).toEqual(["moi"]);
  });

  it("cuoc vua qua nguong mot chut van con trong thung rac", async () => {
    const stub = stubRepo([gameRow({ deletedAt: daysAgo(TRASH_RETENTION_DAYS - 1) })]);

    expect(await listDeletedGames(stub.repo, OWNER)).toHaveLength(1);
    expect(stub.hardDeleted).toEqual([]);
  });

  it("khong tra ve cuoc trong thung rac cua nguoi khac", async () => {
    const stub = stubRepo([gameRow({ ownerUserId: "user_khac", deletedAt: daysAgo(1) })]);

    expect(await listDeletedGames(stub.repo, OWNER)).toEqual([]);
  });
});
