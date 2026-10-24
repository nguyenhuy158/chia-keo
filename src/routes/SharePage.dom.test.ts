import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiExpense, ApiShareView } from "../../shared/api-types";

const { state, useShareView } = vi.hoisted(() => ({
  state: {
    loading: false,
    error: false,
    view: undefined as ApiShareView | undefined,
  },
  useShareView: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ token: "share-token" }),
}));
vi.mock("../adapters/react-query/queries", () => ({
  useShareView: (token: string) => {
    useShareView(token);
    return { isPending: state.loading, isError: state.error, data: state.view };
  },
}));
vi.mock("../components/GameDashboard", () => ({
  GameDashboard: () => "game dashboard",
}));
vi.mock("../components/CopyMenu", () => ({ CopyMenu: () => "copy menu" }));
vi.mock("../components/SharePhotoGallery", () => ({
  SharePhotoGallery: () => "photo gallery",
}));
vi.mock("../components/theme", () => ({ ThemeToggle: () => "theme toggle" }));

import { SharePage } from "./SharePage";

const people: ApiShareView["participants"] = [
  { id: "an", name: "An", bankId: "", accountNo: "", accountName: "" },
  { id: "binh", name: "Bình", bankId: "", accountNo: "", accountName: "" },
];

function expense(overrides: Partial<ApiExpense> = {}): ApiExpense {
  return {
    id: "expense-1",
    kind: "expense",
    category: "",
    title: "Tiền sân",
    amount: 100000,
    note: "",
    payerParticipantId: "an",
    splitMode: "equal",
    splitParticipantIds: ["an", "binh"],
    splits: [
      { participantId: "an", amount: 50000, weight: null },
      { participantId: "binh", amount: 50000, weight: null },
    ],
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function view(overrides: Partial<ApiShareView> = {}): ApiShareView {
  return {
    code: "CK01",
    name: "Cầu tối",
    settlementMode: "p2p",
    settlementHostId: "",
    closedAt: null,
    participants: people,
    expenses: [expense()],
    summary: {
      totalExpense: 100000,
      balances: [
        { participantId: "an", paid: 100000, owed: 50000, balance: 50000 },
        { participantId: "binh", paid: 0, owed: 50000, balance: -50000 },
      ],
      settlements: [
        { fromParticipantId: "binh", toParticipantId: "an", amount: 50000 },
      ],
    },
    ...overrides,
  };
}

let host: HTMLDivElement;
let root: Root;

function render() {
  act(() => root.render(createElement(SharePage)));
}

function tab(label: string) {
  return [...host.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === label,
  ) as HTMLButtonElement;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.loading = false;
  state.error = false;
  state.view = undefined;
  useShareView.mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("SharePage", () => {
  it("shows loading and invalid-link states", () => {
    state.loading = true;
    render();
    expect(useShareView).toHaveBeenCalledWith("share-token");
    expect(host.textContent).not.toContain("Không tìm thấy link chia sẻ");
    state.loading = false;
    state.error = true;
    render();
    expect(host.textContent).toContain("Không tìm thấy link chia sẻ");
    state.error = false;
    render();
    expect(host.textContent).toContain("Không tìm thấy link chia sẻ");
  });

  it("shows summary, closed badge, and filters transfers from the expense list", () => {
    state.view = view({
      closedAt: "2026-01-02T00:00:00Z",
      expenses: [
        expense(),
        expense({ id: "transfer-1", kind: "transfer", title: "Trả nợ" }),
      ],
    });
    render();
    expect(host.textContent).toContain("CK01");
    expect(host.textContent).toContain("Cầu tối");
    expect(host.textContent).toContain("Đã đóng");
    expect(host.textContent).toContain("game dashboard");
    expect(host.textContent).toContain("Tiền sân");
    expect(host.textContent).not.toContain("Trả nợ");
    expect(host.textContent).toContain("An trả, chia 2 người");
    expect(host.textContent).toContain("copy menu");
  });

  it("shows an empty summary and a fallback for missing payers", () => {
    state.view = view({ expenses: [] });
    render();
    expect(host.textContent).toContain("Chưa có khoản chi nào");
    expect(host.textContent).not.toContain("Đã đóng");
    state.view = view({
      expenses: [expense({ payerParticipantId: "missing" })],
    });
    render();
    expect(host.textContent).toContain("Không rõ trả");
  });

  it("switches between summary, photos, and matrix views", () => {
    state.view = view({
      expenses: [
        expense(),
        expense({
          id: "custom",
          title: "Bữa tối",
          splitMode: "amount",
          splits: [{ participantId: "an", amount: 100000, weight: null }],
        }),
        expense({ id: "empty", title: "Không chia", splits: [] }),
        expense({ id: "transfer", kind: "transfer", title: "Trả nợ" }),
      ],
    });
    render();
    act(() => tab("Ảnh").click());
    expect(host.textContent).toContain("photo gallery");
    act(() => tab("Bảng chia").click());
    expect(host.textContent).toContain("3 khoản");
    expect(host.textContent).toContain("Tùy chỉnh");
    expect(host.textContent).toContain("50.000");
    expect(host.textContent).not.toContain("Trả nợ");
    expect(host.querySelectorAll("table tbody tr")).toHaveLength(3);
    expect(host.querySelectorAll("article")).toHaveLength(3);
    act(() => tab("Tổng kết").click());
    expect(host.textContent).toContain("game dashboard");
  });

  it("renders matrix with no participants, balances, or expenses", () => {
    state.view = view({
      participants: [],
      expenses: [],
      summary: { totalExpense: 0, balances: [], settlements: [] },
    });
    render();
    act(() => tab("Bảng chia").click());
    expect(host.textContent).toContain("0 khoản");
    expect(host.querySelectorAll("table tbody tr")).toHaveLength(0);
    state.view = view({
      summary: { totalExpense: 0, balances: [], settlements: [] },
    });
    render();
    expect(host.querySelectorAll("table thead th")).toHaveLength(6);
  });
});
