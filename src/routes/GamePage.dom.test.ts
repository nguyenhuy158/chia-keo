import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiGameDetail } from "../../shared/api-types";

const mocks = vi.hoisted(() => ({
  game: undefined as ApiGameDetail | undefined,
  loading: false,
  error: false,
  photos: [] as unknown[] | undefined,
  confirm: vi.fn(),
  navigate: vi.fn(),
  openGames: vi.fn(),
  findUndo: vi.fn(),
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
  mutation: {} as Record<
    string,
    {
      mutate: ReturnType<typeof vi.fn>;
      mutateAsync: ReturnType<typeof vi.fn>;
      isPending: boolean;
    }
  >,
  props: {} as Record<string, Record<string, unknown>>,
}));

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ gameId: "game-1" }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("../components/ConfirmDialog", () => ({
  useConfirm: () => mocks.confirm,
}));
vi.mock("../components/mobile-shell", () => ({
  useMobileShell: () => ({ openGames: mocks.openGames }),
}));
vi.mock("../adapters/browser/http-game-api", () => ({
  API_BASE: "https://api.example",
}));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("../adapters/react-query/queries", () => {
  const names = [
    "AddExpense",
    "AddParticipant",
    "AddParticipants",
    "AddTransfer",
    "CloseGame",
    "DeleteGame",
    "RemoveExpense",
    "RemoveParticipant",
    "ReorderExpenses",
    "ReorderParticipants",
    "RenameGame",
    "ReopenGame",
    "RotateShareLink",
    "SetSettlementHost",
    "SetSettlementMode",
    "SetShareLinkEnabled",
    "UndoGameEvent",
    "UpdateExpense",
    "UpdateParticipant",
  ];
  return {
    useGame: () => ({
      isPending: mocks.loading,
      isError: mocks.error,
      data: mocks.game,
    }),
    usePhotos: () => ({ isPending: false, data: mocks.photos }),
    findUndoableExpenseRemoval: mocks.findUndo,
    ...Object.fromEntries(
      names.map((name) => [`use${name}`, () => mocks.mutation[name]]),
    ),
  };
});

vi.mock("../components/CollaboratorsPanel", () => ({
  CollaboratorsPanel: (props: Record<string, unknown>) => {
    mocks.props.CollaboratorsPanel = props;
    return "CollaboratorsPanel";
  },
}));
vi.mock("../components/CopyMenu", () => ({
  CopyMenu: (props: Record<string, unknown>) => {
    mocks.props.CopyMenu = props;
    return "CopyMenu";
  },
}));
vi.mock("../components/ExpensePanel", () => ({
  ExpensePanel: (props: Record<string, unknown>) => {
    mocks.props.ExpensePanel = props;
    return "ExpensePanel";
  },
}));
vi.mock("../components/GameDashboard", () => ({
  GameDashboard: (props: Record<string, unknown>) => {
    mocks.props.GameDashboard = props;
    return "GameDashboard";
  },
}));
vi.mock("../components/HistoryPanel", () => ({
  HistoryPanel: (props: Record<string, unknown>) => {
    mocks.props.HistoryPanel = props;
    return "HistoryPanel";
  },
}));
vi.mock("../components/OnboardingBanner", () => ({
  OnboardingBanner: (props: Record<string, unknown>) => {
    mocks.props.OnboardingBanner = props;
    return "OnboardingBanner";
  },
}));
vi.mock("../components/PhotoPanel", () => ({
  PhotoPanel: (props: Record<string, unknown>) => {
    mocks.props.PhotoPanel = props;
    return "PhotoPanel";
  },
}));
vi.mock("../components/ParticipantPanel", () => ({
  ParticipantPanel: (props: Record<string, unknown>) => {
    mocks.props.ParticipantPanel = props;
    return "ParticipantPanel";
  },
}));
vi.mock("../components/SummaryImageCard", () => ({
  SummaryImageCard: (props: Record<string, unknown>) => {
    mocks.props.SummaryImageCard = props;
    return "SummaryImageCard";
  },
}));
vi.mock("../components/MobileGameNav", async () => {
  const { createElement: element } = await import("react");
  return {
    MobileGameNav: (props: { onChange: (value: string) => void }) =>
      element(
        "div",
        null,
        ...["people", "expenses", "summary", "more"].map((value) =>
          element(
            "button",
            {
              type: "button",
              key: value,
              onClick: () => props.onChange(value),
            },
            value,
          ),
        ),
      ),
    ExpenseFab: (props: { onClick: () => void }) =>
      element("button", { type: "button", onClick: props.onClick }, "fab"),
  };
});
vi.mock("../components/overlays", async () => {
  const { createElement: element } = await import("react");
  return {
    BottomSheet: (props: {
      open: boolean;
      onClose: () => void;
      children: unknown;
    }) =>
      props.open
        ? element(
            "div",
            null,
            props.children as import("react").ReactNode,
            element("button", { onClick: props.onClose }, "close sheet"),
          )
        : null,
  };
});

