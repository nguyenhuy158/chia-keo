// Test tich hop cac trang con lai: trang chinh, cai dat, thong ke, dang nhap.

import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmProvider } from "../components/ConfirmDialog";
import { createFakeGameApi, createTestQueryClient } from "../test/fake-game-api";
import { FunStatsPage } from "./FunStatsPage";
import { HomePage } from "./HomePage";
import { SettingsPage } from "./SettingsPage";

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({}),
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: { children: ReactNode; to?: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

let api: ReturnType<typeof createFakeGameApi>;
let fetchMock: ReturnType<typeof vi.fn>;

function renderPage(page: ReactNode) {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ConfirmProvider>{page}</ConfirmProvider>
    </QueryClientProvider>,
  );
}

const CROSS_BALANCES = {
  games: [{ code: "DSKVUF", name: "Cầu lông" }],
  omittedGameCount: 0,
  totalExpense: 90_000,
  people: [
    { name: "An", paid: 90_000, owed: 45_000, net: 45_000, games: [] },
    { name: "Bình", paid: 0, owed: 45_000, net: -45_000, games: [] },
  ],
  settlements: [{ from: "Bình", to: "An", amount: 45_000 }],
  namesInOneGameOnly: [],
};

const FUN_STATS = {
  gameCount: 3,
  totalExpense: 1_200_000,
  topPayer: { name: "An", totalPaid: 800_000, gameCount: 3 },
  mostActive: { name: "Bình", totalPaid: 0, gameCount: 3 },
  biggestExpense: {
    title: "Tiệc tất niên",
    amount: 500_000,
    gameName: "Cầu lông",
    gameCode: "DSKVUF",
  },
  biggestGame: { name: "Cầu lông", code: "DSKVUF", participantCount: 8 },
  favoriteWeekday: 6,
  omittedGameCount: 0,
};

beforeEach(() => {
  api = createFakeGameApi();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} })),
  );
  fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ user: { id: "user_1", name: "Chủ", image: null } })),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HomePage", () => {
  it("chua co cuoc nao thi moi bat dau", async () => {
    api.games.list.mockResolvedValue([]);
    renderPage(<HomePage />);

    expect(await screen.findByText("Bắt đầu một cuộc chơi")).toBeInTheDocument();
  });

  it("hien cac cuoc gan nhat", async () => {
    renderPage(<HomePage />);

    expect(await screen.findByText("Tiếp tục")).toBeInTheDocument();
    expect(screen.getByText("Cầu lông")).toBeInTheDocument();
  });

  it("hien ai con no minh, minh con no ai", async () => {
    api.crossBalances.get.mockResolvedValue(CROSS_BALANCES);
    renderPage(<HomePage />);

    expect(await screen.findByText("Cần tất toán")).toBeInTheDocument();
    expect(screen.getAllByText(/45\.000/).length).toBeGreaterThan(0);
  });

  it("hien thong ke vui khi co du lieu", async () => {
    api.funStats.get.mockResolvedValue(FUN_STATS);
    renderPage(<HomePage />);

    expect(await screen.findByText(/1\.200\.000/)).toBeInTheDocument();
  });
});

describe("SettingsPage", () => {
  it("hien o doi ten va bang token MCP", async () => {
    renderPage(<SettingsPage />);

    expect(screen.getByText("Cài đặt")).toBeInTheDocument();
    await waitFor(() => expect(api.mcpTokens.list).toHaveBeenCalled());
  });

  it("doi ten hien thi thi goi API profile", async () => {
    const user = userEvent.setup();
    renderPage(<SettingsPage />);

    // Cho session tai xong roi input moi co ten.
    const input = await screen.findByDisplayValue("Chủ", {}, { timeout: 3000 });
    await user.clear(input);
    await user.type(input, "Tên mới");
    await user.click(screen.getByRole("button", { name: /Lưu/ }));

    await waitFor(() => {
      const patched = fetchMock.mock.calls.find(
        (call) => (call[1] as RequestInit | undefined)?.method === "PATCH",
      );
      expect(String(patched?.[0])).toContain("/api/profile");
    });
  });
});

describe("FunStatsPage", () => {
  it("hien cac con so vui", async () => {
    api.funStats.get.mockResolvedValue(FUN_STATS);
    renderPage(<FunStatsPage />);

    expect(await screen.findByText(/Tiệc tất niên/)).toBeInTheDocument();
  });

  it("chua co cuoc nao thi noi ro", async () => {
    api.funStats.get.mockResolvedValue({ ...FUN_STATS, gameCount: 0, topPayer: null, biggestExpense: null, biggestGame: null, mostActive: null });
    renderPage(<FunStatsPage />);

    await waitFor(() => expect(api.funStats.get).toHaveBeenCalled());
    expect(screen.queryByText(/Tiệc tất niên/)).toBeNull();
  });
});
