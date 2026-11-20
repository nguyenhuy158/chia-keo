import { useEffect, useRef } from "react";

/**
 * Dong popover (Menu, DatePicker) khi bam ra ngoai hoac bam Esc.
 * Khac `useOverlay`: khong khoa cuon, khong giam focus — popover nho, nen
 * van de tuong tac voi phan con lai cua trang.
 *
 * Tra ve ref, gan vao the boc ca nut mo lan noi dung popover.
 */
export function useDismiss(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  // Giu onClose trong ref de effect chi phu thuoc `open` (xem use-overlay.ts).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onCloseRef.current();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };

    // pointerdown chu khong phai click: dong ngay khi vua cham, khong doi nha tay.
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return ref;
}
