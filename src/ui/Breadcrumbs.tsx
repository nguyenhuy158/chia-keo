import { Fragment, type ReactNode } from "react";

export type Crumb = { label: ReactNode; href?: string; onClick?: () => void };

/** Duong dan phan cap. Muc cuoi la trang hien tai (aria-current, khong bam duoc). */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          const style = "rounded px-1 text-fg-muted transition hover:text-fg outline-none focus-visible:ring-2 focus-visible:ring-ring";
          return (
            <Fragment key={index}>
              <li className="min-w-0">
                {last ? (
                  <span aria-current="page" className="truncate px-1 font-medium text-fg">
                    {item.label}
                  </span>
                ) : item.href ? (
                  <a href={item.href} onClick={item.onClick} className={style}>
                    {item.label}
                  </a>
                ) : (
                  <button type="button" onClick={item.onClick} className={style}>
                    {item.label}
                  </button>
                )}
              </li>
              {!last && (
                <li aria-hidden="true" className="text-fg-muted/50">
                  /
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
