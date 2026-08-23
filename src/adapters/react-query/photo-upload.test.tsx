import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PHOTO_TOO_LARGE_ERROR, PHOTO_UNREADABLE_ERROR } from "../browser/image";
import { createFakeGameApi, createWrapper, GAME_ID } from "../../test/fake-game-api";
import { installFakeCanvas } from "../../test/fake-canvas";
import { toPhotoErrorMessage, usePhotoUploader } from "./photo-upload";

let api: ReturnType<typeof createFakeGameApi>;
let canvas: ReturnType<typeof installFakeCanvas>;

function photoFile(name = "hoa-don.jpg") {
  return new File(["anh"], name, { type: "image/jpeg" });
}

beforeEach(() => {
  api = createFakeGameApi();
  canvas = installFakeCanvas();
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width: 800, height: 600, close: vi.fn() })),
  );
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => "data:image/jpeg;base64,AAAA") as never;
});

afterEach(() => {
  canvas.restore();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("toPhotoErrorMessage", () => {
  it("anh qua nang", () => {
    expect(toPhotoErrorMessage(new Error(PHOTO_TOO_LARGE_ERROR))).toContain("quá nặng");
  });

  it("anh khong doc duoc", () => {
    expect(toPhotoErrorMessage(new Error(PHOTO_UNREADABLE_ERROR))).toContain("Không đọc được");
  });

  it("vuot tran so anh moi cuoc", () => {
    expect(toPhotoErrorMessage(new Error("too_many_photos"))).toContain("tối đa");
  });

  it("loi la thi bao chung chung, khong lo ma loi", () => {
    expect(toPhotoErrorMessage(new Error("khong_ro"))).toBe("Tải ảnh lên thất bại, thử lại sau.");
  });

  it("khong phai Error cung xu ly duoc", () => {
    expect(toPhotoErrorMessage("hong")).toBe("Tải ảnh lên thất bại, thử lại sau.");
  });
});

describe("usePhotoUploader", () => {
  it("chua tai gi thi khong o trang thai dang chay", () => {
    const { wrapper } = createWrapper();
    const hook = renderHook(() => usePhotoUploader(GAME_ID), { wrapper });

    expect(hook.result.current.pending).toBe(false);
    expect(hook.result.current.error).toBe("");
  });

  it("danh sach rong thi khong goi API", async () => {
    const { wrapper } = createWrapper();
    const hook = renderHook(() => usePhotoUploader(GAME_ID), { wrapper });

    await act(async () => {
      await hook.result.current.upload([]);
    });

    expect(api.photos.create).not.toHaveBeenCalled();
  });

  it("nen roi tai lan luot tung anh", async () => {
    const { wrapper } = createWrapper();
    const hook = renderHook(() => usePhotoUploader(GAME_ID), { wrapper });

    let uploaded: unknown[] = [];
    await act(async () => {
      uploaded = await hook.result.current.upload([photoFile("1.jpg"), photoFile("2.jpg")]);
    });

    expect(api.photos.create).toHaveBeenCalledTimes(2);
    expect(uploaded).toHaveLength(2);
  });

  it("gan anh vao khoan chi khi duoc yeu cau", async () => {
    const { wrapper } = createWrapper();
    const hook = renderHook(() => usePhotoUploader(GAME_ID), { wrapper });

    await act(async () => {
      await hook.result.current.upload([photoFile()], { expenseId: "expense_1" });
    });

    expect(api.photos.create).toHaveBeenCalledWith(
      GAME_ID,
      expect.objectContaining({ expenseId: "expense_1" }),
    );
  });

  it("khong yeu cau thi anh thuoc ve ca cuoc chia", async () => {
    const { wrapper } = createWrapper();
    const hook = renderHook(() => usePhotoUploader(GAME_ID), { wrapper });

    await act(async () => {
      await hook.result.current.upload([photoFile()]);
    });

    expect(api.photos.create).toHaveBeenCalledWith(
      GAME_ID,
      expect.objectContaining({ expenseId: null }),
    );
  });

  it("loi giua chung thi giu lai cac anh da tai va bao loi", async () => {
    api.photos.create
      .mockResolvedValueOnce({ id: "photo_1" } as never)
      .mockRejectedValueOnce(new Error("too_many_photos"));
    const { wrapper } = createWrapper();
    const hook = renderHook(() => usePhotoUploader(GAME_ID), { wrapper });

    let uploaded: unknown[] = [];
    await act(async () => {
      uploaded = await hook.result.current.upload([photoFile("1.jpg"), photoFile("2.jpg")]);
    });

    expect(uploaded).toHaveLength(1);
    await waitFor(() => expect(hook.result.current.error).toContain("tối đa"));
  });

  it("xoa duoc thong bao loi", async () => {
    api.photos.create.mockRejectedValue(new Error("khong_ro"));
    const { wrapper } = createWrapper();
    const hook = renderHook(() => usePhotoUploader(GAME_ID), { wrapper });

    await act(async () => {
      await hook.result.current.upload([photoFile()]);
    });
    await waitFor(() => expect(hook.result.current.error).not.toBe(""));

    act(() => hook.result.current.clearError());

    expect(hook.result.current.error).toBe("");
  });

  it("tai xong thi khong con o trang thai dang chay", async () => {
    const { wrapper } = createWrapper();
    const hook = renderHook(() => usePhotoUploader(GAME_ID), { wrapper });

    await act(async () => {
      await hook.result.current.upload([photoFile()]);
    });

    expect(hook.result.current.pending).toBe(false);
  });
});
