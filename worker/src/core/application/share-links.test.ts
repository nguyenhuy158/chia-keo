import { describe, expect, it, vi } from "vitest";
import {
  createFakeRepo,
  FAKE_GAME_ID,
  FAKE_OWNER,
} from "./fake-game-repository";
import { NotFoundError } from "./errors";
import {
  findSharePageMeta,
  getSharePreviewData,
  rotateShareLink,
  saveSharePreview,
} from "./share-links";

describe("share token collisions", () => {
  it("stops after the retry limit when every token exists", async () => {
    const { repo } = createFakeRepo();
    const find = vi
      .spyOn(repo.shareLinks, "findByToken")
      .mockResolvedValue(
        {} as Awaited<ReturnType<typeof repo.shareLinks.findByToken>>,
      );
    await expect(
      rotateShareLink(repo, FAKE_OWNER, FAKE_GAME_ID),
    ).rejects.toThrow("Khong tao duoc share token khong trung");
    expect(find).toHaveBeenCalledTimes(5);
  });
});

describe("share previews", () => {
  const LINK = {
    gameId: FAKE_GAME_ID,
    token: "AbCd",
    enabled: true,
    createdAt: "2026-08-01T00:00:00.000Z",
    expiresAt: null,
  };

  it("stores the preview for an accessible game and serves it by token", async () => {
    const { repo, state } = createFakeRepo({ shareLinks: [LINK] });

    await saveSharePreview(repo, FAKE_OWNER, FAKE_GAME_ID, "base64");

    expect(state.sharePreviews).toEqual([
      { gameId: FAKE_GAME_ID, data: "base64", updatedAt: expect.any(String) },
    ]);
    expect(await getSharePreviewData(repo, "AbCd")).toBe("base64");
    expect(await findSharePageMeta(repo, "AbCd")).toEqual({
      name: "Cầu lông",
      previewVersion: state.sharePreviews[0].updatedAt,
    });
  });

  it("refuses to store a preview for someone else's game", async () => {
    const { repo } = createFakeRepo();

    await expect(saveSharePreview(repo, "user_other", FAKE_GAME_ID, "base64")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("reports a missing preview or share link as not found", async () => {
    const { repo } = createFakeRepo({ shareLinks: [LINK] });

    await expect(getSharePreviewData(repo, "AbCd")).rejects.toThrow(NotFoundError);
    expect(await findSharePageMeta(repo, "AbCd")).toEqual({
      name: "Cầu lông",
      previewVersion: null,
    });
    expect(await findSharePageMeta(repo, "zzzz")).toBeNull();
  });

  it("propagates unexpected errors from the page meta lookup", async () => {
    const { repo } = createFakeRepo();
    vi.spyOn(repo.shareLinks, "findByToken").mockRejectedValue(new Error("d1 down"));

    await expect(findSharePageMeta(repo, "AbCd")).rejects.toThrow("d1 down");
  });
});
