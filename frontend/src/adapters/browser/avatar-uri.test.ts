import { describe, expect, it } from "vitest";
import { getCachedAvatarUri, loadAvatarUri } from "./avatar-uri";

const AVATAR_SIZE = 32;
const SVG_DATA_URI_PREFIX = "data:image/svg+xml";

describe("avatar-uri", () => {
  it("chưa có trong cache trước khi tải", () => {
    expect(getCachedAvatarUri("Chưa tải", AVATAR_SIZE)).toBeUndefined();
  });

  it("tải avatar, lưu cache và dùng lại cho cùng tên đã chuẩn hóa", async () => {
    const uri = await loadAvatarUri(" HỒNG ", AVATAR_SIZE);

    expect(uri).toContain(SVG_DATA_URI_PREFIX);
    expect(getCachedAvatarUri("hồng", AVATAR_SIZE)).toBe(uri);
    expect(await loadAvatarUri("hồng", AVATAR_SIZE)).toBe(uri);
  });

  it("tách cache theo kích thước và hỗ trợ tên rỗng", async () => {
    const small = await loadAvatarUri("", 16);
    const large = await loadAvatarUri("", 48);

    expect(small).toContain(SVG_DATA_URI_PREFIX);
    expect(small).not.toBe(large);
  });
});
