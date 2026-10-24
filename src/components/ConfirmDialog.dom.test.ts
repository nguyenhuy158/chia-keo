import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConfirmProvider, useConfirm } from "./ConfirmDialog";

let host: HTMLDivElement;
let root: Root;
let confirm: ReturnType<typeof useConfirm>;

function Caller() {
  confirm = useConfirm();
  return createElement("button", { type: "button" }, "Open");
}

function dialog() {
  return document.querySelector(
    "[role='alertdialog']",
  ) as HTMLDivElement | null;
}

function button(label: string) {
  return [...document.querySelectorAll("button")].find(
    (item) => item.textContent === label,
  ) as HTMLButtonElement;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() =>
    root.render(createElement(ConfirmProvider, null, createElement(Caller))),
  );
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.style.overflow = "";
});

describe("ConfirmProvider", () => {
  it("hiển thị nội dung và trả về true khi xác nhận", async () => {
    const opener = button("Open");
    opener.focus();
    let result: Promise<boolean> | undefined;
    act(() => {
      result = confirm({
        title: "Xóa cuộc chia",
        description: "Không thể hoàn tác",
        confirmLabel: "Xóa",
        cancelLabel: "Giữ lại",
        destructive: true,
      });
    });

    expect(dialog()?.getAttribute("aria-label")).toBe("Xóa cuộc chia");
    expect(dialog()?.getAttribute("aria-describedby")).toBe(
      "confirm-dialog-description",
    );
    expect(dialog()?.textContent).toContain("Không thể hoàn tác");
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.activeElement).toBe(button("Xóa"));
    expect(button("Xóa").className).toContain("bg-rose-600");
    act(() => button("Xóa").click());
    expect(await result).toBe(true);
    expect(dialog()).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(opener);
  });

  it("trả về false khi hủy bằng nút, Escape hoặc nền", async () => {
    for (const close of [
      () => button("Hủy").click(),
      () =>
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
      () =>
        (
          document.querySelector(
            "button[aria-label='Hủy']",
          ) as HTMLButtonElement
        ).click(),
    ]) {
      let result: Promise<boolean> | undefined;
      act(() => {
        result = confirm({ title: "Xác nhận" });
      });
      expect(dialog()?.getAttribute("aria-describedby")).toBeNull();
      expect(button("Đồng ý").className).toContain("bg-primary");
      act(close);
      expect(await result).toBe(false);
      expect(dialog()).toBeNull();
    }
  });

  it("hủy ngầm lời gọi cũ khi có yêu cầu xác nhận mới", async () => {
    let first: Promise<boolean> | undefined;
    let second: Promise<boolean> | undefined;
    act(() => {
      first = confirm({ title: "Cũ" });
    });
    act(() => {
      second = confirm({ title: "Mới" });
    });
    expect(await first).toBe(false);
    expect(dialog()?.getAttribute("aria-label")).toBe("Mới");
    act(() => button("Đồng ý").click());
    expect(await second).toBe(true);
  });

  it("giữ Tab trong hộp thoại", () => {
    act(() => {
      void confirm({ title: "Xác nhận" });
    });
    const cancel = button("Hủy");
    const accept = button("Đồng ý");
    cancel.focus();
    act(() =>
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", shiftKey: true }),
      ),
    );
    expect(document.activeElement).toBe(accept);
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "x" })));
    act(() =>
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" })),
    );
    expect(document.activeElement).toBe(cancel);
    act(() =>
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" })),
    );
    expect(document.activeElement).toBe(cancel);
  });

  it("bỏ qua Tab khi hộp thoại không còn nút focus được", () => {
    act(() => {
      void confirm({ title: "Xác nhận" });
    });
    dialog()
      ?.querySelectorAll("button")
      .forEach((item) => {
        item.remove();
      });
    act(() =>
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" })),
    );
    expect(dialog()).not.toBeNull();
  });

  it("báo lỗi nếu dùng useConfirm ngoài ConfirmProvider", () => {
    const outside = document.createElement("div");
    document.body.append(outside);
    const outsideRoot = createRoot(outside);
    expect(() => act(() => outsideRoot.render(createElement(Caller)))).toThrow(
      "useConfirm phai duoc dung ben trong ConfirmProvider",
    );
    outside.remove();
  });
});
