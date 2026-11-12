import type { AnchorHTMLAttributes } from "react";
import { cn } from "./cn";

export type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  /** Mo tab moi kem rel an toan va icon mui ten ra ngoai. */
  external?: boolean;
};

/** The <a> mau primary, gach chan khi hover. Router link thi boc className nay vao Link cua router. */
export function Link({ external, className, children, ...rest }: LinkProps) {
  return (
    <a
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
      className={cn(
        "inline-flex items-center gap-1 rounded font-medium text-primary underline-offset-4 transition hover:underline",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...rest}
    >
      {children}
      {external && (
        <svg viewBox="0 0 20 20" aria-hidden="true" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 4H4v12h12v-4M11 4h5v5M16 4l-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </a>
  );
}
