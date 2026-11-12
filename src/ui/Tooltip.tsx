import { useId, useState, type ReactNode } from "react";
import { cn } from "./cn";

export type TooltipProps = {
  label: string;
  side?: "top" | "bottom";
  children: ReactNode;
  className?: string;
};

const SIDE = {
  top: "bottom-full mb-1.5",
  bottom: "top-full mt-1.5",
};

/**
 * Chu goi y khi ro chuot hoac focus ban phim.
 *
 * Tren thiet bi cam ung khong co "ro chuot", nen dung tooltip cho thong tin
 * bat buoc phai doc — chi dung cho phan giai thich them. Viec gi quan trong
 * thi viet thang ra man hinh.
 */
export function Tooltip({ label, side = "top", children, className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className={cn("relative inline-flex", className)}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {/* aria-describedby tren the boc: screen reader doc them chu goi y sau noi dung. */}
      <span aria-describedby={open ? id : undefined}>{children}</span>

      {open && (
        <span
          id={id}
          role="tooltip"
          style={{ animation: "ui-slide-down 120ms ease-out" }}
          className={cn(
            "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap",
            "rounded-md bg-fg px-2 py-1 text-xs font-medium text-bg shadow-lg",
            SIDE[side],
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}
