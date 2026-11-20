import { useEffect, useId, useRef, useState } from "react";
import { cn } from "./cn";
import { useDismiss } from "./use-dismiss";

export type DateString = string;
export type DateRange = { start: DateString; end: DateString };

type CommonProps = {
  min?: DateString;
  max?: DateString;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
};
export type DatePickerProps = CommonProps & {
  value?: DateString;
  onChange: (value: DateString) => void;
};
export type DateRangePickerProps = CommonProps & {
  value?: DateRange;
  onChange: (value: DateRange) => void;
};
type Props =
  | (DatePickerProps & { range?: false })
  | (DateRangePickerProps & { range: true });
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function parse(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) || toDateString(date) !== value
    ? null
    : date;
}

function toDateString(date: Date): DateString {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDate(value?: DateString): string {
  return parse(value)
    ? `${value?.slice(8, 10)}/${value?.slice(5, 7)}/${value?.slice(0, 4)}`
    : "";
}

function moveDay(value: string, days: number) {
  const date = parse(value);
  if (!date) return value;
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

function moveMonth(value: string, months: number) {
  const date = parse(value);
  if (!date) return value;
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, last));
  return toDateString(date);
}

export function DatePicker(props: DatePickerProps) {
  return <DateControl {...props} />;
}

export function DateRangePicker(props: DateRangePickerProps) {
  return <DateControl {...props} range />;
}

