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
    hideSettled: false,
  },
  openGames: vi.fn(),
  useCrossBalances: vi.fn(),
}));

vi.mock("../adapters/react-query/queries", () => ({
  useGames: () => ({ data: state.games, isPending: state.loading }),
  usePreferences: () => ({ hideSettledGames: state.hideSettled }),
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
  state.hideSettled = false;
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

  it("asks for the balances and shows no debt or stat tabs without data", () => {
    state.games = Array.from({ length: 5 }, (_, index) =>
      game(String(index + 1)),
    );
    render();
    expect(useCrossBalances).toHaveBeenLastCalledWith(true);
    expect(host.textContent).toContain("Chào buổi sáng");
    expect(host.textContent).not.toContain("Cần tất toán");
    expect(host.textContent).not.toContain("Vài con số");
    act(() => openButton().click());
    expect(openGames).toHaveBeenCalledOnce();
  });

  it("hides games whose collection is done when the preference is on", () => {
    state.games = [
      { ...game("1"), paidProgress: { paid: 2, total: 2 } },
      game("2"),
    ];
    state.hideSettled = true;
    render();
    expect(host.textContent).toContain("1 cuộc chơi");
    expect(host.textContent).toContain("Đang ẩn 1 cuộc đã thu xong.");
    expect(host.textContent).not.toContain("Cầu 1");
    expect(host.textContent).toContain("Cầu 2");
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

describe("HomePage compact", () => {
  function pill(label: string) {
    return [...host.querySelectorAll("button")].find(
      (item) => item.textContent === label,
    ) as HTMLButtonElement | undefined;
  }

  it("liệt kê mọi cuộc chơi có phân trang và không có tab khi thiếu dữ liệu", () => {
    state.games = Array.from({ length: 5 }, (_, index) =>
      game(String(index + 1)),
    );
    render();
    const compact = host.querySelector("[data-one-screen]") as HTMLElement;
    expect(compact.querySelectorAll('a[href^="/games/"]')).toHaveLength(5);
    expect(pill("Cần tất toán")).toBeUndefined();
    expect(pill("Vài con số")).toBeUndefined();
  });

  it("chuyển giữa các view và quay về Tiếp tục khi view không còn dữ liệu", () => {
    state.games = [game("1")];
    state.people = [
      { name: "An", net: 5000 },
      { name: "Bình", net: -3000 },
    ];
    state.stats = {
      totalExpense: 250000,
      topPayer: { name: "An" },
      biggestExpense: { amount: 150000 },
    };
    render();
    act(() => pill("Cần tất toán")?.click());
    const compact = host.querySelector("[data-one-screen]") as HTMLElement;
    expect(compact.textContent).toContain("Được nhận lại");
    expect(compact.textContent).toContain("Còn phải trả");
    expect(compact.textContent).toContain("3.000");
    act(() => pill("Vài con số")?.click());
    expect(compact.textContent).toContain("Ứng tiền nhiều nhất");
    expect(compact.textContent).toContain("Khoản khủng nhất");
    expect(compact.querySelector('a[href="/fun"]')).not.toBeNull();
    state.stats = { totalExpense: 0 };
    render();
    expect(compact.textContent).toContain("Cầu 1");
    expect(pill("Vài con số")).toBeUndefined();
  });

  it("bỏ ô người ứng nhiều nhất và khoản khủng nhất khi không có", () => {
    state.games = [game("1")];
    state.stats = {
      totalExpense: 250000,
      topPayer: null,
      biggestExpense: null,
    };
    render();
    act(() => pill("Vài con số")?.click());
    const compact = host.querySelector("[data-one-screen]") as HTMLElement;
    expect(compact.textContent).toContain("Tổng chi");
    expect(compact.textContent).not.toContain("Ứng tiền nhiều nhất");
    expect(compact.textContent).not.toContain("Khoản khủng nhất");
  });
});
