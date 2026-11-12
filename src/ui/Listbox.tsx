import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "./cn";
import { useDismiss } from "./use-dismiss";

export type ListboxOption = {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
};

export type ListboxProps = {
  options: ListboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
};

export function Listbox({
  options,
  value,
  onChange,
  placeholder = "Chọn...",
  disabled,
  invalid,
  className,
  id,
  name,
  required,
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
}: ListboxProps) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [missing, setMissing] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const ref = useDismiss(open, () => setOpen(false));
  const listId = useId();
  const triggerId = id ?? `${listId}-trigger`;
  const enabled = options
    .map((option, index) => (option.disabled ? -1 : index))
    .filter((index) => index >= 0);

  const activeIndex = enabled.includes(highlight)
    ? highlight
    : (enabled[0] ?? -1);

  useEffect(() => {
    if (open)
      document
        .getElementById(`${listId}-${activeIndex}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, listId]);

  const selected = options.find((option) => option.value === value);

  const show = () => {
    setHighlight(
      options.findIndex(
        (option) => option.value === value && !option.disabled,
      ) >= 0
        ? options.findIndex((option) => option.value === value)
        : (enabled[0] ?? -1),
    );
    setOpen(true);
  };

  const commit = (option: ListboxOption) => {
    if (disabled || option.disabled) return;
    onChange(option.value);
    setMissing(false);
    setOpen(false);
    trigger.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        show();
      }
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const current = enabled.indexOf(activeIndex);
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? enabled.length - 1
            : Math.max(
                0,
                Math.min(
                  enabled.length - 1,
                  current + (event.key === "ArrowDown" ? 1 : -1),
                ),
              );
      setHighlight(enabled[next] ?? -1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) commit(option);
    } else if (event.key === "Escape" || event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <select
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
        name={name}
        value={value ?? ""}
        required={required}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
          setMissing(false);
        }}
        onInvalid={(event) => {
          event.preventDefault();
          setMissing(true);
          trigger.current?.focus();
        }}
      >
        <option value="" />
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      <button
        ref={trigger}
        id={triggerId}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-describedby={
          [describedBy, missing ? `${listId}-error` : ""]
            .filter(Boolean)
            .join(" ") || undefined
        }
        aria-required={required || undefined}
        aria-activedescendant={
          open && !disabled && activeIndex >= 0
            ? `${listId}-${activeIndex}`
            : undefined
        }
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open && !disabled}
        aria-controls={open && !disabled ? listId : undefined}
        aria-invalid={invalid || missing || undefined}
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-ui border border-border bg-surface px-3 pr-9 text-left text-fg sm:h-10",
          "text-base sm:pointer-fine:text-sm",
          "outline-none transition focus:border-primary focus:ring-2 focus:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-60",
          open && "border-primary ring-2 ring-ring",
          (invalid || missing) && "border-danger",
        )}
      >
        {selected?.icon}
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            !selected && "text-fg-muted",
          )}
        >
          {selected?.label ?? placeholder}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className={cn(
            "h-4 w-4 shrink-0 text-fg-muted transition",
            open && "rotate-180",
          )}
        >
          <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {missing && (
        <p
          id={`${listId}-error`}
          role="alert"
          className="mt-1 text-sm text-danger"
        >
          Vui lòng chọn một mục.
        </p>
      )}
      {open && !disabled && (
        <div
          id={listId}
          role="listbox"
          aria-labelledby={triggerId}
          style={{ animation: "ui-slide-down 120ms ease-out" }}
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-ui border border-border bg-surface p-1 shadow-lg"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <div key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  id={`${listId}-${index}`}
                  disabled={option.disabled}
                  aria-disabled={option.disabled || undefined}
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onClick={() => commit(option)}
                  onPointerEnter={() => {
                    if (!option.disabled) setHighlight(index);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-[calc(var(--ui-radius)-4px)] min-h-11 px-2.5 py-2 text-left text-sm transition disabled:opacity-40 disabled:cursor-not-allowed",
                    index === activeIndex
                      ? "bg-surface-muted"
                      : "bg-transparent",
                    isSelected ? "font-semibold text-primary" : "text-fg",
                  )}
                >
                  {option.icon}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.description && (
                      <span className="block truncate text-xs font-normal text-fg-muted">
                        {option.description}
                      </span>
                    )}
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={cn(
                      "h-4 w-4 shrink-0",
                      !isSelected && "invisible",
                    )}
                  >
                    <path
                      d="M5 10.5l3 3 7-7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
