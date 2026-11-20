import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageLightbox } from "./overlays";

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
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "x" })));
    expect(onClose).toHaveBeenCalledTimes(2);
    act(() =>
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
    );
    expect(onClose).toHaveBeenCalledTimes(3);
    act(() =>
      root.render(createElement(ImageLightbox, { ...props, open: false })),
    );
    expect(document.querySelector("img")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });
});
