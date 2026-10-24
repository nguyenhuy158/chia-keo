import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SummaryTextInput } from "../../shared/summary-text";

const {
  state,
  renderSummaryImage,
  copyImage,
  copyText,
  downloadBlob,
  mutate,
  chooseBackground,
  success,
  error,
  toastMessage,
  createObjectURL,
  revokeObjectURL,
} = vi.hoisted(() => ({
  state: { showQr: true, showAvatar: true, backgroundId: "plain" },
  renderSummaryImage: vi.fn(),
  copyImage: vi.fn(),
  copyText: vi.fn(),
  downloadBlob: vi.fn(),
  mutate: vi.fn(),
  chooseBackground: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  toastMessage: vi.fn(),
  createObjectURL: vi.fn(() => "blob:preview"),
  revokeObjectURL: vi.fn(),
}));

vi.mock("../../shared/summary-text", () => ({
  buildSummaryText: (_input: unknown, variant: string) => `summary ${variant}`,
}));
vi.mock("../adapters/browser/clipboard", () => ({
  copyImage,
  copyText,
  downloadBlob,
}));
vi.mock("../adapters/browser/summary-image", () => ({
  renderSummaryImage,
  buildSummaryImageFileName: (_input: unknown, variant: string) =>
    `summary-${variant}.png`,
}));
vi.mock("../adapters/react-query/queries", () => ({
  usePreferences: () => ({
    summaryShowQr: state.showQr,
    summaryShowAvatar: state.showAvatar,
  }),
  useUpdatePreferences: () => ({ mutate }),
}));
vi.mock("./use-summary-image-background", () => ({
  useSummaryImageBackground: () => [state.backgroundId, chooseBackground],
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
vi.mock("./ui", async () => {
  const { createElement } = await import("react");
  return {
    Switch: ({
      label,
      onChange,
    }: {
      label: string;
      onChange: (checked: boolean) => void;
    }) =>
      createElement(
        "button",
        { type: "button", onClick: () => onChange(false) },
        label,
      ),
  };
});
vi.mock("./overlays", async () => {
  const { createElement } = await import("react");
  return {
    ImageLightbox: ({
      open,
      onClose,
      onDownload,
    }: {
      open: boolean;
      onClose: () => void;
      onDownload: () => void;
    }) =>
      open
        ? createElement(
            "div",
            null,
            createElement(
              "button",
              { type: "button", onClick: onClose },
              "Close zoom",
            ),
            createElement(
              "button",
              { type: "button", onClick: onDownload },
              "Download zoom",
            ),
          )
        : null,
  };
});
vi.mock("sonner", () => ({
  toast: Object.assign(toastMessage, { success, error }),
}));

import { SummaryImageCard } from "./SummaryImageCard";

let host: HTMLDivElement;
let root: Root;
const input = {
  code: "CK01",
  name: "Cầu",
  participants: [
    { id: "person", name: "An", bankId: "MB", accountNo: "12345678" },
  ],
} as unknown as SummaryTextInput;

function deferred() {
  let resolve!: (blob: Blob) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Blob>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function render() {
  act(() => root.render(createElement(SummaryImageCard, { input })));
}

function button(label: string) {
  return [...host.querySelectorAll("button")].find((item) =>
    item.textContent?.includes(label),
  ) as HTMLButtonElement;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.showQr = true;
  state.showAvatar = true;
  state.backgroundId = "plain";
  renderSummaryImage
    .mockReset()
    .mockResolvedValue(new Blob(["png"], { type: "image/png" }));
  copyImage.mockReset().mockResolvedValue(true);
  copyText.mockReset().mockResolvedValue(true);
  downloadBlob.mockReset();
  mutate.mockReset();
  chooseBackground.mockReset();
  success.mockReset();
  error.mockReset();
  toastMessage.mockReset();
  createObjectURL.mockReset().mockReturnValue("blob:preview");
  revokeObjectURL.mockReset();
  vi.stubGlobal(
    "URL",
    Object.assign(URL, { createObjectURL, revokeObjectURL }),
  );
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("SummaryImageCard", () => {
  it("renders, copies, downloads, and enlarges an image", async () => {
    render();
    expect(host.textContent).toContain("Đang vẽ ảnh");
    expect(button("Copy ảnh").disabled).toBe(true);
    expect(button("Lưu về máy").disabled).toBe(true);
    await vi.waitFor(() => expect(button("Copy ảnh").disabled).toBe(false));
    expect(renderSummaryImage).toHaveBeenCalledWith(
      input,
      "compact",
      "plain",
      true,
      true,
    );
    expect(host.querySelector("img")?.getAttribute("src")).toBe("blob:preview");
    await act(async () => button("Copy ảnh").click());
    expect(copyImage).toHaveBeenCalledOnce();
    expect(success).toHaveBeenCalledWith("Đã sao chép ảnh tổng kết");
    act(() => button("Lưu về máy").click());
    expect(downloadBlob).toHaveBeenCalledWith(
      expect.any(Blob),
      "summary-compact.png",
    );
    expect(success).toHaveBeenCalledWith("Đã tải ảnh tổng kết");
    act(() =>
      (
        host.querySelector(
          "button[aria-label='Xem ảnh to']",
        ) as HTMLButtonElement
      ).click(),
    );
    expect(button("Close zoom")).toBeDefined();
    act(() => button("Close zoom").click());
    expect(button("Close zoom")).toBeUndefined();
  });

  it("falls back to download when image copy is unavailable", async () => {
    copyImage.mockResolvedValue(false);
    render();
    await vi.waitFor(() => expect(button("Copy ảnh").disabled).toBe(false));
    await act(async () => button("Copy ảnh").click());
    expect(downloadBlob).toHaveBeenCalledOnce();
    expect(toastMessage).toHaveBeenCalledWith(
      "Trình duyệt không copy được ảnh, đã tải ảnh về máy",
    );
    downloadBlob.mockImplementation(() => {
      throw new Error("blocked");
    });
    await act(async () => button("Copy ảnh").click());
    expect(error).toHaveBeenCalledWith("Không sao chép được ảnh");
    act(() => button("Lưu về máy").click());
    expect(error).toHaveBeenCalledWith("Không tải được ảnh");
  });

  it("switches to text and reports copy success or failure", async () => {
    render();
    await vi.waitFor(() => expect(button("Copy ảnh").disabled).toBe(false));
    act(() => button("Chữ").click());
    expect(host.textContent).toContain("summary compact");
    await act(async () => button("Copy chữ").click());
    expect(copyText).toHaveBeenCalledWith("summary compact");
    expect(success).toHaveBeenCalledWith("Đã sao chép tổng kết");
    copyText.mockResolvedValue(false);
    await act(async () => button("Copy chữ").click());
    expect(error).toHaveBeenCalledWith("Không sao chép được tổng kết");
    act(() => button("Chi tiết").click());
    expect(host.textContent).toContain("summary detailed");
  });

  it("updates image preferences and shows render failure", async () => {
    renderSummaryImage.mockRejectedValue(new Error("canvas unavailable"));
    render();
    await vi.waitFor(() =>
      expect(host.textContent).toContain("Không vẽ được ảnh"),
    );
    act(() => button("Background").click());
    expect(chooseBackground).toHaveBeenCalledWith("new-bg");
    act(() => button("Hiện QR").click());
    expect(mutate).toHaveBeenCalledWith({ summaryShowQr: false });
    act(() => button("Hiện avatar").click());
    expect(mutate).toHaveBeenCalledWith({ summaryShowAvatar: false });
  });

  it("keeps the previous preview visible while a new variant renders", async () => {
    render();
    await vi.waitFor(() => expect(button("Copy ảnh").disabled).toBe(false));
    const next = deferred();
    renderSummaryImage.mockReturnValueOnce(next.promise);
    act(() => button("Chi tiết").click());
    expect(host.querySelector("img")?.className).toContain("opacity-50");
    await act(async () => next.resolve(new Blob(["updated"])));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview");
    expect(host.querySelector("img")?.className).toContain("opacity-100");
    act(() => root.unmount());
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
    root = createRoot(host);
  });

  it("ignores image render results after switching to text", async () => {
    const pending = deferred();
    renderSummaryImage.mockReturnValueOnce(pending.promise);
    render();
    act(() => button("Chữ").click());
    await act(async () => pending.resolve(new Blob(["stale"])));
    expect(createObjectURL).not.toHaveBeenCalled();
    const rejected = deferred();
    renderSummaryImage.mockReturnValueOnce(rejected.promise);
    act(() => button("Ảnh").click());
    act(() => button("Chữ").click());
    await act(async () => rejected.reject(new Error("stale failure")));
    expect(host.textContent).not.toContain("Không vẽ được ảnh");
  });
});
