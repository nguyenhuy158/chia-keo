import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiShuttleEntry } from "../../shared/api-types";

const { state, create, remove, confirm, error } = vi.hoisted(() => ({
  state: {
    stock: undefined as number | undefined,
    entries: undefined as ApiShuttleEntry[] | undefined,
    loading: false,
    queryError: false,
    creating: false,
    deleting: false,
  },
  create: vi.fn(),
  remove: vi.fn(),
  confirm: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../adapters/react-query/shuttles-query", () => ({
  useShuttleStock: () => ({
    data:
      state.stock === undefined
        ? undefined
        : { stock: state.stock, entries: state.entries },
    isPending: state.loading,
    isError: state.queryError,
  }),
  useCreateShuttleEntry: () => ({
    mutateAsync: create,
    isPending: state.creating,
  }),
  useDeleteShuttleEntry: () => ({
    mutateAsync: remove,
    isPending: state.deleting,
  }),
}));
vi.mock("../components/ConfirmDialog", () => ({ useConfirm: () => confirm }));
vi.mock("sonner", () => ({ toast: { error } }));
vi.mock("@tanstack/react-router", async () => {
  const { createElement: element } = await import("react");
  return {
    Link: ({ children }: { children: ReactNode }) =>
      element("a", null, children),
  };
});

import { ShuttlesPage } from "./ShuttlesPage";

let host: HTMLDivElement;
let root: Root;

function entry(
  id: string,
  kind: ApiShuttleEntry["kind"],
  delta: number,
): ApiShuttleEntry {
  return {
    id,
    kind,
    delta,
    stockAfter: 8,
    note: id === "add" ? "Mua mới" : "",
    createdAt: "2026-01-01T00:00:00Z",
  };
}

function render() {
  act(() => root.render(createElement(ShuttlesPage)));
}

function button(label: string) {
  return [...host.querySelectorAll("button")].find(
    (item) =>
      item.textContent?.trim() === label ||
      item.getAttribute("aria-label") === label,
  ) as HTMLButtonElement | undefined;
}

function fill(label: string, value: string) {
  act(() => {
    const input = host.querySelector(
      `[aria-label="${label}"]`,
    ) as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function submit() {
  await act(async () =>
    host
      .querySelector("form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.stock = undefined;
  state.entries = undefined;
  state.loading = false;
  state.queryError = false;
  state.creating = false;
  state.deleting = false;
  create.mockReset().mockResolvedValue(undefined);
  remove.mockReset().mockResolvedValue(undefined);
  confirm.mockReset().mockResolvedValue(true);
  error.mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("ShuttlesPage", () => {
  it("shows error, loading, and empty stock states", () => {
    state.queryError = true;
    render();
    expect(host.textContent).toContain("Không tải được kho cầu");
    state.queryError = false;
    state.loading = true;
    render();
    expect(host.textContent).toContain("Đang đếm cầu");
    state.loading = false;
    state.stock = 0;
    state.entries = [];
    render();
    expect(host.textContent).toContain("Chưa ghi gì");
    expect(button("Dùng 1 trái")?.disabled).toBe(true);
    expect(button("Chốt lại")?.disabled).toBe(true);
  });

  it("adds and uses stock with a trimmed note", async () => {
    state.stock = 3;
    state.entries = [];
    render();
    expect(button("Dùng 4 trái")?.disabled).toBe(true);
    fill("Ghi chú", "  Mua mới  ");
    await act(async () => button("Thêm 6 trái")?.click());
    expect(create).toHaveBeenCalledWith({
      kind: "add",
      quantity: 6,
      note: "Mua mới",
    });
    expect(
      (host.querySelector('[aria-label="Ghi chú"]') as HTMLInputElement).value,
    ).toBe("");
    await act(async () => button("Dùng 2 trái")?.click());
    expect(create).toHaveBeenCalledWith({ kind: "use", quantity: 2, note: "" });
    state.creating = true;
    render();
    expect(button("Thêm 1 trái")?.disabled).toBe(true);
    expect(button("Dùng 1 trái")?.disabled).toBe(true);
  });

  it("validates and records an exact count", async () => {
    state.stock = 8;
    state.entries = [];
    render();
    fill("Chốt lại số cầu đang có", "9999999");
    await submit();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("Nhập số cầu từ 0"),
    );
    expect(create).not.toHaveBeenCalled();
    fill("Chốt lại số cầu đang có", "12abc");
    expect(
      (
        host.querySelector(
          '[aria-label="Chốt lại số cầu đang có"]',
        ) as HTMLInputElement
      ).value,
    ).toBe("12");
    await submit();
    expect(create).toHaveBeenCalledWith({
      kind: "set",
      quantity: 12,
      note: "",
    });
    expect(
      (
        host.querySelector(
          '[aria-label="Chốt lại số cầu đang có"]',
        ) as HTMLInputElement
      ).value,
    ).toBe("");
  });

  it("maps known and unknown write failures", async () => {
    state.stock = 2;
    state.entries = [];
    render();
    create.mockRejectedValueOnce(new Error("shuttle_stock_negative"));
    await act(async () => button("Dùng 1 trái")?.click());
    expect(error).toHaveBeenCalledWith(
      "Trong kho không còn đủ cầu cho thao tác này.",
    );
    create.mockRejectedValueOnce(new Error("shuttle_stock_too_large"));
    await act(async () => button("Thêm 1 trái")?.click());
    expect(error).toHaveBeenCalledWith("Số cầu quá lớn.");
    create.mockRejectedValueOnce("offline");
    await act(async () => button("Thêm 1 trái")?.click());
    expect(error).toHaveBeenCalledWith("Không ghi được, thử lại sau.");
  });

  it("shows all entry kinds and confirms deletion", async () => {
    state.stock = 8;
    state.entries = [
      entry("add", "add", 6),
      entry("use", "use", -2),
      entry("set", "set", 0),
    ];
    render();
    expect(host.textContent).toContain("Thêm cầu");
    expect(host.textContent).toContain("Dùng cầu");
    expect(host.textContent).toContain("Chốt lại số cầu");
    expect(host.textContent).toContain("Mua mới");
    const deleteButtons = [
      ...host.querySelectorAll('button[aria-label="Xóa lần ghi này"]'),
    ] as HTMLButtonElement[];
    confirm.mockResolvedValueOnce(false);
    await act(async () => deleteButtons[0].click());
    expect(remove).not.toHaveBeenCalled();
    await act(async () => deleteButtons[0].click());
    expect(remove).toHaveBeenCalledWith("add");
    remove.mockRejectedValueOnce(new Error("shuttle_stock_negative"));
    await act(async () => deleteButtons[1].click());
    expect(error).toHaveBeenCalledWith(
      "Trong kho không còn đủ cầu cho thao tác này.",
    );
    state.deleting = true;
    render();
    expect(button("Xóa lần ghi này")?.disabled).toBe(true);
  });
});
