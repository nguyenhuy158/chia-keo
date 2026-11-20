import { ChevronDown, UsersRound } from "lucide-react";
import { useState } from "react";
import type { ApiExpense, ApiParticipant } from "../../../shared/api-types";
import { buildPayerBreakdown } from "../../../shared/payer-breakdown";
import { formatMoney } from "../core/domain/money";

const MIN_BAR_PERCENT = 2;

/**
 * "Ai đã trả": mỗi người một dòng (số khoản, tổng tiền), bấm để xem từng khoản
 * người đó đã trả. Phép gom nằm ở `buildPayerBreakdown` (shared).
 */
export function PayerBreakdownCard({
  expenses,
  participants,
}: {
  expenses: ApiExpense[];
  participants: ApiParticipant[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const breakdown = buildPayerBreakdown(expenses, participants);

  if (breakdown.rows.length === 0) return null;

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <UsersRound
          size={18}
          className="text-violet-600 dark:text-violet-400"
        />
        <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">
          Ai đã trả
        </h3>
      </div>

      <ul className="mt-4 space-y-3">
        {breakdown.rows.map((row) => {
          const open = openId === row.participantId;
          return (
            <li key={row.participantId}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : row.participantId)}
                className="w-full text-left"
              >
                <span className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-1 text-stone-700 dark:text-stone-300">
                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                      className={open ? "rotate-180 transition" : "transition"}
                    />
                    <span className="truncate">{row.name}</span>
                    <span className="shrink-0 text-xs text-fg-muted">
                      ({row.count} khoản)
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-stone-950 dark:text-stone-50">
                    {formatMoney(row.total)}
                  </span>
                </span>
                <span
                  className="mt-1 block h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
                  role="img"
                  aria-label={`${row.name}: ${row.percent}% tổng chi`}
                >
                  <span
                    className="block h-full rounded-full bg-violet-500"
                    style={{
                      width: `${Math.max(row.percent, MIN_BAR_PERCENT)}%`,
                    }}
                  />
                </span>
              </button>

              {open && (
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto overscroll-contain rounded-md bg-surface-muted p-2 text-sm">
                  {row.expenses.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-baseline justify-between gap-2"
                    >
                      <span className="min-w-0 truncate text-stone-700 dark:text-stone-300">
                        {item.title}
                      </span>
                      <span className="shrink-0 tabular-nums text-stone-950 dark:text-stone-50">
                        {formatMoney(item.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs text-fg-muted">
        {breakdown.count} khoản chi, tổng {formatMoney(breakdown.total)}. Không
        tính khoản thu và trả nợ.
      </p>
    </section>
  );
}
