import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ComponentProps, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ApiExpense,
  ApiGameDetail,
  ApiParticipant,
  ApiPhoto,
} from "../../shared/api-types";
import { provideGameApi } from "../core/container";
import type { GameApiPort } from "../core/ports/game-api";
import { ConfirmProvider } from "./ConfirmDialog";
import { ExpensePanel } from "./ExpensePanel";

const { uploadMock, photoViewerOpen } = vi.hoisted(() => ({
  uploadMock: vi.fn().mockResolvedValue([]),
  photoViewerOpen: vi.fn(),
}));

vi.mock("../adapters/react-query/photo-upload", () => ({
  usePhotoUploader: () => ({
    upload: uploadMock,
    pending: false,
    done: 0,
    total: 0,
    error: "",
  }),
}));

vi.mock("./use-photo-viewer", () => ({
  usePhotoViewer: () => ({ open: photoViewerOpen, viewer: null }),
}));

const participants: ApiParticipant[] = [
  { id: "an", name: "An", bankId: "", accountNo: "", accountName: "" },
  { id: "binh", name: "Bình", bankId: "", accountNo: "", accountName: "" },
];

let host: HTMLDivElement;
let root: Root;
let client: QueryClient;

function expense(overrides: Partial<ApiExpense> = {}): ApiExpense {
  return {
    id: "expense-a",
    kind: "expense",
    category: "",
    title: "Tiền sân",
    amount: 100_000,
    note: "",
    payerParticipantId: "an",
    splitMode: "equal",
    splitParticipantIds: ["an", "binh"],
    splits: [
      { participantId: "an", amount: 50_000, weight: null },
      { participantId: "binh", amount: 50_000, weight: null },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

type PanelHandlers = Pick<
  ComponentProps<typeof ExpensePanel>,
  "onAdd" | "onUpdate" | "onRemove" | "onAddTransfer" | "onReorder"
>;

function panel(
  options: Partial<PanelHandlers> & {
    expenses?: ApiExpense[];
    participants?: ApiParticipant[];
    photos?: ApiPhoto[];
    pending?: boolean;
    onReorder?: PanelHandlers["onReorder"];
  } = {},
) {
  const onAdd =
    options.onAdd ||
    vi
      .fn<PanelHandlers["onAdd"]>()
      .mockResolvedValue({ expenses: [expense()] } as ApiGameDetail);
  const onUpdate =
    options.onUpdate ||
    vi.fn<PanelHandlers["onUpdate"]>().mockResolvedValue({});
  const onRemove = options.onRemove || vi.fn<PanelHandlers["onRemove"]>();
  const onAddTransfer =
    options.onAddTransfer ||
    vi.fn<PanelHandlers["onAddTransfer"]>().mockResolvedValue({});
  act(() =>
    root.render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(
          ConfirmProvider,
          null,
          createElement(ExpensePanel, {
            gameId: "game",
            participants: options.participants ?? participants,
            expenses: options.expenses || [],
            photos: options.photos || [],
            pending: options.pending || false,
            onAdd,
            onUpdate,
            onRemove,
            onAddTransfer,
            onReorder: options.onReorder || vi.fn<PanelHandlers["onReorder"]>(),
          }),
        ),
      ),
    ),
  );
  return { onAdd, onUpdate, onRemove, onAddTransfer };
}

function input(placeholder: string) {
  return host.querySelector(
    `input[placeholder='${placeholder}']`,
  ) as HTMLInputElement;
}

function type(target: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  act(() => {
    setter?.call(target, value);
    target.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function button(label: string) {
  return [...host.querySelectorAll("button")].find(
    (item) => item.textContent?.trim() === label,
  ) as HTMLButtonElement;
}

function chooseFile(target: HTMLInputElement, file: File) {
  Object.defineProperty(target, "files", { configurable: true, value: [file] });
  act(() => target.dispatchEvent(new Event("change", { bubbles: true })));
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  uploadMock.mockClear();
  photoViewerOpen.mockClear();
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:test"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  provideGameApi({
    photos: { detail: vi.fn() },
    ai: { suggestExpense: vi.fn(), scanReceipt: vi.fn() },
  } as unknown as GameApiPort);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  client.clear();
  host.remove();
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
});

describe("ExpensePanel", () => {
  it("thêm khoản chia đều từ form", async () => {
    const { onAdd } = panel();
    expect(host.textContent).toContain("Khoản chi");
    type(input("Ăn tối"), "Tiền sân");
    type(input("500.000"), "100000");
    await act(async () => {
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "expense",
        title: "Tiền sân",
        amount: 100_000,
        payerParticipantId: "an",
        splitMode: "equal",
        splitParticipantIds: ["an", "binh"],
      }),
    );
  });

  it("mở sửa khoản chi và gọi cập nhật", async () => {
    const onUpdate = vi.fn<PanelHandlers["onUpdate"]>().mockResolvedValue({});
    const onRemove = vi.fn<PanelHandlers["onRemove"]>();
    panel({ expenses: [expense()], onUpdate, onRemove });
    expect(host.textContent).toContain("Tiền sân");
    act(() =>
      (
        host.querySelector(
          "button[aria-label='Sửa Tiền sân']",
        ) as HTMLButtonElement
      ).click(),
    );
    expect(button("Lưu khoản chi")).toBeDefined();
    await act(async () => {
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onUpdate).toHaveBeenCalledWith(
      "expense-a",
      expect.objectContaining({ title: "Tiền sân" }),
    );
    act(() =>
      (
        host.querySelector(
          "button[aria-label='Xóa Tiền sân']",
        ) as HTMLButtonElement
      ).click(),
    );
    expect(onRemove).toHaveBeenCalledWith("expense-a");
  });

  it("thêm khoản thu với tên mặc định và không gắn danh mục", async () => {
    const { onAdd } = panel();
    act(() => button("Khoản thu").click());
    type(input("500.000"), "25000");
    await act(async () => {
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "income",
        category: "",
        title: "Khoản thu",
        amount: 25_000,
      }),
    );
  });

  it("bắt buộc chọn người nhận trước khi ghi khoản trả nợ", async () => {
    const { onAddTransfer } = panel();
    act(() => button("Trả nợ").click());
    type(input("500.000"), "50000");
    await act(async () => {
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onAddTransfer).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Chọn người nhận");
    act(() =>
      (
        host.querySelector(
          "button[aria-label='Chọn người nhận']",
        ) as HTMLButtonElement
      ).click(),
    );
    act(() =>
      (host.querySelector("[role='option']") as HTMLButtonElement).click(),
    );
    await act(async () => {
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onAddTransfer).toHaveBeenCalledWith({
      fromParticipantId: "an",
      toParticipantId: "binh",
      amount: 50_000,
      note: "Trả nợ",
    });
  });

  it("chia theo phần bằng stepper và gửi trọng số", async () => {
    const { onAdd } = panel();
    type(input("500.000"), "90000");
    act(() => button("Theo phần").click());
    expect(host.textContent).toContain("≈ 45.000");
    act(() =>
      (
        host.querySelector(
          "button[aria-label='Tăng số phần của An']",
        ) as HTMLButtonElement
      ).click(),
    );
    expect(host.textContent).toContain("≈ 60.000");
    await act(async () => {
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        splitMode: "shares",
        splitParticipantIds: [],
        splits: [
          { participantId: "an", value: 2 },
          { participantId: "binh", value: 1 },
        ],
      }),
    );
  });

  it("chia tiền riêng, chỉ lưu khi tổng các phần bằng tổng tiền", async () => {
    const { onAdd } = panel();
    type(input("500.000"), "100000");
    act(() => button("Số tiền").click());
    expect(host.textContent).toContain("vừa đủ");
    const binhAmount = host.querySelector(
      "input[aria-label='Phần tiền của Bình']",
    ) as HTMLInputElement;
    type(binhAmount, "10000");
    expect(host.textContent).toContain("còn thiếu");
    await act(async () => {
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onAdd).not.toHaveBeenCalled();
    type(binhAmount, "50000");
    await act(async () => {
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        splitMode: "amount",
        splitParticipantIds: [],
        splits: [
          { participantId: "an", value: 50_000 },
          { participantId: "binh", value: 50_000 },
        ],
      }),
    );
  });

  it("điền form từ gợi ý AI rồi xóa câu nhập", async () => {
    const suggestExpense = vi.fn().mockResolvedValue({
      suggestion: {
        title: "Ăn tối",
        amount: 120_000,
        payerParticipantId: "binh",
        splitParticipantIds: ["an"],
      },
    });
    provideGameApi({ ai: { suggestExpense } } as unknown as GameApiPort);
    panel();
    act(() =>
      (
        host.querySelector("button[aria-expanded]") as HTMLButtonElement
      ).click(),
    );
    type(input("Ví dụ: ăn tối 500k Huy trả chia 3"), "Bình trả tiền ăn");
    await act(async () => button("Gợi ý").click());
    expect(suggestExpense).toHaveBeenCalledWith("game", "Bình trả tiền ăn");
    expect(input("Ăn tối").value).toBe("Ăn tối");
    expect(input("500.000").value).toContain("120");
    expect(input("Ví dụ: ăn tối 500k Huy trả chia 3").value).toBe("");
  });

  it("hiển thị lỗi AI dễ hiểu khi provider chưa cấu hình", async () => {
    const suggestExpense = vi
      .fn()
      .mockRejectedValue(new Error("gemini_not_configured"));
    provideGameApi({ ai: { suggestExpense } } as unknown as GameApiPort);
    panel();
    act(() =>
      (
        host.querySelector("button[aria-expanded]") as HTMLButtonElement
      ).click(),
    );
    type(input("Ví dụ: ăn tối 500k Huy trả chia 3"), "Ăn tối");
    await act(async () => button("Gợi ý").click());
    expect(host.textContent).toContain("Server chưa cấu hình GEMINI_API_KEY");
  });

  it("chọn rồi bỏ danh mục, có thể bỏ và chọn lại mọi người", async () => {
    const { onAdd } = panel();
    const categoryToggle = host.querySelectorAll(
      "button[aria-expanded]",
    )[1] as HTMLButtonElement;
    act(() => categoryToggle.click());
    const food = host.querySelector(
      "[role='group'][aria-label='Danh mục chi tiêu'] button",
    ) as HTMLButtonElement;
    act(() => food.click());
    expect(food.getAttribute("aria-pressed")).toBe("true");
    act(() => button("Bỏ chọn").click());
    expect(button("Chọn tất cả")).toBeDefined();
    act(() => button("Chọn tất cả").click());
    type(input("500.000"), "50000");
    await act(async () => {
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ category: "food" }),
    );
    act(() => food.click());
    type(input("500.000"), "10000");
    await act(async () => {
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onAdd).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: "" }),
    );
  });

  it("khóa form khi chưa có người hoặc khi đang lưu", () => {
    panel({ participants: [] });
    expect(button("Thêm khoản chi").disabled).toBe(true);
    expect(button("Gợi ý").disabled).toBe(true);
    panel({ pending: true });
    expect(button("Thêm khoản chi").disabled).toBe(true);
  });

  it("giữ ảnh tạm rồi tải lên đúng khoản vừa thêm", async () => {
    const { onAdd } = panel();
    const toggle = [...host.querySelectorAll("button")].find((item) =>
      item.textContent?.includes("Ảnh hóa đơn"),
    ) as HTMLButtonElement;
    act(() => toggle.click());
    const picker = host.querySelector(
      "label[aria-label='Đính kèm ảnh hóa đơn'] input[type='file']",
    ) as HTMLInputElement;
    const file = new File(["image"], "receipt.png", { type: "image/png" });
    chooseFile(picker, file);
    expect(host.textContent).toContain(
      "Ảnh sẽ được lưu kèm sau khi thêm khoản chi",
    );
    type(input("500.000"), "100000");
    await act(async () => {
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onAdd).toHaveBeenCalled();
    expect(uploadMock).toHaveBeenCalledWith([file], { expenseId: "expense-a" });
  });

  it("tải ảnh ngay khi đang sửa và mở ảnh đính kèm", async () => {
    const photos: ApiPhoto[] = Array.from({ length: 4 }, (_, index) => ({
      id: `photo-${index}`,
      expenseId: "expense-a",
      caption: "",
      mimeType: "image/png",
      width: 2,
      height: 2,
      thumbData: "thumb",
      createdAt: "2026-01-01T00:00:00.000Z",
    }));
    panel({ expenses: [expense()], photos });
    act(() => button("+1").click());
    expect(photoViewerOpen).toHaveBeenCalledWith(3);
    act(() =>
      (
        host.querySelector(
          "button[aria-label='Sửa Tiền sân']",
        ) as HTMLButtonElement
      ).click(),
    );
    const picker = host.querySelector(
      "label[aria-label='Đính kèm ảnh hóa đơn'] input[type='file']",
    ) as HTMLInputElement;
    const file = new File(["image"], "receipt.png", { type: "image/png" });
    chooseFile(picker, file);
    await vi.waitFor(() =>
      expect(uploadMock).toHaveBeenCalledWith([file], {
        expenseId: "expense-a",
      }),
    );
    act(() =>
      (
        host.querySelector(
          "button[aria-label='Xem ảnh 1']",
        ) as HTMLButtonElement
      ).click(),
    );
    expect(photoViewerOpen).toHaveBeenCalledWith(0);
  });

  it("giữ form khi thêm thất bại và cho hủy sửa", async () => {
    const onAdd = vi
      .fn<PanelHandlers["onAdd"]>()
      .mockRejectedValue(new Error("offline"));
    panel({ expenses: [expense()], onAdd });
    type(input("500.000"), "25000");
    await act(async () => {
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onAdd).toHaveBeenCalled();
    expect(input("500.000").value).toContain("25");
    act(() =>
      (
        host.querySelector(
          "button[aria-label='Sửa Tiền sân']",
        ) as HTMLButtonElement
      ).click(),
    );
    expect(button("Hủy sửa")).toBeDefined();
    act(() => button("Hủy sửa").click());
    expect(button("Thêm khoản chi")).toBeDefined();
  });

  it("giữ form trả nợ khi API thất bại", async () => {
    const onAddTransfer = vi
      .fn<PanelHandlers["onAddTransfer"]>()
      .mockRejectedValue(new Error("offline"));
    panel({ onAddTransfer });
    act(() => button("Trả nợ").click());
    type(input("500.000"), "50000");
    act(() =>
      (
        host.querySelector(
          "button[aria-label='Chọn người nhận']",
        ) as HTMLButtonElement
      ).click(),
    );
    act(() =>
      (host.querySelector("[role='option']") as HTMLButtonElement).click(),
    );
    await act(async () => {
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onAddTransfer).toHaveBeenCalled();
    expect(input("500.000").value).toContain("50");
  });

  it("quét hóa đơn, điền form và giữ ảnh để đính kèm", async () => {
    const scanReceipt = vi.fn().mockResolvedValue({
      suggestion: {
        title: "Hóa đơn sân",
        amount: 80_000,
        payerParticipantId: "an",
        splitParticipantIds: ["an", "binh"],
      },
    });
    provideGameApi({ ai: { scanReceipt } } as unknown as GameApiPort);
    panel();
    act(() =>
      (
        host.querySelector("button[aria-expanded]") as HTMLButtonElement
      ).click(),
    );
    const picker = host.querySelector(
      "label[title='Quét ảnh hóa đơn'] input[type='file']",
    ) as HTMLInputElement;
    const file = new File(["receipt"], "receipt.png", { type: "image/png" });
    chooseFile(picker, file);
    await vi.waitFor(() =>
      expect(scanReceipt).toHaveBeenCalledWith("game", {
        mimeType: "image/png",
        data: "cmVjZWlwdA==",
      }),
    );
    await vi.waitFor(() => expect(input("Ăn tối").value).toBe("Hóa đơn sân"));
    expect(host.textContent).toContain(
      "Ảnh sẽ được lưu kèm sau khi thêm khoản chi",
    );
  });

  it("hiển thị lỗi khi AI quét hóa đơn thất bại", async () => {
    const scanReceipt = vi
      .fn()
      .mockRejectedValue(new Error("gemini_invalid_response"));
    provideGameApi({ ai: { scanReceipt } } as unknown as GameApiPort);
    panel();
    act(() =>
      (
        host.querySelector("button[aria-expanded]") as HTMLButtonElement
      ).click(),
    );
    const picker = host.querySelector(
      "label[title='Quét ảnh hóa đơn'] input[type='file']",
    ) as HTMLInputElement;
    chooseFile(picker, new File(["x"], "receipt.png", { type: "image/png" }));
    await vi.waitFor(() =>
      expect(host.textContent).toContain("AI trả dữ liệu không hợp lệ"),
    );
  });

  it("chặn khoản trả nợ khi người trả cũng là người nhận", async () => {
    const { onAddTransfer } = panel();
    act(() => button("Trả nợ").click());
    type(input("500.000"), "50000");
    act(() =>
      (
        host.querySelector(
          "button[aria-label='Chọn người nhận']",
        ) as HTMLButtonElement
      ).click(),
    );
    act(() =>
      (host.querySelector("[role='option']") as HTMLButtonElement).click(),
    );
    act(() =>
      (
        host.querySelector(
          "button[aria-label='Chọn người trả']",
        ) as HTMLButtonElement
      ).click(),
    );
    const binh = [...host.querySelectorAll("[role='option']")].find((item) =>
      item.textContent?.includes("Bình"),
    ) as HTMLButtonElement;
    act(() => binh.click());
    await act(async () => {
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onAddTransfer).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Người nhận phải khác người trả");
  });

  it("chặn số phần quá lớn và phần tiền bằng 0", async () => {
    const { onAdd } = panel();
    type(input("500.000"), "100000");
    act(() => button("Theo phần").click());
    type(
      host.querySelector(
        "input[aria-label='Số phần của An']",
      ) as HTMLInputElement,
      "100000",
    );
    await act(async () => {
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onAdd).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Số phần tối đa");
    act(() => button("Số tiền").click());
    type(
      host.querySelector(
        "input[aria-label='Phần tiền của Bình']",
      ) as HTMLInputElement,
      "0",
    );
    await act(async () => {
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onAdd).not.toHaveBeenCalled();
    expect(host.textContent).toContain("phần lớn hơn 0");
  });

  it("đồng bộ người mới và đổi người trả khi người cũ bị xóa", async () => {
    const onAdd = vi
      .fn<PanelHandlers["onAdd"]>()
      .mockResolvedValue({ expenses: [expense()] } as ApiGameDetail);
    panel({ onAdd });
    const chi: ApiParticipant = {
      id: "chi",
      name: "Chi",
      bankId: "",
      accountNo: "",
      accountName: "",
    };
    panel({ onAdd, participants: [...participants, chi] });
    expect(host.textContent).toContain("Chi");
    type(input("500.000"), "90000");
    await act(async () => {
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onAdd).toHaveBeenLastCalledWith(
      expect.objectContaining({
        splitParticipantIds: ["an", "binh", "chi"],
      }),
    );
    panel({ onAdd, participants: [participants[1], chi] });
    type(input("500.000"), "10000");
    await act(async () => {
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onAdd).toHaveBeenLastCalledWith(
      expect.objectContaining({
        payerParticipantId: "binh",
        splitParticipantIds: ["binh", "chi"],
      }),
    );
  });
});
