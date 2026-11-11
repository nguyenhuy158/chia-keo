import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SummaryTextInput } from "../../../shared/summary-text";

const { renderSummaryImage } = vi.hoisted(() => ({
  renderSummaryImage: vi.fn(),
}));
vi.mock("./summary-image", () => ({ renderSummaryImage }));

import { renderSharePreviewImage } from "./share-preview-image";

const input = { code: "CK01" } as SummaryTextInput;
const summaryBlob = new Blob(["png"]);
const drawImage = vi.fn();

beforeEach(() => {
  drawImage.mockClear();
  renderSummaryImage.mockReset().mockResolvedValue(summaryBlob);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    "data:image/jpeg;base64,QUJD",
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("renderSharePreviewImage", () => {
  it("scales the compact card without QR to fill 1200x630 from the top", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    const close = vi.fn();
    const bitmap = { width: 1520, height: 2000, close };
    const createImageBitmap = vi.fn(async () => bitmap);
    vi.stubGlobal("createImageBitmap", createImageBitmap);

    expect(await renderSharePreviewImage(input, "plain")).toBe("QUJD");

    expect(renderSummaryImage).toHaveBeenCalledWith(
      input,
      "compact",
      "plain",
      false,
      true,
    );
    expect(createImageBitmap).toHaveBeenCalledWith(summaryBlob);
    const scale = 1200 / 1520;
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1200, 2000 * scale);
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith(
      "image/jpeg",
      0.85,
    );
    expect(close).toHaveBeenCalledOnce();
  });

  it("fails when the browser has no 2d canvas", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 1, height: 1, close: vi.fn() })),
    );

    await expect(renderSharePreviewImage(input)).rejects.toThrow("canvas 2d");
  });
});
