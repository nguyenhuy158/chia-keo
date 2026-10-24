import { describe, expect, it } from "vitest";
import { createFakeRepo, FAKE_OWNER } from "./fake-game-repository";
import { updateProfileName } from "./profile";

describe("updateProfileName", () => {
  it("chỉ đổi tên hiển thị của người dùng hiện tại", async () => {
    const { repo, state } = createFakeRepo({
      users: [
        { id: FAKE_OWNER, name: "Huy cũ", email: "huy@example.test" },
        { id: "user_other", name: "Bạn", email: "friend@example.test" },
      ],
    });

    expect(await updateProfileName(repo, FAKE_OWNER, "Huy mới")).toEqual({
      name: "Huy mới",
    });
    expect(state.users[0]).toMatchObject({
      name: "Huy mới",
      email: "huy@example.test",
    });
    expect(state.users[1]).toMatchObject({
      name: "Bạn",
      email: "friend@example.test",
    });
  });
});
