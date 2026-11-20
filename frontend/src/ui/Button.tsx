import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";
import { Spinner } from "./Spinner";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-fg hover:bg-primary-hover shadow-sm",
  secondary: "bg-surface-muted text-fg hover:bg-border",
  outline: "border border-border bg-surface text-fg hover:bg-surface-muted",
  ghost: "text-fg-muted hover:bg-surface-muted hover:text-fg",
  danger: "bg-danger text-white hover:brightness-110 shadow-sm",
};

/* Cao toi thieu 44px tren mobile: dat muc tieu cham cua iOS/Android.
   Tu sm tro len thu nho lai cho gon desktop. */
const SIZE: Record<ButtonSize, string> = {
  sm: "h-10 px-3 text-sm gap-1.5 sm:h-8",
  md: "h-11 px-4 text-base gap-2 sm:h-10 sm:text-sm",
  lg: "h-12 px-6 text-base gap-2",
  icon: "h-11 w-11 sm:h-10 sm:w-10",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Chiem tron chieu ngang - hay dung cho nut chinh tren mobile. */
  block?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  block = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      // aria-busy de screen reader biet dang cho, khong chi doi con tro.
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-ui font-medium transition",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        "active:scale-[0.98]",
        VARIANT[variant],
        SIZE[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
