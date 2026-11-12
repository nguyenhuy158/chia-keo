import { useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";
import { useOverlay } from "./use-overlay";
import { Button } from "./Button";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Nut o chan hop thoai. Bo trong thi khong ve chan. */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  children?: ReactNode;
};

const SIZE = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" };

export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  size = "md",
  children,
}: ModalProps) {
  const ref = useOverlay(open, onClose);
  const titleId = useId();
  const descId = useId();

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={{ animation: "ui-fade-in 150ms ease-out" }}
    >
      {/* Lop mo phia sau. aria-hidden vi noi dung cua no la trang thai, khong phai chu. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />

      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        style={{ animation: "ui-zoom-in 180ms ease-out" }}
        className={cn(
          "relative flex max-h-[90dvh] w-full flex-col rounded-t-2xl bg-surface shadow-xl outline-none sm:rounded-ui",
          SIZE[size],
        )}
      >
        <div className="border-b border-border px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold text-fg">
            {title}
          </h2>
          {description && (
            <p id={descId} className="mt-1 text-xs text-fg-muted">
              {description}
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {footer && (
          <div className="safe-bottom flex justify-end gap-2 border-t border-border px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Bat khi hanh dong khong hoan tac duoc (xoa, huy...). */
  destructive?: boolean;
  loading?: boolean;
};

/** Hop thoai xac nhan: dung thay cho window.confirm de con style va con chan Esc. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Huỷ",
  destructive = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
