import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeCanvas } from "../../test/fake-canvas";
import { PHOTO_TOO_LARGE_ERROR, PHOTO_UNREADABLE_ERROR, preparePhoto } from "./image";

let canvas: ReturnType<typeof installFakeCanvas>;

/** Anh giai ma xong: bao kich thuoc, khong doc byte that. */
function stubDecodedImage(width: number, height: number) {
  const close = vi.fn();
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width, height, close })),
  );
  return { close };
}

function stubEncoder(base64: string) {
  HTMLCanvasElement.prototype.toDataURL = vi.fn(
    () => `data:image/jpeg;base64,${base64}`,
  ) as never;
}

function file() {
  return new File(["anh"], "hoa-don.jpg", { type: "image/jpeg" });
}

beforeEach(() => {
  canvas = installFakeCanvas();
  stubDecodedImage(2000, 1000);
  stubEncoder("AAAA");
});

afterEach(() => {
  canvas.restore();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("preparePhoto", () => {
  it("tra ve ca anh nen va ban thu nho", async () => {
    const prepared = await preparePhoto(file());

    expect(prepared.mimeType).toBe("image/jpeg");
    expect(prepared.data).toBe("AAAA");
    expect(prepared.thumbData).toBe("AAAA");
  });

  it("thu nho anh qua lon nhung giu ty le", async () => {
    const prepared = await preparePhoto(file());

    expect(prepared.width / prepared.height).toBeCloseTo(2, 5);
    expect(prepared.width).toBeLessThanOrEqual(2000);
  });

  it("anh nho hon nguong thi giu nguyen kich thuoc", async () => {
    stubDecodedImage(320, 240);

    const prepared = await preparePhoto(file());

    expect(prepared).toMatchObject({ width: 320, height: 240 });
  });

  it("giai phong bitmap sau khi nen xong", async () => {
    const image = stubDecodedImage(800, 600);

    await preparePhoto(file());

    expect(image.close).toHaveBeenCalled();
  });

  it("nen mai van qua nang thi bao loi ro rang", async () => {
    stubEncoder("A".repeat(10_000_000));

    await expect(preparePhoto(file())).rejects.toThrow(PHOTO_TOO_LARGE_ERROR);
  });

  it("canvas khong dung duoc thi bao anh khong doc duoc", async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;

    await expect(preparePhoto(file())).rejects.toThrow(PHOTO_UNREADABLE_ERROR);
  });

  it("trinh duyet cu khong co createImageBitmap thi fallback sang the img", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => {
        throw new Error("không hỗ trợ");
      }),
    );
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:fake"),
      revokeObjectURL: vi.fn(),
    });

    const prepared = await preparePhoto(file());

    expect(prepared.data).toBe("AAAA");
  });
});
