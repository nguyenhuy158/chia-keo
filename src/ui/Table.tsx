import { useState, type ReactNode } from "react";
import { cn } from "./cn";

export type Column<TRow> = {
  key: string;
  header: ReactNode;
  /** Lay noi dung o tu mot dong du lieu. */
  cell: (row: TRow) => ReactNode;
  align?: "left" | "right";
  /** So lieu: canh phai + font thang cot. */
  numeric?: boolean;
  /** An cot nay tren mobile, chi hien tu sm tro len. */
  hideOnMobile?: boolean;
  /** Co thi header bam duoc de sap xep theo gia tri nay. */
  sortValue?: (row: TRow) => string | number;
};

type Sort = { key: string; dir: "asc" | "desc" } | null;

const collator = new Intl.Collator("vi", { numeric: true });
function SortIcon({ dir }: { dir?: "asc" | "desc" }) {
  return (
    <svg viewBox="0 0 10 14" aria-hidden="true" className="h-3 w-2.5 shrink-0">
      <path d="M5 1 9 5H1z" className={dir === "asc" ? "fill-fg" : "fill-fg-muted/40"} />
      <path d="M5 13 1 9h8z" className={dir === "desc" ? "fill-fg" : "fill-fg-muted/40"} />
    </svg>
  );
}

export type TableProps<TRow> = {
  columns: Column<TRow>[];
  rows: TRow[];
  rowKey: (row: TRow) => string;
  onRowClick?: (row: TRow) => void;
  /** Hien khi rows rong. Thuong truyen <EmptyState />. */
  empty?: ReactNode;
  className?: string;
};

/**
 * Bang du lieu. Cuon ngang khi khong du cho thay vi ep chu xuong dong; header
 * dinh tren cung khi cuon trong khung co chieu cao co dinh. Cot co `sortValue`
 * bam header de sap xep: tang -> giam -> bo sap xep.
 * Muon dep tren mobile that su thi nen doi sang danh sach the (card list) o
 * breakpoint nho, bang chi hop khi so cot it hoac man hinh rong.
 */
export function Table<TRow>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty,
  className,
}: TableProps<TRow>) {
  const [sort, setSort] = useState<Sort>(null);

  if (rows.length === 0 && empty) return <>{empty}</>;

  const sortColumn = sort && columns.find((column) => column.key === sort.key);
  const sortValue = sortColumn?.sortValue;
  const sorted = sort && sortValue
    ? [...rows].sort((rowA, rowB) => {
        const a = sortValue(rowA);
        const b = sortValue(rowB);
        const result =
          typeof a === "number" && typeof b === "number" ? a - b : collator.compare(String(a), String(b));
        return sort.dir === "asc" ? result : -result;
      })
    : rows;

  const toggleSort = (key: string) =>
    setSort((current) =>
      current?.key !== key ? { key, dir: "asc" } : current.dir === "asc" ? { key, dir: "desc" } : null,
    );

  return (
    <div className={cn("overflow-x-auto rounded-ui border border-border", className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted">
            {columns.map((column) => {
              const right = column.numeric || column.align === "right";
              const dir = sort?.key === column.key ? sort.dir : undefined;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={dir ? (dir === "asc" ? "ascending" : "descending") : undefined}
                  className={cn(
                    "sticky top-0 z-10 bg-surface-muted px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-fg-muted",
                    right ? "text-right" : "text-left",
                    column.hideOnMobile && "hidden sm:table-cell",
                  )}
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5 uppercase tracking-wide hover:text-fg",
                        right && "flex-row-reverse",
                        dir && "text-fg",
                      )}
                    >
                      {column.header}
                      <SortIcon dir={dir} />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody className="divide-y divide-border">
          {sorted.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "bg-surface",
                onRowClick && "cursor-pointer transition hover:bg-surface-muted",
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "px-3 py-3 text-fg",
                    column.numeric && "tabular",
                    column.numeric || column.align === "right" ? "text-right" : "text-left",
                    column.hideOnMobile && "hidden sm:table-cell",
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
