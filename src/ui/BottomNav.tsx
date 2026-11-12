import type { ComponentType, ReactNode } from "react";
import { cn } from "./cn";

export type BottomNavItem<TId extends string = string> = {
  id: TId;
  label: string;
  icon: ComponentType<{ size?: number }>;
  /** So nho goc phai icon (tin chua doc...). 0 hoac bo trong thi khong ve. */
  badge?: number;
};

export type BottomNavProps<TId extends string = string> = {
  items: BottomNavItem<TId>[];
  active: TId;
  onChange: (id: TId) => void;
  /** An tren desktop khi da co sidebar. Dat false neu app chi co mot layout. */
  mobileOnly?: boolean;
  className?: string;
};

/**
 * Thanh dieu huong duoi man hinh.
 *
 * Dung role="tablist" chu khong phai <nav>: cac muc doi noi dung tai cho, khong
 * dieu huong sang trang khac. Neu app dung router that, thay <button> bang <Link>
 * va doi lai thanh <nav> + aria-current="page".
 */
export function BottomNav<TId extends string = string>({
  items,
  active,
  onChange,
  mobileOnly = true,
  className,
}: BottomNavProps<TId>) {
  return (
    <div
      role="tablist"
      className={cn(
        "safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur",
        mobileOnly && "lg:hidden",
        className,
      )}
    >
      <div
        className="mx-auto grid max-w-md"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === active;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(item.id)}
              className={cn(
                "relative flex min-h-14 flex-col items-center justify-center gap-0.5 outline-none transition",
                "active:bg-surface-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                isActive ? "text-primary" : "text-fg-muted",
              )}
            >
              <span className="relative">
                <Icon size={20} />
                {Boolean(item.badge) && (
                  <span className="absolute -right-2 -top-1 min-w-4 rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white">
                    {item.badge! > 99 ? "99+" : item.badge}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type FabProps = {
  onClick: () => void;
  label: string;
  icon: ReactNode;
  /** Nang nut len khi co BottomNav ben duoi. */
  aboveNav?: boolean;
  className?: string;
};

/** Nut hanh dong chinh noi o goc phai duoi. */
export function Fab({ onClick, label, icon, aboveNav = true, className }: FabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        bottom: aboveNav
          ? "calc(4.75rem + env(safe-area-inset-bottom))"
          : "calc(1rem + env(safe-area-inset-bottom))",
      }}
      className={cn(
        "fixed right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full",
        "bg-primary text-primary-fg shadow-lg transition active:scale-95 hover:bg-primary-hover",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {icon}
    </button>
  );
}
