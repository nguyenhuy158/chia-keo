import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiGameEvent } from "../../shared/game-events";

const { state, useGameEvents, undo, success, error } = vi.hoisted(() => ({
  state: {
    events: undefined as ApiGameEvent[] | undefined,
    loading: false,
    undoPending: false,
  },
  useGameEvents: vi.fn(),
  undo: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../adapters/react-query/queries", () => ({
  useGameEvents: (gameId: string, enabled: boolean) => {
    useGameEvents(gameId, enabled);
    return { data: state.events, isPending: state.loading };
  },
  useUndoGameEvent: () => ({ mutateAsync: undo, isPending: state.undoPending }),
}));
vi.mock("sonner", () => ({ toast: { success, error } }));

import { HistoryPanel } from "./HistoryPanel";

let host: HTMLDivElement;
let root: Root;

function render(collapsible = false) {
  act(() =>
    root.render(createElement(HistoryPanel, { gameId: "game", collapsible })),
  );
}

function button(label: string) {
  return [...host.querySelectorAll("button")].find((item) =>
    item.textContent?.includes(label),
  ) as HTMLButtonElement;
}

function event(overrides: Partial<ApiGameEvent> = {}): ApiGameEvent {
  return {
    id: "event-1",
    createdAt: new Date().toISOString(),
    undoneAt: null,
    payload: {
      kind: "expense_removed",
      title: "Sân",
      amount: 100_000,
      payerName: "An",
      restore: {
        payerParticipantId: "person-1",
        kind: "expense",
        title: "Sân",
        amount: 100_000,
        note: "",
        splitMode: "equal",
        splits: [],
      },
    },
    ...overrides,
  };
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.events = undefined;
  state.loading = false;
  state.undoPending = false;
  useGameEvents.mockReset();
  undo.mockReset().mockResolvedValue(undefined);
  success.mockReset();
  error.mockReset();
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: vi.fn() });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("HistoryPanel", () => {
  it("keeps collapsed history unfetched until opened", () => {
    render(true);
    expect(useGameEvents).toHaveBeenLastCalledWith("game", false);
    state.loading = true;
    act(() => button("Xem").click());
    expect(useGameEvents).toHaveBeenLastCalledWith("game", true);
    expect(host.textContent).toContain("Ai đã làm gì");
    state.loading = false;
    state.events = [];
    render(true);
    expect(host.textContent).toContain("Chưa có gì trong lịch sử");
    act(() => button("Ẩn").click());
    expect(useGameEvents).toHaveBeenLastCalledWith("game", false);
  });

  it("shows events with dates and undo availability", () => {
    state.events = [
      event(),
      event({
        id: "old",
        createdAt: "2020-01-01T00:00:00.000Z",
        undoneAt: "2020-01-02",
      }),
      event({
        id: "invalid",
        createdAt: "invalid",
        payload: { kind: "game_created", name: "Cầu" },
      }),
      event({
        id: "person",
        payload: { kind: "participant_removed", name: "Bình" },
      }),
    ];
    render();
    expect(useGameEvents).toHaveBeenLastCalledWith("game", true);
    expect(host.textContent).toContain("Xóa khoản Sân");
    expect(host.textContent).toContain("đã hoàn tác");
    expect(host.textContent).toContain("Tạo cuộc chia");
    expect(host.querySelectorAll("button")).toHaveLength(1);
  });

  it("undoes an expense and reports success or failure", async () => {
    state.events = [event()];
    render();
    await act(async () => button("Hoàn tác").click());
    expect(undo).toHaveBeenCalledWith("event-1");
    expect(success).toHaveBeenCalledWith("Đã dựng lại khoản chi");
    undo.mockRejectedValue(new Error("missing person"));
    await act(async () => button("Hoàn tác").click());
    expect(error).toHaveBeenCalledWith(
      "Không hoàn tác được — người liên quan không còn trong cuộc chia",
    );
    state.undoPending = true;
    render();
    expect(button("Hoàn tác").disabled).toBe(true);
  });
});
