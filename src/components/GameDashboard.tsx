import { HandCoins, Trash2 } from "lucide-react";
import type { ApiExpense, ApiParticipant, ApiSummary } from "../../shared/api-types";
import type { SettlementRow } from "../../shared/split";
import { formatMoney } from "../lib/money";
import { buildVietQrUrl, canBuildVietQr } from "../lib/vietqr";
import { BalancePill, Metric } from "./ui";

type GameDashboardProps = {
  code: string;
  name: string;
  participants: ApiParticipant[];
  expenseCount: number;
  summary: ApiSummary;
  /** Cac khoan cua game; dung de liet ke lich su tra no (kind "transfer"). */
  expenses?: ApiExpense[];
  showHeader?: boolean;
  /** Co mat thi moi dong chuyen khoan toi uu co nut ghi nhan da tra. */
  onSettle?: (settlement: SettlementRow) => void;
  onRemoveTransfer?: (expenseId: string) => void;
  settlePending?: boolean;
};

export function GameDashboard({
  code,
  name,
  participants,
  expenseCount,
  summary,
  expenses = [],
  showHeader = false,
  onSettle,
  onRemoveTransfer,
  settlePending = false,
}: GameDashboardProps) {
  const participantById = new Map(participants.map((participant) => [participant.id, participant]));
  const transfers = expenses.filter((expense) => expense.kind === "transfer");

  return (
    <aside className="space-y-5">
      {showHeader && (
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <p className="text-sm font-medium text-violet-600 dark:text-violet-400">{code}</p>
          <h1 className="mt-1 text-2xl font-semibold text-stone-950 dark:text-stone-50">{name}</h1>
        </section>
      )}

      <section className="grid grid-cols-3 gap-3">
        <Metric label="Tổng chi" value={formatMoney(summary.totalExpense)} />
        <Metric label="Số người" value={String(participants.length)} />
        <Metric label="Khoản chi" value={String(expenseCount)} />
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">Cân bằng</h3>
        <div className="mt-4 space-y-3">
          {summary.balances.length > 0 ? (
            summary.balances.map((row) => {
              const participant = participantById.get(row.participantId);
              if (!participant) return null;

              return (
                <div
                  key={row.participantId}
                  className="rounded-md border border-stone-200 p-3 dark:border-stone-800"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-stone-950 dark:text-stone-50">
                      {participant.name}
                    </p>
                    <BalancePill value={row.balance} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-500 dark:text-stone-400">
                    <span>Đã trả: {formatMoney(row.paid)}</span>
                    <span>Phải chịu: {formatMoney(row.owed)}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-stone-500 dark:text-stone-400">Chưa có người tham gia.</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">
          Chuyển khoản tối ưu
        </h3>
        <div className="mt-4 space-y-3">
          {summary.settlements.length > 0 ? (
            summary.settlements.map((settlement) => {
              const from = participantById.get(settlement.fromParticipantId);
              const to = participantById.get(settlement.toParticipantId);
              if (!from || !to) return null;

              return (
                <div
                  key={`${settlement.fromParticipantId}-${settlement.toParticipantId}-${settlement.amount}`}
                  className="rounded-md border border-stone-200 p-3 dark:border-stone-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-950 dark:text-stone-50">
                        {from.name} trả {to.name}
                      </p>
                      <p className="mt-1 text-sm font-bold text-violet-700 tabular dark:text-violet-400">
                        {formatMoney(settlement.amount)}
                      </p>
                    </div>
                    {onSettle && (
                      <button
                        type="button"
                        onClick={() => onSettle(settlement)}
                        disabled={settlePending}
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                        title="Ghi nhận khoản này đã được chuyển"
                      >
                        <HandCoins size={14} />
                        Đã trả
                      </button>
                    )}
                  </div>
                  {canBuildVietQr(to) && (
                    <img
                      className="mt-3 w-full rounded-md border border-stone-200 bg-white dark:border-stone-700"
                      src={buildVietQrUrl(to, settlement.amount, code)}
                      alt={`QR nhận tiền của ${to.name}`}
                    />
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {transfers.length > 0
                ? "Mọi người đã cân bằng, không còn ai nợ ai."
                : "Thêm khoản chi để tính tiền."}
            </p>
          )}
        </div>
      </section>

      {transfers.length > 0 && (
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">Đã trả nợ</h3>
          <div className="mt-4 space-y-2">
            {transfers.map((transfer) => {
              const from = participantById.get(transfer.payerParticipantId);
              const to = participantById.get(transfer.splits[0]?.participantId || "");

              return (
                <div
                  key={transfer.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-stone-200 p-3 dark:border-stone-800"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-950 dark:text-stone-50">
                      {from?.name || "Không rõ"} đã trả {to?.name || "Không rõ"}
                    </p>
                    {transfer.note && (
                      <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">
                        {transfer.note}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-sm font-semibold text-emerald-700 tabular dark:text-emerald-400">
                      {formatMoney(transfer.amount)}
                    </span>
                    {onRemoveTransfer && (
                      <button
                        type="button"
                        onClick={() => onRemoveTransfer(transfer.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-rose-600 transition hover:bg-rose-50 active:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:active:bg-rose-500/20"
                        aria-label="Xóa khoản trả nợ"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </aside>
  );
}
