import type { ReactNode } from "react";
import { cn } from "./cn";
import { Spinner } from "./Spinner";

/** Khoi xam nhap nho, dung lam khung cho trong khi cho du lieu. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-surface-muted", className)}
    />
  );
}

export function SkeletonListRow({ avatar = false }: { avatar?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-3">
      {avatar && <Skeleton className="h-10 w-10 rounded-full" />}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

export type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  /** Nut goi hanh dong, vi du "Tao moi". */
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-ui border border-dashed border-border px-6 py-10 text-center",
        className,
      )}
    >
      {icon && <div className="text-fg-muted">{icon}</div>}
      <p className="text-sm font-semibold text-fg">{title}</p>
      {description && <p className="max-w-sm text-xs text-fg-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Đang tải..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-fg-muted">
      <Spinner size={16} label={label} />
      {label}
    </div>
  );
}
