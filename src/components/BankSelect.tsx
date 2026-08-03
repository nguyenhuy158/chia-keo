import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ApiBank } from "../../shared/api-types";
import { resolveVietQrBankId } from "../../shared/vietqr";

/** Bo dau tieng Viet va hoa/thuong de tim kiem khong phu thuoc cach go. */
function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

type BankSelectProps = {
  banks: ApiBank[];
  /** Ma ngan hang dang chon ("" = chua chon). */
  value: string;
  onChange: (code: string) => void;
};

/**
 * Dropdown chon ngan hang co o tim kiem: danh sach ~60 bank tu API VietQR nen
 * khong dung <select> goc (khong tim duoc, tren mobile mo picker cua OS).
 */
export function BankSelect({ banks, value, onChange }: BankSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      setSearch("");
      searchRef.current?.focus();
    }
  }, [open]);

  const filtered = useMemo(() => {
    const query = normalizeSearch(search.trim());
    if (!query) return banks;

    // Uu tien khop ma (go "VCB" ra Vietcombank truoc PVcomBank) roi moi den ten.
    function rank(bank: ApiBank) {
      const code = normalizeSearch(bank.code);
      if (code === query) return 0;
      if (code.startsWith(query)) return 1;
      if (normalizeSearch(bank.shortName).startsWith(query)) return 2;
      return 3;
    }

    return banks
      .filter((bank) =>
        [bank.code, bank.shortName, bank.name].some((field) =>
          normalizeSearch(field).includes(query),
        ),
      )
      .sort((a, b) => rank(a) - rank(b));
  }, [banks, search]);

  // So khop qua resolve de gia tri cu kieu alias (MBB) van sang dung bank (MB).
  const resolvedValue = resolveVietQrBankId(value);
  const selected = banks.find((bank) => bank.code === resolvedValue);

  function select(code: string) {
    onChange(code);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label="Mã ngân hàng"
        className="field flex items-center justify-between gap-2 text-left"
      >
        <span className={`truncate ${selected || value ? "" : "text-stone-400 dark:text-stone-500"}`}>
          {selected ? `${selected.shortName} (${selected.code})` : value || "Chọn ngân hàng"}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-stone-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          // Component thuong nam trong <label> (Field): chan hanh vi mac dinh
          // de click vao vung trong cua dropdown khong kich hoat lai nut mo.
          onClick={(event) => event.preventDefault()}
          className="absolute z-10 mt-1 w-full rounded-md border border-stone-300 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-800"
        >
          <div className="flex items-center gap-2 border-b border-stone-200 px-3 dark:border-stone-700">
            <Search size={14} className="shrink-0 text-stone-400" />
            <input
              ref={searchRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (filtered[0]) select(filtered[0].code);
                }
                if (event.key === "Escape") setOpen(false);
              }}
              placeholder="Tìm ngân hàng..."
              className="h-10 w-full min-w-0 bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400 dark:text-stone-100 dark:placeholder:text-stone-500"
            />
          </div>
          <ul className="max-h-60 overflow-auto p-1">
            {value && (
              <li>
                <button
                  type="button"
                  onClick={() => select("")}
                  className="w-full rounded px-3 py-2.5 text-left text-sm text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-700"
                >
                  Bỏ chọn ngân hàng
                </button>
              </li>
            )}
            {filtered.map((bank) => {
              const isSelected = bank.code === resolvedValue;
              return (
                <li key={bank.code}>
                  <button
                    type="button"
                    onClick={() => select(bank.code)}
                    className={`flex w-full items-center justify-between gap-2 rounded px-3 py-2.5 text-sm ${
                      isSelected
                        ? "bg-violet-50 font-semibold text-violet-800 dark:bg-violet-500/15 dark:text-violet-300"
                        : "text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-700"
                    }`}
                  >
                    <span className="min-w-0 truncate">{bank.shortName}</span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-stone-400 dark:text-stone-500">
                      {bank.code}
                      {isSelected && <Check size={14} className="text-violet-600 dark:text-violet-300" />}
                    </span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-2.5 text-sm text-stone-500 dark:text-stone-400">
                Không tìm thấy ngân hàng nào.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
