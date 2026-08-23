import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeGameApi, createTestQueryClient, GAME_ID } from "../test/fake-game-api";
import { ConfirmProvider } from "./ConfirmDialog";
import { GamesSidebar } from "./GamesSidebar";

const navigate = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  useParams: () => ({}),
  Link: ({ children, to }: { children: ReactNode; to?: string }) => <a href={to}>{children}</a>,
}));

let api: ReturnType<typeof createFakeGameApi>;

function renderSidebar(onNavigate?: () => void) {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ConfirmProvider>
        <GamesSidebar onNavigate={onNavigate} />
      </ConfirmProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  navigate.mockClear();
  api = createFakeGameApi();
  localStorage.clear();
});

describe("GamesSidebar", () => {
  it("liet ke cac cuoc chia", async () => {
    renderSidebar();

    expect(await screen.findByText("Cầu lông")).toBeInTheDocument();
  });

  it("tao cuoc moi roi mo thang vao no", async () => {
    const user = renderSidebar();
    await screen.findByText("Cầu lông");

    await user.type(screen.getByRole("textbox"), "Bóng bàn");
    await user.click(screen.getByRole("button", { name: "Tạo cuộc chơi" }));

    await waitFor(() => expect(api.games.create).toHaveBeenCalled());
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: "/games/$gameId",
        params: { gameId: GAME_ID },
      }),
    );
  });

  it("ten rong thi khong tao", async () => {
    const user = renderSidebar();
    await screen.findByText("Cầu lông");

    await user.click(screen.getByRole("button", { name: "Tạo cuộc chơi" }));

    await waitFor(() => expect(api.games.create).not.toHaveBeenCalled());
  });

  it("chon truoc so nguoi tao san", async () => {
    const user = renderSidebar();
    await screen.findByText("Cầu lông");

    await user.click(screen.getByRole("button", { name: "Tăng số người tạo sẵn" }));
    await user.type(screen.getByRole("textbox"), "Bóng bàn");
    await user.click(screen.getByRole("button", { name: "Tạo cuộc chơi" }));

    await waitFor(() =>
      expect(api.games.create).toHaveBeenCalledWith(
        expect.objectContaining({ participantCount: 1 }),
      ),
    );
  });

  it("so nguoi tao san khong xuong duoi 0", async () => {
    const user = renderSidebar();
    await screen.findByText("Cầu lông");

    await user.click(screen.getByRole("button", { name: "Giảm số người tạo sẵn" }));
    await user.type(screen.getByRole("textbox"), "Bóng bàn");
    await user.click(screen.getByRole("button", { name: "Tạo cuộc chơi" }));

    await waitFor(() =>
      expect(api.games.create).toHaveBeenCalledWith(
        expect.objectContaining({ participantCount: 0 }),
      ),
    );
  });

  it("nhan ban mot cuoc chia roi mo ban sao", async () => {
    const user = renderSidebar();
    await screen.findByText("Cầu lông");

    await user.click(screen.getByRole("button", { name: "Nhân bản cuộc chơi" }));

    await waitFor(() => expect(api.games.duplicate).toHaveBeenCalledWith(GAME_ID));
    await waitFor(() => expect(navigate).toHaveBeenCalled());
  });

  it("bao ra ngoai khi da chon mot cuoc (de dong ngan tren mobile)", async () => {
    const onNavigate = vi.fn();
    const user = renderSidebar(onNavigate);
    await screen.findByText("Cầu lông");

    await user.click(screen.getByRole("button", { name: "Nhân bản cuộc chơi" }));

    await waitFor(() => expect(onNavigate).toHaveBeenCalled());
  });

  it("chua co cuoc nao thi khong hien dong nao", async () => {
    api.games.list.mockResolvedValue([]);
    renderSidebar();

    await waitFor(() => expect(api.games.list).toHaveBeenCalled());
    expect(screen.queryByText("Cầu lông")).toBeNull();
  });
});
