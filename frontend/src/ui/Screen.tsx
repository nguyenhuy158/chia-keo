import type { ReactNode } from "react";
import { cn } from "./cn";

export type ScreenProps = {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  fill?: "viewport" | "parent";
  className?: string;
};

export function Screen({
  header,
  footer,
  children,
  fill = "viewport",
  className,
}: ScreenProps) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden",
        fill === "viewport" ? "h-dvh" : "h-full",
        className,
      )}
    >
      {header && <div className="shrink-0">{header}</div>}
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      {footer && <div className="shrink-0">{footer}</div>}
    </div>
  );
}
