import type { ReactNode } from "react";
import { cn } from "./cn";

export type ProgressProps = {
  value: number;
  max?: number;
  label?: ReactNode;
  /** Hien so phan tram ben phai nhan. */
  showValue?: boolean;
  tone?: "primary" | "success" | "warning" | "danger";
  className?: string;
};

const TONE = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function Progress({
  value,
  max = 100,
  label,
  showValue = false,
  tone = "primary",
  className,
}: ProgressProps) {
  // Kep trong [0, max] de du lieu sai khong lam thanh tran ra ngoai khung.
  const clamped = Math.min(Math.max(value, 0), max);
  const percent = max === 0 ? 0 : Math.round((clamped / max) * 100);

  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-fg-muted">{label}</span>
          {showValue && <span className="font-medium text-fg tabular">{percent}%</span>}
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
      >
        <div
          style={{ width: `${percent}%` }}
          className={cn("h-full rounded-full transition-[width] duration-300", TONE[tone])}
        />
      </div>
    </div>
  );
}
