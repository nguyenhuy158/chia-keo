import { describe, expect, it } from "vitest";
import {
  COLLABORATOR_ERROR,
  listShareCandidates,
  shareGame,
  unshareGame,
  unshareGameByEmail,
} from "./collaborators";
import { BadRequestError, NotFoundError } from "./errors";
import { createFakeRepo, FAKE_GAME_ID, FAKE_OWNER, gameRow } from "./fake-game-repository";
import { getShareViewByToken, rotateShareLink, setShareLinkEnabled } from "./share-links";

const OWNER_EMAIL = "chu@example.com";
const FRIEND = { id: "user_ban", name: "Bạn", email: "ban@example.com" };

function withUsers() {
  return createFakeRepo({
    users: [{ id: FAKE_OWNER, name: "Chủ", email: OWNER_EMAIL }, FRIEND],
  });
}

describe("shareGame", () => {
  it("chia se cho user da co tai khoan", async () => {
    const fake = withUsers();

    const detail = await shareGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID, FRIEND.email);

    expect(detail.collaborators).toEqual([
      { userId: FRIEND.id, name: FRIEND.name, email: FRIEND.email },
    ]);
  });

  it("email chua co tai khoan luu thanh invite cho", async () => {
    const fake = withUsers();

    const detail = await shareGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID, "moi@example.com");

    expect(detail.collaborators[0]).toMatchObject({ userId: null, email: "moi@example.com" });
  });

  it("chuan hoa email ve chu thuong", async () => {
    const fake = withUsers();

    await shareGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID, "  BAN@Example.com ");

    expect(fake.state.collaborators[0].invitedEmail).toBe(FRIEND.email);
  });

  it("khong tu chia se cho chinh chu", async () => {
    const fake = withUsers();

    await expect(
      shareGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID, OWNER_EMAIL),
    ).rejects.toThrow(new BadRequestError(COLLABORATOR_ERROR.isOwner));
    expect(fake.state.collaborators).toEqual([]);
  });

  it("khong chia se trung mot email hai lan", async () => {
    const fake = withUsers();
    await shareGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID, FRIEND.email);

    await expect(
      shareGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID, FRIEND.email),
    ).rejects.toThrow(new BadRequestError(COLLABORATOR_ERROR.alreadyShared));
    expect(fake.state.collaborators).toHaveLength(1);
  });

  it("collaborator khong duoc chia se tiep cho nguoi khac", async () => {
    const fake = withUsers();
    await shareGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID, FRIEND.email);

    // Chi chu moi duoc them nguoi: getOwnedGame chan collaborator o day.
    await expect(
      shareGame(fake.repo, FRIEND.id, FAKE_GAME_ID, "nguoila@example.com"),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("listShareCandidates", () => {
  it("bo chu va nguoi da duoc chia se ra khoi goi y", async () => {
    const fake = withUsers();

    expect(await listShareCandidates(fake.repo, FAKE_OWNER, FAKE_GAME_ID)).toEqual([FRIEND]);

    await shareGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID, FRIEND.email);

    expect(await listShareCandidates(fake.repo, FAKE_OWNER, FAKE_GAME_ID)).toEqual([]);
  });
});

describe("unshareGame", () => {
  it("go quyen theo userId", async () => {
    const fake = withUsers();
    await shareGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID, FRIEND.email);

    const detail = await unshareGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID, FRIEND.id);

    expect(detail.collaborators).toEqual([]);
  });

  it("go invite dang cho theo email", async () => {
    const fake = withUsers();
    await shareGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID, "moi@example.com");

    const detail = await unshareGameByEmail(
      fake.repo,
      FAKE_OWNER,
      FAKE_GAME_ID,
      "MOI@example.com",
    );

    expect(detail.collaborators).toEqual([]);
  });
});

describe("share link", () => {
  it("quay link tao token moi va bat san", async () => {
    const fake = createFakeRepo();

    const detail = await rotateShareLink(fake.repo, FAKE_OWNER, FAKE_GAME_ID);

    expect(detail.shareLink?.enabled).toBe(true);
    expect(detail.shareLink?.token).toHaveLength(4);
  });

  it("quay lai lan hai thi token cu het hieu luc", async () => {
    const fake = createFakeRepo();
    const first = await rotateShareLink(fake.repo, FAKE_OWNER, FAKE_GAME_ID);
    const oldToken = first.shareLink?.token || "";

    const second = await rotateShareLink(fake.repo, FAKE_OWNER, FAKE_GAME_ID);

    expect(second.shareLink?.token).not.toBe(oldToken);
    await expect(getShareViewByToken(fake.repo, oldToken)).rejects.toThrow(NotFoundError);
  });

  it("tat link thi khong xem duoc nua", async () => {
    const fake = createFakeRepo();
    const detail = await rotateShareLink(fake.repo, FAKE_OWNER, FAKE_GAME_ID);
    const token = detail.shareLink?.token || "";

    await expect(getShareViewByToken(fake.repo, token)).resolves.toMatchObject({
      name: "Cầu lông",
    });

    await setShareLinkEnabled(fake.repo, FAKE_OWNER, FAKE_GAME_ID, false);

    await expect(getShareViewByToken(fake.repo, token)).rejects.toThrow(NotFoundError);
  });

  it("link het han thi tu choi", async () => {
    const fake = createFakeRepo({
      shareLinks: [
        {
          gameId: FAKE_GAME_ID,
          token: "abcd",
          enabled: true,
          createdAt: "2026-08-01T00:00:00.000Z",
          expiresAt: "2026-08-02T00:00:00.000Z",
        },
      ],
    });

    await expect(getShareViewByToken(fake.repo, "abcd")).rejects.toThrow(NotFoundError);
  });

  it("cuoc chia trong thung rac thi link tat theo", async () => {
    const fake = createFakeRepo({
      games: [gameRow({ deletedAt: "2026-08-02T00:00:00.000Z" })],
      shareLinks: [
        {
          gameId: FAKE_GAME_ID,
          token: "abcd",
          enabled: true,
          createdAt: "2026-08-01T00:00:00.000Z",
          expiresAt: null,
        },
      ],
    });

    await expect(getShareViewByToken(fake.repo, "abcd")).rejects.toThrow(NotFoundError);
  });

  it("nguoi la khong quay duoc link", async () => {
    const fake = createFakeRepo();

    await expect(
      rotateShareLink(fake.repo, "user_la", FAKE_GAME_ID),
    ).rejects.toThrow(NotFoundError);
    expect(fake.state.shareLinks).toEqual([]);
  });
});
