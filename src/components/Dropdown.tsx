import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type DropdownOption = { value: string; label: string };

type DropdownProps = {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  /** Chu hien khi chua chon gi. */
  placeholder?: string;
  ariaLabel?: string;
  /**
   * Hien o tim trong danh sach. Bat khi danh sach dai (ngan hang): cuon 32 muc
   * de tim "Techcombank" cham hon go ba chu cai.
   */
  searchable?: boolean;
  disabled?: boolean;
};

/** Bo dau de go "techcom" van ra "Techcombank", "sacom" ra "Sacombank". */
function foldText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Dropdown dung chung cho moi cho chon mot muc trong app.
 *
 * Khong dung <select> goc: tren mobile no mo picker cua OS, khong theo duoc
 * mau va kieu chu cua app nen nhin lech han so voi phan con lai. Truoc day
 * logic nay nam rieng trong ExpensePanel (chi chon nguoi tra); tach ra day de
 * o chon ngan hang dung lai dung mot kieu, khong phai ban thu hai.
 */
export function Dropdown({
  options,
  value,
  onChange,
  placeholder = "Chọn",
  ariaLabel,
  searchable = false,
  disabled = false,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Vi tri dang "sang" bang ban phim (khac focus DOM thuc, xem aria-activedescendant).
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const selected = options.find((option) => option.value === value);

  const visible = useMemo(() => {
    if (!searchable || query.trim() === "") return options;
    const needle = foldText(query);
    return options.filter((option) => foldText(option.label).includes(needle));
  }, [options, query, searchable]);

  const activeOptionId =
    activeIndex >= 0 && activeIndex < visible.length ? `${listId}-option-${activeIndex}` : undefined;

  // Mo ra la nham thang vao muc dang chon; go tim doi danh sach thi ve dau.
  useEffect(() => {
    if (!open) return;
    const selectedIndex = visible.findIndex((option) => option.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, visible, value]);

  useEffect(() => {
    if (!open) return;

    function onDocClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    // Tab ra khoi ca dropdown (trigger + o tim) thi dong lai, khong de danh
    // sach treo mo trong khi ban phim da roi sang phan khac cua trang.
    function onFocusOut(event: FocusEvent) {
      if (rootRef.current && !rootRef.current.contains(event.relatedTarget as Node)) {
        setOpen(false);
      }
    }

    // Esc de dong: mo dropdown roi doi y la chuyen thuong xuyen, bat nguoi
    // dung phai bam ra ngoai moi thoat thi vuong.
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => Math.min(current + 1, visible.length - 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => Math.max(current - 1, 0));
        return;
      }
      if (event.key === "Enter") {
        const option = visible[activeIndex];
        if (option) {
          event.preventDefault();
          choose(option.value);
        }
      }
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, visible, activeIndex]);

  // Mo ra la con tro nam san o o tim, khoi phai bam them mot lan nua.
  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
    // Dong bang phim (Enter/click) thi tra focus ve trigger, giong Esc — khong
    // de rơi khoi ca widget sau khi chon xong.
    triggerRef.current?.focus();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className="field flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={`truncate ${selected ? "" : "text-stone-400 dark:text-stone-500"}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-stone-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          id={listId}
          className="absolute z-20 mt-1 w-full rounded-md border border-stone-300 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-800"
        >
          {searchable && (
            <div className="flex items-center gap-2 border-b border-stone-200 px-2.5 py-2 dark:border-stone-700">
              <Search size={14} className="shrink-0 text-stone-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm..."
                aria-label="Tìm trong danh sách"
                className="w-full min-w-0 bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400 dark:text-stone-100"
              />
            </div>
          )}

          <ul className="max-h-60 overflow-auto p-1">
            {visible.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-stone-500 dark:text-stone-400">
                Không tìm thấy
              </li>
            ) : (
              visible.map((option) => {
                const isSelected = option.value === value;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      onClick={() => choose(option.value)}
                      className={`flex w-full items-center justify-between gap-2 rounded px-3 py-2.5 text-left text-sm ${
                        isSelected
                          ? "bg-violet-50 font-semibold text-violet-800 dark:bg-violet-500/15 dark:text-violet-300"
                          : "text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-700"
                      }`}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected && <Check size={14} className="shrink-0" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
