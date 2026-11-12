import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "./cn";

export type ComboboxOption = {
  value: string;
  label: string;
  /** Chu phu ben duoi, vi du email hoac so dien thoai. */
  description?: string;
  icon?: ReactNode;
};

export type ComboboxProps = {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Chu hien khi go khong ra ket qua nao. */
  emptyLabel?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
};

/** Bo dau tieng Viet de go "an toi" van tim ra "Ăn tối". */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    // U+0300..U+036F la day dau thanh/dau mu tach ra sau khi chuan hoa NFD.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/**
 * O chon co tim kiem. Dung khi danh sach dai qua cho <Select> (tu ~10 muc tro len).
 * Ngan hon thi <Select> van tot hon vi tren mobile no mo picker cua he dieu hanh.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Tìm và chọn...",
  emptyLabel = "Không tìm thấy",
  disabled,
  invalid,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    if (!query) return options;
    const needle = normalize(query);
    return options.filter(
      (option) =>
        normalize(option.label).includes(needle) ||
        (option.description && normalize(option.description).includes(needle)),
    );
  }, [options, query]);

  // Loc lai thi muc dang sang co the khong con ton tai, keo ve dau danh sach.
  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const commit = (option: ComboboxOption) => {
    onChange(option.value);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const delta = event.key === "ArrowDown" ? 1 : -1;
      // Chia lay du de chay vong tu cuoi ve dau va nguoc lai.
      setHighlight((current) =>
        filtered.length === 0 ? 0 : (current + delta + filtered.length) % filtered.length,
      );
      return;
    }

    if (event.key === "Enter" && open && filtered[highlight]) {
      event.preventDefault();
      commit(filtered[highlight]);
    }
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <input
        // Khi dong thi o nhap hien nhan cua muc da chon, luc mo moi cho go tim.
        value={open ? query : (selected?.label ?? "")}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        className={cn(
          "h-11 w-full rounded-ui border border-border bg-surface px-3 pr-9 text-fg sm:h-10",
          "text-base sm:pointer-fine:text-sm placeholder:text-fg-muted",
          "outline-none transition focus:border-primary focus:ring-2 focus:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-60",
          invalid && "border-danger",
        )}
      />

      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
      >
        <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {open && (
        <ul
          id={listId}
          role="listbox"
          style={{ animation: "ui-slide-down 120ms ease-out" }}
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-ui border border-border bg-surface py-1 shadow-lg"
        >
          {filtered.length === 0 && (
            <li className="px-3 py-3 text-sm text-fg-muted">{emptyLabel}</li>
          )}

          {filtered.map((option, index) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                // pointerdown chu khong phai click: click xay ra sau blur cua o
                // nhap, luc do danh sach da dong nen khong bat duoc lua chon.
                onPointerDown={(event) => {
                  event.preventDefault();
                  commit(option);
                }}
                onPointerEnter={() => setHighlight(index)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition",
                  index === highlight ? "bg-surface-muted" : "bg-transparent",
                  option.value === value ? "font-semibold text-primary" : "text-fg",
                )}
              >
                {option.icon}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{option.label}</span>
                  {option.description && (
                    <span className="block truncate text-xs text-fg-muted">
                      {option.description}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
