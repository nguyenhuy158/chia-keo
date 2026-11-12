import { useState, type ReactNode } from "react";
import { cn } from "./cn";

export type AccordionItem = {
  id: string;
  title: ReactNode;
  content: ReactNode;
};

export type AccordionProps = {
  items: AccordionItem[];
  /** Mo san nhung muc nay lan dau. */
  defaultOpen?: string[];
  /** Chi cho mo mot muc mot luc. */
  single?: boolean;
  className?: string;
};

export function Accordion({ items, defaultOpen = [], single = false, className }: AccordionProps) {
  const [open, setOpen] = useState<string[]>(defaultOpen);

  const toggle = (id: string) => {
    setOpen((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      return single ? [id] : [...current, id];
    });
  };

  return (
    <div className={cn("divide-y divide-border rounded-ui border border-border bg-surface", className)}>
      {items.map((item) => {
        const isOpen = open.includes(item.id);

        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-medium text-fg outline-none transition",
                "hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              )}
            >
              {item.title}
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className={cn(
                  "h-4 w-4 shrink-0 text-fg-muted transition-transform",
                  isOpen && "rotate-180",
                )}
              >
                <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Thao han khoi DOM khi dong, khong chi an di: tranh Tab lac vao
                phan dang an va tranh render thua noi dung nang. */}
            {isOpen && <div className="px-4 pb-4 text-sm text-fg-muted">{item.content}</div>}
          </div>
        );
      })}
    </div>
  );
}
