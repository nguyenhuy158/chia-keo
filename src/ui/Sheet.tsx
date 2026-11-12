import { useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";
import { useOverlay } from "./use-overlay";

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** "bottom" cho mobile (mac dinh), "left"/"right" cho menu ngan keo. */
  side?: "bottom" | "left" | "right";
  children?: ReactNode;
};

const SIDE = {
  bottom: {
    position: "inset-x-0 bottom-0 max-h-[85dvh] w-full rounded-t-2xl",
    animation: "ui-slide-up 220ms cubic-bezier(0.32, 0.72, 0, 1)",
  },
  left: {
    position: "inset-y-0 left-0 h-full w-[85%] max-w-xs",
    animation: "ui-fade-in 200ms ease-out",
  },
  right: {
    position: "inset-y-0 right-0 h-full w-[85%] max-w-xs",
    animation: "ui-fade-in 200ms ease-out",
  },
};

/** Ngan truot tu canh man hinh. Tren mobile de bam hon Modal vi gan ngon tay hon. */
export function Sheet({ open, onClose, title, side = "bottom", children }: SheetProps) {
  const ref = useOverlay(open, onClose);
  const titleId = useId();

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50" style={{ animation: "ui-fade-in 150ms ease-out" }}>
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/50" />

      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ animation: SIDE[side].animation }}
        className={cn(
          "absolute flex flex-col bg-surface shadow-xl outline-none",
          SIDE[side].position,
        )}
      >
        {/* Thanh keo: tin hieu thi giac cho biet co the vuot xuong de dong. */}
        {side === "bottom" && (
          <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" />
        )}

        <div className="px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold text-fg">
            {title}
          </h2>
        </div>

        <div className="safe-bottom min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
