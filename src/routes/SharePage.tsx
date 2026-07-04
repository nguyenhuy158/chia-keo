import { useParams } from "@tanstack/react-router";
import { GameDashboard } from "../components/GameDashboard";
import { ThemeToggle } from "../components/theme";
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
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <GameDashboard
        code={view.code}
        name={view.name}
        participants={view.participants}
        expenseCount={view.expenses.length}
        summary={view.summary}
        showHeader
      />

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">Cac khoan chi</h3>
        <div className="mt-4 space-y-2">
          {view.expenses.length > 0 ? (
            view.expenses.map((expense) => {
              const payer = participantById.get(expense.payerParticipantId);
              return (
                <div
                  key={expense.id}
                  className="rounded-md border border-stone-200 p-3 dark:border-stone-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-950 dark:text-stone-50">
                        {expense.title}
                      </p>
                      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                        {payer?.name || "Khong ro"} tra, chia {expense.splitParticipantIds.length} nguoi
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-stone-950 tabular dark:text-stone-50">
                      {formatMoney(expense.amount)}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-stone-500 dark:text-stone-400">Chua co khoan chi nao.</p>
          )}
        </div>
      </section>
    </div>
  );
}
