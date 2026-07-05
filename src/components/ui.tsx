import type { ReactNode } from "react";
import { formatMoney } from "../lib/money";

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
      <p className="mt-2 truncate text-lg font-semibold text-stone-950 tabular dark:text-stone-50">
        {value}
      </p>
    </div>
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
