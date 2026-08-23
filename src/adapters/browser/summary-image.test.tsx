import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SummaryTextInput } from "../../../shared/summary-text";
import { installFakeCanvas } from "../../test/fake-canvas";
import { buildSummaryImageFileName, renderSummaryImage } from "./summary-image";

const AN = "participant_an";
const BINH = "participant_binh";

let canvas: ReturnType<typeof installFakeCanvas>;

function summaryInput(overrides: Partial<SummaryTextInput> = {}): SummaryTextInput {
  return {
    code: "DSKVUF",
    name: "Cầu lông",
    participants: [
      { id: AN, name: "An", bankId: "970436", accountNo: "0123456789", accountName: "AN" },
      { id: BINH, name: "Bình", bankId: "", accountNo: "", accountName: "" },
    ],
    expenses: [
      {
        id: "expense_1",
        kind: "expense",
        title: "Tiền nước",
        amount: 90_000,
        note: "",
        payerParticipantId: AN,
        splitMode: "equal",
        splitParticipantIds: [AN, BINH],
        splits: [
          { participantId: AN, amount: 45_000, weight: null },
          { participantId: BINH, amount: 45_000, weight: null },
        ],
        createdAt: "2026-08-01T00:00:00.000Z",
      },
    ],
    summary: {
      totalExpense: 90_000,
      balances: [
        { participantId: AN, paid: 90_000, owed: 45_000, balance: 45_000 },
        { participantId: BINH, paid: 0, owed: 45_000, balance: -45_000 },
      ],
      settlements: [{ fromParticipantId: BINH, toParticipantId: AN, amount: 45_000 }],
    },
    settlementMode: "host",
    settlementHostId: AN,
    ...overrides,
  };
}

beforeEach(() => {
  canvas = installFakeCanvas();
  vi.stubGlobal("fetch", vi.fn(async () => new Response("")));
});

afterEach(() => {
  canvas.restore();
  vi.unstubAllGlobals();
});

describe("renderSummaryImage", () => {
  it("xuat ra anh PNG", async () => {
    const blob = await renderSummaryImage(summaryInput());

    expect(blob.type).toBe("image/png");
  });

  it("ve ten va ma cuoc chia len anh", async () => {
    await renderSummaryImage(summaryInput());

    expect(canvas.drawnText()).toContain("Cầu lông");
    expect(canvas.drawnText()).toContain("DSKVUF");
  });

  it("ve ai chuyen cho ai bao nhieu", async () => {
    await renderSummaryImage(summaryInput());

    expect(canvas.drawnText()).toContain("Bình → An: 45k");
  });

  it("ban day du chi tiet hon ban gon", async () => {
    await renderSummaryImage(summaryInput(), "detailed");
    const detailed = canvas.drawnText();

    canvas.restore();
    canvas = installFakeCanvas();
    await renderSummaryImage(summaryInput(), "compact");
    const compact = canvas.drawnText();

    expect(detailed.length).toBeGreaterThan(compact.length);
  });

  it("liet ke khoan chi va tung nguoi", async () => {
    await renderSummaryImage(summaryInput(), "detailed");

    expect(canvas.drawnText()).toContain("Tiền nước");
    expect(canvas.drawnText()).toContain("TỪNG NGƯỜI");
  });

  it("tat QR va avatar thi khong ve anh nao len canvas", async () => {
    await renderSummaryImage(summaryInput(), "compact", undefined, false, false);

    // Khong lo so tai khoan qua QR khi nguoi dung khong muon.
    expect(canvas.calls.filter((call) => call.method === "drawImage")).toHaveLength(0);
    expect(canvas.drawnText()).not.toContain("0123456789");
  });

  it("bat QR thi ve QR kem so tai khoan", async () => {
    await renderSummaryImage(summaryInput(), "compact", undefined, true, false);

    expect(canvas.calls.some((call) => call.method === "drawImage")).toBe(true);
    expect(canvas.drawnText()).toContain("0123456789");
  });

  it("tat avatar van ve duoc", async () => {
    const blob = await renderSummaryImage(summaryInput(), "compact", undefined, false, false);

    expect(blob.type).toBe("image/png");
  });

  it("nen la khong ro thi dung nen mac dinh, khong nem", async () => {
    const blob = await renderSummaryImage(summaryInput(), "compact", "khong-co-nen-nay");

    expect(blob.type).toBe("image/png");
  });

  it("co link chia se thi ve len chan anh", async () => {
    await renderSummaryImage(summaryInput({ shareUrl: "https://chia-keo.test/share/abcd" }));

    expect(canvas.drawnText()).toContain("chia-keo.test/share/abcd");
  });

  it("cuoc chua co khoan chi nao van ve duoc", async () => {
    const blob = await renderSummaryImage(
      summaryInput({
        expenses: [],
        summary: { totalExpense: 0, balances: [], settlements: [] },
      }),
    );

    expect(blob.type).toBe("image/png");
  });

  it("canvas khong dung duoc thi bao loi ro rang", async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;

    await expect(renderSummaryImage(summaryInput())).rejects.toThrow(/canvas/i);
  });

  it("khong tao duoc anh thi bao loi", async () => {
    HTMLCanvasElement.prototype.toBlob = vi.fn((callback: BlobCallback) => callback(null)) as never;

    await expect(renderSummaryImage(summaryInput())).rejects.toThrow(/Khong tao duoc anh/);
  });
});

describe("buildSummaryImageFileName", () => {
  it("dat ten file theo ma cuoc chia", () => {
    expect(buildSummaryImageFileName(summaryInput())).toContain("DSKVUF");
  });

  it("duoi file la png", () => {
    expect(buildSummaryImageFileName(summaryInput())).toMatch(/\.png$/);
  });
});
