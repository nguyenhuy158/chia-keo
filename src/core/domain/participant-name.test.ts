import { describe, expect, it } from "vitest";
import { toParticipantTitleCase } from "./participant-name";

describe("participant name", () => {
  it("chuẩn hóa tên người tham gia về title case", () => {
    expect(toParticipantTitleCase("nguyen huy")).toBe("Nguyen Huy");
    expect(toParticipantTitleCase("NGUYEN HUY")).toBe("Nguyen Huy");
    expect(toParticipantTitleCase("  nguyễn   văn   huy  ")).toBe("Nguyễn Văn Huy");
  });

  it("giữ dấu phân tách và title case từng phần chữ", () => {
    expect(toParticipantTitleCase("nguyen-huy")).toBe("Nguyen-Huy");
    expect(toParticipantTitleCase("o'connor")).toBe("O'Connor");
  });
});