function DateControl(props: Props) {
  const {
    min,
    max,
    disabled,
    invalid,
    className,
    id,
    "aria-label": ariaLabel,
    "aria-describedby": describedBy,
  } = props;
  const today = toDateString(new Date());
  const bounded = (date: string) =>
    min && date < min ? min : max && date > max ? max : date;
  const allowed = (date: string) =>
    !!parse(date) && !(min && date < min) && !(max && date > max);
  const valueStart = props.range ? props.value?.start : props.value;
  const valueEnd = props.range ? props.value?.end : props.value;
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<string>();
  const [hover, setHover] = useState<string>();
  const [active, setActive] = useState(
    bounded(parse(valueStart) ? (valueStart ?? today) : today),
  );
  const [view, setView] = useState(active);
  const trigger = useRef<HTMLButtonElement>(null);
  const calendar = useRef<HTMLDivElement>(null);
  const popupId = useId();
  const ref = useDismiss(open, () => setOpen(false));
  const base = parse(view) ?? new Date();
  const year = base.getFullYear();
  const month = base.getMonth();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const total = new Date(year, month + 1, 0).getDate();
  const label = props.range ? "Chọn khoảng ngày" : "Chọn ngày";
  const display =
    props.range && valueStart && valueEnd
      ? `${formatDate(valueStart)} – ${formatDate(valueEnd)}`
      : !props.range
        ? formatDate(valueStart)
        : "";
  const first = start ?? valueStart;
  const last = start ? (hover ?? active) : valueEnd;
  const rangeStart = first && last ? (first < last ? first : last) : first;
  const rangeEnd = first && last ? (first > last ? first : last) : first;

  useEffect(() => {
    if (open && !disabled)
      calendar.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${active}"]`)
        ?.focus();
  }, [open, active, disabled]);

  function show() {
    const initial = bounded(parse(valueStart) ? (valueStart ?? today) : today);
    setActive(initial);
    setView(initial);
    setStart(undefined);
    setHover(undefined);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  function choose(date: string) {
    if (disabled || !allowed(date)) return;
    if (!props.range) {
      props.onChange(date);
      close();
    } else if (!start) {
      setStart(date);
      setActive(date);
      setHover(undefined);
    } else {
      props.onChange(
        date < start ? { start: date, end: start } : { start, end: date },
      );
      close();
    }
  }

  function navigate(date: string) {
    const next = bounded(date);
    if (!parse(next)) return;
    setActive(next);
    setView(next);
    setHover(undefined);
  }

  return (
    <div
      ref={ref}
      className={cn("relative", className)}
      onBlurCapture={(event) => {
        if (
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          setOpen(false);
      }}
    >
      <button
        ref={trigger}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-haspopup="dialog"
        aria-expanded={open && !disabled}
        aria-controls={open && !disabled ? popupId : undefined}
        aria-invalid={invalid || undefined}
        onClick={() => (open ? close() : show())}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-2 rounded-ui border border-border bg-surface px-3 py-2 text-left text-base sm:pointer-fine:text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
          invalid && "border-danger",
          display ? "text-fg" : "text-fg-muted",
        )}
      >
        <span>{display || props.placeholder || label}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="h-4 w-4 shrink-0 text-fg-muted"
        >
          <rect x="3" y="4.5" width="14" height="12" rx="2" />
          <path d="M3 8h14M7 3v3m6-3v3" strokeLinecap="round" />
        </svg>
      </button>
      {open && !disabled && (
        <div
          id={popupId}
          role="dialog"
          onKeyDown={(event) => {
            if (event.key === "Escape" && open) {
              event.stopPropagation();
              close();
            }
          }}
          aria-label={label}
          className="absolute left-0 z-50 mt-1 w-[21rem] max-sm:fixed max-sm:inset-x-2 max-sm:top-1/2 max-sm:mt-0 max-sm:w-auto max-sm:-translate-y-1/2 max-h-[70dvh] overflow-y-auto rounded-ui border border-border bg-surface p-1.5 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Tháng trước"
              disabled={
                !!min && moveMonth(view, -1).slice(0, 7) < min.slice(0, 7)
              }
              onClick={() => navigate(moveMonth(view, -1))}
              className="grid size-11 place-items-center rounded-ui text-fg-muted hover:bg-surface-muted disabled:opacity-30"
            >
              ‹
            </button>
            <span aria-live="polite" className="text-sm font-semibold text-fg">
              Tháng {month + 1} / {year}
            </span>
            <button
              type="button"
              aria-label="Tháng sau"
              disabled={
                !!max && moveMonth(view, 1).slice(0, 7) > max.slice(0, 7)
              }
              onClick={() => navigate(moveMonth(view, 1))}
              className="grid size-11 place-items-center rounded-ui text-fg-muted hover:bg-surface-muted disabled:opacity-30"
            >
              ›
            </button>
          </div>
          {props.range && (
            <p role="status" className="px-2 py-1 text-sm text-fg-muted">
              {start
                ? `Từ ${formatDate(start)} · Chọn ngày kết thúc`
                : "Chọn ngày bắt đầu"}
            </p>
          )}
          <div ref={calendar} className="grid grid-cols-7">
            {WEEKDAYS.map((day) => (
              <span
                key={day}
                className="py-2 text-center text-xs text-fg-muted"
              >
                {day}
              </span>
            ))}
            {WEEKDAYS.slice(0, offset).map((day) => (
              <span key={day} />
            ))}
            {Array.from({ length: total }, (_, index) => {
              const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
              const edge = date === rangeStart || date === rangeEnd;
              const between =
                props.range &&
                rangeStart &&
                rangeEnd &&
                date > rangeStart &&
                date < rangeEnd;
              return (
                <button
                  key={date}
                  type="button"
                  data-date={date}
                  aria-label={formatDate(date)}
                  aria-pressed={Boolean(edge || between)}
                  aria-current={date === today ? "date" : undefined}
                  disabled={!allowed(date)}
                  tabIndex={date === active ? 0 : -1}
                  onClick={() => choose(date)}
                  onKeyDown={(event) => {
                    const day = (event.target as HTMLElement).dataset.date;
                    if (!day) return;
                    const weekday = ((parse(day)?.getDay() ?? 1) + 6) % 7;
                    const steps: Record<string, number> = {
                      ArrowLeft: -1,
                      ArrowRight: 1,
                      ArrowUp: -7,
                      ArrowDown: 7,
                      Home: -weekday,
                      End: 6 - weekday,
                    };
                    if (event.key in steps) {
                      event.preventDefault();
                      navigate(moveDay(day, steps[event.key]));
                    }
                    if (event.key === "PageUp" || event.key === "PageDown") {
                      event.preventDefault();
                      navigate(moveMonth(day, event.key === "PageUp" ? -1 : 1));
                    }
                  }}
                  onPointerEnter={() => {
                    if (start && allowed(date)) setHover(date);
                  }}
                  className={cn(
                    "grid min-h-11 place-items-center rounded-ui text-sm tabular outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 disabled:cursor-not-allowed",
                    edge
                      ? "bg-primary font-semibold text-primary-fg"
                      : between
                        ? "bg-primary-soft text-primary"
                        : "text-fg hover:bg-surface-muted",
                    !edge && date === today && "font-semibold text-primary",
                  )}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={!allowed(today)}
            onClick={() => choose(today)}
            className="mt-1 min-h-11 w-full rounded-ui text-sm font-medium text-primary hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Hôm nay
          </button>
        </div>
      )}
    </div>
  );
}
