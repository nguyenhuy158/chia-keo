import { useState, type ReactNode } from "react";
import { cn } from "./cn";
import { Tooltip } from "./Tooltip";
import { useDismiss } from "./use-dismiss";

export type SpeedDialAction = { label: string; icon: ReactNode; onSelect: () => void };

export type SpeedDialProps = {
  actions: SpeedDialAction[];
  icon: ReactNode;
  label?: string;
  /** Huong bung cac nut con. */
  direction?: "up" | "left";
  className?: string;
};

/**
 * Nut tron chinh bung ra vai hanh dong phu. Dat vi tri bang className
 * (vi du "fixed bottom-20 right-4"); mac dinh nam trong dong chay trang.
 */
export function SpeedDial({ actions, icon, label = "Hành động", direction = "up", className }: SpeedDialProps) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center gap-3",
        direction === "up" ? "flex-col-reverse" : "flex-row-reverse",
        className,
      )}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-fg shadow-lg outline-none transition hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
      >
        <span className={cn("transition", open && "rotate-45")}>{icon}</span>
      </button>

      {open &&
        actions.map((action, index) => (
          <Tooltip key={action.label} label={action.label}>
            <button
              type="button"
              aria-label={action.label}
              onClick={() => {
                action.onSelect();
                setOpen(false);
              }}
              style={{ animation: `ui-zoom-in 150ms ease-out ${index * 30}ms both` }}
              className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-fg shadow-md outline-none transition hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              {action.icon}
            </button>
          </Tooltip>
        ))}
    </div>
  );
}
