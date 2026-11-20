import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "./cn";

const PAGER_BUTTON =
  "inline-flex h-11 w-11 items-center justify-center rounded-ui text-lg text-fg-muted outline-none transition hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40";

export type PagedListProps<T> = {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  rowHeight: number;
  gap?: number;
  empty?: ReactNode;
  className?: string;
};

export function PagedList<T>({
  items,
  getKey,
  renderItem,
  rowHeight,
  gap = 8,
  empty,
  className,
}: PagedListProps<T>) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyHeight, setBodyHeight] = useState(0);
  const [page, setPage] = useState(1);

  useLayoutEffect(() => {
    if (bodyRef.current) setBodyHeight(bodyRef.current.clientHeight);
  }, []);

  useEffect(() => {
    const node = bodyRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setBodyHeight(node.clientHeight));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const pageSize =
    bodyHeight > 0
      ? Math.max(1, Math.floor((bodyHeight + gap) / (rowHeight + gap)))
      : Math.max(1, items.length);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = items.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div ref={bodyRef} className="min-h-0 flex-1 overflow-hidden">
        {items.length === 0 ? (
          empty
        ) : (
          <div className="flex flex-col" style={{ gap }}>
            {visible.map((item, index) => (
              <div
                key={getKey(item)}
                className="overflow-hidden"
                style={{ height: rowHeight }}
              >
                {renderItem(item, (currentPage - 1) * pageSize + index)}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex h-12 shrink-0 items-center justify-center">
        {pageCount > 1 && (
          <nav aria-label="Phân trang" className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Trang trước"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className={PAGER_BUTTON}
            >
              ‹
            </button>
            <span
              aria-live="polite"
              className="tabular min-w-14 text-center text-sm text-fg-muted"
            >
              {currentPage}/{pageCount}
            </span>
            <button
              type="button"
              aria-label="Trang sau"
              disabled={currentPage >= pageCount}
              onClick={() => setPage(currentPage + 1)}
              className={PAGER_BUTTON}
            >
              ›
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
