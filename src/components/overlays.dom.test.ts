import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BottomSheet, Drawer, ImageLightbox } from "./overlays";

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.style.overflow = "";
});

describe("overlays", () => {
  it("BottomSheet khóa cuộn, đóng bằng Escape, nút và nền rồi trả focus", () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const onClose = vi.fn();
    const props = {
      open: true,
      onClose,
      title: "Chi tiết",
      children: "Nội dung",
    };
    act(() => root.render(createElement(BottomSheet, props)));
    const dialog = document.querySelector("[role='dialog']") as HTMLDivElement;
    expect(dialog.getAttribute("aria-label")).toBe("Chi tiết");
    expect(dialog.textContent).toContain("Nội dung");
    expect(document.body.style.overflow).toBe("hidden");
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "x" })));
    expect(onClose).not.toHaveBeenCalled();
    act(() =>
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    const buttons = document.querySelectorAll("button[aria-label='Đóng']");
    act(() => (buttons[0] as HTMLButtonElement).click());
    act(() => (buttons[1] as HTMLButtonElement).click());
    expect(onClose).toHaveBeenCalledTimes(3);
    act(() =>
      root.render(createElement(BottomSheet, { ...props, open: false })),
    );
    expect(document.querySelector("[role='dialog']")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it("Drawer hiển thị nội dung và gọi đóng từ nút", () => {
    const onClose = vi.fn();
    const props = {
      open: true,
      onClose,
      title: "Điều hướng",
      children: "Mục chính",
    };
    act(() => root.render(createElement(Drawer, props)));
    expect(document.querySelector("[role='dialog']")?.textContent).toContain(
      "Mục chính",
    );
    expect(document.body.style.overflow).toBe("hidden");
    const buttons = document.querySelectorAll("button[aria-label='Đóng']");
    act(() => (buttons[0] as HTMLButtonElement).click());
    act(() => (buttons[1] as HTMLButtonElement).click());
    expect(onClose).toHaveBeenCalledTimes(2);
    act(() => root.render(createElement(Drawer, { ...props, open: false })));
    expect(document.body.style.overflow).toBe("");
  });

  it("ImageLightbox hiển thị ảnh, tải và đóng theo thao tác", () => {
    const onClose = vi.fn();
    const onDownload = vi.fn();
    const props = { open: true, src: "/receipt.png", alt: "Hóa đơn", onClose };
    act(() => root.render(createElement(ImageLightbox, props)));
    expect(document.querySelector("img")?.getAttribute("src")).toBe(
      "/receipt.png",
    );
    expect(document.querySelector("img")?.getAttribute("alt")).toBe("Hóa đơn");
    expect(
      document.querySelector("button[aria-label='Tải ảnh về máy']"),
    ).toBeNull();
    act(() =>
      root.render(createElement(ImageLightbox, { ...props, onDownload })),
    );
    act(() =>
      (
        document.querySelector(
          "button[aria-label='Tải ảnh về máy']",
        ) as HTMLButtonElement
      ).click(),
    );
    expect(onDownload).toHaveBeenCalledOnce();
    const buttons = document.querySelectorAll("button[aria-label='Đóng']");
    act(() => (buttons[0] as HTMLButtonElement).click());
    act(() => (buttons[1] as HTMLButtonElement).click());
    expect(onClose).toHaveBeenCalledTimes(2);
    act(() =>
      root.render(createElement(ImageLightbox, { ...props, open: false })),
    );
    expect(document.querySelector("img")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });
});
