import { type ReactNode, useState } from "react";
import { cn } from "./cn";
import { useDismiss } from "./use-dismiss";

export type PopoverProps = {
  trigger: (props: {
    onClick: () => void;
    "aria-expanded": boolean;
    "aria-haspopup": "dialog";
  }) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "left" | "right";
  side?: "top" | "bottom";
  className?: string;
  panelClassName?: string;
};

export function Popover({
  trigger,
  children,
  align = "left",
  side = "bottom",
  className,
  panelClassName,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const ref = useDismiss(open, close);

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      {trigger({
        onClick: () => setOpen((value) => !value),
        "aria-expanded": open,
        "aria-haspopup": "dialog",
      })}

      {open && (
        <div
          role="dialog"
          style={{ animation: "ui-slide-down 120ms ease-out" }}
          className={cn(
            "absolute z-50 min-w-56 rounded-ui border border-border bg-surface p-3 shadow-lg",
            side === "bottom" ? "top-full mt-1" : "bottom-full mb-1",
            align === "right" ? "right-0" : "left-0",
            panelClassName,
          )}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}
