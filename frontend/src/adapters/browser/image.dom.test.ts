import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PHOTO_TOO_LARGE_ERROR,
  PHOTO_UNREADABLE_ERROR,
  preparePhoto,
} from "./image";

const file = new File(["photo"], "photo.png", { type: "image/png" });
const fillRect = vi.fn();
const drawImage = vi.fn();
const toDataURL = vi.fn(() => "data:image/jpeg;base64,QUJD");

beforeEach(() => {
  fillRect.mockClear();
  drawImage.mockClear();
  toDataURL.mockReset().mockReturnValue("data:image/jpeg;base64,QUJD");
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillStyle: "",
    fillRect,
    drawImage,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation(
    toDataURL,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
});

describe("preparePhoto", () => {
  it("thu nhỏ ảnh lớn, tô nền trắng và đóng bitmap sau khi mã hóa", async () => {
    const close = vi.fn();
    const bitmap = { width: 3200, height: 1600, close };
    const createImageBitmap = vi.fn(async () => bitmap);
    vi.stubGlobal("createImageBitmap", createImageBitmap);
    const result = await preparePhoto(file);
    expect(createImageBitmap).toHaveBeenCalledWith(file, {
      imageOrientation: "from-image",
    });
    expect(result).toEqual({
      mimeType: "image/jpeg",
      data: "QUJD",
      thumbData: "QUJD",
      width: 1600,
      height: 800,
    });
    expect(fillRect).toHaveBeenCalledWith(0, 0, 1600, 800);
    expect(fillRect).toHaveBeenCalledWith(0, 0, 480, 240);
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1600, 800);
    expect(close).toHaveBeenCalledOnce();
  });

  it("không phóng to ảnh nhỏ và thử chất lượng thấp hơn khi cần", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 100, height: 50 })),
    );
    toDataURL
      .mockReturnValueOnce("data:image/jpeg;base64,")
      .mockReturnValueOnce(`data:image/jpeg;base64,${"x".repeat(1_400_001)}`)
      .mockReturnValueOnce("data:image/jpeg;base64,T0s=")
      .mockReturnValueOnce("data:image/jpeg;base64,T0s=");
    const result = await preparePhoto(file);
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
    expect(result.data).toBe("T0s=");
    expect(toDataURL).toHaveBeenCalledTimes(4);
  });

  it("báo lỗi nếu canvas không khả dụng hoặc ảnh vẫn vượt giới hạn", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 100, height: 50 })),
    );
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    await expect(preparePhoto(file)).rejects.toThrow(PHOTO_UNREADABLE_ERROR);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      fillStyle: "",
      fillRect,
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    toDataURL.mockReturnValue("data:image/jpeg;base64,");
    await expect(preparePhoto(file)).rejects.toThrow(PHOTO_TOO_LARGE_ERROR);
  });

  it("dùng Image nếu createImageBitmap không đọc được file", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => {
        throw new Error("unsupported");
      }),
    );
    const createObjectURL = vi.fn(() => "blob:photo");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    class ImageStub {
      naturalWidth = 200;
      naturalHeight = 100;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", ImageStub);
    const result = await preparePhoto(file);
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
    expect(createObjectURL).toHaveBeenCalledWith(file);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:photo");
  });

  it("báo lỗi nếu cả Image cũng không đọc được file", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => {
        throw new Error("unsupported");
      }),
    );
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:bad"),
    });
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    class ImageStub {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onerror?.());
      }
    }
    vi.stubGlobal("Image", ImageStub);
    await expect(preparePhoto(file)).rejects.toThrow(PHOTO_UNREADABLE_ERROR);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:bad");
  });
});
