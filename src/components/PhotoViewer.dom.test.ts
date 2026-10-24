import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiPhoto } from "../../shared/api-types";
import { PhotoViewer } from "./PhotoViewer";

const photo: ApiPhoto = {
  id: "photo-1",
  expenseId: null,
  caption: "Bữa trưa",
  mimeType: "image/jpeg",
  width: 100,
  height: 80,
  thumbData: "dGh1bWI=",
  createdAt: "2026-01-01T00:00:00Z",
};

let host: HTMLDivElement;
let root: Root;
let onPrev: () => void;
let onNext: () => void;
let onClose: () => void;

function render(overrides: Partial<Parameters<typeof PhotoViewer>[0]> = {}) {
  act(() =>
    root.render(
      createElement(PhotoViewer, {
        photo,
        detail: undefined,
        index: 0,
        total: 1,
        onPrev,
        onNext,
        onClose,
        ...overrides,
      }),
    ),
  );
}

function button(label: string) {
  return document.querySelector(
    `button[aria-label='${label}']`,
  ) as HTMLButtonElement | null;
}

function touch(type: string, startX?: number) {
  const event = new Event(type, { bubbles: true });
  const points = startX === undefined ? [] : [{ clientX: startX }];
  Object.defineProperty(
    event,
    type === "touchstart" ? "touches" : "changedTouches",
    {
      value: points,
    },
  );
  act(() =>
    (
      document.querySelector("img") as HTMLImageElement
    ).parentElement?.dispatchEvent(event),
  );
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  onPrev = vi.fn();
  onNext = vi.fn();
  onClose = vi.fn();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.style.overflow = "";
});

describe("PhotoViewer", () => {
  it("hiển thị thumbnail, tải ảnh và đóng bằng nút hoặc Escape", () => {
    render();
    const image = document.querySelector("img") as HTMLImageElement;
    expect(image.src).toContain("data:image/jpeg;base64,dGh1bWI=");
    expect(image.alt).toBe("Bữa trưa");
    expect(image.className).toContain("blur-sm");
    expect(
      document.querySelector("a[download]")?.getAttribute("download"),
    ).toBe("Bữa-trưa.jpg");
    expect(document.body.style.overflow).toBe("hidden");
    expect(button("Xóa ảnh")).toBeNull();
    expect(button("Ảnh trước")).toBeNull();
    act(() => button("Đóng ảnh")?.click());
    act(() =>
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
    );
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("dùng ảnh gốc, chuyển ảnh bằng nút, phím và vuốt", () => {
    render({ detail: { ...photo, data: "Z3JvdW5k" }, index: 1, total: 3 });
    const image = document.querySelector("img") as HTMLImageElement;
    expect(image.src).toContain("data:image/jpeg;base64,Z3JvdW5k");
    expect(image.className).not.toContain("blur-sm");
    expect(document.body.textContent).toContain("2/3");
    act(() => button("Ảnh trước")?.click());
    act(() => button("Ảnh sau")?.click());
    act(() =>
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" })),
    );
    act(() =>
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" })),
    );
    touch("touchstart", 100);
    touch("touchend", 40);
    touch("touchstart", 40);
    touch("touchend", 100);
    expect(onPrev).toHaveBeenCalledTimes(3);
    expect(onNext).toHaveBeenCalledTimes(3);
  });

  it("chỉ chuyển ảnh khi vuốt đủ xa và có nhiều ảnh", () => {
    render({ total: 2 });
    touch("touchend", 0);
    touch("touchstart");
    touch("touchend", 0);
    touch("touchstart", 100);
    touch("touchend", 70);
    expect(onNext).not.toHaveBeenCalled();
    touch("touchstart", 100);
    touch("touchend");
    expect(onNext).toHaveBeenCalledOnce();
    render({ total: 1 });
    touch("touchstart", 100);
    touch("touchend", 0);
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("xóa bị khóa khi đang lưu và có thể sửa chú thích", async () => {
    const onDelete = vi.fn();
    const onSaveCaption = vi.fn(async () => undefined);
    render({
      onDelete,
      onSaveCaption,
      pending: true,
      expenseTitle: "Tiền sân",
    });
    expect(button("Xóa ảnh")?.disabled).toBe(true);
    expect(document.body.textContent).toContain("Hóa đơn: Tiền sân");
    act(() => button("Sửa chú thích")?.click());
    expect(button("Lưu chú thích")?.disabled).toBe(true);
    render({
      onDelete,
      onSaveCaption,
      pending: false,
      expenseTitle: "Tiền sân",
    });
    const input = document.querySelector(
      "input[placeholder='Chú thích ảnh']",
    ) as HTMLInputElement;
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    act(() => {
      setValue?.call(input, "  Cơm trưa  ");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      button("Lưu chú thích")?.click();
    });
    expect(onSaveCaption).toHaveBeenCalledWith("Cơm trưa");
    expect(button("Sửa chú thích")).not.toBeNull();
    act(() => button("Xóa ảnh")?.click());
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("dùng tên khoản chi và tên mặc định khi ảnh chưa có chú thích", () => {
    const blank = { ...photo, caption: "" };
    render({
      photo: blank,
      expenseTitle: "Tiền sân",
      onSaveCaption: vi.fn(async () => undefined),
    });
    expect(document.querySelector("img")?.getAttribute("alt")).toBe("Tiền sân");
    expect(
      document.querySelector("a[download]")?.getAttribute("download"),
    ).toBe("Tiền-sân.jpg");
    expect(document.body.textContent).toContain("Chưa có chú thích");
    render({ photo: blank });
    expect(document.querySelector("img")?.getAttribute("alt")).toBe(
      "Ảnh cuộc chia",
    );
    expect(
      document.querySelector("a[download]")?.getAttribute("download"),
    ).toBe("anh.jpg");
  });

  it("lưu chú thích bằng Enter, hủy bằng Escape hoặc nút hủy", async () => {
    const onSaveCaption = vi.fn(async () => undefined);
    render({ onSaveCaption });
    act(() => button("Sửa chú thích")?.click());
    const input = document.querySelector(
      "input[placeholder='Chú thích ảnh']",
    ) as HTMLInputElement;
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });
    expect(onSaveCaption).toHaveBeenCalledWith("Bữa trưa");
    act(() => button("Sửa chú thích")?.click());
    act(() =>
      (
        document.querySelector(
          "input[placeholder='Chú thích ảnh']",
        ) as HTMLInputElement
      ).dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    expect(button("Sửa chú thích")).not.toBeNull();
    act(() => button("Sửa chú thích")?.click());
    act(() => button("Hủy sửa chú thích")?.click());
    expect(button("Sửa chú thích")).not.toBeNull();
  });

  it("bỏ qua lưu khi callback không còn trong lúc đang sửa", async () => {
    render({ onSaveCaption: vi.fn(async () => undefined) });
    act(() => button("Sửa chú thích")?.click());
    render();
    await act(async () => {
      button("Lưu chú thích")?.click();
    });
    expect(
      document.querySelector("input[placeholder='Chú thích ảnh']"),
    ).not.toBeNull();
    render({ photo: { ...photo, id: "photo-2" } });
    expect(
      document.querySelector("input[placeholder='Chú thích ảnh']"),
    ).toBeNull();
  });
});
