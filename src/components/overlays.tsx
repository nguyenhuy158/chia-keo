import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

function useBodyScrollLock(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
}

function useEscToClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Đóng"
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 active:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-800 dark:active:bg-stone-700"
    >
      <X size={20} />
    </button>
  );
}

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/**
 * Bottom sheet truot len tu duoi man hinh, toi uu cho thao tac bang ngon cai.
 * Tren man hinh lon se can giua nhu modal thuong.
 */
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  useBodyScrollLock(open);
  useEscToClose(open, onClose);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-stone-900/40 animate-[overlay-in_160ms_ease]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="safe-bottom relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl animate-[sheet-up_240ms_cubic-bezier(0.32,0.72,0,1)] dark:bg-stone-900 sm:max-w-lg sm:rounded-2xl"
      >
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-stone-300 dark:bg-stone-700 sm:hidden" />
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 px-4 py-2.5 dark:border-stone-800">
          <h3 className="text-base font-semibold text-stone-950 dark:text-stone-50">{title}</h3>
          <CloseButton onClose={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/** Ngan keo tu canh trai, dung cho dieu huong tren mobile. */
export function Drawer({ open, onClose, title, children }: DrawerProps) {
  useBodyScrollLock(open);
  useEscToClose(open, onClose);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-stone-900/40 animate-[overlay-in_160ms_ease]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-y-0 left-0 flex w-[86%] max-w-xs flex-col bg-violet-50 shadow-xl animate-[drawer-in_240ms_cubic-bezier(0.32,0.72,0,1)] dark:bg-stone-950"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-base font-semibold text-stone-950 dark:text-stone-50">{title}</h2>
          <CloseButton onClose={onClose} />
        </div>
        <div className="safe-bottom min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
