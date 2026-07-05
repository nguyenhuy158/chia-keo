import { useParams } from "@tanstack/react-router";
import { Check, ListChecks, Square, Table2 } from "lucide-react";
import { useState } from "react";
import type { ApiExpense, ApiParticipant, ApiSummary } from "../../shared/api-types";
import { GameDashboard } from "../components/GameDashboard";
import { ThemeToggle } from "../components/theme";
import { EmptyState, LoadingState } from "../components/ui";
import { formatMoney } from "../lib/money";
import { useShareView } from "../lib/queries";

type ShareTab = "summary" | "matrix";

type ExpenseMatrixProps = {
  participants: ApiParticipant[];
  expenses: ApiExpense[];
  summary: ApiSummary;
};

const MATRIX_MIN_WIDTH = 920;
const STICKY_DESCRIPTION_WIDTH = 220;
const STICKY_TOTAL_WIDTH = 96;
const STICKY_COUNT_WIDTH = 68;
const STICKY_SHARE_WIDTH = 86;

function formatPlainMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);
}

function ExpenseMatrix({ participants, expenses, summary }: ExpenseMatrixProps) {
  const balanceByParticipantId = new Map(
    summary.balances.map((balance) => [balance.participantId, balance]),
  );

  return (
    <section className="min-h-0 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-3 py-3 dark:border-stone-800">
        <div>
          <h2 className="text-sm font-semibold text-stone-950 dark:text-stone-50">Bang chia</h2>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Tick vang la nguoi tham gia khoan chi.
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-stone-500 tabular dark:text-stone-400">
          {expenses.length} khoan
        </span>
      </div>

      <div className="max-h-[calc(100vh-13rem)] overflow-auto">
        <table
          className="w-full border-separate border-spacing-0 text-left text-sm"
          style={{ minWidth: Math.max(MATRIX_MIN_WIDTH, 560 + participants.length * 112) }}
        >
          <thead>
            <tr className="bg-stone-50 text-stone-950 dark:bg-stone-950 dark:text-stone-50">
              <th
                className="sticky left-0 top-0 z-30 border-b border-r border-dashed border-stone-300 bg-stone-50 px-3 py-3 font-semibold dark:border-stone-700 dark:bg-stone-950"
                style={{ width: STICKY_DESCRIPTION_WIDTH, minWidth: STICKY_DESCRIPTION_WIDTH }}
              >
                Noi dung
              </th>
              <th
                className="sticky top-0 z-20 border-b border-r border-dashed border-stone-300 bg-stone-50 px-2 py-3 text-right font-semibold dark:border-stone-700 dark:bg-stone-950"
                style={{
                  left: STICKY_DESCRIPTION_WIDTH,
                  width: STICKY_TOTAL_WIDTH,
                  minWidth: STICKY_TOTAL_WIDTH,
                }}
              >
                Tong chi
              </th>
              <th
                className="sticky top-0 z-20 border-b border-r border-dashed border-stone-300 bg-stone-50 px-2 py-3 text-right font-semibold dark:border-stone-700 dark:bg-stone-950"
                style={{
                  left: STICKY_DESCRIPTION_WIDTH + STICKY_TOTAL_WIDTH,
                  width: STICKY_COUNT_WIDTH,
                  minWidth: STICKY_COUNT_WIDTH,
                }}
              >
                Nguoi
              </th>
              <th
                className="sticky top-0 z-20 border-b border-r border-dashed border-stone-300 bg-stone-50 px-2 py-3 text-right font-semibold dark:border-stone-700 dark:bg-stone-950"
                style={{
                  left: STICKY_DESCRIPTION_WIDTH + STICKY_TOTAL_WIDTH + STICKY_COUNT_WIDTH,
                  width: STICKY_SHARE_WIDTH,
                  minWidth: STICKY_SHARE_WIDTH,
                }}
              >
                /nguoi
              </th>
              {participants.map((participant) => {
                const balance = balanceByParticipantId.get(participant.id);
                return (
                  <th
                    key={participant.id}
                    className="sticky top-0 z-10 border-b border-r border-dashed border-stone-300 bg-stone-50 px-3 py-2 text-center font-semibold dark:border-stone-700 dark:bg-stone-950"
                    style={{ minWidth: 112 }}
                  >
                    <span className="block truncate">{participant.name}</span>
                    <span className="mt-1 block text-xs font-medium text-stone-500 tabular dark:text-stone-400">
                      {formatMoney(balance?.owed || 0)}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => {
              const splitParticipantIds = new Set(expense.splitParticipantIds);
              const splitCount = expense.splitParticipantIds.length;
              const shareAmount = splitCount > 0 ? Math.round(expense.amount / splitCount) : 0;

              return (
                <tr key={expense.id}>
                  <td
                    className="sticky left-0 z-20 max-w-0 border-b border-r border-dashed border-stone-300 bg-white px-3 py-2 font-medium text-stone-950 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
                    style={{ width: STICKY_DESCRIPTION_WIDTH, minWidth: STICKY_DESCRIPTION_WIDTH }}
                  >
                    <span className="block truncate">{expense.title}</span>
                  </td>
                  <td
                    className="sticky z-10 border-b border-r border-dashed border-stone-300 bg-white px-2 py-2 text-right text-stone-950 tabular dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
                    style={{
                      left: STICKY_DESCRIPTION_WIDTH,
                      width: STICKY_TOTAL_WIDTH,
                      minWidth: STICKY_TOTAL_WIDTH,
                    }}
                  >
                    {formatPlainMoney(expense.amount)}
                  </td>
                  <td
                    className="sticky z-10 border-b border-r border-dashed border-stone-300 bg-white px-2 py-2 text-right text-stone-950 tabular dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
                    style={{
                      left: STICKY_DESCRIPTION_WIDTH + STICKY_TOTAL_WIDTH,
                      width: STICKY_COUNT_WIDTH,
                      minWidth: STICKY_COUNT_WIDTH,
                    }}
                  >
                    {splitCount}
                  </td>
                  <td
                    className="sticky z-10 border-b border-r border-dashed border-stone-300 bg-white px-2 py-2 text-right text-stone-950 tabular dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
                    style={{
                      left: STICKY_DESCRIPTION_WIDTH + STICKY_TOTAL_WIDTH + STICKY_COUNT_WIDTH,
                      width: STICKY_SHARE_WIDTH,
                      minWidth: STICKY_SHARE_WIDTH,
                    }}
                  >
                    {formatPlainMoney(shareAmount)}
                  </td>
                  {participants.map((participant) => {
                    const isIncluded = splitParticipantIds.has(participant.id);
                    return (
                      <td
                        key={participant.id}
                        className={`border-b border-r border-dashed border-stone-300 px-3 py-2 text-center dark:border-stone-700 ${
                          isIncluded
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                        }`}
                      >
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md">
                          {isIncluded ? <Check size={24} /> : <Square size={24} />}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SharePage() {
  const { token } = useParams({ from: "/share/$token" });
  const shareQuery = useShareView(token);
  const [activeTab, setActiveTab] = useState<ShareTab>("summary");

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
  const tabs: Array<{ id: ShareTab; label: string; icon: typeof ListChecks }> = [
    { id: "summary", label: "Tong ket", icon: ListChecks },
    { id: "matrix", label: "Bang chia", icon: Table2 },
  ];

  return (
    <div className="mx-auto flex h-screen w-full max-w-6xl flex-col gap-4 overflow-hidden px-4 py-4 sm:px-5">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-violet-600 dark:text-violet-400">{view.code}</p>
          <h1 className="truncate text-xl font-semibold text-stone-950 dark:text-stone-50">
            {view.name}
          </h1>
        </div>
        <ThemeToggle />
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 rounded-lg bg-stone-100 p-1 dark:bg-stone-900">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-white text-violet-700 shadow-sm dark:bg-stone-800 dark:text-violet-300"
                  : "text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-100"
              }`}
            >
              <Icon size={17} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {activeTab === "summary" ? (
          <div className="mx-auto max-w-2xl space-y-5 pb-4">
            <GameDashboard
              code={view.code}
              name={view.name}
              participants={view.participants}
              expenseCount={view.expenses.length}
              summary={view.summary}
            />

            <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
              <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">
                Cac khoan chi
              </h3>
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
                              {payer?.name || "Khong ro"} tra, chia{" "}
                              {expense.splitParticipantIds.length} nguoi
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
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Chua co khoan chi nao.
                  </p>
                )}
              </div>
            </section>
          </div>
        ) : (
          <ExpenseMatrix
            participants={view.participants}
            expenses={view.expenses}
            summary={view.summary}
          />
        )}
      </div>
    </div>
  );
}
