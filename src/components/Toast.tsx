import { CheckCircle2, Info, XCircle } from "lucide-react";
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

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastFn = (message: string, variant?: ToastVariant) => void;

const ToastContext = createContext<ToastFn | null>(null);

const TOAST_DURATION_MS = 2600;

const VARIANT_STYLE: Record<ToastVariant, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: "text-emerald-600" },
  error: { icon: XCircle, className: "text-rose-600" },
  info: { icon: Info, className: "text-stone-500" },
};

export function useToast(): ToastFn {
  const toast = useContext(ToastContext);
  if (!toast) {
    throw new Error("useToast phai duoc dung ben trong ToastProvider");
  }
  return toast;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback<ToastFn>(
    (message, variant = "success") => {
      const id = (idRef.current += 1);
      setToasts((prev) => [...prev.slice(-2), { id, message, variant }]);
      window.setTimeout(() => remove(id), TOAST_DURATION_MS);
    },
    [remove],
  );

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4">
          {toasts.map((item) => {
            const { icon: Icon, className } = VARIANT_STYLE[item.variant];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => remove(item.id)}
                className="pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-sm font-medium text-stone-800 shadow-lg animate-[toast-in_200ms_ease] dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              >
                <Icon size={18} className={`shrink-0 ${className}`} />
                <span className="min-w-0 flex-1">{item.message}</span>
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
