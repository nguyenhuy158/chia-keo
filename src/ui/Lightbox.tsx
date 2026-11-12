import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";
import { useOverlay } from "./use-overlay";

const SWIPE_THRESHOLD_PX = 48;

export type LightboxProps = {
  open: boolean;
  src: string;
  alt: string;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  loading?: boolean;
  actions?: ReactNode;
  footer?: ReactNode;
};

export function LightboxButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 active:bg-white/25 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function Lightbox({
  open,
  src,
  alt,
  index,
  total,
  onClose,
  onPrev,
  onNext,
  loading = false,
  actions,
  footer,
}: LightboxProps) {
  const ref = useOverlay(open, onClose);
  const touchStartX = useRef<number | null>(null);
  const navigation = useRef({ onPrev, onNext });
  navigation.current = { onPrev, onNext };

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") navigation.current.onPrev();
      if (event.key === "ArrowRight") navigation.current.onNext();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!open) return null;

  function handleTouchEnd(endX: number) {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX === null || total < 2) return;
    const distance = endX - startX;
    if (distance > SWIPE_THRESHOLD_PX) onPrev();
    if (distance < -SWIPE_THRESHOLD_PX) onNext();
  }

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      tabIndex={-1}
      style={{ animation: "ui-fade-in 150ms ease-out" }}
      className="fixed inset-0 z-50 flex flex-col bg-black text-white outline-none"
    >
      <div className="safe-top flex shrink-0 items-center justify-between gap-2 px-2 py-2">
        <LightboxButton label="Đóng" onClick={onClose}>
          <X size={22} />
        </LightboxButton>
        <span className="text-sm font-medium text-white/80 tabular-nums">
          {index + 1}/{total}
        </span>
        <div className="flex min-w-11 items-center justify-end gap-1">
          {actions}
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) =>
          handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)
        }
      >
        {total > 1 && (
          <div className="absolute inset-x-1 flex items-center justify-between">
            <LightboxButton label="Ảnh trước" onClick={onPrev}>
              <ChevronLeft size={26} />
            </LightboxButton>
            <LightboxButton label="Ảnh sau" onClick={onNext}>
              <ChevronRight size={26} />
            </LightboxButton>
          </div>
        )}
        <img
          src={src}
          alt={alt}
          className={cn(
            "max-h-full max-w-full object-contain transition",
            loading && "blur-sm",
          )}
        />
      </div>

      {footer && (
        <div className="safe-bottom shrink-0 space-y-2 px-4 py-3">{footer}</div>
      )}
    </div>,
    document.body,
  );
}
