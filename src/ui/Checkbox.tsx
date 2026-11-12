import type { InputHTMLAttributes, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { cn } from "./cn";

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> & {
  label?: ReactNode;
  description?: ReactNode;
  /** Trang thai nua: dung cho o "chon tat ca" khi moi chon mot phan. */
  indeterminate?: boolean;
};

/**
 * Giu input that (chi an di bang sr-only) de van submit theo form, van
 * focus/space duoc, va van bat duoc bo loc cua trinh duyet. O vuong mau la lop ve.
 */
export function Checkbox({
  label,
  description,
  indeterminate = false,
  className,
  disabled,
  ...rest
}: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  // indeterminate chi dat duoc bang JS, khong co thuoc tinh HTML tuong ung.
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label
      className={cn(
        "flex cursor-pointer select-none items-start gap-3 py-2",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <input ref={ref} type="checkbox" disabled={disabled} className="peer sr-only" {...rest} />

      <span
        aria-hidden="true"
        className={cn(
          // text-transparent: dau tick luon co trong DOM, chi hien khi checked
          // doi mau chu. Khong dung peer-checked tren the <path> vi bien the
          // peer chi ap cho anh em cua input, khong ap cho con chau.
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[0.3rem] border border-border bg-surface text-transparent transition",
          "peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-fg",
          "peer-indeterminate:border-primary peer-indeterminate:bg-primary peer-indeterminate:text-primary-fg",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
        )}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5">
          {indeterminate ? (
            <path d="M4 8h8" strokeLinecap="round" />
          ) : (
            <path d="M3.5 8.5l3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </span>

      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm text-fg">{label}</span>}
          {description && (
            <span className="mt-0.5 block text-xs text-fg-muted">{description}</span>
          )}
        </span>
      )}
    </label>
  );
}
