import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiGame } from "../../shared/api-types";

const { state, navigate, createGame, duplicateGame } = vi.hoisted(() => ({
  state: {
    hideSettled: false,
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
  usePreferences: () => ({ hideSettledGames: state.hideSettled }),
  useCreateGame: () => ({ mutateAsync: createGame, isPending: state.creating }),
  useDuplicateGame: () => ({
    mutateAsync: duplicateGame,
    isPending: state.duplicating,
  }),
}));
vi.mock("./ClosedGamesCard", () => ({ ClosedGamesCard: () => null }));
vi.mock("./ArchivedGamesCard", () => ({ ArchivedGamesCard: () => null }));
vi.mock("./ContactBookCard", () => ({ ContactBookCard: () => null }));
vi.mock("./TrashCard", () => ({ TrashCard: () => null }));
vi.mock("./PlayedDatePicker", async () => {
  const { createElement } = await import("react");
  return {
    PlayedDatePicker: ({
      onChange,
    }: {
      onChange: (from: string, to: string) => void;
    }) =>
      createElement("button", {
        type: "button",
        "aria-label": "Chọn ngày chơi",
        onClick: () => onChange("2026-11-16", "2026-11-18"),
      }),
  };
});

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

function openCreateForm() {
  act(() =>
    (
      [...host.querySelectorAll("button")].find((item) =>
        item.textContent?.includes("Thêm cuộc chơi mới"),
      ) as HTMLButtonElement
    ).click(),
  );
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
  state.hideSettled = false;
  window.localStorage.clear();
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
    expect(host.querySelector("#game-name")).toBeNull();
    openCreateForm();
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
      playedFrom: "",
      playedTo: "",
    });
    expect(navigate).toHaveBeenCalledWith({
      to: "/games/$gameId",
      params: { gameId: "new-game" },
    });
    expect(onNavigate).toHaveBeenCalledOnce();
    expect(host.querySelector("#game-name")).toBeNull();
    openCreateForm();
    expect((host.querySelector("#game-name") as HTMLInputElement).value).toBe(
      "",
    );
  });

  it("creates a game with the picked played dates and shows them on the card", async () => {
    render();
    openCreateForm();
    typeName("Cầu lông 16.11");
    act(() => button("Chọn ngày chơi").click());
    await submit();
    expect(createGame).toHaveBeenCalledWith({
      name: "Cầu lông 16.11",
      participantCount: 0,
      playedFrom: "2026-11-16",
      playedTo: "2026-11-18",
    });
    state.games = [
      { ...game(), playedFrom: "2026-11-16", playedTo: "2026-11-18" },
    ];
    render();
    expect(host.textContent).toContain("16/11 - 18/11/2026");
  });

  it("shows a paid progress bar only for games that have debtors", () => {
    state.games = [
      { ...game(), paidProgress: { paid: 2, total: 4 } },
      { ...game(), id: "game-2", name: "Không nợ" },
    ];
    render();
    const bars = host.querySelectorAll("[role='progressbar']");
    expect(bars).toHaveLength(1);
    expect(bars[0].getAttribute("aria-valuenow")).toBe("2");
    expect(bars[0].getAttribute("aria-valuemax")).toBe("4");
    expect((bars[0].firstElementChild as HTMLElement).style.width).toBe("50%");
    expect(host.textContent).toContain("2/4");
  });

  it("hides games whose collection is done when the preference is on", () => {
    state.games = [
      { ...game(), paidProgress: { paid: 4, total: 4 } },
      {
        ...game(),
        id: "game-2",
        name: "Còn nợ",
        paidProgress: { paid: 1, total: 3 },
      },
      { ...game(), id: "game-3", name: "Không nợ" },
    ];
    render();
    expect(host.textContent).toContain("Cầu tối");
    expect(host.textContent).not.toContain("Đang ẩn");
    state.hideSettled = true;
    render();
    expect(host.querySelectorAll("a[href='#game']")).toHaveLength(2);
    expect(host.textContent).toContain("Đang ẩn 1 cuộc đã thu tiền xong");
    state.games = [{ ...game(), paidProgress: { paid: 2, total: 2 } }];
    render();
    expect(host.textContent).toContain("Mọi cuộc chơi đã thu tiền xong.");
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
    openCreateForm();
    expect(button("Nhân bản cuộc chơi").disabled).toBe(true);
    expect(button("Tạo cuộc chơi").disabled).toBe(true);
  });
});
