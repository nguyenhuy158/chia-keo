import { describe, expect, it, vi } from "vitest";
import {
  createFakeRepo,
  FAKE_GAME_ID,
  FAKE_OWNER,
} from "./fake-game-repository";
import { rotateShareLink } from "./share-links";

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
