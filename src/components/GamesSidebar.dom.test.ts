import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiGame } from "../../shared/api-types";

const { state, navigate, createGame, duplicateGame } = vi.hoisted(() => ({
  state: {
    games: undefined as ApiGame[] | undefined,
    loading: false,
    creating: false,
    duplicating: false,
  },
  navigate: vi.fn(),
  createGame: vi.fn(),
  duplicateGame: vi.fn(),
}));

vi.mock("@tanstack/react-router", async () => {
  const { createElement } = await import("react");
  return {
    useNavigate: () => navigate,
    Link: ({
      children,
      onClick,
    }: {
      children: React.ReactNode;
      onClick?: () => void;
    }) => createElement("a", { href: "#game", onClick }, children),
  };
});
vi.mock("../adapters/react-query/queries", () => ({
  useGames: () => ({ data: state.games, isPending: state.loading }),
  useCreateGame: () => ({ mutateAsync: createGame, isPending: state.creating }),
  useDuplicateGame: () => ({
    mutateAsync: duplicateGame,
    isPending: state.duplicating,
  }),
}));
vi.mock("./ClosedGamesCard", () => ({ ClosedGamesCard: () => null }));
vi.mock("./ContactBookCard", () => ({ ContactBookCard: () => null }));
vi.mock("./TrashCard", () => ({ TrashCard: () => null }));

import { GamesSidebar } from "./GamesSidebar";

let host: HTMLDivElement;
let root: Root;

function render(onNavigate?: () => void) {
  act(() => root.render(createElement(GamesSidebar, { onNavigate })));
}

function button(label: string) {
  return host.querySelector(
    `button[aria-label='${label}']`,
  ) as HTMLButtonElement;
}

function typeName(value: string) {
  const input = host.querySelector("#game-name") as HTMLInputElement;
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function submit() {
  return act(async () =>
    host
      .querySelector("form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}

function game(): ApiGame {
  return {
    id: "game-1",
    name: "Cầu tối",
    participantCount: 2,
    expenseCount: 1,
  } as ApiGame;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.games = undefined;
  state.loading = false;
  state.creating = false;
  state.duplicating = false;
  navigate.mockReset();
  createGame.mockReset().mockResolvedValue({ id: "new-game" });
  duplicateGame.mockReset().mockResolvedValue({ id: "copy-game" });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("GamesSidebar", () => {
  it("shows loading and empty game states", () => {
    state.loading = true;
    render();
    expect(host.textContent).not.toContain("Chưa có cuộc chơi nào");
    state.loading = false;
    render();
    expect(host.textContent).toContain("Chưa có cuộc chơi nào");
    state.games = [];
    render();
    expect(host.textContent).toContain("Chưa có cuộc chơi nào");
  });

  it("validates a new game and creates it with the chosen participant count", async () => {
    const onNavigate = vi.fn();
    render(onNavigate);
    await submit();
    expect(host.textContent).toContain("Nhập tên cuộc chơi");
    expect(createGame).not.toHaveBeenCalled();
    typeName("  Cầu sáng  ");
    act(() => button("Tăng số người tạo sẵn").click());
    act(() => button("Tăng số người tạo sẵn").click());
    expect(host.textContent).toContain("Người 2");
    act(() => button("Giảm số người tạo sẵn").click());
    await submit();
    expect(createGame).toHaveBeenCalledWith({
      name: "Cầu sáng",
      participantCount: 1,
    });
    expect(navigate).toHaveBeenCalledWith({
      to: "/games/$gameId",
      params: { gameId: "new-game" },
    });
    expect(onNavigate).toHaveBeenCalledOnce();
    expect((host.querySelector("#game-name") as HTMLInputElement).value).toBe(
      "",
    );
  });

  it("opens and duplicates listed games", async () => {
    const onNavigate = vi.fn();
    state.games = [game()];
    render(onNavigate);
    expect(host.textContent).toContain("2 người, 1 khoản");
    act(() =>
      (host.querySelector("a[href='#game']") as HTMLAnchorElement).click(),
    );
    expect(onNavigate).toHaveBeenCalledOnce();
    await act(async () => button("Nhân bản cuộc chơi").click());
    expect(duplicateGame).toHaveBeenCalledWith("game-1");
    expect(navigate).toHaveBeenCalledWith({
      to: "/games/$gameId",
      params: { gameId: "copy-game" },
    });
    state.duplicating = true;
    state.creating = true;
    render(onNavigate);
    expect(button("Nhân bản cuộc chơi").disabled).toBe(true);
    expect(button("Tạo cuộc chơi").disabled).toBe(true);
  });
});
