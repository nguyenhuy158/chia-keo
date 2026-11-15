import { type ReactNode, useState } from "react";
import { cn } from "./cn";
import { useDismiss } from "./use-dismiss";
import { motion, usePresence } from "./use-presence";

export type MenuItem = {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  /** To do cho hanh dong xoa / khong hoan tac duoc. */
  destructive?: boolean;
  disabled?: boolean;
};

export type MenuProps = {
  /** Nut mo menu. Nhan onClick tu Menu, thuong la mot <Button size="icon">. */
  trigger: (props: {
    onClick: () => void;
    "aria-expanded": boolean;
  }) => ReactNode;
  items: MenuItem[];
  align?: "left" | "right";
  className?: string;
};

/** Menu tha xuong. Dong khi bam ra ngoai, bam Esc, hoac chon mot muc. */
export function Menu({
  trigger,
  items,
  align = "right",
  className,
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const { mounted, closing } = usePresence(open);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {trigger({
        onClick: () => setOpen((value) => !value),
        "aria-expanded": open,
      })}

      {mounted && (
        <div
          role="menu"
          style={{
            animation: motion(
              closing,
              "ui-slide-down 120ms ease-out",
              "ui-slide-down-out 120ms ease-in",
            ),
          }}
          className={cn(
            closing && "pointer-events-none",
            "absolute z-50 mt-1 min-w-44 overflow-hidden rounded-ui border border-border bg-surface py-1 shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm outline-none transition",
                "hover:bg-surface-muted focus-visible:bg-surface-muted",
                "disabled:pointer-events-none disabled:opacity-50",
                item.destructive ? "text-danger" : "text-fg",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
