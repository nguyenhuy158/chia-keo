import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Spinner } from "./Spinner";

export type BackdropProps = {
  open: boolean;
  /** Bam nen de dong. Bo trong khi dang xu ly khong cho huy (vi du dang luu). */
  onClose?: () => void;
  /** Mac dinh: spinner + "Đang xử lý...". */
  children?: ReactNode;
};

/** Lop mo phu toan man hinh, chan thao tac trong luc cho. */
export function Backdrop({ open, onClose, children }: BackdropProps) {
  if (!open) return null;

  return createPortal(
    <div
      aria-busy="true"
      onClick={onClose}
      style={{ animation: "ui-fade-in 150ms ease-out" }}
      className="fixed inset-0 z-[70] grid place-items-center bg-black/50 text-white backdrop-blur-sm"
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
