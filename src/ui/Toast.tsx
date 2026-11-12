import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";

export type ToastTone = "info" | "success" | "warning" | "error";

type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
  description?: string;
};

type ToastOptions = { description?: string; duration?: number };

type ToastApi = {
  show: (tone: ToastTone, message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  success: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast phai nam trong ToastProvider");
  return api;
}

const TONE: Record<ToastTone, string> = {
  info: "border-border bg-surface text-fg",
  success: "border-success/40 bg-success-soft text-success",
  warning: "border-warning/40 bg-warning-soft text-warning",
  error: "border-danger/40 bg-danger-soft text-danger",
};

/** Boc quanh app mot lan. Khong dung thu vien ngoai de copy sang project khac la chay. */
export function ToastProvider({
  children,
  duration = 4000,
}: {
  children: ReactNode;
  duration?: number;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (tone: ToastTone, message: string, options?: ToastOptions) => {
      const id = nextId.current;
      nextId.current += 1;
      setToasts((list) => [...list, { id, tone, message, description: options?.description }]);
      // Loi thuong can doc ky hon nen de lau gap doi.
      const ms = options?.duration ?? (tone === "error" ? duration * 2 : duration);
      window.setTimeout(() => dismiss(id), ms);
    },
    [dismiss, duration],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      dismiss,
      info: (message, options) => show("info", message, options),
      success: (message, options) => show("success", message, options),
      warning: (message, options) => show("warning", message, options),
      error: (message, options) => show("error", message, options),
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        // aria-live polite: screen reader doc khi ranh, khong cat ngang thao tac.
        <div
          role="status"
          aria-live="polite"
          className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
        >
          {toasts.map((toast) => (
            <button
              key={toast.id}
              type="button"
              onClick={() => dismiss(toast.id)}
              style={{ animation: "ui-slide-up 200ms ease-out" }}
              className={cn(
                "pointer-events-auto w-full max-w-sm rounded-ui border px-4 py-3 text-left shadow-lg",
                TONE[toast.tone],
              )}
            >
              <p className="text-sm font-medium">{toast.message}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs opacity-80">{toast.description}</p>
              )}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
