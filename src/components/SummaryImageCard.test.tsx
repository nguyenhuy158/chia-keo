import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SummaryTextInput } from "../../shared/summary-text";
import { installFakeCanvas } from "../test/fake-canvas";
import { AN, BINH, createFakeGameApi, createTestQueryClient, makeDetail } from "../test/fake-game-api";
import { SummaryImageCard } from "./SummaryImageCard";

const clipboard = vi.hoisted(() => ({
  copyText: vi.fn(async (_text: string) => true),
  copyImage: vi.fn(async (_blob: Promise<Blob>) => true),
  downloadBlob: vi.fn((_blob: Blob, _name: string) => {}),
}));

vi.mock("../adapters/browser/clipboard", () => clipboard);

let canvas: ReturnType<typeof installFakeCanvas>;
let api: ReturnType<typeof createFakeGameApi>;

function summaryInput(): SummaryTextInput {
  const detail = makeDetail();
  return {
    code: detail.code,
    name: detail.name,
    participants: detail.participants,
    expenses: [],
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
  };
}

function renderCard() {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <SummaryImageCard input={summaryInput()} />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  api = createFakeGameApi();
  canvas = installFakeCanvas();
  clipboard.copyText.mockClear();
  clipboard.copyImage.mockClear();
  clipboard.downloadBlob.mockClear();
  vi.stubGlobal("fetch", vi.fn(async () => new Response("")));
  vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:fake"), revokeObjectURL: vi.fn() });
});

afterEach(() => {
  canvas.restore();
  vi.unstubAllGlobals();
});

describe("SummaryImageCard", () => {
  it("ve san anh xem truoc", async () => {
    renderCard();

    await waitFor(() => expect(screen.getByRole("button", { name: "Xem ảnh to" })).toBeInTheDocument());
  });

  it("co cong tac bat/tat QR va avatar", async () => {
    renderCard();

    await waitFor(() => expect(screen.getAllByRole("switch")).toHaveLength(2));
  });

  it("tat QR thi luu lai lua chon cho lan sau", async () => {
    const user = renderCard();
    await waitFor(() => expect(screen.getAllByRole("switch")).toHaveLength(2));

    await user.click(screen.getByRole("switch", { name: /QR/ }));

    await waitFor(() =>
      expect(api.preferences.update).toHaveBeenCalledWith({ summaryShowQr: false }),
    );
  });

  it("copy anh xem truoc", async () => {
    const user = renderCard();
    await waitFor(() => expect(screen.getByRole("button", { name: /Copy ảnh/ })).toBeEnabled());

    await user.click(screen.getByRole("button", { name: /Copy ảnh/ }));

    await waitFor(() => expect(clipboard.copyImage).toHaveBeenCalled());
  });

  it("luu anh ve may", async () => {
    const user = renderCard();
    await waitFor(() => expect(screen.getByRole("button", { name: /Lưu về máy/ })).toBeEnabled());

    await user.click(screen.getByRole("button", { name: /Lưu về máy/ }));

    await waitFor(() => expect(clipboard.downloadBlob).toHaveBeenCalled());
  });

  it("mo anh to roi dong lai", async () => {
    const user = renderCard();
    await waitFor(() => expect(screen.getByRole("button", { name: "Xem ảnh to" })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Xem ảnh to" }));
    // Lop xem anh toan man hinh co nut dong rieng.
    expect((await screen.findAllByRole("button", { name: "Đóng" })).length).toBeGreaterThan(0);

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("button", { name: "Đóng" })).toBeNull());
  });
});
