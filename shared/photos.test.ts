import { describe, expect, it } from "vitest";
import type { ApiPhoto } from "./api-types";
import {
  countPhotosByExpenseId,
  filterPhotosByExpenseId,
  indexAfterRemove,
  stepPhotoIndex,
  toDataUrl,
} from "./photos";
import { PHOTO_CAPTION_MAX_LENGTH, photoInputSchema, photoUpdateSchema } from "./schemas";

function photo(id: string, expenseId: string | null): ApiPhoto {
  return {
    id,
    expenseId,
    caption: "",
    mimeType: "image/jpeg",
    width: 100,
    height: 100,
    thumbData: "AAAA",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("countPhotosByExpenseId", () => {
  it("dem theo tung khoan chi va bo qua anh chung", () => {
    const counts = countPhotosByExpenseId([
      photo("p1", "e1"),
      photo("p2", "e1"),
      photo("p3", "e2"),
      photo("p4", null),
    ]);

    expect(counts.get("e1")).toBe(2);
    expect(counts.get("e2")).toBe(1);
    expect(counts.size).toBe(2);
  });
});

describe("filterPhotosByExpenseId", () => {
  it("chi lay anh cua dung khoan chi", () => {
    const photos = [photo("p1", "e1"), photo("p2", null), photo("p3", "e1")];
    expect(filterPhotosByExpenseId(photos, "e1").map((row) => row.id)).toEqual(["p1", "p3"]);
  });
});

describe("stepPhotoIndex", () => {
  it("quay vong ca hai chieu", () => {
    expect(stepPhotoIndex(0, 1, 3)).toBe(1);
    expect(stepPhotoIndex(2, 1, 3)).toBe(0);
    expect(stepPhotoIndex(0, -1, 3)).toBe(2);
  });

  it("tra -1 khi khong con anh", () => {
    expect(stepPhotoIndex(0, 1, 0)).toBe(-1);
  });
});

describe("indexAfterRemove", () => {
  it("lui ve anh cuoi khi xoa anh cuoi danh sach", () => {
    expect(indexAfterRemove(2, 2)).toBe(1);
    expect(indexAfterRemove(0, 3)).toBe(0);
    expect(indexAfterRemove(0, 0)).toBe(-1);
  });
});

describe("toDataUrl", () => {
  it("ghep dung tien to data URI", () => {
    expect(toDataUrl("image/jpeg", "AAAA")).toBe("data:image/jpeg;base64,AAAA");
  });
});

describe("photoInputSchema", () => {
  const base = {
    mimeType: "image/jpeg",
    data: "AAAA",
    thumbData: "BBBB",
    width: 1600,
    height: 900,
  };

  it("mac dinh caption rong va khong gan khoan chi", () => {
    const parsed = photoInputSchema.parse(base);
    expect(parsed.caption).toBe("");
    expect(parsed.expenseId).toBeNull();
  });

  it("tu choi mime type la khac anh", () => {
    expect(photoInputSchema.safeParse({ ...base, mimeType: "application/pdf" }).success).toBe(
      false,
    );
  });

  it("tu choi caption qua dai", () => {
    const caption = "a".repeat(PHOTO_CAPTION_MAX_LENGTH + 1);
    expect(photoInputSchema.safeParse({ ...base, caption }).success).toBe(false);
  });

  it("tu choi kich thuoc anh khong hop le", () => {
    expect(photoInputSchema.safeParse({ ...base, width: 0 }).success).toBe(false);
  });
});

describe("photoUpdateSchema", () => {
  it("cho phep go anh khoi khoan chi bang null", () => {
    expect(photoUpdateSchema.parse({ expenseId: null }).expenseId).toBeNull();
  });

  it("cho phep chi doi caption", () => {
    expect(photoUpdateSchema.parse({ caption: " Hoa don " }).caption).toBe("Hoa don");
  });
});
