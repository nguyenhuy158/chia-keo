import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiExpense } from "../../shared/api-types";
import {
  AN,
  BINH,
  createFakeGameApi,
  createTestQueryClient,
  GAME_ID,
  makeDetail,
  makePhoto,
} from "../test/fake-game-api";
import { ConfirmProvider } from "./ConfirmDialog";
import { ExpensePanel } from "./ExpensePanel";

const PARTICIPANTS = makeDetail().participants;

function expenseRow(overrides: Partial<ApiExpense> = {}): ApiExpense {
  return {
    id: "expense_1",
    kind: "expense",
    title: "Tiền nước",
    amount: 90_000,
    note: "",
    payerParticipantId: AN,
    splitMode: "equal",
    splitParticipantIds: [AN, BINH],
    splits: [
      { participantId: AN, amount: 45_000, weight: null },
      { participantId: BINH, amount: 45_000, weight: null },
    ],
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

type Handlers = {
  onAdd: ReturnType<typeof vi.fn>;
  onUpdate: ReturnType<typeof vi.fn>;
  onRemove: ReturnType<typeof vi.fn>;
  onAddTransfer: ReturnType<typeof vi.fn>;
  onReorder: ReturnType<typeof vi.fn>;
};

function setup(
  props: { expenses?: ApiExpense[]; participants?: typeof PARTICIPANTS; photos?: ReturnType<typeof makePhoto>[] } = {},
) {
  const handlers: Handlers = {
    onAdd: vi.fn(async () => makeDetail()),
    onUpdate: vi.fn(async () => makeDetail()),
    onRemove: vi.fn(),
    onAddTransfer: vi.fn(async () => makeDetail()),
    onReorder: vi.fn(),
  };

  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ConfirmProvider>
        <ExpensePanel
          gameId={GAME_ID}
          participants={props.participants ?? PARTICIPANTS}
          expenses={props.expenses ?? []}
          photos={props.photos ?? []}
          pending={false}
          {...handlers}
        />
      </ConfirmProvider>
    </QueryClientProvider>,
  );

  return { ...handlers, user: userEvent.setup() };
}

beforeEach(() => {
  createFakeGameApi();
});

describe("danh sach khoan chi", () => {
  it("chua co khoan nao thi khong hien dong nao", () => {
    setup();

    expect(screen.queryByText("Tiền nước")).toBeNull();
  });

  it("hien khoan chi kem so tien va nguoi tra", () => {
    setup({ expenses: [expenseRow()] });

    expect(screen.getByText("Tiền nước")).toBeInTheDocument();
    expect(screen.getAllByText(/90\.000/).length).toBeGreaterThan(0);
  });

  it("khoan tra no khong hien trong danh sach khoan chi", () => {
    setup({
      expenses: [expenseRow({ id: "expense_2", kind: "transfer", title: "Bình trả An" })],
    });

    // "Tra no" con la mot tab cua form nen doi chieu bang tieu de rieng.
    expect(screen.queryByText("Bình trả An")).toBeNull();
  });
});

describe("them khoan chi", () => {
  it("nhap noi dung va so tien roi luu", async () => {
    const { onAdd, user } = setup();

    await user.type(screen.getByLabelText("Nội dung"), "Tiền sân");
    await user.type(screen.getByLabelText(/Số tiền/), "120000");
    await user.click(screen.getByRole("button", { name: /Thêm khoản chi/ }));

    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Tiền sân", amount: 120_000, splitMode: "equal" }),
      ),
    );
  });

  it("thieu so tien thi bao loi, khong goi API", async () => {
    const { onAdd, user } = setup();

    await user.type(screen.getByLabelText("Nội dung"), "Tiền sân");
    await user.click(screen.getByRole("button", { name: /Thêm khoản chi/ }));

    await waitFor(() => expect(onAdd).not.toHaveBeenCalled());
  });

  it("doi sang khoan thu thi nut luu doi theo", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Khoản thu" }));

    expect(screen.getByRole("button", { name: /Thêm khoản thu/ })).toBeInTheDocument();
  });

  it("khoan tra no goi dung callback rieng", async () => {
    const { onAddTransfer, user } = setup();

    await user.click(screen.getByRole("button", { name: "Trả nợ" }));
    await user.type(screen.getByLabelText(/Số tiền/), "50000");

    // Tra no bat buoc chon nguoi nhan, khac nguoi tra.
    await user.click(screen.getByRole("button", { name: "Chọn người nhận" }));
    await user.click(screen.getByRole("option", { name: /Bình/ }));

    await user.click(screen.getByRole("button", { name: /Ghi nhận trả nợ/ }));

    await waitFor(() => expect(onAddTransfer).toHaveBeenCalled());
  });
});

