import { cn } from "./cn";

type SpinnerProps = {
  size?: number;
  className?: string;
  label?: string;
};

/** Vong xoay thuan CSS, khong dung SVG animate de nhe va tat duoc bang reduced-motion. */
export function Spinner({ size = 16, className, label }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label ?? "Đang tải"}
      style={{
        width: size,
        height: size,
        borderWidth: Math.max(2, Math.round(size / 8)),
        animation: "ui-spin 700ms linear infinite",
      }}
      className={cn(
        "inline-block shrink-0 rounded-full border-current border-r-transparent align-[-0.125em]",
        className,
      )}
    />
  );
}
