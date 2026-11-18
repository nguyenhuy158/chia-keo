import type {
  HTMLInputTypeAttribute,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useLayoutEffect, useRef } from "react";
import { autosizeTextarea } from "../dom/textarea.mjs";
import { cn } from "./cn";

/* 16px la nguong iOS Safari khong tu zoom khi focus. Chi ha xuong 14px tu sm
   tro len va khi co chuot that (iPad rong hon 640px van bi zoom). */
const CONTROL = cn(
  "w-full rounded-ui border border-border bg-surface text-fg",
  "text-base sm:pointer-fine:text-sm",
  "placeholder:text-fg-muted",
  "outline-none transition focus:border-primary focus:ring-2 focus:ring-ring",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/30",
);

const HEIGHT = "h-11 px-3 sm:h-10";

type KeyboardHints = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  | "inputMode"
  | "autoComplete"
  | "autoCapitalize"
  | "spellCheck"
  | "enterKeyHint"
>;

const NO_AUTOCORRECT: KeyboardHints = {
  autoCapitalize: "none",
  spellCheck: false,
};

const KEYBOARD_BY_TYPE: Partial<Record<HTMLInputTypeAttribute, KeyboardHints>> =
  {
    email: { ...NO_AUTOCORRECT, inputMode: "email", autoComplete: "email" },
    tel: { inputMode: "tel", autoComplete: "tel" },
    url: { ...NO_AUTOCORRECT, inputMode: "url", autoComplete: "url" },
    search: { inputMode: "search", enterKeyHint: "search" },
    number: { inputMode: "decimal" },
    password: NO_AUTOCORRECT,
  };

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  // Ten `leading`/`trailing` chu khong phai `prefix`/`suffix`: hai cai sau la
  // thuoc tinh HTML that va da co kieu string, dat de len se sai kieu.
  /** Icon hoac chu dat trong o, ben trai (vi du: bieu tuong tim kiem). */
  leading?: ReactNode;
  /** Icon hoac chu dat trong o, ben phai (vi du: don vi "d"). */
  trailing?: ReactNode;
  invalid?: boolean;
};

export function Input({
  leading,
  trailing,
  invalid,
  className,
  ...rest
}: InputProps) {
  const input = (
    <input
      {...(rest.type && KEYBOARD_BY_TYPE[rest.type])}
      aria-invalid={invalid || undefined}
      className={cn(
        CONTROL,
        HEIGHT,
        leading && "ps-10",
        trailing && "pe-10",
        className,
      )}
      {...rest}
    />
  );

  if (!leading && !trailing) return input;

  return (
    <div className="relative">
      {leading && (
        <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-fg-muted">
          {leading}
        </span>
      )}
      {input}
      {trailing && (
        <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-fg-muted">
          {trailing}
        </span>
      )}
    </div>
  );
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  autoSize?: boolean;
  invalid?: boolean;
};

export function Textarea({
  autoSize = false,
  invalid,
  className,
  rows = 3,
  ...rest
}: TextareaProps) {
  const element = useRef<HTMLTextAreaElement>(null);
  const sizing = useRef<ReturnType<typeof autosizeTextarea> | null>(null);
  useLayoutEffect(() => {
    if (!autoSize || !element.current) return;
    const controller = autosizeTextarea(element.current);
    sizing.current = controller;
    return () => {
      controller.destroy();
      sizing.current = null;
    };
  }, [autoSize]);
  useLayoutEffect(() => {
    sizing.current?.resize();
  });
  return (
    <textarea
      ref={element}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(CONTROL, "px-3 py-2.5 resize-y", className)}
      {...rest}
    />
  );
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

/** Select gan nguyen ban: tren mobile picker cua he dieu hanh van la thu tot nhat. */
export function Select({ invalid, className, children, ...rest }: SelectProps) {
  return (
    <div className="relative">
      <select
        aria-invalid={invalid || undefined}
        className={cn(CONTROL, HEIGHT, "appearance-none pe-9", className)}
        {...rest}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