describe("sua khoan chi", () => {
  it("bam sua thi form dien san du lieu cu", async () => {
    const { user } = setup({ expenses: [expenseRow()] });

    await user.click(screen.getByRole("button", { name: /Sửa/ }));

    expect(screen.getByLabelText("Nội dung")).toHaveValue("Tiền nước");
    expect(screen.getByRole("button", { name: /Lưu khoản chi/ })).toBeInTheDocument();
  });

  it("luu thi goi onUpdate voi id dung", async () => {
    const { onUpdate, user } = setup({ expenses: [expenseRow()] });

    await user.click(screen.getByRole("button", { name: /Sửa/ }));
    const amount = screen.getByLabelText(/Số tiền/);
    await user.clear(amount);
    await user.type(amount, "60000");
    await user.click(screen.getByRole("button", { name: /Lưu khoản chi/ }));

    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(
        "expense_1",
        expect.objectContaining({ amount: 60_000 }),
      ),
    );
  });
});

describe("xoa khoan chi", () => {
  it("bam xoa goi onRemove", async () => {
    const { onRemove, user } = setup({ expenses: [expenseRow()] });

    await user.click(screen.getAllByRole("button", { name: /Xóa/ })[0]);

    await waitFor(() => expect(onRemove).toHaveBeenCalledWith("expense_1"));
  });
});

describe("chia tuy chinh", () => {
  it("chon chi mot nguoi chia thi gui dung danh sach", async () => {
    const { onAdd, user } = setup();

    await user.type(screen.getByLabelText("Nội dung"), "Cà phê");
    await user.type(screen.getByLabelText(/Số tiền/), "50000");

    // Bo Binh ra khoi danh sach chia.
    // Chip chon nguoi chia la nut mang dung ten nguoi do.
    const chips = screen.getAllByRole("button", { name: "Bình" });
    await user.click(chips[chips.length - 1]);

    await user.click(screen.getByRole("button", { name: /Thêm khoản chi/ }));

    await waitFor(() => {
      const input = onAdd.mock.calls[0]?.[0] as { splitParticipantIds: string[] };
      expect(input.splitParticipantIds).toEqual([AN]);
    });
  });
});

describe("nhap nhanh bang AI", () => {
  it("khu vuc AI gap lai mac dinh, bam thi mo ra", async () => {
    const { user } = setup();
    const toggle = screen.getByRole("button", { name: /Nhập nhanh bằng AI/ });

    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("chua co ai trong cuoc thi khong go duoc", async () => {
    setup({ participants: [] });

    expect(
      screen.getByPlaceholderText("Ví dụ: ăn tối 500k Huy trả chia 3"),
    ).toBeDisabled();
  });
});

describe("anh dinh kem", () => {
  it("hien anh cua khoan chi", () => {
    setup({
      expenses: [expenseRow()],
      photos: [makePhoto({ id: "photo_1", expenseId: "expense_1" })],
    });

    expect(screen.getAllByRole("button", { name: /Ảnh|ảnh/ }).length).toBeGreaterThan(0);
  });
});