import { GamePage } from "./GamePage";

let host: HTMLDivElement;
let root: Root;

function game(overrides: Partial<ApiGameDetail> = {}): ApiGameDetail {
  return {
    id: "game-1",
    code: "CK01",
    name: "Cầu tối",
    settlementMode: "p2p",
    settlementHostId: "",
    createdAt: "2026-01-01T00:00:00Z",
    closedAt: null,
    closeMode: "manual",
    isOwner: true,
    shareLink: null,
    collaborators: [],
    participants: [
      { id: "an", name: "An", bankId: "", accountNo: "", accountName: "" },
    ],
    expenses: [
      {
        id: "expense-1",
        kind: "expense",
        category: "",
        title: "Tiền sân",
        amount: 100000,
        note: "",
        payerParticipantId: "an",
        splitMode: "equal",
        splitParticipantIds: ["an"],
        splits: [{ participantId: "an", amount: 100000, weight: null }],
        createdAt: "2026-01-01T00:00:00Z",
      },
    ],
    summary: { totalExpense: 100000, balances: [], settlements: [] },
    ...overrides,
  };
}

function render() {
  act(() => root.render(createElement(GamePage)));
}

function button(label: string) {
  const found = [...host.querySelectorAll("button")].find(
    (item) =>
      item.textContent?.trim() === label ||
      item.getAttribute("aria-label") === label,
  );
  if (!found) throw new Error(`Missing button ${label}`);
  return found as HTMLButtonElement;
}

