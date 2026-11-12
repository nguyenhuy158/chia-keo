import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";
import { useOverlay } from "./use-overlay";

export type Command = {
  id: string;
  label: string;
  /** Gom nhom trong danh sach, vi du "Điều hướng", "Hành động". */
  group?: string;
  icon?: ReactNode;
  /** Phim tat hien ben phai, chi de hien thi. */
  shortcut?: string;
  /** Tu khoa phu de tim ra lenh nay du ten khong chua chu do. */
  keywords?: string;
  onRun: () => void;
};

/** Bo dau tieng Viet de go khong dau van tim duoc. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    // U+0300..U+036F la day dau thanh tach ra sau khi chuan hoa NFD.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/**
 * Bat Ctrl+K (hoac Cmd+K tren Mac) de mo bang lenh.
 * Tra ve [open, setOpen] de tu dieu khien them cho nut bam.
 */
export function useCommandPalette(): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        // Chan mac dinh: Ctrl+K cua trinh duyet nhay vao thanh dia chi.
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return [open, setOpen];
}

export type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  commands: Command[];
  placeholder?: string;
  emptyLabel?: string;
};

export function CommandPalette({
  open,
  onClose,
  commands,
  placeholder = "Gõ để tìm lệnh...",
  emptyLabel = "Không có lệnh nào khớp",
}: CommandPaletteProps) {
  const overlayRef = useOverlay(open, onClose);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const filtered = useMemo(() => {
    if (!query) return commands;
    const needle = normalize(query);
    return commands.filter((command) =>
      normalize(`${command.label} ${command.group ?? ""} ${command.keywords ?? ""}`).includes(needle),
    );
  }, [commands, query]);

  // Mo lai thi xoa chu cu, dua con tro vao o nhap.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHighlight(0);
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  if (!open) return null;

  const run = (command: Command) => {
    onClose();
    command.onRun();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setHighlight((current) =>
        filtered.length === 0 ? 0 : (current + delta + filtered.length) % filtered.length,
      );
      return;
    }

    if (event.key === "Enter" && filtered[highlight]) {
      event.preventDefault();
      run(filtered[highlight]);
    }
  };

  // Gom theo nhom nhung van giu thu tu phang de mui ten len/xuong chay dung.
  let flatIndex = -1;
  const groups = filtered.reduce<Record<string, Command[]>>((acc, command) => {
    const key = command.group ?? "";
    (acc[key] ??= []).push(command);
    return acc;
  }, {});

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]"
      style={{ animation: "ui-fade-in 150ms ease-out" }}
    >
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

      <div
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-label="Bảng lệnh"
        tabIndex={-1}
        style={{ animation: "ui-zoom-in 160ms ease-out" }}
        className="relative flex max-h-[70dvh] w-full max-w-lg flex-col overflow-hidden rounded-ui bg-surface shadow-xl outline-none"
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4 shrink-0 text-fg-muted">
            <circle cx="9" cy="9" r="5.5" />
            <path d="M13 13l4 4" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            role="combobox"
            aria-expanded
            aria-autocomplete="list"
            className="h-12 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-muted"
          />
        </div>

        <div role="listbox" className="min-h-0 flex-1 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-fg-muted">{emptyLabel}</p>
          )}

          {Object.entries(groups).map(([group, items]) => (
            <div key={group || "khac"}>
              {group && (
                <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
                  {group}
                </p>
              )}

              {items.map((command) => {
                flatIndex += 1;
                const index = flatIndex;

                return (
                  <button
                    key={command.id}
                    type="button"
                    role="option"
                    aria-selected={index === highlight}
                    onPointerEnter={() => setHighlight(index)}
                    onClick={() => run(command)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-ui px-2 py-2.5 text-left text-sm transition",
                      index === highlight ? "bg-surface-muted text-fg" : "text-fg",
                    )}
                  >
                    {command.icon}
                    <span className="min-w-0 flex-1 truncate">{command.label}</span>
                    {command.shortcut && (
                      <kbd className="rounded border border-border px-1.5 py-0.5 text-[11px] text-fg-muted">
                        {command.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
