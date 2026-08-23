import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SummaryTextInput } from "../../shared/summary-text";
import { AN, BINH, makeDetail } from "../test/fake-game-api";
import { installFakeCanvas } from "../test/fake-canvas";
import { CopyMenu } from "./CopyMenu";

let canvas: ReturnType<typeof installFakeCanvas>;

// Cua ngo ra clipboard/tai file la mot adapter rieng (da co test rieng); o day
// chi can biet CopyMenu dua CAI GI cho no.
const clipboard = vi.hoisted(() => ({
  copyText: vi.fn(async (_text: string) => true),
  copyImage: vi.fn(async (_blob: Promise<Blob>) => true),
  downloadBlob: vi.fn((_blob: Blob, _fileName: string) => {}),
}));

vi.mock("../adapters/browser/clipboard", () => clipboard);

function summaryInput(overrides: Partial<SummaryTextInput> = {}): SummaryTextInput {
  const detail = makeDetail();
  return {
    code: detail.code,
    name: detail.name,
    participants: detail.participants,
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

/**
 * Moi muc menu co ca nhan lan dong goi y nen ten tro nang kem ca hai; doi
 * chieu bang dung dong nhan de "Copy tong ket" khong an vao "Copy tong ket
 * chi tiet".
 */
/**
 * Bam mot muc menu bang fireEvent: menu tu dong khi thay mousedown ngoai vung,
 * ma userEvent.click gui mousedown truoc — se dong menu roi click roi vao
 * khoang khong.
 */
function clickMenuItem(label: string) {
  const item = menuItem(label);
  fireEvent.click(item);
  return item;
}

function menuItem(label: string) {
  const item = screen
    .getAllByRole("menuitem")
    .find((node) => node.querySelector("span span")?.textContent === label);
  if (!item) throw new Error(`Khong tim thay muc menu "${label}"`);
  return item;
}

async function openMenu(input = summaryInput()) {
  const user = userEvent.setup();
  // Menu ve bang createPortal(document.body): goc React phai la chinh
  // document.body, khong thi su kien tren muc menu khong toi duoc React.
  render(<CopyMenu input={input} />, { container: document.body });
  await user.click(screen.getByRole("button"));
  return user;
}

beforeEach(() => {
  canvas = installFakeCanvas();
  clipboard.copyText.mockClear().mockResolvedValue(true);
  clipboard.copyImage.mockClear().mockResolvedValue(true);
  clipboard.downloadBlob.mockClear();
  vi.stubGlobal("fetch", vi.fn(async () => new Response("")));
});

afterEach(() => {
  canvas.restore();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("CopyMenu", () => {
  it("chua bam thi menu dong", () => {
    render(<CopyMenu input={summaryInput()} />, { container: document.body });

    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
  });

  it("bam thi mo menu voi cac lua chon copy", async () => {
    await openMenu();

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(menuItem("Copy tổng kết")).toBeInTheDocument();
    expect(menuItem("Copy ảnh")).toBeInTheDocument();
  });

  it("chua co link chia se thi khong hien muc copy link", async () => {
    await openMenu();

    expect(
      screen
        .getAllByRole("menuitem")
        .some((node) => node.querySelector("span span")?.textContent === "Copy link"),
    ).toBe(false);
  });

  it("co link chia se thi copy duoc link", async () => {
    await openMenu(summaryInput({ shareUrl: "https://chia-keo.test/share/abcd" }));

    clickMenuItem("Copy link");

    await waitFor(() =>
      expect(clipboard.copyText).toHaveBeenCalledWith("https://chia-keo.test/share/abcd"),
    );
  });

  it("copy tong ket dang chu", async () => {
    await openMenu();

    clickMenuItem("Copy tổng kết");

    await waitFor(() => expect(clipboard.copyText.mock.calls[0]?.[0]).toContain("Cầu lông"));
  });

  it("copy ban chi tiet thi dai hon ban gon", async () => {
    await openMenu();

    clickMenuItem("Copy tổng kết chi tiết");

    await waitFor(() => expect(clipboard.copyText.mock.calls[0]?.[0]).toContain("Tiền nước"));
  });

  it("copy anh tong ket", async () => {
    await openMenu();

    clickMenuItem("Copy ảnh");

    await waitFor(() => expect(clipboard.copyImage).toHaveBeenCalled());
  });

  it("trinh duyet khong copy duoc anh thi tai anh ve may", async () => {
    // Firefox chua ho tro copy anh: phai co duong lui, khong bo nguoi dung giua chung.
    clipboard.copyImage.mockResolvedValue(false);
    await openMenu();

    clickMenuItem("Copy ảnh");

    await waitFor(() => expect(clipboard.downloadBlob).toHaveBeenCalled());
  });

  it("luu anh ve may", async () => {
    await openMenu();

    clickMenuItem("Lưu ảnh về máy");

    await waitFor(() => expect(clipboard.downloadBlob).toHaveBeenCalled());
  });

  it("bam ra ngoai thi dong menu", async () => {
    const user = await openMenu();

    await user.click(document.body);

    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });
});