async function click(label: string) {
  await act(async () => {
    button(label).click();
  });
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.game = game();
  mocks.loading = false;
  mocks.error = false;
  mocks.photos = [];
  mocks.props = {};
  for (const mock of [
    mocks.confirm,
    mocks.navigate,
    mocks.openGames,
    mocks.findUndo,
    mocks.toast,
    mocks.toast.success,
    mocks.toast.error,
  ])
    mock.mockReset();
  mocks.confirm.mockResolvedValue(true);
  mocks.findUndo.mockResolvedValue(null);
  for (const name of [
    "AddExpense",
    "AddParticipant",
    "AddParticipants",
    "AddTransfer",
    "CloseGame",
    "DeleteGame",
    "RemoveExpense",
    "RemoveParticipant",
    "ReorderExpenses",
    "ReorderParticipants",
    "RenameGame",
    "ReopenGame",
    "RotateShareLink",
    "SetSettlementHost",
    "SetSettlementMode",
    "SetShareLinkEnabled",
    "UndoGameEvent",
    "UpdateExpense",
    "UpdateParticipant",
  ]) {
    mocks.mutation[name] = {
      mutate: vi.fn((_input, options?: { onSuccess?: () => void }) =>
        options?.onSuccess?.(),
      ),
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    };
  }
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("GamePage", () => {
  it("shows loading and missing game states", () => {
    mocks.loading = true;
    render();
    expect(host.textContent).not.toContain("Cầu tối");
    mocks.loading = false;
    mocks.error = true;
    render();
    expect(host.textContent).toContain("Không tìm thấy cuộc chơi");
    mocks.error = false;
    mocks.game = undefined;
    render();
    expect(host.textContent).toContain("Không tìm thấy cuộc chơi");
  });

  it("renders panels and switches mobile sections", async () => {
    render();
    expect(host.textContent).toContain("Cầu tối");
    expect(mocks.props.GameDashboard.expenseCount).toBe(1);
    await click("people");
    expect(host.textContent?.match(/ParticipantPanel/g)).toHaveLength(2);
    await click("summary");
    expect(host.textContent?.match(/GameDashboard/g)).toHaveLength(2);
    await click("more");
    expect(host.textContent).toContain("Ảnh");
    await click("Lịch sử");
    expect(host.textContent?.match(/HistoryPanel/g)).toHaveLength(2);
    await click("Ảnh");
    expect(host.textContent?.match(/PhotoPanel/g)).toHaveLength(2);
    await click("Lịch sử");
    await click("fab");
    expect(host.textContent?.match(/ExpensePanel/g)).toHaveLength(2);
  });

  it("renames, closes, reopens and deletes with confirmation", async () => {
    render();
    await click("Đổi tên cuộc chơi");
    await click("Lưu tên cuộc chơi");
    expect(mocks.mutation.RenameGame.mutateAsync).not.toHaveBeenCalled();
    await click("Đổi tên cuộc chơi");
    const input = host.querySelector("input") as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(input, "Trận mới");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click("Lưu tên cuộc chơi");
    expect(mocks.mutation.RenameGame.mutateAsync).toHaveBeenCalledWith(
      "Trận mới",
    );
    mocks.confirm.mockResolvedValueOnce(false);
    await click("Đóng");
    expect(mocks.mutation.CloseGame.mutateAsync).not.toHaveBeenCalled();
    await click("Đóng");
    expect(mocks.mutation.CloseGame.mutateAsync).toHaveBeenCalledWith("game-1");
    mocks.game = game({ closedAt: "2026-01-02T00:00:00Z" });
    render();
    expect(host.textContent).toContain("Đã đóng");
    await click("Mở lại");
    expect(mocks.mutation.ReopenGame.mutateAsync).toHaveBeenCalledWith(
      "game-1",
    );
    mocks.confirm.mockResolvedValueOnce(false);
    await click("Xóa");
    expect(mocks.mutation.DeleteGame.mutateAsync).not.toHaveBeenCalled();
    await click("Xóa");
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/" });
  });

  it("handles share link and email actions", async () => {
    render();
    await click("Tạo link share");
    expect(mocks.mutation.RotateShareLink.mutate).toHaveBeenCalled();
    mocks.game = game({ shareLink: { token: "token", enabled: true } });
    render();
    expect(
      (mocks.props.CopyMenu.input as { shareUrl: string }).shareUrl,
    ).toContain("/share/token");
    await click("Tắt link");
    expect(mocks.mutation.SetShareLinkEnabled.mutate).toHaveBeenCalledWith(
      false,
      expect.anything(),
    );
    mocks.confirm.mockResolvedValueOnce(false);
    await click("Đổi link");
    await click("Đổi link");
    expect(mocks.mutation.RotateShareLink.mutate).toHaveBeenCalledTimes(2);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await click("Email cho tôi");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example/api/games/game-1/email-summary",
      expect.anything(),
    );
    fetchMock.mockResolvedValueOnce({ ok: false });
    await click("Email cho tôi");
    expect(mocks.toast.error).toHaveBeenCalled();
  });

  it("connects participant, expense and settlement actions", async () => {
    render();
    const participants = mocks.props.ParticipantPanel as Record<
      string,
      (...args: unknown[]) => unknown
    >;
    const expenses = mocks.props.ExpensePanel as Record<
      string,
      (...args: unknown[]) => unknown
    >;
    const dashboard = mocks.props.GameDashboard as Record<
      string,
      (...args: unknown[]) => unknown
    >;
    await act(async () => {
      await participants.onAdd({ name: "Bình" });
      await participants.onAddMany([{ name: "Bình" }]);
      await participants.onUpdate("an", { name: "An mới" });
      participants.onRemove("an");
      participants.onReorder(["an"]);
      await expenses.onAdd({ title: "Ăn" });
      await expenses.onUpdate("expense-1", { title: "Uống" });
      await expenses.onAddTransfer({ amount: 100 });
      expenses.onReorder(["expense-1"]);
      dashboard.onSettlementModeChange("host");
      dashboard.onSettlementHostChange("an");
      await dashboard.onSettle({
        fromParticipantId: "an",
        toParticipantId: "missing",
        amount: 100,
      });
    });
    expect(mocks.mutation.AddParticipant.mutateAsync).toHaveBeenCalled();
    expect(mocks.mutation.AddParticipants.mutateAsync).toHaveBeenCalledWith({
      people: [{ name: "Bình" }],
    });
    expect(mocks.mutation.UpdateParticipant.mutateAsync).toHaveBeenCalledWith({
      participantId: "an",
      input: { name: "An mới" },
    });
    expect(mocks.mutation.AddTransfer.mutateAsync).toHaveBeenCalledWith({
      fromParticipantId: "an",
      toParticipantId: "missing",
      amount: 100,
      note: "",
    });
    expect(mocks.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Ghi nhận An đã trả Không rõ?" }),
    );
    await act(async () => {
      await expenses.onRemove("expense-1");
    });
    expect(mocks.toast).toHaveBeenCalledWith(
      'Đã xóa "Tiền sân"',
      expect.anything(),
    );
  });

  it("reports failed close and reopen actions", async () => {
    render();
    mocks.mutation.CloseGame.mutateAsync.mockRejectedValueOnce(
      new Error("offline"),
    );
    await click("Đóng");
    expect(mocks.toast.error).toHaveBeenCalledWith("Không đóng được");
    mocks.game = game({ closedAt: "2026-01-02T00:00:00Z" });
    render();
    mocks.mutation.ReopenGame.mutateAsync.mockRejectedValueOnce(
      new Error("offline"),
    );
    await click("Mở lại");
    expect(mocks.toast.error).toHaveBeenCalledWith("Không mở lại được");
  });

  it("handles expense removal with undo and missing expense", async () => {
    render();
    const expenses = mocks.props.ExpensePanel as {
      onRemove: (id: string) => Promise<void>;
    };
    mocks.findUndo.mockResolvedValueOnce("event-1");
    await act(async () => {
      await expenses.onRemove("expense-1");
    });
    const options = mocks.toast.mock.calls[0][1] as {
      action: { onClick: () => void };
    };
    await act(async () => {
      options.action.onClick();
      await Promise.resolve();
    });
    expect(mocks.toast.success).toHaveBeenCalledWith("Đã dựng lại khoản chi");
    mocks.findUndo.mockResolvedValueOnce("event-2");
    await act(async () => {
      await expenses.onRemove("expense-1");
    });
    mocks.mutation.UndoGameEvent.mutateAsync.mockRejectedValueOnce(
      new Error("removed"),
    );
    const failedOptions = mocks.toast.mock.calls[1][1] as {
      action: { onClick: () => void };
    };
    await act(async () => {
      failedOptions.action.onClick();
      await Promise.resolve();
    });
    expect(mocks.toast.error).toHaveBeenCalled();
    await act(async () => {
      await expenses.onRemove("unknown");
    });
    expect(mocks.toast).toHaveBeenCalledWith("Đã xóa khoản chi", {
      action: undefined,
    });
  });

  it("supports name keyboard shortcuts, cancel, mobile actions and guest view", async () => {
    render();
    await click("Đổi tên cuộc chơi");
    let input = host.querySelector("input") as HTMLInputElement;
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(host.querySelector("input")).toBeNull();
    await click("Đổi tên cuộc chơi");
    await click("Hủy đổi tên");
    expect(host.querySelector("input")).toBeNull();
    await click("Đổi tên cuộc chơi");
    input = host.querySelector("input") as HTMLInputElement;
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });
    expect(host.querySelector("input")).toBeNull();
    await click("Danh sách cuộc chơi");
    expect(mocks.openGames).toHaveBeenCalled();
    await click("Tùy chọn cuộc chơi");
    expect(host.textContent).toContain("close sheet");
    await click("close sheet");
    expect(host.textContent).not.toContain("close sheet");
    mocks.game = game({ isOwner: false });
    render();
    expect(host.textContent).not.toContain("Xóa");
    expect(host.textContent).not.toContain("Đóng");
  });

  it("handles disabled share link and cancelled settlement", async () => {
    mocks.game = game({ shareLink: { token: "token", enabled: false } });
    render();
    expect(
      (mocks.props.CopyMenu.input as { shareUrl?: string }).shareUrl,
    ).toBeUndefined();
    await click("Bật link");
    expect(mocks.mutation.SetShareLinkEnabled.mutate).toHaveBeenCalledWith(
      true,
      expect.anything(),
    );
    const dashboard = mocks.props.GameDashboard as {
      onSettle: (value: unknown) => Promise<void>;
    };
    mocks.confirm.mockResolvedValueOnce(false);
    await act(async () => {
      await dashboard.onSettle({
        fromParticipantId: "missing",
        toParticipantId: "an",
        amount: 100,
      });
    });
    expect(mocks.mutation.AddTransfer.mutateAsync).not.toHaveBeenCalled();
  });

  it("handles photos still loading", () => {
    mocks.photos = undefined;
    render();
    expect(mocks.props.PhotoPanel.photos).toEqual([]);
  });
});
