import { cn } from "./cn";

export type ImageItem = { src: string; alt: string; title?: string };

export type ImageListProps = {
  items: ImageItem[];
  /** "grid": o vuong deu nhau. "masonry": giu ti le anh, xep cot so le. */
  variant?: "grid" | "masonry";
  cols?: 2 | 3 | 4;
  onSelect?: (item: ImageItem) => void;
  className?: string;
};

const GRID_COLS = { 2: "grid-cols-2", 3: "grid-cols-2 sm:grid-cols-3", 4: "grid-cols-2 sm:grid-cols-4" };
const MASONRY_COLS = { 2: "columns-2", 3: "columns-2 sm:columns-3", 4: "columns-2 sm:columns-4" };

/**
 * Luoi anh. Masonry dung CSS `columns` thuan: khong JS do chieu cao, nhung thu tu
 * doc theo cot (tren xuong roi sang phai) thay vi theo hang.
 */
export function ImageList({ items, variant = "grid", cols = 3, onSelect, className }: ImageListProps) {
  const masonry = variant === "masonry";

  return (
    <ul className={cn(masonry ? cn("gap-2", MASONRY_COLS[cols]) : cn("grid gap-2", GRID_COLS[cols]), className)}>
      {items.map((item) => (
        <li key={item.src} className={cn("group relative overflow-hidden rounded-ui bg-surface-muted", masonry && "mb-2 break-inside-avoid")}>
          <button
            type="button"
            onClick={() => onSelect?.(item)}
            className="block w-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img
              src={item.src}
              alt={item.alt}
              loading="lazy"
              className={cn("w-full transition group-hover:scale-105", masonry ? "h-auto" : "aspect-square object-cover")}
            />
            {item.title && (
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-left text-xs font-medium text-white">
                {item.title}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
