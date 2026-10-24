import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SummaryTextInput } from "../../shared/summary-text";

const {
  copyImage,
  copyText,
  downloadBlob,
  renderSummaryImage,
  chooseBackground,
  success,
  error,
  message,
} = vi.hoisted(() => ({
  copyImage: vi.fn(),
  copyText: vi.fn(),
  downloadBlob: vi.fn(),
  renderSummaryImage: vi.fn(),
  chooseBackground: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  message: vi.fn(),
}));

vi.mock("../../shared/summary-text", () => ({
  buildSummaryText: (_input: unknown, variant = "compact") =>
    `summary ${variant}`,
}));
vi.mock("../adapters/browser/clipboard", () => ({
  copyImage,
  copyText,
  downloadBlob,
}));
vi.mock("../adapters/browser/summary-image", () => ({
  renderSummaryImage,
  buildSummaryImageFileName: (_input: unknown, variant = "compact") =>
    `${variant}.png`,
}));
vi.mock("./use-summary-image-background", () => ({
  useSummaryImageBackground: () => ["plain", chooseBackground],
}));
vi.mock("./SummaryBackgroundPicker", async () => {
  const { createElement } = await import("react");
  return {
    SummaryBackgroundPicker: ({
      onChange,
    }: {
      onChange: (value: string) => void;
    }) =>
      createElement(
        "button",
        { type: "button", onClick: () => onChange("new-bg") },
        "Background",
      ),
  };
});
vi.mock("sonner", () => ({
  toast: Object.assign(message, { success, error }),
}));

import { CopyMenu } from "./CopyMenu";

let host: HTMLDivElement;
let root: Root;

function input(shareUrl?: string) {
  return { code: "CK01", name: "Cầu", shareUrl } as SummaryTextInput;
}

function render(shareUrl?: string, className?: string) {
  act(() =>
    root.render(createElement(CopyMenu, { input: input(shareUrl), className })),
  );
}

function trigger() {
  return host.querySelector(
    "button[aria-haspopup='menu']",
  ) as HTMLButtonElement;
}

function menu() {
  return document.body.querySelector("[role='menu']") as HTMLDivElement;
}

function item(label: string) {
  return [...document.body.querySelectorAll("[role='menuitem']")].find(
    (element) => element.textContent?.includes(label),
  ) as HTMLButtonElement;
}

function open() {
  act(() => trigger().click());
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  copyImage.mockReset().mockResolvedValue(true);
  copyText.mockReset().mockResolvedValue(true);
  downloadBlob.mockReset();
  renderSummaryImage.mockReset().mockResolvedValue(new Blob(["png"]));
  chooseBackground.mockReset();
  success.mockReset();
  error.mockReset();
  message.mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("CopyMenu", () => {
  it("opens in the viewport and closes on trigger, Escape, outside click, resize, and scroll", () => {
    render(undefined, "custom-trigger");
    expect(trigger().className).toBe("custom-trigger");
    trigger().getBoundingClientRect = () =>
      ({
        left: 0,
        right: 200,
        top: 100,
        bottom: 140,
      }) as DOMRect;
    open();
    expect(menu().style.left).toBe("8px");
    expect(menu().style.top).toBe("146px");
    act(() => trigger().click());
    expect(menu()).toBeNull();
    open();
    act(() =>
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
    );
    expect(menu()).toBeNull();
    open();
    act(() =>
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" })),
    );
    expect(menu()).not.toBeNull();
    act(() =>
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true })),
    );
    expect(menu()).toBeNull();
    open();
    act(() => window.dispatchEvent(new Event("resize")));
    expect(menu()).toBeNull();
    open();
    act(() => window.dispatchEvent(new Event("scroll")));
    expect(menu()).toBeNull();
  });

  it("opens above when there is no space and ignores clicks inside", () => {
    render("https://example.test/share/code");
    trigger().getBoundingClientRect = () =>
      ({
        left: 700,
        right: 900,
        top: 600,
        bottom: 640,
      }) as DOMRect;
    open();
    expect(menu().style.bottom).toBe("174px");
    expect(item("Copy link")).toBeDefined();
    act(() =>
      menu().dispatchEvent(new Event("pointerdown", { bubbles: true })),
    );
    expect(menu()).not.toBeNull();
    act(() =>
      trigger().dispatchEvent(new Event("pointerdown", { bubbles: true })),
    );
    expect(menu()).not.toBeNull();
    act(() => (menu().querySelector("button") as HTMLButtonElement).click());
    expect(chooseBackground).toHaveBeenCalledWith("new-bg");
  });

  it("copies compact and detailed text and reports clipboard failure", async () => {
    render();
    open();
    await act(async () => item("Copy tổng kết").click());
    expect(copyText).toHaveBeenCalledWith("summary compact");
    expect(success).toHaveBeenCalledWith("Đã sao chép tổng kết");
    copyText.mockResolvedValue(false);
    open();
    await act(async () => item("Copy tổng kết chi tiết").click());
    expect(copyText).toHaveBeenCalledWith("summary detailed");
    expect(error).toHaveBeenCalledWith("Không sao chép được tổng kết");
    open();
    await act(async () => item("Copy tổng kết").click());
    expect(error).toHaveBeenCalledTimes(2);
    copyText.mockResolvedValue(true);
    open();
    await act(async () => item("Copy tổng kết chi tiết").click());
    expect(success).toHaveBeenCalledWith("Đã sao chép tổng kết chi tiết");
  });

  it("copies share links and handles clipboard refusal", async () => {
    render("https://example.test/share/code");
    open();
    await act(async () => item("Copy link").click());
    expect(copyText).toHaveBeenCalledWith("https://example.test/share/code");
    expect(success).toHaveBeenCalledWith("Đã sao chép link");
    copyText.mockResolvedValue(false);
    open();
    await act(async () => item("Copy link").click());
    expect(error).toHaveBeenCalledWith("Không sao chép được link");
  });

  it("copies or downloads both image variants", async () => {
    render();
    open();
    await act(async () => item("Copy ảnh chi tiết").click());
    expect(renderSummaryImage).toHaveBeenCalledWith(
      expect.anything(),
      "detailed",
      "plain",
    );
    expect(success).toHaveBeenCalledWith("Đã sao chép ảnh tổng kết");
    copyImage.mockResolvedValue(false);
    open();
    await act(async () => item("Copy ảnh").click());
    expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), "compact.png");
    expect(message).toHaveBeenCalledWith(
      "Trình duyệt không copy được ảnh, đã tải ảnh về máy",
    );
    open();
    await act(async () => item("Lưu ảnh về máy").click());
    expect(success).toHaveBeenCalledWith("Đã tải ảnh tổng kết");
  });

  it("reports image rendering and download failures", async () => {
    copyImage.mockResolvedValue(false);
    renderSummaryImage.mockRejectedValue(new Error("canvas failed"));
    render();
    open();
    await act(async () => item("Copy ảnh").click());
    expect(error).toHaveBeenCalledWith("Không tạo được ảnh tổng kết");
    open();
    await act(async () => item("Lưu ảnh về máy").click());
    expect(error).toHaveBeenCalledTimes(2);
  });
});
