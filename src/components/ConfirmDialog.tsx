import { TriangleAlert } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRestoreFocus } from "./overlays";

type ConfirmOptions = {
  title: string;
  /** Chi tiet phu, vd ten cuoc chia hoac ket qua khong hoan tac duoc. */
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Nut xac nhan mau do — dung cho thao tac xoa/khong hoan tac duoc. */
  destructive?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Thay `window.confirm`: hop thoai native khong theo duoc mau/kieu chu cua
 * app, tren desktop hien ca URL va nhin nhu loi trinh duyet chu khong phai
 * mot phan cua Chia Kèo.
 *
 * Dung Promise<boolean> giu nguyen cach goi cu (`if (!(await confirm(...))) return;`)
 * nen doi tu window.confirm sang day chi doi mot dong o moi cho goi.
 */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm phai duoc dung ben trong ConfirmProvider");
  }
  return confirm;
}

type PendingConfirm = ConfirmOptions & { resolve: (value: boolean) => void };

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useRestoreFocus(Boolean(pending));

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      // Chi mot hop thoai tai mot thoi diem: hop moi de nghi thi coi nhu
      // nguoi dung da bo qua hop cu (huy ngam).
      setPending((current) => {
        current?.resolve(false);
        return { ...options, resolve };
      });
    });
  }, []);

  function close(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  useEffect(() => {
    if (!pending) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus vao nut xac nhan: Enter go ngay duoc, quan trong vi day thay the
    // window.confirm() von nhan Enter la dong y.
    confirmButtonRef.current?.focus();

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", handleKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {pending &&
        createPortal(
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Hủy"
              onClick={() => close(false)}
              className="absolute inset-0 h-full w-full cursor-default bg-stone-900/40 animate-[overlay-in_160ms_ease]"
            />
            <div
              ref={dialogRef}
              role="alertdialog"
              aria-modal="true"
              aria-label={pending.title}
              aria-describedby={pending.description ? "confirm-dialog-description" : undefined}
              className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl animate-[sheet-up_200ms_cubic-bezier(0.32,0.72,0,1)] dark:bg-stone-900"
            >
              <div className="flex items-start gap-3">
                {pending.destructive && (
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                    <TriangleAlert size={18} />
                  </span>
                )}
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-stone-950 dark:text-stone-50">
                    {pending.title}
                  </h2>
                  {pending.description && (
                    <p
                      id="confirm-dialog-description"
                      className="mt-1 text-sm text-stone-600 dark:text-stone-400"
                    >
                      {pending.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-medium text-stone-700 transition hover:bg-stone-50 active:scale-[0.98] dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  {pending.cancelLabel || "Hủy"}
                </button>
                <button
                  ref={confirmButtonRef}
                  type="button"
                  onClick={() => close(true)}
                  className={`inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold text-white transition active:scale-[0.98] ${
                    pending.destructive
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-violet-600 hover:bg-violet-700"
                  }`}
                >
                  {pending.confirmLabel || "Đồng ý"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </ConfirmContext.Provider>
  );
}
