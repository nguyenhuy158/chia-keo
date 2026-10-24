import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiParticipant } from "../../../shared/api-types";
import type { SummaryTextInput } from "../../../shared/summary-text";
import { buildSummaryImageFileName, renderSummaryImage } from "./summary-image";

const an: ApiParticipant = {
  id: "an",
  name: "An",
  bankId: "VCB",
  accountNo: "123456789",
  accountName: "NGUYEN AN",
};
const binh: ApiParticipant = {
  id: "binh",
  name: "Bình",
  bankId: "",
  accountNo: "",
  accountName: "",
};
const input: SummaryTextInput = {
  code: "K123",
  name: "Tiền sân",
  participants: [an, binh],
  expenses: [],
  summary: {
    totalExpense: 100_000,
    balances: [
      { participantId: "an", paid: 100_000, owed: 50_000, balance: 50_000 },
      { participantId: "binh", paid: 0, owed: 50_000, balance: -50_000 },
    ],
    settlements: [
      { fromParticipantId: "binh", toParticipantId: "an", amount: 50_000 },
    ],
  },
  shareUrl: "https://chiakeo.huyab.click/share/token",
};

let context: CanvasRenderingContext2D;
let fillText: ReturnType<typeof vi.fn>;
let drawImage: ReturnType<typeof vi.fn>;
let toBlob: ReturnType<typeof vi.fn<(callback: BlobCallback) => void>>;
let imageSources: string[];
let imageFails: (src: string) => boolean;
let imageHangs: (src: string) => boolean;

