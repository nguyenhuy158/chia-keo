// Canvas gia cho jsdom: jsdom khong cai dat canvas 2d, nen moi doan code ve
// anh (summary-image, image) se nem neu khong co lop nay.
//
// Khong ve that: chi ghi lai loi goi de test kiem duoc "co ve chu nay khong",
// "co ve QR khong" — dung phan quyet dinh duoc, khong phai tung pixel.

import { vi } from "vitest";

export type CanvasCall = { method: string; args: unknown[] };

/** Do chu gia: moi ky tu rong 8px — du de wrapText chia dong on dinh. */
const CHAR_WIDTH = 8;

export function installFakeCanvas() {
  const calls: CanvasCall[] = [];

  const context = new Proxy(
    {
      measureText: (text: string) => ({ width: String(text).length * CHAR_WIDTH }),
      fillText: (...args: unknown[]) => calls.push({ method: "fillText", args }),
      drawImage: (...args: unknown[]) => calls.push({ method: "drawImage", args }),
      fillRect: (...args: unknown[]) => calls.push({ method: "fillRect", args }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      canvas: { width: 0, height: 0 },
    } as Record<string, unknown>,
    {
      get(target, prop: string) {
        if (prop in target) return target[prop];
        // Cac lenh ve con lai (save/restore/beginPath/arc/...) chi can khong nem.
        return (...args: unknown[]) => calls.push({ method: prop, args });
      },
      set(target, prop: string, value) {
        target[prop] = value;
        return true;
      },
    },
  );

  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;

  HTMLCanvasElement.prototype.getContext = vi.fn(() => context) as never;
  HTMLCanvasElement.prototype.toBlob = vi.fn((callback: BlobCallback) => {
    callback(new Blob(["png"], { type: "image/png" }));
  }) as never;

  // Anh (QR, avatar) tai xong ngay, khong cham mang.
  class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    width = 100;
    height = 100;
    crossOrigin = "";
    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  const originalImage = globalThis.Image;
  globalThis.Image = FakeImage as never;

  function restore() {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toBlob = originalToBlob;
    globalThis.Image = originalImage;
  }

  /** Toan bo chu da ve, noi lai — de assert "anh co chua dong nay khong". */
  function drawnText() {
    return calls
      .filter((call) => call.method === "fillText")
      .map((call) => String(call.args[0]))
      .join("\n");
  }

  return { calls, restore, drawnText, context };
}
