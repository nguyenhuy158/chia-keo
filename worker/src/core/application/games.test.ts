import { describe, expect, it } from "vitest";
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
  listClosedGames,
  reopenGame,
  restoreGame,
  updateGame,
} from "./games";

describe("game use cases", () => {
  it("tạo cuộc chia và số người mặc định theo yêu cầu", async () => {
    const fake = createFakeRepo({ games: [] });
    const detail = await createGame(fake.repo, FAKE_OWNER, {
      name: "Cầu tối thứ bảy",
      participantCount: 2,
    });
    expect(detail.name).toBe("Cầu tối thứ bảy");
    expect(detail.participants.map((person) => person.name)).toEqual([
      "Người 1",
      "Người 2",
    ]);
    expect(fake.state.games).toHaveLength(1);
    expect(fake.state.events.map((event) => event.kind)).toContain(
      "game_created",
    );
  });

  it("tạo cuộc chia rỗng khi không yêu cầu người mặc định", async () => {
    const fake = createFakeRepo({ games: [] });
    const detail = await createGame(fake.repo, FAKE_OWNER, {
      name: "Cuộc mới",
    });
    expect(detail.participants).toEqual([]);
    expect(detail.settlementHostId).toBe("");
  });

  it("đổi tên và cách nhận tiền, lưu sự kiện có tên người nhận", async () => {
    const fake = createFakeRepo({
      participants: [participantRow("person-a", "An")],
    });
    const detail = await updateGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID, {
      name: "Kèo thứ hai",
      settlementMode: "pick",
      settlementHostId: "person-a",
    });
    expect(detail.name).toBe("Kèo thứ hai");
    expect(detail.settlementHostId).toBe("person-a");
    expect(fake.state.events.map((event) => event.kind)).toEqual([
      "settlement_changed",
      "game_renamed",
    ]);
    expect(JSON.parse(fake.state.events[0].payload)).toMatchObject({
      hostName: "An",
    });
    expect(JSON.parse(fake.state.events[1].payload)).toMatchObject({
      from: "Cầu lông",
      to: "Kèo thứ hai",
    });
  });

  it("không ghi sự kiện đổi tên nếu tên giữ nguyên", async () => {
    const fake = createFakeRepo();
    await updateGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID, { name: "Cầu lông" });
    expect(fake.state.events).toEqual([]);
    await updateGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID, {
      settlementHostId: "unknown",
    });
    expect(JSON.parse(fake.state.events[0].payload)).toMatchObject({
      hostName: "",
    });
  });

  it("đổi riêng cách chia giữ nguyên người nhận cũ", async () => {
    const fake = createFakeRepo({
      games: [gameRow({ settlementHostId: "person-a" })],
      participants: [participantRow("person-a", "An")],
    });
    await updateGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID, {
      settlementMode: "pick",
    });
    expect(JSON.parse(fake.state.events[0].payload)).toMatchObject({
      mode: "pick",
      hostName: "An",
    });
  });

  it("từ chối sửa trống hoặc sửa cuộc không tồn tại", async () => {
    const fake = createFakeRepo();
    await expect(
      updateGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID, {}),
    ).rejects.toThrow(InvalidInputError);
    await expect(
      updateGame(fake.repo, FAKE_OWNER, "missing", { name: "Mới" }),
    ).rejects.toThrow(NotFoundError);
    await expect(
      getGameDetailForOwner(fake.repo, FAKE_OWNER, "missing"),
    ).rejects.toThrow(NotFoundError);
    expect(
      (await getGameDetailForOwner(fake.repo, FAKE_OWNER, FAKE_GAME_ID)).id,
    ).toBe(FAKE_GAME_ID);
  });

  it("nhân bản người tham gia và tài khoản nhận nhưng không mang khoản chi sang", async () => {
    const fake = createFakeRepo({
      games: [
        gameRow({ settlementMode: "pick", settlementHostId: "person-a" }),
      ],
      participants: [
        participantRow("person-a", "An"),
        participantRow("person-b", "Bình", { sequence: 1 }),
      ],
      payments: [
        {
          participantId: "person-a",
          bankId: "vcb",
          accountNo: "123",
          accountName: "AN",
        },
      ],
    });
    const detail = await duplicateGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID);
    expect(detail.id).not.toBe(FAKE_GAME_ID);
    expect(detail.name).toBe("Cầu lông (bản sao)");
    expect(detail.expenses).toEqual([]);
    expect(detail.participants.map((person) => person.name)).toEqual([
      "An",
      "Bình",
    ]);
    expect(detail.settlementHostId).toBe(detail.participants[0].id);
    expect(
      fake.state.payments.find(
        (row) => row.participantId === detail.participants[0].id,
      ),
    ).toMatchObject({
      bankId: "vcb",
      accountNo: "123",
    });
  });

  it("không nhân bản cuộc không truy cập được", async () => {
    const fake = createFakeRepo();
    await expect(
      duplicateGame(fake.repo, FAKE_OWNER, "missing"),
    ).rejects.toThrow(NotFoundError);
  });

  it("nhân bản cuộc có người nhận không còn trong danh sách thì bỏ chọn", async () => {
    const fake = createFakeRepo({
      games: [
        gameRow({ settlementMode: "pick", settlementHostId: "removed-person" }),
      ],
      participants: [participantRow("person-a", "An")],
    });
    const detail = await duplicateGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID);
    expect(detail.settlementHostId).toBe("");
  });

  it("khôi phục cuộc đã xóa và báo lỗi nếu không tìm thấy", async () => {
    const fake = createFakeRepo({
      games: [gameRow({ deletedAt: "2026-08-02T00:00:00.000Z" })],
    });
    const detail = await restoreGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID);
    expect(detail.id).toBe(FAKE_GAME_ID);
    expect(fake.state.games[0].deletedAt).toBeNull();
    await expect(restoreGame(fake.repo, FAKE_OWNER, "missing")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("tra cứu bằng mã không phân biệt hoa thường hoặc bằng id", () => {
    const games = [gameRow()];
    expect(findGameByRef(games, " dskvuf ")?.id).toBe(FAKE_GAME_ID);
    expect(findGameByRef(games, FAKE_GAME_ID)?.id).toBe(FAKE_GAME_ID);
    expect(findGameByRef(games, "missing")).toBeUndefined();
  });

  it("sắp cuộc đã đóng mới nhất lên trước", async () => {
    const fake = createFakeRepo({
      games: [
        gameRow({
          id: "old",
          closedAt: "2026-08-01T00:00:00.000Z",
          closeMode: "manual",
        }),
        gameRow({
          id: "new",
          closedAt: "2026-08-02T00:00:00.000Z",
          closeMode: "manual",
        }),
      ],
    });
    expect(
      (await listClosedGames(fake.repo, FAKE_OWNER)).map((game) => game.id),
    ).toEqual(["new", "old"]);
  });

  it("mở lại cuộc đã tự đóng và ghi rõ nguyên nhân", async () => {
    const fake = createFakeRepo({
      games: [
        gameRow({ closedAt: "2026-08-02T00:00:00.000Z", closeMode: "auto" }),
      ],
    });
    const detail = await reopenGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID);
    expect(detail.closedAt).toBeNull();
    expect(JSON.parse(fake.state.events[0].payload)).toMatchObject({
      mode: "auto",
    });
  });
});