beforeEach(() => {
  fillText = vi.fn();
  drawImage = vi.fn();
  const gradient = { addColorStop: vi.fn() };
  context = {
    scale: vi.fn(),
    measureText: (text: string) => ({ width: text.length * 9 }),
    fillText,
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    save: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    clip: vi.fn(),
    drawImage,
    restore: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
  toBlob = vi.fn((callback: BlobCallback) =>
    callback(new Blob(["png"], { type: "image/png" })),
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(toBlob);
  imageSources = [];
  imageFails = () => false;
  imageHangs = () => false;
  class ImageStub {
    crossOrigin = "";
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(value: string) {
      imageSources.push(value);
      if (imageHangs(value)) return;
      queueMicrotask(() =>
        imageFails(value) ? this.onerror?.() : this.onload?.(),
      );
    }
  }
  vi.stubGlobal("Image", ImageStub);
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: undefined,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, "fonts");
});

describe("summary PNG rendering", () => {
  it("draws compact text and share link into a full size PNG without private graphics", async () => {
    const blob = await renderSummaryImage(
      input,
      "compact",
      "trang",
      false,
      false,
    );
    expect(blob.type).toBe("image/png");
    expect(fillText.mock.calls.map(([text]) => text)).toContain("Tiền sân");
    expect(
      fillText.mock.calls.some(([text]) =>
        String(text).includes("chiakeo.huyab.click"),
      ),
    ).toBe(true);
    expect(drawImage).not.toHaveBeenCalled();
    expect(imageSources).toEqual([]);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png");
    expect(buildSummaryImageFileName(input)).toBe("chia-keo-K123.png");
    expect(buildSummaryImageFileName(input, "detailed")).toBe(
      "chia-keo-K123-chi-tiet.png",
    );
  });

  it("draws QR for a payment and participant avatars", async () => {
    const blob = await renderSummaryImage(input, "detailed", "dem");
    expect(blob.type).toBe("image/png");
    expect(imageSources.some((source) => source.includes("/api/qr"))).toBe(
      true,
    );
    expect(
      imageSources.some((source) => source.startsWith("data:image/svg+xml")),
    ).toBe(true);
    expect(drawImage).toHaveBeenCalled();
    expect(
      fillText.mock.calls.some(([text]) => String(text).includes("Bình")),
    ).toBe(true);
  });

  it("draws one QR for a host and uses the light frame on a white card", async () => {
    await renderSummaryImage(
      { ...input, settlementMode: "host" },
      "detailed",
      "trang",
      true,
      false,
    );
    expect(imageSources.some((source) => source.includes("/api/qr"))).toBe(
      true,
    );
    expect(
      fillText.mock.calls.some(([text]) =>
        String(text).includes("Quét rồi tự nhập số tiền"),
      ),
    ).toBe(true);
    expect(drawImage).toHaveBeenCalledOnce();
  });

  it("falls back to text when a host has no bank or is absent from the participant list", async () => {
    await renderSummaryImage(
      {
        ...input,
        settlementMode: "host",
        participants: [{ ...an, bankId: "", accountNo: "" }, binh],
      },
      "compact",
      "trang",
      true,
      false,
    );
    await renderSummaryImage(
      { ...input, settlementMode: "host", participants: [binh] },
      "compact",
      "trang",
      true,
      false,
    );
    expect(imageSources).toEqual([]);
    expect(
      fillText.mock.calls.some(([text]) => String(text).includes("GOM VỀ")),
    ).toBe(true);
  });

  it("uses the participant name when an account name is empty", async () => {
    await renderSummaryImage(
      {
        ...input,
        settlementMode: "host",
        participants: [{ ...an, accountName: "" }, binh],
      },
      "compact",
      "trang",
      true,
      false,
    );
    expect(drawImage).toHaveBeenCalledOnce();
  });

  it("wraps long text and loads Vietnamese font subsets before measuring", async () => {
    const load = vi.fn().mockResolvedValue([]);
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { load },
    });
    await renderSummaryImage(
      {
        ...input,
        name: Array(30).fill("Cầu lông buổi tối").join(" "),
        shareUrl:
          "https://chiakeo.huyab.click/share/" +
          Array(30).fill("token").join("-"),
      },
      "compact",
      "trang",
      false,
      false,
    );
    expect(load).toHaveBeenCalledTimes(6);
    expect(load.mock.calls[0][1]).toContain("ăâđêôơư");
    expect(
      fillText.mock.calls.filter(([text]) => String(text).includes("Cầu lông"))
        .length,
    ).toBeGreaterThan(1);
    load.mockRejectedValue(new Error("font unavailable"));
    await expect(
      renderSummaryImage(input, "compact", "trang", false, false),
    ).resolves.toBeInstanceOf(Blob);
  });

  it("keeps the payment text when the QR image fails", async () => {
    imageFails = (source) => source.includes("/api/qr");
    await renderSummaryImage(input, "compact", "trang", true, false);
    expect(
      fillText.mock.calls.some(([text]) => String(text).includes("Bình")),
    ).toBe(true);
    expect(drawImage).not.toHaveBeenCalled();
  });

  it("skips QR when bank details are missing or the payer is absent", async () => {
    const recipient = { ...an, bankId: "", accountNo: "" };
    await renderSummaryImage(
      { ...input, participants: [recipient, binh], shareUrl: undefined },
      "compact",
      "trang",
      true,
      false,
    );
    expect(imageSources).toEqual([]);
    expect(
      fillText.mock.calls.some(([text]) => String(text).includes("Bình")),
    ).toBe(true);

    const missingPayer = {
      ...input,
      summary: {
        ...input.summary,
        settlements: [
          {
            fromParticipantId: "missing",
            toParticipantId: "an",
            amount: 50_000,
          },
        ],
      },
    };
    await renderSummaryImage(missingPayer, "compact", "trang", true, false);
    expect(imageSources).toEqual([]);
  });

  it("still draws text after an image times out", async () => {
    vi.useFakeTimers();
    imageHangs = (source) => source.includes("/api/qr");
    const rendering = renderSummaryImage(
      input,
      "compact",
      "trang",
      true,
      false,
    );
    await vi.advanceTimersByTimeAsync(8_000);
    await expect(rendering).resolves.toBeInstanceOf(Blob);
    expect(drawImage).not.toHaveBeenCalled();
  });

  it("draws text when avatar loading fails", async () => {
    imageFails = (source) => source.startsWith("data:image/svg+xml");
    await renderSummaryImage(
      { ...input, participants: [{ ...an, name: "" }, binh] },
      "compact",
      "trang",
      false,
      true,
    );
    expect(drawImage).not.toHaveBeenCalled();
    expect(fillText).toHaveBeenCalled();
  });

  it("reports unsupported canvas and failed PNG encoding", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    await expect(
      renderSummaryImage(input, "compact", "trang", false, false),
    ).rejects.toThrow("canvas 2d");
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context,
    );
    toBlob.mockImplementation((callback: BlobCallback) => callback(null));
    await expect(
      renderSummaryImage(input, "compact", "trang", false, false),
    ).rejects.toThrow("Khong tao duoc anh");
  });
});
