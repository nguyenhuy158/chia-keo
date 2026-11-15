import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "./cn";

export type MobileSpan = 1 | 2 | 3 | 4;
export type DesktopSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

const MOBILE_FULL_SPAN = 4;
const DESKTOP_PER_MOBILE_COLUMN = 3;

export function Container({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-container", className)} {...rest} />;
}

export function Grid({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-grid", className)} {...rest} />;
}

export type ColProps = HTMLAttributes<HTMLDivElement> & {
  mobile?: MobileSpan;
  desktop?: DesktopSpan;
};

export function Col({
  mobile = MOBILE_FULL_SPAN,
  desktop,
  className,
  style,
  ...rest
}: ColProps) {
  const spans = {
    "--ui-col-mobile": mobile,
    "--ui-col-desktop": desktop ?? mobile * DESKTOP_PER_MOBILE_COLUMN,
  } as CSSProperties;

  return (
    <div
      className={cn("ui-col", className)}
      style={{ ...spans, ...style }}
      {...rest}
    />
  );
}
