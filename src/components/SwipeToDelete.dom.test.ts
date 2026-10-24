import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SwipeToDelete } from "./SwipeToDelete";

let host: HTMLDivElement;
let root: Root;
let onDelete: () => void;

function surface() {
  return host.querySelector(".bg-surface") as HTMLDivElement;
}

function pointer(type: string, x: number, y: number, pointerType = "touch") {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  act(() => surface().dispatchEvent(event));
  return event;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  onDelete = vi.fn();
  act(() =>
    root.render(
      createElement(
        SwipeToDelete,
        { onDelete, deleteLabel: "Xóa khoản chi" } as Parameters<
          typeof SwipeToDelete
        >[0],
        createElement("span", null, "Bữa trưa"),
      ),
    ),
  );
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("SwipeToDelete", () => {
  it("không phản ứng với chuột hoặc cuộn dọc", () => {
    pointer("pointerdown", 100, 10, "mouse");
    pointer("pointermove", 0, 10, "mouse");
    pointer("pointerup", 0, 10, "mouse");
    expect(host.querySelector("button[aria-label='Xóa khoản chi']")).toBeNull();

    pointer("pointerdown", 100, 10);
    pointer("pointermove", 98, 30);
    pointer("pointerup", 98, 30);
    expect(surface().style.transform).toBe("translateX(0px)");
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("chỉ lộ nút xóa sau khi vuốt đủ xa và bấm nút mới xóa", () => {
    pointer("pointerdown", 100, 10);
    pointer("pointermove", 96, 11);
    expect(surface().style.transform).toBe("translateX(0px)");
    pointer("pointermove", 20, 12);
    expect(surface().style.transform).toBe("translateX(-80px)");
    pointer("pointermove", 0, 12);
    expect(surface().style.transform).toBe("translateX(-88px)");
    pointer("pointerup", 20, 12);
    expect(surface().style.transform).toBe("translateX(-88px)");
    expect(onDelete).not.toHaveBeenCalled();
    act(() =>
      (
        host.querySelector(
          "button[aria-label='Xóa khoản chi']",
        ) as HTMLButtonElement
      ).click(),
    );
    expect(onDelete).toHaveBeenCalledOnce();
    expect(surface().style.transform).toBe("translateX(0px)");
  });

  it("đóng khi vuốt chưa đủ xa hoặc bấm lên nội dung đã mở", () => {
    pointer("pointerdown", 100, 10, "pen");
    pointer("pointermove", 70, 10, "pen");
    pointer("pointercancel", 70, 10, "pen");
    expect(host.querySelector("button[aria-label='Xóa khoản chi']")).toBeNull();

    pointer("pointerdown", 100, 10);
    pointer("pointermove", 0, 10);
    pointer("pointerup", 0, 10);
    act(() =>
      (
        host.querySelector("button[aria-label='Đóng']") as HTMLButtonElement
      ).click(),
    );
    expect(host.querySelector("button[aria-label='Xóa khoản chi']")).toBeNull();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("vuốt phải từ trạng thái mở thì đóng lại", () => {
    pointer("pointerdown", 100, 10);
    pointer("pointermove", 0, 10);
    pointer("pointerup", 0, 10);
    pointer("pointerdown", 0, 10);
    pointer("pointermove", 70, 10);
    pointer("pointerup", 70, 10);
    expect(surface().style.transform).toBe("translateX(0px)");
    expect(host.querySelector("button[aria-label='Đóng']")).toBeNull();
  });
});
