import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiGame } from "../../shared/api-types";

const { state, navigate, reopen, success, error, useClosedGames } = vi.hoisted(
  () => ({
    state: {
      games: [] as ApiGame[] | undefined,
      pending: false,
      reopening: false,
    },
    navigate: vi.fn(),
    reopen: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    useClosedGames: vi.fn(),
  }),
);

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));
vi.mock("../adapters/react-query/queries", () => ({
  useClosedGames: (enabled: boolean) => {
    useClosedGames(enabled);
    return { data: state.games, isPending: state.pending };
  },
  useReopenGame: () => ({ mutateAsync: reopen, isPending: state.reopening }),
}));
vi.mock("sonner", () => ({ toast: { success, error } }));

import { ClosedGamesCard } from "./ClosedGamesCard";

let host: HTMLDivElement;
let root: Root;
let stored: Map<string, string>;

function render(onNavigate?: () => void) {
  act(() => root.render(createElement(ClosedGamesCard, { onNavigate })));
}

function button(label: string) {
  return [...host.querySelectorAll("button")].find((item) =>
    item.textContent?.includes(label),
  ) as HTMLButtonElement;
}

function game(overrides: Partial<ApiGame> = {}): ApiGame {
  return {
    id: "game-1",
    name: "Cầu tối",
    participantCount: 2,
    expenseCount: 1,
    closeMode: "settled",
    closedAt: "2026-08-01T00:00:00.000Z",
    isOwner: true,
    ...overrides,
  } as ApiGame;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.games = [];
  state.pending = false;
  state.reopening = false;
  navigate.mockReset();
  reopen.mockReset().mockResolvedValue(undefined);
  success.mockReset();
  error.mockReset();
  useClosedGames.mockReset();
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

describe("ClosedGamesCard", () => {
  it("fetches only when expanded and shows loading or empty state", () => {
    render();
    expect(useClosedGames).toHaveBeenLastCalledWith(false);
    expect(host.textContent).not.toContain("Chưa có cuộc chơi");
    state.pending = true;
    state.games = undefined;
    act(() => button("Xem").click());
    expect(useClosedGames).toHaveBeenLastCalledWith(true);
    expect(host.querySelector("[aria-expanded='true']")).not.toBeNull();
    state.pending = false;
    state.games = [];
    render();
    expect(host.textContent).toContain("Chưa có cuộc chơi nào đóng");
    act(() => button("Ẩn").click());
    expect(useClosedGames).toHaveBeenLastCalledWith(false);
  });

  it("opens a closed game and notifies the parent", () => {
    const onNavigate = vi.fn();
    state.games = [game({ isOwner: false, closedAt: null })];
    render(onNavigate);
    act(() => button("Xem").click());
    expect(host.textContent).toContain("Cầu tối");
    expect(button("Mở lại")).toBeUndefined();
    act(() => button("Cầu tối").click());
    expect(navigate).toHaveBeenCalledWith({
      to: "/games/$gameId",
      params: { gameId: "game-1" },
    });
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("reopens an owned game and reports success or failure", async () => {
    state.games = [game()];
    render();
    act(() => button("Xem").click());
    expect(host.textContent).toContain("2 người, 1 khoản");
    await act(async () => button("Mở lại").click());
    expect(reopen).toHaveBeenCalledWith("game-1");
    expect(success).toHaveBeenCalledWith('Đã mở lại "Cầu tối"');
    reopen.mockRejectedValue(new Error("offline"));
    await act(async () => button("Mở lại").click());
    expect(error).toHaveBeenCalledWith("Không mở lại được");
    state.reopening = true;
    render();
    expect(button("Mở lại").disabled).toBe(true);
  });
});
