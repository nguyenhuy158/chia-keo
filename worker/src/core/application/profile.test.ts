import { describe, expect, it } from "vitest";
import { createFakeRepo, FAKE_OWNER } from "./fake-game-repository";
import { updateProfileName } from "./profile";

describe("updateProfileName", () => {
  it("doi ten hien thi cua chinh minh", async () => {
    const fake = createFakeRepo({
      users: [{ id: FAKE_OWNER, name: "Chủ", email: "chu@example.com" }],
    });

    expect(await updateProfileName(fake.repo, FAKE_OWNER, "Chủ Mới")).toEqual({ name: "Chủ Mới" });
    expect(fake.state.users[0].name).toBe("Chủ Mới");
  });

  it("khong dong den email/dang nhap", async () => {
    const fake = createFakeRepo({
      users: [{ id: FAKE_OWNER, name: "Chủ", email: "chu@example.com" }],
    });

    await updateProfileName(fake.repo, FAKE_OWNER, "Tên khác");

    expect(fake.state.users[0].email).toBe("chu@example.com");
  });
});
