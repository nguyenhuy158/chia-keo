import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Cach xu ly dung chung cho Modal / Sheet / lop phu bat ky:
 * - Esc de dong
 * - khoa cuon trang nen
 * - giam focus trong lop phu (Tab khong thoat ra sau lung)
 * - tra focus ve dung nut da mo no khi dong
 *
 * Tra ve ref, gan vao the boc noi dung lop phu.
 */
export function useOverlay(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  // Ham onClose thuong duoc truyen vao dang arrow function moi moi lan render.
  // Giu no trong ref de effect ben duoi chi phu thuoc `open`, khong bi chay lai
  // (va giam focus lai tu dau) moi khi component cha re-render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;

    // Dua focus vao trong ngay khi mo, neu khong Tab dau tien se roi ra nen.
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !node) return;

      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      // Vong lai hai dau: Shift+Tab o phan tu dau -> nhay ve cuoi va nguoc lai.
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreTo.current?.focus();
    };
  }, [open]);

  return ref;
}
