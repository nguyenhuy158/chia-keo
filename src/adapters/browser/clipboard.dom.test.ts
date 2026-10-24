import { afterEach, describe, expect, it, vi } from "vitest";
import { copyImage, copyText, downloadBlob } from "./clipboard";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "execCommand");
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
});

function command(result: boolean | Error) {
  const execute = vi.fn(() => {
    if (result instanceof Error) throw result;
    return result;
  });
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: execute,
  });
  return execute;
}

describe("clipboard", () => {
  it("copy text qua Clipboard API khi được phép", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    expect(await copyText("Tổng kết")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("Tổng kết");
  });

  it("fallback sang textarea khi thiếu API hoặc bị từ chối quyền", async () => {
    const execute = command(true);
    vi.stubGlobal("navigator", { clipboard: {} });
    expect(await copyText("Nợ 50.000")).toBe(true);
    expect(execute).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn(async () => {
          throw new Error("denied");
        }),
      },
    });
    expect(await copyText("Cầu lông")).toBe(true);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("trả false và dọn textarea nếu lệnh copy cũ bị lỗi", async () => {
    command(new Error("copy failed"));
    vi.stubGlobal("navigator", {});
    expect(await copyText("Không thể copy")).toBe(false);
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("copy ảnh khi trình duyệt hỗ trợ và trả false khi thiếu hoặc lỗi", async () => {
    const blob = Promise.resolve(new Blob(["image"], { type: "image/png" }));
    vi.stubGlobal("navigator", { clipboard: {} });
    expect(await copyImage(blob)).toBe(false);
    vi.stubGlobal("ClipboardItem", undefined);
    vi.stubGlobal("navigator", { clipboard: { write: vi.fn() } });
    expect(await copyImage(blob)).toBe(false);

    class ClipboardItemStub {
      constructor(readonly data: Record<string, Promise<Blob>>) {}
    }
    const write = vi.fn(async (_items: ClipboardItemStub[]) => undefined);
    vi.stubGlobal("ClipboardItem", ClipboardItemStub);
    vi.stubGlobal("navigator", { clipboard: { write } });
    expect(await copyImage(blob)).toBe(true);
    expect(write).toHaveBeenCalledOnce();
    expect(write.mock.calls.at(0)?.[0]?.[0]?.data["image/png"]).toBe(blob);
    write.mockRejectedValueOnce(new Error("denied"));
    expect(await copyImage(blob)).toBe(false);
  });

  it("tải Blob và thu hồi URL tạm", () => {
    const blob = new Blob(["image"], { type: "image/png" });
    const createObjectURL = vi.fn(() => "blob:test-image");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    downloadBlob(blob, "tong-ket.png");
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector("a[download]")).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test-image");
  });
});
