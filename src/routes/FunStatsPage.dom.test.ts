import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { state } = vi.hoisted(() => ({
  state: {
    loading: false,
    error: false,
    data: undefined as Record<string, unknown> | undefined,
  },
}));

vi.mock("../adapters/react-query/fun-stats-query", () => ({
  useFunStats: () => ({
    isPending: state.loading,
    isError: state.error,
    data: state.data,
  }),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}));

import { FunStatsPage } from "./FunStatsPage";

let host: HTMLDivElement;
let root: Root;

function render() {
  act(() => root.render(createElement(FunStatsPage)));
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.loading = false;
  state.error = false;
  state.data = undefined;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("FunStatsPage", () => {
  it("shows loading, error, and empty states", () => {
    state.loading = true;
    render();
    expect(host.textContent).toContain("Đang tải");
    state.loading = false;
    state.error = true;
    render();
    expect(host.textContent).toContain("Không tải được thống kê");
    state.error = false;
    render();
    expect(host.textContent).toContain("Không tải được thống kê");
    state.data = { gameCount: 0 };
    render();
    expect(host.textContent).toContain("Chưa có gì để thống kê");
  });

  it("renders all ranked stats and the omitted game count", () => {
    state.data = {
      gameCount: 3,
      totalExpense: 450000,
      topPayer: { name: "An", totalPaid: 300000 },
      mostActive: { name: "Bình", gameCount: 3 },
      biggestGame: { name: "Cầu tối", participantCount: 8 },
      biggestExpense: {
        title: "Tiền sân",
        gameName: "Cầu tối",
        amount: 250000,
      },
      favoriteWeekday: 6,
      omittedGameCount: 2,
    };
    render();
    expect(host.textContent).toContain("450.000 ₫");
    expect(host.textContent).toContain("Đại gia của hội");
    expect(host.textContent).toContain("ứng 300.000 ₫");
    expect(host.textContent).not.toContain("₫đ");
    expect(host.textContent).toContain("Cắm chốt nhiều nhất");
    expect(host.textContent).toContain("Đông người nhất");
    expect(host.textContent).toContain("Khoản chi khủng nhất");
    expect(host.textContent).toContain("Tiền sân · Cầu tối");
    expect(host.textContent).toContain("Thứ Bảy");
    expect(host.textContent).toContain("Đã bỏ bớt 2 cuộc chơi");
  });

  it("omits rankings that have no data", () => {
    state.data = {
      gameCount: 1,
      totalExpense: 0,
      topPayer: null,
      mostActive: null,
      biggestGame: null,
      biggestExpense: null,
      favoriteWeekday: null,
      omittedGameCount: 0,
    };
    render();
    expect(host.textContent).toContain("Tổng đã chi");
    expect(host.textContent).not.toContain("Đại gia của hội");
    expect(host.textContent).not.toContain("Hay chơi nhất vào");
    expect(host.textContent).not.toContain("Đã bỏ bớt");
  });
});
