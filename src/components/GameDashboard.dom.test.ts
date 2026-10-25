import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ApiExpense,
  ApiParticipant,
  ApiSummary,
} from "../../shared/api-types";
import type { SettlementMode } from "../../shared/schemas";

const { qr, canBuild, buildUrl, copyText, toastSuccess, toastError } =
  vi.hoisted(() => ({
    qr: { canBuild: vi.fn(), buildUrl: vi.fn() },
    canBuild: vi.fn(),
    buildUrl: vi.fn(),
    copyText: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
  }));

vi.mock("../core/container", () => ({ getQrProvider: () => qr }));
vi.mock("../adapters/browser/clipboard", () => ({ copyText }));
vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));
vi.mock("./CategoryBreakdownCard", () => ({
  CategoryBreakdownCard: () => "category card",
}));

import { GameDashboard } from "./GameDashboard";

const participants: ApiParticipant[] = [
  {
    id: "an",
    name: "An",
    bankId: "MB",
    accountNo: "12345678",
    accountName: "An",
  },
  { id: "binh", name: "Bình", bankId: "", accountNo: "", accountName: "" },
  { id: "chau", name: "Châu", bankId: "", accountNo: "", accountName: "" },
];

const balances: ApiSummary["balances"] = [
  { participantId: "an", paid: 150000, owed: 100000, balance: 50000 },
  { participantId: "binh", paid: 50000, owed: 100000, balance: -50000 },
  { participantId: "chau", paid: 100000, owed: 100000, balance: 0 },
];

const summary: ApiSummary = {
  totalExpense: 300000,
  balances,
  settlements: [
    { fromParticipantId: "binh", toParticipantId: "an", amount: 50000 },
  ],
};

let host: HTMLDivElement;
let root: Root;
let onModeChange = vi.fn();
let onHostChange = vi.fn();
let onSettle = vi.fn();
let onRemoveTransfer = vi.fn();

