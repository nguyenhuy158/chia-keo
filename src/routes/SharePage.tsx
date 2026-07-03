import { useParams } from "@tanstack/react-router";
import { GameDashboard } from "../components/GameDashboard";
import { EmptyState, LoadingState } from "../components/ui";
import { formatMoney } from "../lib/money";
import { useShareView } from "../lib/queries";

export function SharePage() {
  const { token } = useParams({ from: "/share/$token" });
  const shareQuery = useShareView(token);

  if (shareQuery.isPending) {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 py-10">
        <LoadingState />
      </div>
    );
  }

  if (shareQuery.isError || !shareQuery.data) {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 py-10">
        <EmptyState
          title="Khong tim thay link chia se"
          description="Link khong ton tai, da bi tat hoac da het han."
        />
      </div>
    );
  }

  const view = shareQuery.data;
  const participantById = new Map(view.participants.map((participant) => [participant.id, participant]));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-5 py-10">
      <GameDashboard
        code={view.code}
        name={view.name}
        participants={view.participants}
        expenseCount={view.expenses.length}
        summary={view.summary}
        showHeader
      />

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-stone-950">Cac khoan chi</h3>
        <div className="mt-4 space-y-2">
          {view.expenses.length > 0 ? (
            view.expenses.map((expense) => {
              const payer = participantById.get(expense.payerParticipantId);
              return (
                <div key={expense.id} className="rounded-md border border-stone-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-950">{expense.title}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {payer?.name || "Khong ro"} tra, chia {expense.splitParticipantIds.length} nguoi
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-stone-950">
                      {formatMoney(expense.amount)}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-stone-500">Chua co khoan chi nao.</p>
          )}
        </div>
      </section>
    </div>
  );
}
