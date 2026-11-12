import { cn } from "./cn";

export type TabItem<TId extends string = string> = {
  id: TId;
  label: string;
  count?: number;
};

export type TabsProps<TId extends string = string> = {
  items: TabItem<TId>[];
  active: TId;
  onChange: (id: TId) => void;
  /** "line": gach chan, hop trang noi dung. "pill": nen bo tron, hop bo loc. */
  variant?: "line" | "pill";
  className?: string;
};

export function Tabs<TId extends string = string>({
  items,
  active,
  onChange,
  variant = "line",
  className,
}: TabsProps<TId>) {
  return (
    <div
      role="tablist"
      className={cn(
        // overflow-x-auto: nhieu tab thi cuon ngang thay vi xuong dong roi vo layout.
        "flex gap-1 overflow-x-auto",
        variant === "line" && "border-b border-border",
        variant === "pill" && "rounded-ui bg-surface-muted p-1",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.id === active;

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={cn(
              "shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium outline-none transition",
              "focus-visible:ring-2 focus-visible:ring-ring",
              variant === "line" &&
                cn(
                  "-mb-px border-b-2",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-fg-muted hover:text-fg",
                ),
              variant === "pill" &&
                cn(
                  "rounded-[calc(var(--ui-radius)-0.25rem)]",
                  isActive ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
                ),
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="ml-1.5 text-xs text-fg-muted tabular">{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
