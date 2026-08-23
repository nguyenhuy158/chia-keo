// Test tich hop trang chi tiet cuoc chia: render that ca cac panel con
// (nguoi tham gia, khoan chi, tong ket, anh, lich su) tren du lieu gia.

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmProvider } from "../components/ConfirmDialog";
import {
  AN,
  BINH,
  createFakeGameApi,
  createTestQueryClient,
  GAME_ID,
  makeDetail,
} from "../test/fake-game-api";
import { GamePage } from "./GamePage";

const navigate = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ gameId: GAME_ID }),
  useNavigate: () => navigate,
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}));

let api: ReturnType<typeof createFakeGameApi>;

function renderPage() {
  const queryClient = createTestQueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        <GamePage />
      </ConfirmProvider>
    </QueryClientProvider>,
  );
  return { queryClient };
}

const EXPENSE = {
  id: "expense_1",
  kind: "expense" as const,
  title: "Tiền nước",
  amount: 90_000,
  note: "",
  payerParticipantId: AN,
  splitMode: "equal" as const,
  splitParticipantIds: [AN, BINH],
  splits: [
    { participantId: AN, amount: 45_000, weight: null },
    { participantId: BINH, amount: 45_000, weight: null },
  ],
  createdAt: "2026-08-01T00:00:00.000Z",
};

beforeEach(() => {
  navigate.mockClear();
  api = createFakeGameApi();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })));
});

describe("trang thai tai du lieu", () => {
  it("dang tai thi hien khung xam giu dung bo cuc", () => {
    const { container } = render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ConfirmProvider>
          <GamePage />
        </ConfirmProvider>
      </QueryClientProvider>,
    );

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("cuoc chia khong ton tai thi noi ro thay vi trang trong", async () => {
    api.games.detail.mockRejectedValue(new Error("not_found"));
    renderPage();

    expect(await screen.findByText("Không tìm thấy cuộc chơi")).toBeInTheDocument();
  });
});

describe("noi dung trang", () => {
  it("hien ten, ma cuoc chia va danh sach nguoi", async () => {
    renderPage();

    expect(await screen.findByText("DSKVUF")).toBeInTheDocument();
    expect(screen.getAllByText("An").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bình").length).toBeGreaterThan(0);
  });

  it("hien khoan chi va tong tien", async () => {
    api.games.detail.mockResolvedValue(
      makeDetail({
        expenses: [EXPENSE],
        summary: {
          totalExpense: 90_000,
          balances: [
            { participantId: AN, paid: 90_000, owed: 45_000, balance: 45_000 },
            { participantId: BINH, paid: 0, owed: 45_000, balance: -45_000 },
          ],
          settlements: [
            { fromParticipantId: BINH, toParticipantId: AN, amount: 45_000 },
          ],
        },
      }),
    );
    renderPage();

    expect((await screen.findAllByText("Tiền nước")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/90\.000/).length).toBeGreaterThan(0);
  });

  it("chua co ai thi moi them nguoi", async () => {
    api.games.detail.mockResolvedValue(makeDetail({ participants: [] }));
    renderPage();

    await waitFor(() => expect(screen.getByText("DSKVUF")).toBeInTheDocument());
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });
});

describe("doi ten cuoc chia", () => {
  it("bam nut sua roi luu thi goi API", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("DSKVUF");

    const renameButton = screen.getByRole("button", { name: "Đổi tên cuộc chơi" });
    await user.click(renameButton);

    const input = screen.getByDisplayValue("Cầu lông");
    await user.clear(input);
    await user.type(input, "Bóng bàn");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(api.games.update).toHaveBeenCalledWith(GAME_ID, { name: "Bóng bàn" }));
  });

  it("ten khong doi thi khong goi API", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("DSKVUF");

    await user.click(screen.getByRole("button", { name: "Đổi tên cuộc chơi" }));
    await user.keyboard("{Enter}");

    expect(api.games.update).not.toHaveBeenCalled();
  });
});

describe("xoa cuoc chia", () => {
  it("hoi lai roi moi chuyen vao thung rac", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("DSKVUF");

    await user.click(screen.getByRole("button", { name: "Xóa" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(/thùng rác/i);

    await user.click(within(dialog).getByRole("button", { name: "Chuyển vào thùng rác" }));

    await waitFor(() => expect(api.games.remove).toHaveBeenCalledWith(GAME_ID));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/" }));
  });

  it("bam huy thi khong xoa gi", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("DSKVUF");

    await user.click(screen.getByRole("button", { name: "Xóa" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Hủy" }));

    expect(api.games.remove).not.toHaveBeenCalled();
  });
});

describe("link chia se", () => {
  it("chua co link thi co nut tao", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("DSKVUF");

    const createButton = screen.getByRole("button", { name: /Tạo link/ });
    await user.click(createButton);

    await waitFor(() => expect(api.shareLinks.rotate).toHaveBeenCalledWith(GAME_ID));
  });

  it("da co link thi bat/tat duoc", async () => {
    api.games.detail.mockResolvedValue(
      makeDetail({ shareLink: { token: "abcd", enabled: true } }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("DSKVUF");

    await user.click(screen.getByTitle("Tắt link share"));

    await waitFor(() => expect(api.shareLinks.setEnabled).toHaveBeenCalledWith(GAME_ID, false));
  });
});

describe("gui email tom tat", () => {
  it("goi endpoint email-summary", async () => {
    const fetchMock = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("DSKVUF");

    await user.click(screen.getByRole("button", { name: /Email cho tôi/i }));

    await waitFor(() =>
      expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
        `/api/games/${GAME_ID}/email-summary`,
      ),
    );
  });

  it("gui that bai thi bao loi, khong im lang", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("DSKVUF");

    await user.click(screen.getByRole("button", { name: /Email cho tôi/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Email cho tôi/i })).toBeEnabled(),
    );
  });
});
