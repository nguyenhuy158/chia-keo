import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDragReorder } from "./use-drag-reorder";

const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
let host: HTMLDivElement;
let root: Root;
let drag: ReturnType<typeof useDragReorder<{ id: string }>>;
let onReorder: (ids: string[]) => void;

function Harness() {
  drag = useDragReorder(items, (item) => item.id, onReorder);
  return createElement(
    "div",
    null,
    drag.orderedItems.map((item) =>
      createElement("div", {
        key: item.id,
        "data-id": item.id,
        ref: drag.registerRow(item.id),
      }),
    ),
  );
}

function rowIds() {
  return [...host.querySelectorAll("[data-id]")].map((row) =>
    row.getAttribute("data-id"),
  );
}

function pointer(y: number) {
  return {
    clientY: y,
    pointerId: 1,
    preventDefault: vi.fn(),
    target: { setPointerCapture: vi.fn() },
  } as unknown as Parameters<typeof drag.handleDragPointerMove>[0];
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  onReorder = vi.fn();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const id = this.getAttribute("data-id");
      const index = [...host.querySelectorAll("[data-id]")].findIndex(
        (row) => row.getAttribute("data-id") === id,
      );
      return { top: index * 50, height: 50 } as DOMRect;
    },
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    callback(0),
  );
  act(() => root.render(createElement(Harness)));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useDragReorder", () => {
  it("không đổi thứ tự khi chưa kéo hoặc khi thả vào đúng vị trí", () => {
    act(() => drag.handleDragPointerMove(pointer(100)));
    act(() => drag.handleDragPointerUp());
    expect(rowIds()).toEqual(["a", "b", "c"]);
    act(() => drag.handleDragPointerDown("a", pointer(25)));
    expect(drag.draggingId).toBe("a");
    act(() => drag.handleDragPointerMove(pointer(25)));
    act(() => drag.handleDragPointerUp());
    expect(onReorder).not.toHaveBeenCalled();
    expect(rowIds()).toEqual(["a", "b", "c"]);
  });

  it("kéo tới hàng khác rồi lưu đúng thứ tự khi thả", () => {
    const event = pointer(25);
    act(() => drag.handleDragPointerDown("a", event));
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(
      (event.target as HTMLElement).setPointerCapture,
    ).toHaveBeenCalledWith(1);
    act(() => drag.handleDragPointerMove(pointer(125)));
    expect(drag.dragTranslateY).toBe(100);
    expect(rowIds()).toEqual(["b", "c", "a"]);
    expect(onReorder).not.toHaveBeenCalled();
    act(() => drag.handleDragPointerMove(pointer(25)));
    act(() => drag.handleDragPointerMove(pointer(75)));
    expect(rowIds()).toEqual(["b", "a", "c"]);
    act(() => drag.handleDragPointerUp());
    expect(onReorder).toHaveBeenCalledWith(["b", "a", "c"]);
    expect(rowIds()).toEqual(["a", "b", "c"]);
    expect(drag.draggingId).toBeNull();
  });

  it("giữ hàng không đổi vị trí đứng yên trong hoạt ảnh", () => {
    act(() => drag.handleDragPointerDown("b", pointer(75)));
    act(() => drag.handleDragPointerMove(pointer(125)));
    expect(rowIds()).toEqual(["a", "c", "b"]);
    act(() => drag.handleDragPointerUp());
    expect(onReorder).toHaveBeenCalledWith(["a", "c", "b"]);
  });

  it("bỏ qua hàng không có vị trí cũ hoặc id không thuộc danh sách", () => {
    act(() => drag.handleDragPointerDown("a", pointer(25)));
    act(() => {
      drag.handleDragPointerMove(pointer(125));
      const extra = document.createElement("div");
      extra.dataset.id = "extra";
      drag.registerRow("extra")(extra);
    });
    expect(rowIds()).toEqual(["b", "c", "a"]);
    act(() => drag.handleDragPointerUp());

    act(() => drag.handleDragPointerDown("missing", pointer(25)));
    act(() => drag.handleDragPointerMove(pointer(75)));
    expect(rowIds()).toEqual(["a", "b", "c"]);
    act(() => drag.handleDragPointerUp());

    act(() => drag.handleDragPointerDown("a", pointer(25)));
    act(() => drag.handleDragPointerMove(pointer(-25)));
    expect(rowIds()).toEqual(["a", "b", "c"]);
    act(() => drag.handleDragPointerUp());
  });

  it("không đổi thứ tự nếu không còn hàng nào được đăng ký", () => {
    act(() => drag.handleDragPointerDown("a", pointer(25)));
    for (const item of items) drag.registerRow(item.id)(null);
    drag.registerRow("extra")(null);
    act(() => drag.handleDragPointerMove(pointer(125)));
    act(() => drag.handleDragPointerUp());
    expect(onReorder).not.toHaveBeenCalled();
  });
});
