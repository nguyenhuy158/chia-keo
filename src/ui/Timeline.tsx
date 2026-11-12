import type { ReactNode } from "react";
import { cn } from "./cn";

export type TimelineItem = {
  id: string;
  title: ReactNode;
  time?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** Muc dang dien ra / moi nhat: cham to mau primary. */
  active?: boolean;
};

/** Dong thoi gian doc: cham + duong noi, noi dung ben phai. */
export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={className}>
      {items.map((item, index) => (
        <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
          {index < items.length - 1 && (
            <span aria-hidden="true" className="absolute left-[0.6875rem] top-6 h-[calc(100%-1.5rem)] w-px bg-border" />
          )}
          <span
            className={cn(
              "relative z-10 grid size-6 shrink-0 place-items-center rounded-full border-2",
              item.active ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface text-fg-muted",
            )}
          >
            {item.icon ?? <span className={cn("size-1.5 rounded-full", item.active ? "bg-primary-fg" : "bg-fg-muted")} />}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
              <p className={cn("text-sm", item.active ? "font-semibold text-fg" : "font-medium text-fg")}>{item.title}</p>
              {item.time && <span className="text-xs text-fg-muted">{item.time}</span>}
            </div>
            {item.description && <p className="mt-0.5 text-sm text-fg-muted">{item.description}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
