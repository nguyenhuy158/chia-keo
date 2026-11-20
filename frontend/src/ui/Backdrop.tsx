import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";
import { Spinner } from "./Spinner";
import { motion, usePresence } from "./use-presence";

export type BackdropProps = {
  open: boolean;
  /** Bam nen de dong. Bo trong khi dang xu ly khong cho huy (vi du dang luu). */
  onClose?: () => void;
  /** Mac dinh: spinner + "Đang xử lý...". */
  children?: ReactNode;
};

/** Lop mo phu toan man hinh, chan thao tac trong luc cho. */
export function Backdrop({ open, onClose, children }: BackdropProps) {
  const { mounted, closing } = usePresence(open);

  if (!mounted) return null;

  return createPortal(
    // biome-ignore lint/a11y/noStaticElementInteractions: pointer-only dismiss, the host owns keyboard handling
    // biome-ignore lint/a11y/useKeyWithClickEvents: pointer-only dismiss, the host owns keyboard handling
    <div
      aria-busy="true"
      onClick={onClose}
      style={{
        animation: motion(
          closing,
          "ui-fade-in var(--ui-dur-fast) var(--ui-ease-out)",
          "ui-fade-out var(--ui-dur-fast) var(--ui-ease-in)",
        ),
      }}
      className={cn(
        "fixed inset-0 z-[70] grid place-items-center bg-black/50 text-white backdrop-blur-sm",
        closing && "pointer-events-none",
      )}
    >
      {children ?? (
        <div className="flex flex-col items-center gap-3">
          <Spinner size={32} />
          <span className="text-sm">Đang xử lý...</span>
        </div>
      )}
    </div>,
    document.body,
  );
}
