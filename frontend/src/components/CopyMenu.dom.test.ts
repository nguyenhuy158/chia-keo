import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SummaryTextInput } from "../../../shared/summary-text";

const {
  copyImage,
  copyText,
  downloadBlob,
  renderSummaryImage,
  renderExpenseXlsx,
  chooseBackground,
  success,
  error,
  message,
  preferences,
  updatePreferences,
  rowsTsv,
} = vi.hoisted(() => ({
  copyImage: vi.fn(),
  copyText: vi.fn(),
  downloadBlob: vi.fn(),
  renderSummaryImage: vi.fn(),
  renderExpenseXlsx: vi.fn(),
  chooseBackground: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  message: vi.fn(),
  preferences: {
    roundDownRefunds: false,
    summaryShowQr: true,
    summaryShowAvatar: true,
  },
  updatePreferences: vi.fn(),
  rowsTsv: { value: "rows tsv" },
}));

vi.mock("../../../shared/summary-text", () => ({
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
vi.mock("../adapters/browser/expense-xlsx", () => ({ renderExpenseXlsx }));
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
vi.mock("../../../shared/expense-sheet", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../shared/expense-sheet")>()),
  buildExpenseSheetTsv: () => "sheet tsv",
  buildTransactionRowsTsv: () => rowsTsv.value,
}));
vi.mock("../adapters/react-query/queries", () => ({
  usePreferences: () => preferences,
  useUpdatePreferences: () => ({ mutate: updatePreferences }),
}));
vi.mock("../../../shared/settlement-table", () => ({
  buildSettlementTableTsv: () => "table tsv",
}));
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
  renderExpenseXlsx.mockReset().mockResolvedValue(new Blob(["xlsx"]));
  preferences.summaryShowQr = true;
  preferences.summaryShowAvatar = true;
  updatePreferences.mockReset();
  rowsTsv.value = "rows tsv";
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
    expect(menu().style.maxHeight).toBe("586px");
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

  it("centers the menu with a backdrop on narrow screens and keeps scrolling inside open", () => {
    const originalWidth = window.innerWidth;
    window.innerWidth = 400;
    try {
      render();
      open();
      expect(menu().style.left).toBe("50%");
      expect(menu().style.top).toBe("50%");
      expect(menu().style.transform).toBe("translate(-50%, -50%)");
      const backdrop = document.body.querySelector(
        "[data-testid='copy-menu-backdrop']",
      ) as HTMLDivElement;
      expect(backdrop).not.toBeNull();
      act(() => {
        menu().dispatchEvent(new Event("scroll"));
      });
      expect(menu()).not.toBeNull();
      act(() =>
        backdrop.dispatchEvent(new Event("pointerdown", { bubbles: true })),
      );
      expect(menu()).toBeNull();
    } finally {
      window.innerWidth = originalWidth;
    }
  });

  it("caps the menu height to the space left so it scrolls on short screens", () => {
    const originalHeight = window.innerHeight;
    window.innerHeight = 500;
    try {
      render();
      trigger().getBoundingClientRect = () =>
        ({ left: 100, right: 300, top: 100, bottom: 140 }) as DOMRect;
      open();
      expect(menu().style.top).toBe("146px");
      expect(menu().style.maxHeight).toBe("346px");
    } finally {
      window.innerHeight = originalHeight;
    }
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
      true,
      true,
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

  it("toggles the QR on copied images and passes the preference to the renderer", async () => {
    render();
    open();
    await act(async () => item("Ẩn QR trên ảnh").click());
    expect(updatePreferences).toHaveBeenCalledWith({ summaryShowQr: false });

    preferences.summaryShowQr = false;
    preferences.summaryShowAvatar = false;
    open();
    expect(item("Hiện QR trên ảnh")).toBeDefined();
    await act(async () => item("Copy ảnh").click());
    expect(renderSummaryImage).toHaveBeenLastCalledWith(
      expect.anything(),
      "compact",
      "plain",
      false,
      false,
    );
    open();
    await act(async () => item("Lưu ảnh về máy").click());
    expect(renderSummaryImage).toHaveBeenLastCalledWith(
      expect.anything(),
      "compact",
      "plain",
      false,
      false,
    );
    open();
    await act(async () => item("Hiện QR trên ảnh").click());
    expect(updatePreferences).toHaveBeenLastCalledWith({ summaryShowQr: true });
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

  it("copies the spreadsheet and reports clipboard refusal", async () => {
    render();
    open();
    await act(async () => item("Copy bảng tính").click());
    expect(copyText).toHaveBeenCalledWith("sheet tsv");
    expect(success).toHaveBeenCalledWith(
      "Đã sao chép bảng tính, dán vào Google Sheets",
    );
    copyText.mockResolvedValue(false);
    open();
    await act(async () => item("Copy bảng tính").click());
    expect(error).toHaveBeenCalledWith("Không sao chép được bảng tính");
  });

  it("copies the settlement table and reports clipboard refusal", async () => {
    render();
    open();
    await act(async () => item("Copy bảng tổng hợp").click());
    expect(copyText).toHaveBeenCalledWith("table tsv");
    expect(success).toHaveBeenCalledWith(
      "Đã sao chép bảng tổng hợp, dán vào Google Sheets",
    );
    copyText.mockResolvedValue(false);
    open();
    await act(async () => item("Copy bảng tổng hợp").click());
    expect(error).toHaveBeenCalledWith("Không sao chép được bảng tổng hợp");
  });

  it("copies only the transaction rows and handles empty or refused copies", async () => {
    render();
    open();
    await act(async () => item("Copy dòng chi thu").click());
    expect(copyText).toHaveBeenCalledWith("rows tsv");
    expect(success).toHaveBeenCalledWith(
      "Đã sao chép các dòng chi thu, dán vào Google Sheets",
    );
    copyText.mockResolvedValue(false);
    open();
    await act(async () => item("Copy dòng chi thu").click());
    expect(error).toHaveBeenCalledWith("Không sao chép được các dòng chi thu");
    rowsTsv.value = "";
    copyText.mockClear();
    open();
    await act(async () => item("Copy dòng chi thu").click());
    expect(copyText).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith("Chưa có dòng chi thu nào để sao chép");
  });

  it("downloads the Excel file and reports a failure", async () => {
    render();
    open();
    await act(async () => item("Tải Excel").click());
    expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), "cau.xlsx");
    expect(success).toHaveBeenCalledWith("Đã tải file Excel");
    renderExpenseXlsx.mockRejectedValue(new Error("xlsx failed"));
    open();
    await act(async () => item("Tải Excel").click());
    expect(error).toHaveBeenCalledWith("Không tạo được file Excel");
  });
});
