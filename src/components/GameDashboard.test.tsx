import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiExpense, ApiSummary } from "../../shared/api-types";
import { AN, BINH, createFakeGameApi, makeDetail } from "../test/fake-game-api";
import { GameDashboard } from "./GameDashboard";

const PARTICIPANTS = makeDetail().participants;

const SUMMARY: ApiSummary = {
  totalExpense: 90_000,
  balances: [
    { participantId: AN, paid: 90_000, owed: 45_000, balance: 45_000 },
    { participantId: BINH, paid: 0, owed: 45_000, balance: -45_000 },
  ],
  settlements: [{ fromParticipantId: BINH, toParticipantId: AN, amount: 45_000 }],
};

const TRANSFER: ApiExpense = {
  id: "expense_transfer",
  kind: "transfer",
  title: "Trả nợ",
  amount: 45_000,
  note: "",
  payerParticipantId: BINH,
  splitMode: "amount",
  splitParticipantIds: [AN],
  splits: [{ participantId: AN, amount: 45_000, weight: null }],
  createdAt: "2026-08-01T00:00:00.000Z",
};

function renderDashboard(props: Partial<Parameters<typeof GameDashboard>[0]> = {}) {
  render(
    <GameDashboard
      code="DSKVUF"
      name="Cầu lông"
      participants={PARTICIPANTS}
      expenseCount={1}
      summary={SUMMARY}
      settlementMode="host"
      settlementHostId={AN}
      expenses={[]}
      {...props}
    />,
  );
  return userEvent.setup();
}

beforeEach(() => {
  // Dashboard ve QR nen can QrProviderPort da duoc dang ky.
  createFakeGameApi();
});

describe("GameDashboard", () => {
  it("hien tong chi, so nguoi va so khoan chi", () => {
    renderDashboard();

    expect(screen.getByText("Tổng chi")).toBeInTheDocument();
    expect(screen.getAllByText(/90\.000/).length).toBeGreaterThan(0);
    expect(screen.getByText("Số người")).toBeInTheDocument();
  });

  it("hien ai duoc nhan lai, ai con phai tra", () => {
    renderDashboard();

    expect(screen.getByText(/Nhận/)).toBeInTheDocument();
    expect(screen.getByText(/Trả/)).toBeInTheDocument();
  });

  it("liet ke cac buoc chuyen tien", () => {
    renderDashboard();

    expect(screen.getAllByText(/45\.000/).length).toBeGreaterThan(0);
  });

  it("khong truyen onSettlementModeChange thi khong sua duoc cach chia", () => {
    renderDashboard();

    // Ban chi doc (trang share) khong duoc doi cach chia tien.
    expect(screen.queryByRole("button", { name: /Cách chia|chuyển tiền/i })).toBeNull();
  });

  it("bam ghi nhan da tra thi bao ra ngoai", async () => {
    const onSettle = vi.fn();
    const user = renderDashboard({ onSettle });

    await user.click(screen.getAllByRole("button")[0]);

    expect(onSettle).toHaveBeenCalled();
  });

  it("xoa duoc khoan tra no da ghi", async () => {
    const onRemoveTransfer = vi.fn();
    const user = renderDashboard({ expenses: [TRANSFER], onRemoveTransfer });

    await user.click(screen.getByRole("button", { name: "Xóa khoản trả nợ" }));

    expect(onRemoveTransfer).toHaveBeenCalledWith("expense_transfer");
  });

  it("cuoc chua co gi thi khong co buoc chuyen tien nao", () => {
    renderDashboard({
      summary: { totalExpense: 0, balances: [], settlements: [] },
      expenseCount: 0,
    });

    expect(screen.getAllByText("0 ₫").length).toBeGreaterThan(0);
  });
});
