import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiExpense } from "../../shared/api-types";
import type { ExpenseInput, TransferInput } from "../../shared/schemas";
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

function setup(
  props: { expenses?: ApiExpense[]; participants?: typeof PARTICIPANTS; photos?: ReturnType<typeof makePhoto>[] } = {},
) {
  const handlers = {
    onAdd: vi.fn(async (_input: ExpenseInput) => makeDetail()),
    onUpdate: vi.fn(async (_expenseId: string, _input: Partial<ExpenseInput>) => makeDetail()),
    onRemove: vi.fn((_expenseId: string) => {}),
    onAddTransfer: vi.fn(async (_input: TransferInput) => makeDetail()),
    onReorder: vi.fn((_expenseIds: string[]) => {}),
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
      expect(onAdd.mock.calls[0]?.[0].splitParticipantIds).toEqual([AN]);
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

describe("chia theo phan va theo so tien", () => {
  it("chia theo phan: tang phan cua mot nguoi", async () => {
    const { onAdd, user } = setup();

    await user.type(screen.getByLabelText("Nội dung"), "Ăn tối");
    await user.type(screen.getByLabelText(/Số tiền/), "300000");
    await user.click(screen.getByRole("button", { name: "Theo phần" }));
    await user.click(screen.getByRole("button", { name: "Tăng số phần của An" }));
    await user.click(screen.getByRole("button", { name: /Thêm khoản chi/ }));

    await waitFor(() => {
      const input = onAdd.mock.calls[0]?.[0];
      expect(input?.splitMode).toBe("shares");
      expect(input?.splits).toEqual([
        { participantId: AN, value: 2 },
        { participantId: BINH, value: 1 },
      ]);
    });
  });

  it("chia theo phan: giam phan khong xuong duoi 1", async () => {
    const { onAdd, user } = setup();

    await user.type(screen.getByLabelText("Nội dung"), "Ăn tối");
    await user.type(screen.getByLabelText(/Số tiền/), "300000");
    await user.click(screen.getByRole("button", { name: "Theo phần" }));
    await user.click(screen.getByRole("button", { name: "Giảm số phần của An" }));
    await user.click(screen.getByRole("button", { name: /Thêm khoản chi/ }));

    await waitFor(() => {
      expect(onAdd.mock.calls[0]?.[0].splits[0]).toEqual({ participantId: AN, value: 1 });
    });
  });

  it("chia theo so tien: nhap tay tung nguoi", async () => {
    const { onAdd, user } = setup();

    await user.type(screen.getByLabelText("Nội dung"), "Ăn tối");
    await user.type(screen.getByLabelText(/Số tiền/), "100000");
    await user.click(screen.getByRole("button", { name: "Số tiền" }));

    // Mode nay tu dien chia deu lam moc, phai xoa truoc khi go so rieng.
    const anField = screen.getByLabelText("Phần tiền của An");
    const binhField = screen.getByLabelText("Phần tiền của Bình");
    await user.clear(anField);
    await user.type(anField, "70000");
    await user.clear(binhField);
    await user.type(binhField, "30000");
    await user.click(screen.getByRole("button", { name: /Thêm khoản chi/ }));

    await waitFor(() => {
      const input = onAdd.mock.calls[0]?.[0];
      expect(input?.splitMode).toBe("amount");
      expect(input?.splits).toEqual([
        { participantId: AN, value: 70_000 },
        { participantId: BINH, value: 30_000 },
      ]);
    });
  });

  it("chon tat ca / bo chon tat ca", async () => {
    const { onAdd, user } = setup();

    await user.type(screen.getByLabelText("Nội dung"), "Cà phê");
    await user.type(screen.getByLabelText(/Số tiền/), "50000");

    await user.click(screen.getByRole("button", { name: "Bỏ chọn" }));
    await user.click(screen.getByRole("button", { name: "Chọn tất cả" }));
    await user.click(screen.getByRole("button", { name: /Thêm khoản chi/ }));

    await waitFor(() =>
      expect(onAdd.mock.calls[0]?.[0].splitParticipantIds).toEqual([AN, BINH]),
    );
  });

  it("khong chon ai chia thi khong luu duoc", async () => {
    const { onAdd, user } = setup();

    await user.type(screen.getByLabelText("Nội dung"), "Cà phê");
    await user.type(screen.getByLabelText(/Số tiền/), "50000");
    await user.click(screen.getByRole("button", { name: "Bỏ chọn" }));
    await user.click(screen.getByRole("button", { name: /Thêm khoản chi/ }));

    await waitFor(() => expect(onAdd).not.toHaveBeenCalled());
  });
});

describe("huy sua", () => {
  it("bam huy thi form ve trang thai them moi", async () => {
    const { user } = setup({ expenses: [expenseRow()] });

    await user.click(screen.getByRole("button", { name: /Sửa/ }));
    expect(screen.getByRole("button", { name: /Lưu khoản chi/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hủy sửa" }));

    expect(screen.getByRole("button", { name: /Thêm khoản chi/ })).toBeInTheDocument();
  });
});

describe("nguoi tra", () => {
  it("doi nguoi tra qua o chon", async () => {
    const { onAdd, user } = setup();

    await user.type(screen.getByLabelText("Nội dung"), "Cà phê");
    await user.type(screen.getByLabelText(/Số tiền/), "50000");
    await user.click(screen.getByRole("button", { name: "Chọn người trả" }));
    await user.click(screen.getByRole("option", { name: /Bình/ }));
    await user.click(screen.getByRole("button", { name: /Thêm khoản chi/ }));

    await waitFor(() =>
      expect(onAdd.mock.calls[0]?.[0].payerParticipantId).toBe(BINH),
    );
  });
});
