import type { ReactNode } from "react";
import { cn } from "./cn";

export type AlertTone = "info" | "success" | "warning" | "danger";

const TONE: Record<AlertTone, string> = {
  info: "border-border bg-surface-muted text-fg",
  success: "border-success/40 bg-success-soft text-success",
  warning: "border-warning/40 bg-warning-soft text-warning",
  danger: "border-danger/40 bg-danger-soft text-danger",
};

export type AlertProps = {
  tone?: AlertTone;
  title?: ReactNode;
  icon?: ReactNode;
  /** Nut o cuoi, vi du "Thử lại". */
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
};

/**
 * Thong bao nam tai cho trong trang (khac Toast la thong bao thoang qua).
 * Dung cho loi cua ca form, canh bao han muc, huong dan buoc tiep theo.
 */
export function Alert({ tone = "info", title, icon, action, className, children }: AlertProps) {
  return (
    <div
      // role="alert" chi cho canh bao thuc su, con lai de mac dinh de screen
      // reader khong bi cat ngang boi thong tin phu.
      role={tone === "danger" ? "alert" : undefined}
      className={cn("flex gap-3 rounded-ui border px-4 py-3", TONE[tone], className)}
    >
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}

      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-semibold">{title}</p>}
        {children && <div className={cn("text-xs", title && "mt-0.5", "opacity-90")}>{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
