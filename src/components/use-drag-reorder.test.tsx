import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDragReorder } from "./use-drag-reorder";

type Row = { id: string; name: string };

const ITEMS: Row[] = [
  { id: "a", name: "An" },
  { id: "b", name: "Bình" },
  { id: "c", name: "Cường" },
];

/**
 * Moi dong cao 100px, xep lien nhau — du de tinh "dong gan con tro nhat".
 */
function fakeRow(top: number): HTMLElement {
  const node = document.createElement("div");
  node.getBoundingClientRect = () =>
    ({ top, height: 100, bottom: top + 100, left: 0, right: 0, width: 100, x: 0, y: top }) as DOMRect;
  return node;
}

function pointerEvent(clientY: number) {
  return {
    clientY,
    pointerId: 1,
    preventDefault: () => {},
    target: { setPointerCapture: () => {} },
  } as unknown as React.PointerEvent;
}

function setup(onReorder = vi.fn()) {
  const hook = renderHook(() => useDragReorder(ITEMS, (item: Row) => item.id, onReorder));

  act(() => {
    hook.result.current.registerRow("a")(fakeRow(0));
    hook.result.current.registerRow("b")(fakeRow(100));
    hook.result.current.registerRow("c")(fakeRow(200));
  });

  return { hook, onReorder };
}

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
});

describe("useDragReorder", () => {
  it("chua keo thi giu nguyen thu tu goc", () => {
    const { hook } = setup();

    expect(hook.result.current.orderedItems).toEqual(ITEMS);
    expect(hook.result.current.draggingId).toBeNull();
  });

  it("bat dau keo thi danh dau dong dang keo", () => {
    const { hook } = setup();

    act(() => hook.result.current.handleDragPointerDown("a", pointerEvent(10)));

    expect(hook.result.current.draggingId).toBe("a");
  });

  it("keo xuong thi doi cho va bao khoang dich chuyen", () => {
    const { hook } = setup();

    act(() => hook.result.current.handleDragPointerDown("a", pointerEvent(10)));
    act(() => hook.result.current.handleDragPointerMove(pointerEvent(210)));

    expect(hook.result.current.dragTranslateY).toBe(200);
    expect(hook.result.current.orderedItems.map((item) => item.id)).toEqual(["b", "c", "a"]);
  });

  it("tha ra thi luu thu tu moi", () => {
    const { hook, onReorder } = setup();

    act(() => hook.result.current.handleDragPointerDown("a", pointerEvent(10)));
    act(() => hook.result.current.handleDragPointerMove(pointerEvent(210)));
    act(() => hook.result.current.handleDragPointerUp());

    expect(onReorder).toHaveBeenCalledWith(["b", "c", "a"]);
    expect(hook.result.current.draggingId).toBeNull();
  });

  it("keo roi tha ve dung cho cu thi khong luu gi", () => {
    const { hook, onReorder } = setup();

    act(() => hook.result.current.handleDragPointerDown("a", pointerEvent(10)));
    act(() => hook.result.current.handleDragPointerMove(pointerEvent(20)));
    act(() => hook.result.current.handleDragPointerUp());

    // Khong doi thu tu thi khong goi API.
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("di chuyen khi khong keo thi khong lam gi", () => {
    const { hook, onReorder } = setup();

    act(() => hook.result.current.handleDragPointerMove(pointerEvent(200)));

    expect(hook.result.current.orderedItems).toEqual(ITEMS);
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("tha ra khi chua keo thi khong luu gi", () => {
    const { hook, onReorder } = setup();

    act(() => hook.result.current.handleDragPointerUp());

    expect(onReorder).not.toHaveBeenCalled();
  });

  it("go dong khoi DOM thi khong con tinh no la dich den", () => {
    const { hook, onReorder } = setup();

    act(() => hook.result.current.registerRow("c")(null));
    act(() => hook.result.current.handleDragPointerDown("a", pointerEvent(10)));
    act(() => hook.result.current.handleDragPointerMove(pointerEvent(110)));
    act(() => hook.result.current.handleDragPointerUp());

    expect(onReorder).toHaveBeenCalledWith(["b", "a", "c"]);
  });
});
