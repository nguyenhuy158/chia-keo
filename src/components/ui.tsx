import type { ReactNode } from "react";
import { formatMoney } from "../core/domain/money";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-violet-50 text-stone-950 dark:bg-stone-950 dark:text-stone-50">
      {children}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center dark:border-stone-700 dark:bg-stone-900">
      <h2 className="text-lg font-semibold text-stone-950 dark:text-stone-50">{title}</h2>
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">{description}</p>
    </div>
  );
}

export function LoadingState({ label = "Đang tải..." }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-lg border border-stone-200 bg-white p-8 dark:border-stone-800 dark:bg-stone-900">
      <p className="text-sm text-stone-500 dark:text-stone-400">{label}</p>
    </div>
  );
}

/** Khoi xam nhap nhay — vien gach cho Skeleton* ben duoi, it khi dung truc tiep. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-stone-200 dark:bg-stone-800 ${className}`}
    />
  );
}

/**
 * Khung cho mot dong trong danh sach co vien (GamesSidebar, TrashCard,
 * McpTokenPanel): tieu de + dong phu, dung hinh dang voi item that thay vi
 * chu "Đang tải..." de cam giac nhanh hon du thoi gian cho nhu nhau.
 */
export function SkeletonCard() {
  return (
    <div className="rounded-md border border-stone-200 p-3 dark:border-stone-800">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="mt-2 h-3 w-1/3" />
    </div>
  );
}

/**
 * Khung cho mot dong trong danh sach khong vien, ngan cach bang duong ke
 * (ContactBookCard, HistoryPanel). `icon` them mot khoi tron ben trai, dung
 * cho danh sach co icon nhu HistoryPanel.
 */
export function SkeletonListRow({ icon = false }: { icon?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      {icon && <Skeleton className="h-8 w-8 shrink-0 rounded-full" />}
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

/** Luoi o vuong cho anh dang tai — dung so cot voi PhotoGrid that. */
export function SkeletonPhotoGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {Array.from({ length: count }, (_unused, index) => (
        <Skeleton key={index} className="aspect-square rounded-md" />
      ))}
    </div>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">
        {label}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">{error}</span>}
    </label>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <p className="text-xs font-medium uppercase text-stone-500 dark:text-stone-400">{label}</p>
      <p className="mt-2 text-base font-semibold leading-tight text-stone-950 tabular dark:text-stone-50 sm:text-lg">
        {value}
      </p>
    </div>
  );
}

/** Cong tac bat/tat kieu iOS, dung khi checkbox trinh duyet mac dinh qua tho. */
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 text-sm text-stone-600 dark:text-stone-300"
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-violet-600" : "bg-stone-300 dark:bg-stone-700"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
      {label}
    </button>
  );
}

export function BalancePill({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 tabular dark:bg-emerald-500/15 dark:text-emerald-300">
        Nhận {formatMoney(value)}
      </span>
    );
  }

  if (value < 0) {
    return (
      <span className="shrink-0 rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 tabular dark:bg-rose-500/15 dark:text-rose-300">
        Trả {formatMoney(Math.abs(value))}
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
      Đủ
    </span>
  );
}
