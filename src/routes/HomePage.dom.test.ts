import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { state, openGames, useCrossBalances } = vi.hoisted(() => ({
  state: {
    loading: false,
    games: undefined as Array<Record<string, unknown>> | undefined,
    people: undefined as Array<{ name: string; net: number }> | undefined,
    stats: undefined as Record<string, unknown> | undefined,
    shell: true,
  },
  openGames: vi.fn(),
  useCrossBalances: vi.fn(),
}));

vi.mock("../adapters/react-query/queries", () => ({
  useGames: () => ({ data: state.games, isPending: state.loading }),
}));
vi.mock("../adapters/react-query/cross-balances-query", () => ({
  useCrossBalances: (enabled: boolean) => {
    useCrossBalances(enabled);
    return { data: state.people ? { people: state.people } : undefined };
  },
}));
vi.mock("../adapters/react-query/fun-stats-query", () => ({
  useFunStats: () => ({ data: state.stats }),
}));
vi.mock("../components/mobile-shell", () => ({
  useMobileShell: () => (state.shell ? { openGames } : null),
}));
vi.mock("@tanstack/react-router", async () => {
  const { createElement: element } = await import("react");
  return {
    Link: ({
      children,
      to,
      params,
    }: {
      children: ReactNode;
      to: string;
      params?: { gameId: string };
    }) =>
      element("a", { href: params ? `/games/${params.gameId}` : to }, children),
  };
});

import { HomePage } from "./HomePage";

let host: HTMLDivElement;
let root: Root;

function game(id: string) {
  return { id, name: `Cầu ${id}`, participantCount: 4, expenseCount: 2 };
}

function render() {
  act(() => root.render(createElement(HomePage)));
}

function openButton() {
  return [...host.querySelectorAll("button")].find((item) =>
    item.textContent?.includes("Mở danh sách cuộc chơi"),
  ) as HTMLButtonElement;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.loading = false;
  state.games = undefined;
  state.people = undefined;
  state.stats = undefined;
  state.shell = true;
  openGames.mockReset();
  useCrossBalances.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 24, 9));
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe("HomePage", () => {
  it("shows skeletons while loading and an empty state for new users", () => {
    state.loading = true;
    render();
    expect(useCrossBalances).toHaveBeenLastCalledWith(false);
    expect(host.textContent).not.toContain("Bắt đầu một cuộc chơi");
    state.loading = false;
    render();
    expect(host.textContent).toContain("Bắt đầu một cuộc chơi");
    act(() => openButton().click());
    expect(openGames).toHaveBeenCalledOnce();
    state.shell = false;
    render();
    act(() => openButton().click());
    expect(openGames).toHaveBeenCalledOnce();
  });

  it("shows the four most recent games and no debt or stat cards without data", () => {
    state.games = Array.from({ length: 5 }, (_, index) =>
      game(String(index + 1)),
    );
    render();
    expect(useCrossBalances).toHaveBeenLastCalledWith(true);
    expect(host.textContent).toContain("Chào buổi sáng");
    expect(host.querySelectorAll('a[href^="/games/"]')).toHaveLength(4);
    expect(host.textContent).not.toContain("Cầu 5");
    expect(host.textContent).not.toContain("Cần tất toán");
    expect(host.textContent).not.toContain("Vài con số");
    act(() => openButton().click());
    expect(openGames).toHaveBeenCalledOnce();
  });

  it("shows both debt directions and limits each list to five people", () => {
    state.games = [game("1")];
    state.people = [
      ...Array.from({ length: 6 }, (_, index) => ({
        name: `Được ${index}`,
        net: 1000,
      })),
      ...Array.from({ length: 6 }, (_, index) => ({
        name: `Nợ ${index}`,
        net: -1000,
      })),
      { name: "Đã xong", net: 0 },
    ];
    render();
    expect(host.textContent).toContain("Cần tất toán");
    expect(host.textContent).toContain("Được nhận lại");
    expect(host.textContent).toContain("Còn phải trả");
    expect(host.textContent).toContain("Được 4");
    expect(host.textContent).not.toContain("Được 5");
    expect(host.textContent).not.toContain("Nợ 5");
    expect(host.textContent).not.toContain("Đã xong");
  });

  it("shows either debt direction independently", () => {
    state.games = [game("1")];
    state.people = [{ name: "An", net: 1000 }];
    render();
    expect(host.textContent).toContain("Được nhận lại");
    expect(host.textContent).not.toContain("Còn phải trả");
    state.people = [{ name: "Bình", net: -1000 }];
    render();
    expect(host.textContent).not.toContain("Được nhận lại");
    expect(host.textContent).toContain("Còn phải trả");
  });

  it("shows optional spending highlights", () => {
    state.games = [game("1")];
    state.stats = {
      totalExpense: 250000,
      topPayer: { name: "An" },
      biggestExpense: { amount: 150000 },
    };
    render();
    expect(host.textContent).toContain("Vài con số");
    expect(host.textContent).toContain("Ứng tiền nhiều nhất");
    expect(host.textContent).toContain("Khoản khủng nhất");
    expect(host.querySelector('a[href="/fun"]')).not.toBeNull();
    state.stats = {
      totalExpense: 250000,
      topPayer: null,
      biggestExpense: null,
    };
    render();
    expect(host.textContent).not.toContain("Ứng tiền nhiều nhất");
    expect(host.textContent).not.toContain("Khoản khủng nhất");
    state.stats = { totalExpense: 0 };
    render();
    expect(host.textContent).not.toContain("Vài con số");
  });

  it.each([
    [2, "Khuya rồi"],
    [9, "Chào buổi sáng"],
    [12, "Chào buổi trưa"],
    [16, "Chào buổi chiều"],
    [21, "Chào buổi tối"],
  ])("greets at hour %i", (hour, greeting) => {
    state.games = [game("1")];
    vi.setSystemTime(new Date(2026, 9, 24, hour));
    render();
    expect(host.textContent).toContain(greeting);
  });
});
