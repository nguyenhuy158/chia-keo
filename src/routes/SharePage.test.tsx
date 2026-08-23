import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../components/theme";
import { AN, BINH, createFakeGameApi, createTestQueryClient } from "../test/fake-game-api";
import { SharePage } from "./SharePage";

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ token: "abcd" }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

let api: ReturnType<typeof createFakeGameApi>;

const SHARE_VIEW = {
  code: "DSKVUF",
  name: "Cầu lông",
  settlementMode: "host" as const,
  settlementHostId: AN,
  participants: [
    { id: AN, name: "An", bankId: "970436", accountNo: "0123456789", accountName: "AN" },
    { id: BINH, name: "Bình", bankId: "", accountNo: "", accountName: "" },
  ],
  expenses: [
    {
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
    },
  ],
  summary: {
    totalExpense: 90_000,
    balances: [
      { participantId: AN, paid: 90_000, owed: 45_000, balance: 45_000 },
      { participantId: BINH, paid: 0, owed: 45_000, balance: -45_000 },
    ],
    settlements: [{ fromParticipantId: BINH, toParticipantId: AN, amount: 45_000 }],
  },
};

function renderPage() {
  // SharePage co ThemeToggle nen bat buoc nam trong ThemeProvider.
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ThemeProvider>
        <SharePage />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  api = createFakeGameApi();
  api.share.view.mockResolvedValue(SHARE_VIEW);
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })),
  );
});

describe("SharePage", () => {
  it("dang tai thi hien khung xam", () => {
    const { container } = render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ThemeProvider>
          <SharePage />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("link sai hoac da tat thi noi ro", async () => {
    api.share.view.mockRejectedValue(new Error("not_found"));
    renderPage();

    expect(await screen.findByText("Không tìm thấy link chia sẻ")).toBeInTheDocument();
  });

  it("hien ten, ma va tong ket cua cuoc chia", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Cầu lông" })).toBeInTheDocument();
    expect(screen.getByText("DSKVUF")).toBeInTheDocument();
    expect(screen.getAllByText(/90\.000/).length).toBeGreaterThan(0);
  });

  it("hien ai tra cho ai", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Cầu lông" });
    expect(screen.getAllByText(/45\.000/).length).toBeGreaterThan(0);
  });

  it("doi duoc sang tab bang chia", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Cầu lông" });

    await user.click(screen.getByRole("button", { name: /Bảng chia/ }));

    expect(screen.getAllByText("Tiền nước").length).toBeGreaterThan(0);
  });

  it("doi duoc sang tab anh", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Cầu lông" });

    await user.click(screen.getByRole("button", { name: /Ảnh/ }));

    expect(api.share.photos).toHaveBeenCalledWith("abcd");
  });

  it("nguoi xem qua link khong thay nut sua/xoa nao", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Cầu lông" });

    // Link chia se la ban chi doc.
    expect(screen.queryByRole("button", { name: /Xóa/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Thêm khoản chi/ })).toBeNull();
  });
});