function transfer(overrides: Partial<ApiExpense> = {}): ApiExpense {
  return {
    id: "transfer-1",
    kind: "transfer",
    category: "",
    title: "Trả nợ",
    amount: 50000,
    note: "Chuyển khoản",
    payerParticipantId: "binh",
    splitMode: "equal",
    splitParticipantIds: ["an"],
    splits: [{ participantId: "an", amount: 50000, weight: null }],
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function render(overrides: Partial<Parameters<typeof GameDashboard>[0]> = {}) {
  act(() =>
    root.render(
      createElement(GameDashboard, {
        code: "CK01",
        name: "Cầu tối",
        participants,
        expenseCount: 2,
        summary,
        settlementMode: "p2p" as SettlementMode,
        onSettlementModeChange: onModeChange,
        onSettlementHostChange: onHostChange,
        onSettle,
        onRemoveTransfer,
        ...overrides,
      }),
    ),
  );
}

function button(label: string) {
  return [...host.querySelectorAll("button")].find(
    (item) =>
      item.textContent?.trim() === label ||
      item.getAttribute("aria-label") === label,
  ) as HTMLButtonElement | undefined;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  canBuild.mockReset().mockReturnValue(true);
  buildUrl.mockReset().mockReturnValue("https://qr.example/image");
  qr.canBuild = canBuild;
  qr.buildUrl = buildUrl;
  copyText.mockReset().mockResolvedValue(true);
  toastSuccess.mockReset();
  toastError.mockReset();
  onModeChange = vi.fn();
  onHostChange = vi.fn();
  onSettle = vi.fn();
  onRemoveTransfer = vi.fn();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("GameDashboard", () => {
  it("shows balances, P2P settlement, QR, and mode controls", () => {
    render({ showHeader: true });
    expect(host.textContent).toContain("CK01");
    expect(host.textContent).toContain("Cầu tối");
    expect(host.textContent).toContain("Tổng chi");
    expect(host.textContent).toContain("Cân bằng");
    expect(host.textContent).toContain("BìnhtrảAn");
    expect(host.querySelector('img[alt="QR nhận tiền của An"]')).not.toBeNull();
    expect(buildUrl).toHaveBeenCalledWith(participants[0], 50000, "CK01");
    expect(button("Copy lời nhắc cho Bình")).toBeDefined();
    act(() => button("Đã trả")?.click());
    expect(onSettle).toHaveBeenCalledWith(summary.settlements[0]);
    act(() => button("Gom 1 người")?.click());
    expect(onModeChange).toHaveBeenCalledWith("host");
    expect(button("Nhiều chiều")?.getAttribute("aria-pressed")).toBe("true");
  });

  it("hides editable controls in read-only mode and skips unknown balances", () => {
    render({
      onSettlementModeChange: undefined,
      onSettle: undefined,
      summary: {
        totalExpense: 0,
        balances: [{ participantId: "missing", paid: 0, owed: 0, balance: 0 }],
        settlements: [
          { fromParticipantId: "missing", toParticipantId: "an", amount: 1 },
        ],
      },
    });
    expect(button("Nhiều chiều")).toBeUndefined();
    expect(button("Đã trả")).toBeUndefined();
    expect(button("Copy lời nhắc cho Bình")).toBeUndefined();
    expect(host.querySelector('img[alt^="QR"]')).toBeNull();
    render({
      participants: [],
      summary: { totalExpense: 0, balances: [], settlements: [] },
      settlementMode: "off",
      onSettlementModeChange: undefined,
    });
    expect(host.textContent).toContain("Chưa có người tham gia");
    expect(host.textContent).not.toContain("Chuyển khoản tối ưu");
  });

  it("shows disabled settlement mode and P2P empty states", () => {
    render({ settlementMode: "off" });
    expect(host.textContent).toContain("Đang tắt");
    render({ summary: { ...summary, settlements: [] }, expenses: [] });
    expect(host.textContent).toContain("Thêm khoản chi để tính tiền");
    render({
      summary: { ...summary, settlements: [] },
      expenses: [transfer()],
    });
    expect(host.textContent).toContain("Mọi người đã cân bằng");
  });

  it("shows host transfers in both directions and the shared QR", () => {
    render({ settlementMode: "host" });
    expect(host.textContent).toContain("Gom về An");
    expect(host.textContent).toContain("Bình → An");
    expect(button("Copy lời nhắc cho Bình")).toBeDefined();
    expect(buildUrl).toHaveBeenCalledWith(participants[0], 0, "CK01");
    act(() => button("Đã trả")?.click());
    expect(onSettle).toHaveBeenCalledWith({
      fromParticipantId: "binh",
      toParticipantId: "an",
      amount: 50000,
    });
    render({
      settlementMode: "pick",
      settlementHostId: "binh",
      summary: {
        ...summary,
        balances: [
          { participantId: "an", paid: 50000, owed: 100000, balance: -50000 },
          { participantId: "binh", paid: 150000, owed: 100000, balance: 50000 },
        ],
      },
    });
    expect(host.textContent).toContain("An → Bình");
    expect(button("Copy lời nhắc cho An")).toBeDefined();
    act(() => button("Copy lời nhắc cho An")?.click());
    expect(copyText).toHaveBeenCalledWith(
      'An ơi, bạn chuyển 50.000 ₫ cho Bình cho kèo "Cầu tối" nhé.',
    );
    act(() => button("Đã trả")?.click());
    expect(onSettle).toHaveBeenCalledWith({
      fromParticipantId: "an",
      toParticipantId: "binh",
      amount: 50000,
    });
    expect(host.querySelector("select")).not.toBeNull();
    act(() => {
      const select = host.querySelector("select") as HTMLSelectElement;
      select.value = "an";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onHostChange).toHaveBeenCalledWith("an");
    render({ settlementMode: "pick", settlementHostId: "binh" });
    expect(host.textContent).toContain("Bình → An");
    act(() => button("Đã trả")?.click());
    expect(onSettle).toHaveBeenCalledWith({
      fromParticipantId: "binh",
      toParticipantId: "an",
      amount: 50000,
    });
  });

  it("warns when the selected host is gone and shows host empty states", () => {
    render({ settlementMode: "pick", settlementHostId: "missing" });
    expect(host.textContent).toContain("Người đã chọn không còn trong cuộc");
    render({ settlementMode: "host", summary: { ...summary, balances: [] } });
    expect(host.textContent).toContain("Thêm khoản chi để tính tiền");
    render({
      settlementMode: "host",
      summary: { ...summary, balances: [] },
      expenses: [transfer()],
    });
    expect(host.textContent).toContain("Mọi người đã cân bằng");
    render({
      settlementMode: "pick",
      settlementHostId: "missing",
      summary: { ...summary, balances: [] },
    });
    expect(host.textContent).toContain("người ứng nhiều nhất");
  });

  it("respects QR availability and pending settle state", () => {
    canBuild.mockReturnValue(false);
    render({ settlementMode: "host", settlePending: true });
    expect(host.querySelector('img[alt^="QR"]')).toBeNull();
    expect(button("Đã trả")?.disabled).toBe(true);
    expect(button("Copy lời nhắc cho Bình")?.disabled).toBe(true);
    render({ settlementMode: "p2p", settlePending: true });
    expect(host.querySelector('img[alt^="QR"]')).toBeNull();
    expect(button("Đã trả")?.disabled).toBe(true);
    expect(button("Copy lời nhắc cho Bình")?.disabled).toBe(true);
    render({ settlementMode: "host", onSettle: undefined });
    expect(button("Đã trả")).toBeUndefined();
    render({
      settlementMode: "host",
      summary: {
        ...summary,
        balances: [
          balances[0],
          { participantId: "missing", paid: 0, owed: 50000, balance: -50000 },
        ],
      },
    });
    expect(host.textContent).not.toContain("missing → An");
  });

  it("copies the current reminder and reports clipboard failure", async () => {
    render();
    await act(async () => button("Copy lời nhắc cho Bình")?.click());
    expect(copyText).toHaveBeenCalledWith(
      'Bình ơi, bạn chuyển 50.000 ₫ cho An cho kèo "Cầu tối" nhé.',
    );
    expect(toastSuccess).toHaveBeenCalledWith("Đã sao chép lời nhắc");

    copyText.mockResolvedValueOnce(false);
    await act(async () => button("Copy lời nhắc cho Bình")?.click());
    expect(toastError).toHaveBeenCalledWith("Không sao chép được lời nhắc");

    render({ summary: { ...summary, settlements: [] } });
    expect(button("Copy lời nhắc cho Bình")).toBeUndefined();
  });

  it("lists transfer history and removes a transfer", () => {
    render({
      expenses: [
        transfer(),
        transfer({
          id: "transfer-2",
          payerParticipantId: "missing",
          splits: [],
          note: "",
        }),
      ],
    });
    expect(host.textContent).toContain("Đã trả nợ");
    expect(host.textContent).toContain("Bình đã trả An");
    expect(host.textContent).toContain("Không rõ đã trả Không rõ");
    expect(host.textContent).toContain("Chuyển khoản");
    act(() => button("Xóa khoản trả nợ")?.click());
    expect(onRemoveTransfer).toHaveBeenCalledWith("transfer-1");
    render({ expenses: [transfer()], onRemoveTransfer: undefined });
    expect(button("Xóa khoản trả nợ")).toBeUndefined();
  });
});
