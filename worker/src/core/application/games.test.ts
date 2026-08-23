import { describe, expect, it } from "vitest";
import { QUICK_PARTICIPANT_PREFIX } from "../../../../shared/schemas";
import { InvalidInputError, NotFoundError } from "./errors";
import {
  createFakeRepo,
  FAKE_GAME_ID,
  FAKE_OWNER,
  gameRow,
  participantRow,
} from "./fake-game-repository";
import {
  createGame,
  duplicateGame,
  findGameByRef,
  getGameDetailForOwner,
  listGames,
  restoreGame,
  updateGame,
} from "./games";

const FRIEND = "user_ban";

describe("listGames", () => {
  it("gop cuoc tu tao va cuoc duoc chia se, kem so nguoi va so khoan chi", async () => {
    const fake = createFakeRepo({
      games: [gameRow(), gameRow({ id: "game_ban", ownerUserId: FRIEND })],
      participants: [
        participantRow("participant_an", "An"),
        participantRow("participant_binh", "Bình", { sequence: 1 }),
      ],
      collaborators: [
        {
          id: "collab_1",
          gameId: "game_ban",
          userId: FAKE_OWNER,
          invitedEmail: "chu@example.com",
          name: "Chủ",
          email: "chu@example.com",
          createdAt: "2026-08-01T00:00:00.000Z",
        },
      ],
    });

    const games = await listGames(fake.repo, FAKE_OWNER);

    expect(games.map((row) => [row.id, row.isOwner])).toEqual([
      [FAKE_GAME_ID, true],
      ["game_ban", false],
    ]);
    expect(games[0].participantCount).toBe(2);
  });

  it("khong tinh khoan tra no vao so khoan chi", async () => {
    const fake = createFakeRepo({
      expenses: [
        {
          id: "expense_1",
          gameId: FAKE_GAME_ID,
          payerParticipantId: "participant_an",
          kind: "expense",
          title: "Nước",
          amount: 1_000,
          note: "",
          splitMode: "equal",
          sequence: 0,
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
        {
          id: "expense_2",
          gameId: FAKE_GAME_ID,
          payerParticipantId: "participant_an",
          kind: "transfer",
          title: "Trả nợ",
          amount: 1_000,
          note: "",
          splitMode: "amount",
          sequence: 1,
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
    });

    expect((await listGames(fake.repo, FAKE_OWNER))[0].expenseCount).toBe(1);
  });

  it("cuoc trong thung rac khong nam trong danh sach", async () => {
    const fake = createFakeRepo({ games: [gameRow({ deletedAt: "2026-08-02T00:00:00.000Z" })] });

    expect(await listGames(fake.repo, FAKE_OWNER)).toEqual([]);
  });
});

describe("findGameByRef", () => {
  const games = [
    { id: "game_1", code: "DSKVUF" },
    { id: "game_2", code: "ABCDEF" },
  ];

  it("do duoc theo id", () => {
    expect(findGameByRef(games, "game_2")?.code).toBe("ABCDEF");
  });

  it("do duoc theo ma, khong phan biet hoa thuong", () => {
    expect(findGameByRef(games, "dskvuf")?.id).toBe("game_1");
  });

  it("bo khoang trang thua", () => {
    expect(findGameByRef(games, "  ABCDEF ")?.id).toBe("game_2");
  });

  it("khong khop thi tra ve undefined", () => {
    expect(findGameByRef(games, "khong-co")).toBeUndefined();
  });
});

describe("createGame", () => {
  it("tao cuoc voi ma 6 ky tu va ghi lich su", async () => {
    const fake = createFakeRepo({ games: [] });

    const detail = await createGame(fake.repo, FAKE_OWNER, { name: "Cầu lông" });

    expect(detail.name).toBe("Cầu lông");
    expect(detail.code).toHaveLength(6);
    expect(detail.isOwner).toBe(true);
    expect(fake.state.events[0].kind).toBe("game_created");
  });

  it("tao san N nguoi de vao viec ngay", async () => {
    const fake = createFakeRepo({ games: [] });

    const detail = await createGame(fake.repo, FAKE_OWNER, {
      name: "Cầu lông",
      participantCount: 3,
    });

    expect(detail.participants.map((row) => row.name)).toEqual([
      `${QUICK_PARTICIPANT_PREFIX} 1`,
      `${QUICK_PARTICIPANT_PREFIX} 2`,
      `${QUICK_PARTICIPANT_PREFIX} 3`,
    ]);
  });

  it("khong yeu cau so nguoi thi tao cuoc rong", async () => {
    const fake = createFakeRepo({ games: [] });

    expect((await createGame(fake.repo, FAKE_OWNER, { name: "Cầu lông" })).participants).toEqual(
      [],
    );
  });
});

describe("updateGame", () => {
  it("doi ten va ghi lich su game_renamed", async () => {
    const fake = createFakeRepo();

    const detail = await updateGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID, { name: "Bóng bàn" });

    expect(detail.name).toBe("Bóng bàn");
    expect(fake.state.events.some((row) => row.kind === "game_renamed")).toBe(true);
  });

  it("ten khong doi thi khong ghi lich su doi ten", async () => {
    const fake = createFakeRepo();

    await updateGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID, { name: "Cầu lông" });

    expect(fake.state.events.some((row) => row.kind === "game_renamed")).toBe(false);
  });

  it("doi nguoi nhan tien ghi lich su kem ten nguoi do", async () => {
    const fake = createFakeRepo({ participants: [participantRow("participant_an", "An")] });

    await updateGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID, {
      settlementMode: "pick",
      settlementHostId: "participant_an",
    });

    const event = fake.state.events.find((row) => row.kind === "settlement_changed");
    expect(JSON.parse(event?.payload || "{}")).toMatchObject({ mode: "pick", hostName: "An" });
  });

  it("khong gui truong nao thi tu choi", async () => {
    const fake = createFakeRepo();

    await expect(updateGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID, {})).rejects.toThrow(
      InvalidInputError,
    );
  });

  it("nguoi la khong sua duoc", async () => {
    const fake = createFakeRepo();

    await expect(
      updateGame(fake.repo, "user_la", FAKE_GAME_ID, { name: "Hack" }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("duplicateGame", () => {
  it("giu nguoi va tai khoan nhan, khong keo theo khoan chi", async () => {
    const fake = createFakeRepo({
      participants: [participantRow("participant_an", "An")],
      payments: [
        {
          participantId: "participant_an",
          bankId: "970436",
          accountNo: "0123",
          accountName: "AN",
        },
      ],
      expenses: [
        {
          id: "expense_1",
          gameId: FAKE_GAME_ID,
          payerParticipantId: "participant_an",
          kind: "expense",
          title: "Nước",
          amount: 1_000,
          note: "",
          splitMode: "equal",
          sequence: 0,
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
    });

    const copy = await duplicateGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID);

    expect(copy.name).toBe("Cầu lông (bản sao)");
    expect(copy.id).not.toBe(FAKE_GAME_ID);
    expect(copy.participants).toHaveLength(1);
    expect(copy.participants[0]).toMatchObject({ name: "An", accountNo: "0123" });
    // Ban sao bat dau sach: khong keo theo khoan chi cu.
    expect(copy.expenses).toEqual([]);
  });

  it("doi chieu nguoi nhan tien sang id moi cua ban sao", async () => {
    const fake = createFakeRepo({
      games: [gameRow({ settlementMode: "pick", settlementHostId: "participant_an" })],
      participants: [participantRow("participant_an", "An")],
    });

    const copy = await duplicateGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID);

    expect(copy.settlementHostId).toBe(copy.participants[0].id);
    expect(copy.settlementHostId).not.toBe("participant_an");
  });

  it("nguoi nhan cu khong con thi de rong", async () => {
    const fake = createFakeRepo({
      games: [gameRow({ settlementMode: "pick", settlementHostId: "participant_da_xoa" })],
      participants: [participantRow("participant_an", "An")],
    });

    expect((await duplicateGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID)).settlementHostId).toBe("");
  });

  it("nguoi la khong nhan ban duoc", async () => {
    const fake = createFakeRepo();

    await expect(duplicateGame(fake.repo, "user_la", FAKE_GAME_ID)).rejects.toThrow(NotFoundError);
  });
});

describe("getGameDetailForOwner", () => {
  it("chu xem duoc", async () => {
    const fake = createFakeRepo();

    expect(await getGameDetailForOwner(fake.repo, FAKE_OWNER, FAKE_GAME_ID)).toMatchObject({
      isOwner: true,
    });
  });

  it("nguoi la khong xem duoc", async () => {
    const fake = createFakeRepo();

    await expect(getGameDetailForOwner(fake.repo, "user_la", FAKE_GAME_ID)).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe("restoreGame", () => {
  it("phuc hoi tra ve detail cua cuoc da song lai", async () => {
    const fake = createFakeRepo({ games: [gameRow({ deletedAt: "2026-08-02T00:00:00.000Z" })] });

    const detail = await restoreGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID);

    expect(detail.id).toBe(FAKE_GAME_ID);
    expect(fake.state.games[0].deletedAt).toBeNull();
  });

  it("nguoi la khong phuc hoi duoc", async () => {
    const fake = createFakeRepo({ games: [gameRow({ deletedAt: "2026-08-02T00:00:00.000Z" })] });

    await expect(restoreGame(fake.repo, "user_la", FAKE_GAME_ID)).rejects.toThrow(NotFoundError);
  });
});
