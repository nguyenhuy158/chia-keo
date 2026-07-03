import type { ApiParticipant, ApiSummary } from "../../shared/api-types";
import { formatMoney } from "../lib/money";
import { buildVietQrUrl, canBuildVietQr } from "../lib/vietqr";
import { BalancePill, Metric } from "./ui";

type GameDashboardProps = {
  code: string;
  name: string;
  participants: ApiParticipant[];
  expenseCount: number;
  summary: ApiSummary;
  showHeader?: boolean;
};

export function GameDashboard({
  code,
  name,
  participants,
  expenseCount,
  summary,
  showHeader = false,
}: GameDashboardProps) {
  const participantById = new Map(participants.map((participant) => [participant.id, participant]));

  return (
    <aside className="space-y-5">
      {showHeader && (
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-violet-600">{code}</p>
          <h1 className="mt-1 text-2xl font-semibold text-stone-950">{name}</h1>
        </section>
      )}

      <section className="grid grid-cols-3 gap-3">
        <Metric label="Tong chi" value={formatMoney(summary.totalExpense)} />
        <Metric label="So nguoi" value={String(participants.length)} />
        <Metric label="Khoan chi" value={String(expenseCount)} />
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-stone-950">Can bang</h3>
        <div className="mt-4 space-y-3">
          {summary.balances.length > 0 ? (
            summary.balances.map((row) => {
              const participant = participantById.get(row.participantId);
              if (!participant) return null;

              return (
                <div key={row.participantId} className="rounded-md border border-stone-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-stone-950">
                      {participant.name}
                    </p>
                    <BalancePill value={row.balance} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-500">
                    <span>Da tra: {formatMoney(row.paid)}</span>
                    <span>Phai chiu: {formatMoney(row.owed)}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-stone-500">Chua co nguoi tham gia.</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-stone-950">Chuyen khoan toi uu</h3>
        <div className="mt-4 space-y-3">
          {summary.settlements.length > 0 ? (
            summary.settlements.map((settlement) => {
              const from = participantById.get(settlement.fromParticipantId);
              const to = participantById.get(settlement.toParticipantId);
              if (!from || !to) return null;

              return (
                <div
                  key={`${settlement.fromParticipantId}-${settlement.toParticipantId}-${settlement.amount}`}
                  className="rounded-md border border-stone-200 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-950">
                        {from.name} tra {to.name}
                      </p>
                      <p className="mt-1 text-sm font-bold text-violet-700 tabular">
                        {formatMoney(settlement.amount)}
                      </p>
                    </div>
                  </div>
                  {canBuildVietQr(to) && (
                    <img
                      className="mt-3 w-full rounded-md border border-stone-200"
                      src={buildVietQrUrl(to, settlement.amount, code)}
                      alt={`QR nhan tien cua ${to.name}`}
                    />
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-stone-500">Them khoan chi de tinh tien.</p>
          )}
        </div>
      </section>
    </aside>
  );
}
