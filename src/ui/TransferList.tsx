import { useState } from "react";
import { Checkbox } from "./Checkbox";
import { cn } from "./cn";

export type TransferItem = { value: string; label: string };

export type TransferListProps = {
  items: TransferItem[];
  /** Cac value dang o cot phai. */
  selected: string[];
  onChange: (selected: string[]) => void;
  titles?: [string, string];
  className?: string;
};

type Side = "left" | "right";

/** Hai cot, tick roi bam mui ten de chuyen qua lai. Cot phai la `selected`. */
export function TransferList({
  items,
  selected,
  onChange,
  titles = ["Có sẵn", "Đã chọn"],
  className,
}: TransferListProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const columns: Record<Side, TransferItem[]> = {
    left: items.filter((item) => !selected.includes(item.value)),
    right: items.filter((item) => selected.includes(item.value)),
  };
  const checkedOn = (side: Side) => columns[side].filter((item) => checked.has(item.value));

  const toggle = (value: string) =>
    setChecked((current) => {
      const next = new Set(current);
      if (!next.delete(value)) next.add(value);
      return next;
    });

  const move = (from: Side) => {
    const moving = checkedOn(from).map((item) => item.value);
    onChange(from === "left" ? [...selected, ...moving] : selected.filter((value) => !moving.includes(value)));
    setChecked((current) => new Set([...current].filter((value) => !moving.includes(value))));
  };

  const column = (side: Side, title: string) => {
    const list = columns[side];
    const count = checkedOn(side).length;
    return (
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-ui border border-border bg-surface">
        <div className="border-b border-border bg-surface-muted px-3">
          <Checkbox
            label={`${title} (${count}/${list.length})`}
            checked={list.length > 0 && count === list.length}
            indeterminate={count > 0 && count < list.length}
            disabled={list.length === 0}
            onChange={() =>
              setChecked((current) => {
                const next = new Set(current);
                for (const item of list) {
                  if (count === list.length) next.delete(item.value);
                  else next.add(item.value);
                }
                return next;
              })
            }
          />
        </div>
        <div className="h-48 overflow-y-auto px-3">
          {list.length === 0 && <p className="py-6 text-center text-sm text-fg-muted">Trống</p>}
          {list.map((item) => (
            <Checkbox
              key={item.value}
              label={item.label}
              checked={checked.has(item.value)}
              onChange={() => toggle(item.value)}
            />
          ))}
        </div>
      </div>
    );
  };

  const arrow = (from: Side, label: string, path: string) => (
    <button
      type="button"
      aria-label={label}
      disabled={checkedOn(from).length === 0}
      onClick={() => move(from)}
      className="grid size-9 place-items-center rounded-ui border border-border bg-surface text-fg transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
    >
      <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4 max-sm:rotate-90" fill="none" stroke="currentColor" strokeWidth="2">
        <path d={path} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );

  return (
    <div className={cn("flex flex-col items-stretch gap-3 sm:flex-row sm:items-center", className)}>
      {column("left", titles[0])}
      <div className="flex justify-center gap-2 sm:flex-col">
        {arrow("left", "Chuyển sang phải", "M7 4l6 6-6 6")}
        {arrow("right", "Chuyển sang trái", "M13 4l-6 6 6 6")}
      </div>
      {column("right", titles[1])}
    </div>
  );
}
