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

const { uploadMock, photoViewerOpen, uploadState } = vi.hoisted(() => ({
  uploadMock: vi.fn().mockResolvedValue([]),
  photoViewerOpen: vi.fn(),
  uploadState: { pending: false, done: 0, total: 0, error: "" },
}));

vi.mock("../adapters/react-query/photo-upload", () => ({
  usePhotoUploader: () => ({
    upload: uploadMock,
    ...uploadState,
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

function splitButton(name: string) {
  return [...host.querySelectorAll("button")].find(
    (item) =>
      item.textContent?.trim() === name && item.className.includes("min-h-11"),
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
  Object.assign(uploadState, { pending: false, done: 0, total: 0, error: "" });
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
  vi.unstubAllGlobals();
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

  it("hiển thị khoản thu, danh mục, ảnh và cho đính kèm ảnh từ dòng khoản chi", () => {
    const photos: ApiPhoto[] = [
      {
        id: "photo",
        expenseId: "expense-a",
        caption: "",
        mimeType: "image/png",
        width: 2,
        height: 2,
        thumbData: "thumb",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    panel({
      expenses: [
        expense({ category: "food" }),
        expense({
          id: "income",
          title: "Hoàn tiền",
          kind: "income",
          payerParticipantId: "missing",
          splitMode: "shares",
        }),
      ],
      photos,
    });
    expect(host.textContent).toContain("Thu");
    expect(host.textContent).toContain("Không rõ");
    expect(host.textContent).toContain("theo phần");
    act(() =>
      (
        host.querySelector(
          "button[aria-label='Xem ảnh của Tiền sân']",
        ) as HTMLButtonElement
      ).click(),
    );
    expect(photoViewerOpen).toHaveBeenCalledWith(0);
    const picker = host.querySelector(
      "label[aria-label='Thêm ảnh cho Tiền sân'] input[type='file']",
    ) as HTMLInputElement;
    const file = new File(["image"], "new.png", { type: "image/png" });
    chooseFile(picker, file);
    expect(uploadMock).toHaveBeenCalledWith([file], { expenseId: "expense-a" });
    act(() =>
      (
        host.querySelector(
          "button[aria-label='Sửa Hoàn tiền']",
        ) as HTMLButtonElement
      ).click(),
    );
    expect(button("Lưu khoản thu")).toBeDefined();
    expect(button("Khoản chi").disabled).toBe(true);
  });

  it("bỏ ảnh tạm trước khi lưu khoản chi", async () => {
    const { onAdd } = panel();
    const toggle = [...host.querySelectorAll("button")].find((item) =>
      item.textContent?.includes("Ảnh hóa đơn"),
    ) as HTMLButtonElement;
    act(() => toggle.click());
    const picker = host.querySelector(
      "label[aria-label='Đính kèm ảnh hóa đơn'] input[type='file']",
    ) as HTMLInputElement;
    Object.defineProperty(picker, "files", { configurable: true, value: [] });
    act(() => picker.dispatchEvent(new Event("change", { bubbles: true })));
    expect(host.textContent).not.toContain("Ảnh sẽ được lưu kèm");
    chooseFile(
      picker,
      new File(["image"], "receipt.png", { type: "image/png" }),
    );
    expect(host.textContent).toContain("Ảnh sẽ được lưu kèm");
    act(() =>
      (
        host.querySelector(
          "button[aria-label='Bỏ ảnh đính kèm 1']",
        ) as HTMLButtonElement
      ).click(),
    );
    expect(host.textContent).not.toContain("Ảnh sẽ được lưu kèm");
    type(input("500.000"), "10000");
    await act(async () => {
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onAdd).toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("không tải ảnh tạm nếu API không trả khoản chi mới", async () => {
    const existing = expense();
    const onAdd = vi
      .fn<PanelHandlers["onAdd"]>()
      .mockResolvedValue({ expenses: [existing] } as ApiGameDetail);
    panel({ expenses: [existing], onAdd });
    const toggle = [...host.querySelectorAll("button")].find((item) =>
      item.textContent?.includes("Ảnh hóa đơn"),
    ) as HTMLButtonElement;
    act(() => toggle.click());
    const picker = host.querySelector(
      "label[aria-label='Đính kèm ảnh hóa đơn'] input[type='file']",
    ) as HTMLInputElement;
    chooseFile(
      picker,
      new File(["image"], "receipt.png", { type: "image/png" }),
    );
    type(input("500.000"), "10000");
    await act(async () => {
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onAdd).toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("gợi ý AI khi nhấn Enter và bỏ qua câu trống", async () => {
    const suggestExpense = vi.fn().mockResolvedValue({
      suggestion: {
        title: "",
        amount: 0,
        payerParticipantId: "",
        splitParticipantIds: [],
      },
    });
    provideGameApi({ ai: { suggestExpense } } as unknown as GameApiPort);
    panel();
    const aiInput = input("Ví dụ: ăn tối 500k Huy trả chia 3");
    act(() =>
      aiInput.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    expect(suggestExpense).not.toHaveBeenCalled();
    type(aiInput, "Ăn tối");
    await act(async () => {
      aiInput.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(suggestExpense).toHaveBeenCalledWith("game", "Ăn tối");
    expect(input("Ăn tối").value).toBe("");
  });

  it("bỏ rồi chọn lại từng người ở chế độ chia đều và theo phần", async () => {
    const { onAdd } = panel();
    act(() => splitButton("An").click());
    type(input("500.000"), "10000");
    await act(async () => {
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onAdd).toHaveBeenLastCalledWith(
      expect.objectContaining({ splitParticipantIds: ["binh"] }),
    );
    act(() => splitButton("An").click());
    act(() => button("Theo phần").click());
    act(() => splitButton("Bình").click());
    expect(
      host.querySelector("input[aria-label='Số phần của Bình']"),
    ).toBeNull();
    act(() => splitButton("Bình").click());
    const weight = host.querySelector(
      "input[aria-label='Số phần của An']",
    ) as HTMLInputElement;
    act(() =>
      (
        host.querySelector(
          "button[aria-label='Tăng số phần của An']",
        ) as HTMLButtonElement
      ).click(),
    );
    act(() =>
      (
        host.querySelector(
          "button[aria-label='Giảm số phần của An']",
        ) as HTMLButtonElement
      ).click(),
    );
    type(weight, "0");
    act(() => {
      weight.focus();
      weight.blur();
    });
    expect(weight.value).toBe("1");
    type(weight, "");
    act(() => {
      weight.focus();
      weight.blur();
    });
    expect(weight.value).toBe("1");
  });

  it("bắt buộc chọn một người để chia khoản chi", async () => {
    const { onAdd } = panel();
    act(() => button("Bỏ chọn").click());
    type(input("500.000"), "10000");
    await act(async () => {
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onAdd).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Chọn ít nhất một người cùng chia");
  });

  it("bỏ qua file hóa đơn chưa chọn và hiển thị lỗi khi không đọc được file", async () => {
    panel();
    const picker = host.querySelector(
      "label[title='Quét ảnh hóa đơn'] input[type='file']",
    ) as HTMLInputElement;
    Object.defineProperty(picker, "files", { configurable: true, value: [] });
    act(() => picker.dispatchEvent(new Event("change", { bubbles: true })));
    class BrokenReader {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      error = new Error("unreadable");
      readAsDataURL() {
        queueMicrotask(() => this.onerror?.());
      }
    }
    vi.stubGlobal("FileReader", BrokenReader);
    chooseFile(picker, new File(["bad"], "receipt.png", { type: "image/png" }));
    await vi.waitFor(() =>
      expect(host.textContent).toContain("Gọi AI thất bại"),
    );
  });

  it("kéo khoản chi để đổi thứ tự", () => {
    const onReorder = vi.fn<PanelHandlers["onReorder"]>();
    panel({
      expenses: [expense(), expense({ id: "expense-b", title: "Ăn tối" })],
      onReorder,
    });
    const handle = host.querySelector(
      "button[aria-label='Kéo để đổi thứ tự Tiền sân']",
    ) as HTMLButtonElement;
    handle.setPointerCapture = vi.fn();
    const rows = [
      ...host.querySelectorAll("button[aria-label^='Kéo để đổi thứ tự']"),
    ].map(
      (button) =>
        button.parentElement?.parentElement?.parentElement as HTMLElement,
    );
    rows[0].getBoundingClientRect = () => ({ top: 0, height: 50 }) as DOMRect;
    rows[1].getBoundingClientRect = () => ({ top: 100, height: 50 }) as DOMRect;
    const pointer = (kind: string, clientY: number) => {
      const event = new MouseEvent(kind, {
        bubbles: true,
        clientY,
        cancelable: true,
      });
      Object.defineProperty(event, "pointerId", { value: 1 });
      act(() => handle.dispatchEvent(event));
    };
    pointer("pointerdown", 10);
    pointer("pointermove", 120);
    pointer("pointerup", 120);
    expect(onReorder).toHaveBeenCalledWith(["expense-b", "expense-a"]);
  });

  it("hiển thị số tiền còn thiếu hoặc vượt khi chia tiền riêng", () => {
    panel();
    act(() => button("Số tiền").click());
    expect(host.textContent).toContain("nhập số tiền ở trên trước");
    type(input("500.000"), "100000");
    const binhAmount = host.querySelector(
      "input[aria-label='Phần tiền của Bình']",
    ) as HTMLInputElement;
    type(binhAmount, "70000");
    expect(host.textContent).toContain("vượt 20.000");
  });

  it("hiển thị tiến độ và lỗi tải ảnh trong form", () => {
    panel();
    Object.assign(uploadState, {
      pending: true,
      done: 1,
      total: 2,
      error: "Không đọc được ảnh",
    });
    panel();
    const toggle = [...host.querySelectorAll("button")].find((item) =>
      item.textContent?.includes("Ảnh hóa đơn"),
    ) as HTMLButtonElement;
    act(() => toggle.click());
    expect(host.textContent).toContain("Đang tải 2/2");
    expect(host.textContent).toContain("Không đọc được ảnh");
  });

  it("báo lỗi AI không xác định và không gửi khi nhấn phím khác Enter", async () => {
    const suggestExpense = vi.fn().mockRejectedValue("offline");
    provideGameApi({ ai: { suggestExpense } } as unknown as GameApiPort);
    panel();
    const aiInput = input("Ví dụ: ăn tối 500k Huy trả chia 3");
    type(aiInput, "Ăn tối");
    act(() =>
      aiInput.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
      ),
    );
    expect(suggestExpense).not.toHaveBeenCalled();
    await act(async () => button("Gợi ý").click());
    expect(host.textContent).toContain("Gọi AI thất bại");
  });

  it("bấm sửa lần nữa để hủy sửa", () => {
    panel({ expenses: [expense()] });
    const edit = host.querySelector(
      "button[aria-label='Sửa Tiền sân']",
    ) as HTMLButtonElement;
    act(() => edit.click());
    expect(button("Lưu khoản chi")).toBeDefined();
    act(() => edit.click());
    expect(button("Thêm khoản chi")).toBeDefined();
  });

  it("kiểm tra phần tiền của người mới trước khi lưu", async () => {
    const onAdd = vi.fn<PanelHandlers["onAdd"]>();
    panel({ onAdd });
    type(input("500.000"), "100000");
    act(() => button("Số tiền").click());
    const chi: ApiParticipant = {
      id: "chi",
      name: "Chi",
      bankId: "",
      accountNo: "",
      accountName: "",
    };
    panel({ onAdd, participants: [...participants, chi] });
    expect(
      host.querySelector("input[aria-label='Phần tiền của Chi']"),
    ).not.toBeNull();
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

  it("đổi về người trả trống khi hủy sửa sau lúc xóa hết người", () => {
    panel({ expenses: [expense()] });
    act(() =>
      (
        host.querySelector(
          "button[aria-label='Sửa Tiền sân']",
        ) as HTMLButtonElement
      ).click(),
    );
    panel({ expenses: [expense()], participants: [] });
    act(() => button("Hủy sửa").click());
    expect(button("Thêm khoản chi").disabled).toBe(true);
  });

  it("đọc được sự kiện ảnh nhưng nội dung ảnh rỗng", async () => {
    const scanReceipt = vi
      .fn()
      .mockResolvedValue({
        suggestion: {
          title: "",
          amount: 0,
          payerParticipantId: "",
          splitParticipantIds: [],
        },
      });
    provideGameApi({ ai: { scanReceipt } } as unknown as GameApiPort);
    class EmptyReader {
      result = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("FileReader", EmptyReader);
    panel();
    const picker = host.querySelector(
      "label[title='Quét ảnh hóa đơn'] input[type='file']",
    ) as HTMLInputElement;
    chooseFile(
      picker,
      new File(["image"], "receipt.png", { type: "image/png" }),
    );
    await vi.waitFor(() =>
      expect(scanReceipt).toHaveBeenCalledWith("game", {
        mimeType: "image/png",
        data: "",
      }),
    );
  });

  it("không gửi thêm ảnh quét khi lần quét đầu đang chạy", async () => {
    let finish!: (result: unknown) => void;
    const scanReceipt = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    provideGameApi({ ai: { scanReceipt } } as unknown as GameApiPort);
    panel();
    const picker = host.querySelector(
      "label[title='Quét ảnh hóa đơn'] input[type='file']",
    ) as HTMLInputElement;
    chooseFile(picker, new File(["first"], "first.png", { type: "image/png" }));
    await vi.waitFor(() => expect(host.textContent).toContain("Đang quét..."));
    chooseFile(
      picker,
      new File(["second"], "second.png", { type: "image/png" }),
    );
    expect(scanReceipt).toHaveBeenCalledOnce();
    finish({
      suggestion: {
        title: "",
        amount: 0,
        payerParticipantId: "",
        splitParticipantIds: [],
      },
    });
    await vi.waitFor(() =>
      expect(host.textContent).not.toContain("Đang quét..."),
    );
  });
});
