import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiGame } from "../../shared/api-types";

const { state, navigate, reopen, success, error, useArchivedGames } =
  vi.hoisted(() => ({
    state: {
      games: [] as ApiGame[] | undefined,
      pending: false,
    },
    navigate: vi.fn(),
    reopen: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    useArchivedGames: vi.fn(),
  }));

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));
vi.mock("../adapters/react-query/queries", () => ({
  useArchivedGames: (enabled: boolean) => {
    useArchivedGames(enabled);
    return { data: state.games, isPending: state.pending };
  },
  useReopenGame: () => ({ mutateAsync: reopen, isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { success, error } }));

import { ArchivedGamesCard } from "./ArchivedGamesCard";

let host: HTMLDivElement;
let root: Root;
let stored: Map<string, string>;

function render(onNavigate?: () => void) {
  act(() => root.render(createElement(ArchivedGamesCard, { onNavigate })));
}

function button(label: string) {
  return [...host.querySelectorAll("button")].find((item) =>
    item.textContent?.includes(label),
  ) as HTMLButtonElement;
}

function game(overrides: Partial<ApiGame> = {}): ApiGame {
  return {
    id: "game-1",
    name: "Kèo test",
    participantCount: 2,
    expenseCount: 1,
    closeMode: "archived",
    closedAt: "2026-08-01T00:00:00.000Z",
    isOwner: true,
    ...overrides,
  } as ApiGame;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.games = [];
  state.pending = false;
  navigate.mockReset();
  reopen.mockReset().mockResolvedValue(undefined);
  success.mockReset();
  error.mockReset();
  useArchivedGames.mockReset();
  stored = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("ArchivedGamesCard", () => {
  it("is collapsed by default and only loads the list once opened", () => {
    render();
    expect(useArchivedGames).toHaveBeenLastCalledWith(false);
    expect(host.textContent).not.toContain("Chưa lưu trữ");
    act(() => button("Xem").click());
    expect(useArchivedGames).toHaveBeenLastCalledWith(true);
    expect(host.textContent).toContain("Chưa lưu trữ cuộc chơi nào");
    act(() => button("Ẩn").click());
    expect(host.textContent).not.toContain("Chưa lưu trữ");
  });

  it("shows a skeleton while loading", () => {
    state.pending = true;
    state.games = undefined;
    render();
    act(() => button("Xem").click());
    expect(host.textContent).not.toContain("Chưa lưu trữ");
  });

  it("lists archived games, opens one and restores it", async () => {
    state.games = [
      game(),
      game({
        id: "game-2",
        name: "Của người khác",
        closedAt: null,
        isOwner: false,
      }),
    ];
    const onNavigate = vi.fn();
    render(onNavigate);
    act(() => button("Xem").click());
    expect(host.textContent).toContain("Kèo test");
    expect(host.textContent).toContain("Của người khác");
    expect(host.querySelectorAll("button").length).toBeGreaterThan(3);

    act(() => button("Kèo test").click());
    expect(navigate).toHaveBeenCalledWith({
      to: "/games/$gameId",
      params: { gameId: "game-1" },
    });
    expect(onNavigate).toHaveBeenCalledOnce();

    await act(async () => button("Khôi phục").click());
    expect(reopen).toHaveBeenCalledWith("game-1");
    expect(success).toHaveBeenCalledWith('Đã khôi phục "Kèo test"');

    reopen.mockRejectedValueOnce(new Error("fail"));
    await act(async () => button("Khôi phục").click());
    expect(error).toHaveBeenCalledWith("Không khôi phục được");
  });
});
