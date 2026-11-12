import type { ReactNode } from "react";
import { cn } from "./cn";

export type HeaderBarProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Nut trai: nut quay lai, nut mo menu... */
  leading?: ReactNode;
  /** Nut phai: tim kiem, doi giao dien, avatar... */
  actions?: ReactNode;
  /** Dinh khi cuon. Tat neu trang da co header khac dinh san. */
  sticky?: boolean;
  className?: string;
};

/** Thanh tieu de tren cung. Co safe-top de khong bi notch che tren iPhone. */
export function HeaderBar({
  title,
  subtitle,
  leading,
  actions,
  sticky = true,
  className,
}: HeaderBarProps) {
  return (
    <header
      className={cn(
        "safe-top z-30 border-b border-border bg-surface/90 backdrop-blur",
        sticky && "sticky top-0",
        className,
      )}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 pb-2">
        {leading}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-fg">{title}</h1>
          {subtitle && <p className="truncate text-xs text-fg-muted">{subtitle}</p>}
        </div>

        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
    </header>
  );
}
