import type { ReactNode } from "react";
import { formatMoney } from "../lib/money";

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-violet-50 text-stone-950">{children}</div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center">
      <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
      <p className="mt-2 text-sm text-stone-500">{description}</p>
    </div>
  );
}

export function LoadingState({ label = "Dang tai..." }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-lg border border-stone-200 bg-white p-8">
      <p className="text-sm text-stone-500">{label}</p>
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
      <span className="mb-2 block text-sm font-medium text-stone-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-medium uppercase text-stone-500">{label}</p>
      <p className="mt-2 truncate text-lg font-semibold text-stone-950 tabular">{value}</p>
    </div>
  );
}

export function BalancePill({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 tabular">
        Nhan {formatMoney(value)}
      </span>
    );
  }

  if (value < 0) {
    return (
      <span className="shrink-0 rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 tabular">
        Tra {formatMoney(Math.abs(value))}
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">
      Du
    </span>
  );
}
