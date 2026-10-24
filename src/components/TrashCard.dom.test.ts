import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiTrashGame } from "../../shared/api-types";

const { state, confirm, restore, purge, success, error, useTrashedGames } =
  vi.hoisted(() => ({
    state: {
      games: undefined as ApiTrashGame[] | undefined,
      loading: false,
      restoring: false,
      purging: false,
    },
    confirm: vi.fn(),
    restore: vi.fn(),
    purge: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    useTrashedGames: vi.fn(),
  }));

vi.mock("./ConfirmDialog", () => ({ useConfirm: () => confirm }));
vi.mock("../adapters/react-query/queries", () => ({
  useTrashedGames: (enabled: boolean) => {
    useTrashedGames(enabled);
    return { data: state.games, isPending: state.loading };
  },
  useRestoreGame: () => ({ mutateAsync: restore, isPending: state.restoring }),
  usePurgeGame: () => ({ mutateAsync: purge, isPending: state.purging }),
}));
vi.mock("sonner", () => ({ toast: { success, error } }));

import { TrashCard } from "./TrashCard";

let host: HTMLDivElement;
let root: Root;

function render() {
  act(() => root.render(createElement(TrashCard)));
}

function button(label: string) {
  return [...host.querySelectorAll("button")].find((item) =>
    item.textContent?.includes(label),
  ) as HTMLButtonElement;
}

function game(deletedAt = new Date().toISOString()): ApiTrashGame {
  return {
    id: "game-1",
    name: "Cầu tối",
    participantCount: 2,
    expenseCount: 1,
    deletedAt,
  } as ApiTrashGame;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.games = undefined;
  state.loading = false;
  state.restoring = false;
  state.purging = false;
  confirm.mockReset().mockResolvedValue(true);
  restore.mockReset().mockResolvedValue(undefined);
  purge.mockReset().mockResolvedValue(undefined);
  success.mockReset();
  error.mockReset();
  useTrashedGames.mockReset();
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

describe("TrashCard", () => {
  it("fetches only when expanded and shows loading or empty state", () => {
    render();
    expect(useTrashedGames).toHaveBeenLastCalledWith(false);
    state.loading = true;
    act(() => button("Xem").click());
    expect(useTrashedGames).toHaveBeenLastCalledWith(true);
    expect(host.querySelector("[aria-expanded='true']")).not.toBeNull();
    state.loading = false;
    state.games = [];
    render();
    expect(host.textContent).toContain("Trống. Cuộc chơi đã xóa nằm ở đây");
    act(() => button("Ẩn").click());
    expect(useTrashedGames).toHaveBeenLastCalledWith(false);
  });

  it("restores a game and reports an error when restoration fails", async () => {
    state.games = [game()];
    render();
    act(() => button("Xem").click());
    expect(host.textContent).toContain("2 người, 1 khoản");
    await act(async () => button("Phục hồi").click());
    expect(restore).toHaveBeenCalledWith("game-1");
    expect(success).toHaveBeenCalledWith('Đã phục hồi "Cầu tối"');
    restore.mockRejectedValue(new Error("offline"));
    await act(async () => button("Phục hồi").click());
    expect(error).toHaveBeenCalledWith("Không phục hồi được");
    state.restoring = true;
    render();
    expect(button("Phục hồi").disabled).toBe(true);
  });

  it("requires confirmation before permanently deleting a game", async () => {
    state.games = [game("invalid-date")];
    render();
    act(() => button("Xem").click());
    expect(host.textContent).toContain("còn 30 ngày");
    confirm.mockResolvedValueOnce(false);
    await act(async () => button("Xóa hẳn").click());
    expect(purge).not.toHaveBeenCalled();
    await act(async () => button("Xóa hẳn").click());
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ destructive: true }),
    );
    expect(purge).toHaveBeenCalledWith("game-1");
    expect(success).toHaveBeenCalledWith("Đã xóa hẳn");
    purge.mockRejectedValue(new Error("offline"));
    await act(async () => button("Xóa hẳn").click());
    expect(error).toHaveBeenCalledWith("Không xóa được");
    state.purging = true;
    render();
    expect(button("Xóa hẳn").disabled).toBe(true);
  });

  it("does not show negative days for old trash", () => {
    state.games = [game("2020-01-01T00:00:00.000Z")];
    render();
    act(() => button("Xem").click());
    expect(host.textContent).toContain("còn 0 ngày");
  });
});
