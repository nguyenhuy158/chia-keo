import { cn } from "./cn";

export type PaginationProps = {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  className?: string;
};

/**
 * Sinh day trang co dau "..." khi qua nhieu trang.
 * Luon giu trang dau, trang cuoi va mot trang moi ben trang hien tai.
 */
function pageItems(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const items: (number | "gap")[] = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(pageCount - 1, page + 1);

  if (from > 2) items.push("gap");
  for (let value = from; value <= to; value += 1) items.push(value);
  if (to < pageCount - 1) items.push("gap");

  items.push(pageCount);
  return items;
}

const ITEM =
  "inline-flex h-10 min-w-10 items-center justify-center rounded-ui px-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring";

export function Pagination({ page, pageCount, onChange, className }: PaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label="Phân trang" className={cn("flex items-center justify-center gap-1", className)}>
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Trang trước"
        className={cn(ITEM, "text-fg-muted hover:bg-surface-muted disabled:opacity-40")}
      >
        ‹
      </button>

      {pageItems(page, pageCount).map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-fg-muted">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              ITEM,
              "tabular",
              item === page
                ? "bg-primary font-semibold text-primary-fg"
                : "text-fg hover:bg-surface-muted",
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Trang sau"
        className={cn(ITEM, "text-fg-muted hover:bg-surface-muted disabled:opacity-40")}
      >
        ›
      </button>
    </nav>
  );
}
