import { PieChart } from "lucide-react";
import type { ApiExpense } from "../../shared/api-types";
import { buildCategoryBreakdown } from "../../shared/expense-categories";
import { formatMoney } from "../core/domain/money";

/**
 * "Chi theo danh mục": thanh ngang thuan CSS, khong keo them thu vien bieu do
 * nao — mot danh sach vai dong thi `div` co `width: %` du dung va khong ton
 * them KB nao cho bundle.
 *
 * Toan bo phep gop nam o `buildCategoryBreakdown` (shared) de worker/MCP dung
 * lai duoc cung con so; o day chi ve.
 */
export function CategoryBreakdownCard({ expenses }: { expenses: ApiExpense[] }) {
  const breakdown = buildCategoryBreakdown(expenses);

  // Chua co khoan chi nao (hoac chi co khoan thu / trả nợ) thi khong hien the
  // rong lam nang trang.
  if (breakdown.rows.length === 0) return null;

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center gap-2">
        <PieChart size={18} className="text-violet-600 dark:text-violet-400" />
        <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">
          Chi theo danh mục
        </h3>
      </div>

      <ul className="mt-4 space-y-3">
        {breakdown.rows.map((row) => (
          <li key={row.category || "uncategorized"}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate text-stone-700 dark:text-stone-300">
                <span aria-hidden="true">{row.emoji}</span> {row.label}
                <span className="ml-1 text-xs text-stone-500 dark:text-stone-400">
                  ({row.count})
                </span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-stone-950 dark:text-stone-50">
                {formatMoney(row.total)}
              </span>
            </div>
            <div
              className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
              role="img"
              aria-label={`${row.label}: ${row.percent}% tổng chi`}
            >
              {/* Toi thieu 2% de nhom rat nho van nhin thay mot vet mau. */}
              <div
                className={`h-full rounded-full ${row.barClassName}`}
                style={{ width: `${Math.max(row.percent, 2)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
        Tổng {formatMoney(breakdown.total)}, không tính khoản thu và trả nợ.
      </p>
    </section>
  );
}
