import type { LucideIcon } from "lucide-react";
import { LayoutGrid, QrCode, Users, Wallet } from "lucide-react";

export type GameSection = "people" | "expenses" | "more" | "summary";

const SECTIONS: { id: GameSection; label: string; icon: LucideIcon }[] = [
  { id: "people", label: "Người", icon: Users },
  { id: "expenses", label: "Chi", icon: Wallet },
  { id: "summary", label: "Tổng kết", icon: QrCode },
  { id: "more", label: "Khác", icon: LayoutGrid },
];

type MobileGameNavProps = {
  active: GameSection;
  onChange: (section: GameSection) => void;
};

/** Thanh dieu huong duoi man hinh cho mot cuoc choi, chi hien tren mobile. */
export function MobileGameNav({ active, onChange }: MobileGameNavProps) {
  return (
    <nav className="safe-bottom shrink-0 border-t border-border bg-surface/95 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = section.id === active;
          return (
            <button
              key={section.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onChange(section.id)}
              className={`flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 transition active:bg-stone-100 dark:active:bg-stone-800 ${
                isActive
                  ? "text-violet-600 dark:text-violet-400"
                  : "text-fg-muted"
              }`}
            >
              <Icon size={20} />
              <span className="whitespace-nowrap text-[11px] font-medium">
                {section.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
