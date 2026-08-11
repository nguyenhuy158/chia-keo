import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/**
 * Keo tha doi thu tu bang con tro (khong dung HTML5 drag — khong hoat dong
 * tot tren mobile). Dung chung cho khoan chi (ExpensePanel) va nguoi tham gia
 * (ParticipantPanel): component chi can list + ham lay id + callback luu.
 *
 * FLIP animation: dong khac vi tri moi truot vao thay vi nhay cung, dua vao
 * rect chup ngay truoc khi doi thu tu (prevRectsRef).
 */
export function useDragReorder<T>(
  items: T[],
  getId: (item: T) => string,
  onReorder: (orderedIds: string[]) => void,
) {
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragTranslateY, setDragTranslateY] = useState(0);
  const draggingIdRef = useRef<string | null>(null);
  const dragStartYRef = useRef(0);
  const rowRefs = useRef(new Map<string, HTMLElement>());
  const prevRectsRef = useRef(new Map<string, DOMRect>());

  const orderedItems = dragOrder
    ? (dragOrder.map((id) => items.find((item) => getId(item) === id)).filter(Boolean) as T[])
    : items;

  useLayoutEffect(() => {
    const prevRects = prevRectsRef.current;
    if (prevRects.size === 0) return;
    prevRectsRef.current = new Map();

    for (const [id, node] of rowRefs.current) {
      if (id === draggingIdRef.current) continue;
      const before = prevRects.get(id);
      if (!before) continue;
      const after = node.getBoundingClientRect();
      const deltaY = before.top - after.top;
      if (deltaY === 0) continue;

      node.style.transition = "none";
      node.style.transform = `translateY(${deltaY}px)`;
      requestAnimationFrame(() => {
        node.style.transition = "transform 180ms ease";
        node.style.transform = "";
      });
    }
  }, [dragOrder]);

  function handleDragPointerDown(id: string, event: ReactPointerEvent) {
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    draggingIdRef.current = id;
    setDraggingId(id);
    dragStartYRef.current = event.clientY;
    setDragTranslateY(0);
    setDragOrder(items.map(getId));
  }

  function handleDragPointerMove(event: ReactPointerEvent) {
    const draggingId = draggingIdRef.current;
    if (!draggingId) return;
    setDragTranslateY(event.clientY - dragStartYRef.current);

    let closestId: string | null = null;
    let closestDistance = Infinity;
    for (const [id, node] of rowRefs.current) {
      const rect = node.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const distance = Math.abs(event.clientY - center);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestId = id;
      }
    }
    if (!closestId || closestId === draggingId) return;

    const rects = new Map<string, DOMRect>();
    for (const [id, node] of rowRefs.current) rects.set(id, node.getBoundingClientRect());
    prevRectsRef.current = rects;

    setDragOrder((current) => {
      const order = current ? [...current] : items.map(getId);
      const fromIndex = order.indexOf(draggingId);
      const toIndex = order.indexOf(closestId as string);
      if (fromIndex === -1 || toIndex === -1) return order;
      order.splice(fromIndex, 1);
      order.splice(toIndex, 0, draggingId);
      return order;
    });
  }

  function handleDragPointerUp() {
    const draggingId = draggingIdRef.current;
    draggingIdRef.current = null;
    setDraggingId(null);
    setDragTranslateY(0);
    if (!draggingId || !dragOrder) return;

    const originalOrder = items.map(getId);
    const changed = dragOrder.some((id, index) => id !== originalOrder[index]);
    if (changed) onReorder(dragOrder);
    setDragOrder(null);
  }

  function registerRow(id: string) {
    return (node: HTMLElement | null) => {
      if (node) rowRefs.current.set(id, node);
      else rowRefs.current.delete(id);
    };
  }

  return {
    orderedItems,
    draggingId,
    dragTranslateY,
    registerRow,
    handleDragPointerDown,
    handleDragPointerMove,
    handleDragPointerUp,
  };
}
