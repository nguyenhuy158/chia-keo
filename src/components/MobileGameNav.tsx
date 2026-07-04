import { ListChecks, Plus, QrCode, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMobileShell } from "./mobile-shell";

export type GameSection = "people" | "expenses" | "summary";

const SECTIONS: { id: GameSection; label: string; icon: LucideIcon }[] = [
  { id: "people", label: "Người", icon: Users },
  { id: "expenses", label: "Chi", icon: Wallet },
  { id: "summary", label: "Tổng kết", icon: QrCode },
];

type MobileGameNavProps = {
  active: GameSection;
  onChange: (section: GameSection) => void;
};

/** Thanh dieu huong duoi man hinh cho mot cuoc choi, chi hien tren mobile. */
export function MobileGameNav({ active, onChange }: MobileGameNavProps) {
  const shell = useMobileShell();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-stone-900/95 lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">
        <button
          type="button"
          onClick={() => shell?.openGames()}
          className="flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 text-stone-500 transition active:bg-stone-100 dark:text-stone-400 dark:active:bg-stone-800"
        >
          <ListChecks size={20} />
          <span className="text-[11px] font-medium">Cuộc chơi</span>
        </button>
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
                  : "text-stone-500 dark:text-stone-400"
              }`}
            >
              <Icon size={20} />
              <span className="text-[11px] font-medium">{section.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

type ExpenseFabProps = {
  onClick: () => void;
};

/** Nut hanh dong chinh: chuyen toi phan them khoan chi, noi phia tren bottom nav. */
export function ExpenseFab({ onClick }: ExpenseFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Thêm khoản chi"
      style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
      className="fixed right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg transition hover:from-violet-700 hover:to-fuchsia-700 active:scale-95 lg:hidden"
    >
      <Plus size={26} />
    </button>
  );
}
