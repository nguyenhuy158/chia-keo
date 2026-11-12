import type { ReactNode } from "react";
import { cn } from "./cn";

export type ChipProps = {
  children: ReactNode;
  icon?: ReactNode;
  /** Co thi chip bam duoc (chip loc); `selected` to mau. */
  onClick?: () => void;
  selected?: boolean;
  /** Co thi hien nut x de go chip (chip nhap lieu, vi du tag). */
  onRemove?: () => void;
  className?: string;
};

/** Nhan tron: loc (bam chon), tag (co nut x) hoac chi hien thi. */
export function Chip({ children, icon, onClick, selected, onRemove, className }: ChipProps) {
  const body = (
    <>
      {icon}
      <span className="truncate">{children}</span>
    </>
  );
  const base = cn(
    "inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border px-3 text-sm transition",
    selected ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-fg",
    className,
  );

  if (onClick) {
    return (
      <button
        type="button"
        aria-pressed={selected}
        onClick={onClick}
        className={cn(base, !selected && "hover:bg-surface-muted", "outline-none focus-visible:ring-2 focus-visible:ring-ring")}
      >
        {body}
      </button>
    );
  }

  return (
    <span className={cn(base, onRemove && "pr-1")}>
      {body}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Xoá ${typeof children === "string" ? children : ""}`.trim()}
          className="grid size-6 place-items-center rounded-full text-fg-muted hover:bg-surface-muted hover:text-fg"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </span>
  );
}
