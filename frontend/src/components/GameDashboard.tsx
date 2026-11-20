import { ChevronRight, Copy, HandCoins, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type {
  ApiExpense,
  ApiParticipant,
  ApiSummary,
} from "../../../shared/api-types";
import { buildPaymentReminder } from "../../../shared/payment-reminder";
import type { SettlementMode } from "../../../shared/schemas";
import {
  calculateHostTransfers,
  displayBalance,
  resolveHostParticipantId,
  type SettlementRow,
} from "../../../shared/split";
import { copyText } from "../adapters/browser/clipboard";
import { usePreferences } from "../adapters/react-query/queries";
import { getQrProvider } from "../core/container";
import { formatMoney } from "../core/domain/money";
import { PagedList } from "../ui/PagedList";
import { AdaptiveSheet } from "./AdaptiveSheet";

import { Avatar } from "./Avatar";
import { CategoryBreakdownCard } from "./CategoryBreakdownCard";
import { PayerBreakdownCard } from "./PayerBreakdownCard";
import { SettlementTableCard } from "./SettlementTableCard";
import { BalancePill, Metric } from "./ui";

/** QR chung cua host khong gan san so tien vi moi nguoi chuyen mot muc khac. */
export const QR_AMOUNT_FREE = 0;

export function ReminderButton({
  gameName,
  fromName,
  toName,
  amount,
  shareUrl,
  disabled = false,
}: {
  gameName: string;
  fromName: string;
  toName: string;
  amount: number;
  shareUrl?: string;
  disabled?: boolean;
}) {
  async function handleCopy() {
    const copied = await copyText(
      buildPaymentReminder(gameName, fromName, toName, amount, shareUrl),
    );
    (copied ? toast.success : toast.error)(
      copied ? "Đã sao chép lời nhắc" : "Không sao chép được lời nhắc",
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled}
      aria-label={`Copy lời nhắc cho ${fromName}`}
      title={`Copy lời nhắc cho ${fromName}`}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-stone-300 bg-surface px-2.5 text-xs font-semibold text-stone-700 transition hover:bg-surface-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:text-stone-200"
    >
      <Copy size={14} />
      Nhắc
    </button>
  );
}

export const MODE_OPTIONS: Array<{
  value: SettlementMode;
  label: string;
  hint: string;
}> = [
  {
    value: "p2p",
    label: "Nhiều chiều",
    hint: "Chuyển thẳng giữa từng cặp, ít lượt nhất",
  },
  {
    value: "host",
    label: "Gom 1 người",
    hint: "Ai cũng chuyển về người ứng nhiều nhất, chỉ một QR",
  },
  {
    value: "pick",
    label: "Chọn người",
    hint: "Gom về một người do bạn chọn, chỉ một QR",
  },
  { value: "off", label: "Tắt", hint: "Không hiện phần chuyển khoản" },
];

export type GameDashboardProps = {
  code: string;
  name: string;
  participants: ApiParticipant[];
  expenseCount: number;
  summary: ApiSummary;
  settlementMode: SettlementMode;
  /** Dau moi da chon; chi co nghia o che do "pick". */
  settlementHostId?: string;
  /** Cac khoan cua game; dung de liet ke lich su tra no (kind "transfer"). */
  expenses?: ApiExpense[];
  showHeader?: boolean;
  /** Chi truyen o trang chu cuoc choi; trang share xem thi bo trong. */
  onSettlementModeChange?: (mode: SettlementMode) => void;
  /** Co mat cung che do "pick" thi moi cho doi dau moi. */
  onSettlementHostChange?: (participantId: string) => void;
  /** Co mat thi moi dong chuyen khoan toi uu co nut ghi nhan da tra. */
  onSettle?: (settlement: SettlementRow) => void;
  onRemoveTransfer?: (expenseId: string) => void;
  settlePending?: boolean;
  shareUrl?: string;
  compact?: boolean;
};

function GameDashboardFull({
  code,
  name,
  participants,
  expenseCount,
  summary,
  settlementMode,
  settlementHostId = "",
  expenses = [],
  showHeader = false,
  onSettlementModeChange,
  onSettlementHostChange,
  onSettle,
  onRemoveTransfer,
  settlePending = false,
  shareUrl,
}: GameDashboardProps) {
  const participantById = new Map(
    participants.map((participant) => [participant.id, participant]),
  );
  const transfers = expenses.filter((expense) => expense.kind === "transfer");
  const qr = getQrProvider();
  const { roundDownRefunds } = usePreferences();

  const canEditMode = Boolean(onSettlementModeChange);
  const isHostMode = settlementMode === "host" || settlementMode === "pick";
  const hostId = resolveHostParticipantId(
    summary.balances,
    settlementMode,
    settlementHostId,
  );
  const host = hostId ? participantById.get(hostId) : undefined;
  const hostTransfers = host
    ? calculateHostTransfers(summary.balances, hostId, roundDownRefunds)
    : [];

  return (
    <aside className="space-y-5">
      {showHeader && (
        <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <p className="text-sm font-medium text-violet-600 dark:text-violet-400">
            {code}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-stone-950 dark:text-stone-50">
            {name}
          </h1>
        </section>
      )}

      <section className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3">
        <Metric label="Tổng chi" value={formatMoney(summary.totalExpense)} />
        <Metric label="Số người" value={String(participants.length)} />
        <Metric label="Khoản chi" value={String(expenseCount)} />
      </section>

      <CategoryBreakdownCard expenses={expenses} />
      <PayerBreakdownCard expenses={expenses} participants={participants} />
      <SettlementTableCard
        participants={participants}
        summary={summary}
        settlementMode={settlementMode}
        settlementHostId={settlementHostId}
        roundDownRefunds={roundDownRefunds}
      />

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">
          Cân bằng
        </h3>
        <div className="mt-2 divide-y divide-border">
          {summary.balances.length > 0 ? (
            summary.balances.map((row) => {
              const participant = participantById.get(row.participantId);
              if (!participant) return null;

              return (
                <div key={row.participantId} className="py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-stone-950 dark:text-stone-50">
                      {participant.name}
                    </p>
                    <BalancePill
                      value={displayBalance(row, hostId, roundDownRefunds)}
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    Đã trả {formatMoney(row.paid)} · Phải chịu{" "}
                    {formatMoney(row.owed)}
                  </p>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-fg-muted">Chưa có người tham gia.</p>
          )}
        </div>
      </section>

      {(canEditMode || settlementMode !== "off") && (
        <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">
            {isHostMode && host ? `Gom về ${host.name}` : "Chuyển khoản tối ưu"}
          </h3>

          {canEditMode && (
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-stone-100 p-1 sm:grid-cols-4 dark:bg-stone-950">
              {MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onSettlementModeChange?.(option.value)}
                  title={option.hint}
                  aria-pressed={settlementMode === option.value}
                  className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                    settlementMode === option.value
                      ? "bg-white text-violet-700 shadow-sm dark:bg-stone-800 dark:text-violet-300"
                      : "text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-100"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {settlementMode === "pick" && onSettlementHostChange && (
            <label className="mt-3 block">
              <span className="text-xs font-medium text-fg-muted">
                Người nhận tiền
              </span>
              <select
                value={settlementHostId}
                onChange={(event) => onSettlementHostChange(event.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-stone-300 bg-surface px-2 text-sm text-stone-950 dark:border-stone-700 dark:text-stone-50"
              >
                <option value="">Tự chọn (người ứng nhiều nhất)</option>
                {participants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.name}
                  </option>
                ))}
              </select>
              {settlementHostId && settlementHostId !== hostId && (
                <span className="mt-1 block text-xs text-warning">
                  Người đã chọn không còn trong cuộc, đang tạm gom về{" "}
                  {host?.name || "người ứng nhiều nhất"}.
                </span>
              )}
            </label>
          )}

          <div className="mt-4 space-y-3">
            {settlementMode === "off" ? (
              <p className="text-sm text-fg-muted">
                Đang tắt. Bảng tổng kết và ảnh cũng sẽ không có phần chuyển
                khoản.
              </p>
            ) : isHostMode ? (
              host && hostTransfers.length > 0 ? (
                <>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-sm font-semibold text-stone-950 dark:text-stone-50">
                      Chuyển cho {host.name}
                    </p>
                    <p className="mt-1 text-xs text-fg-muted">
                      Quét rồi tự nhập số tiền của mình
                    </p>
                    {qr.canBuild(host) && (
                      <img
                        className="mt-3 w-full rounded-md border border-stone-200 bg-white dark:border-stone-700"
                        src={qr.buildUrl(host, QR_AMOUNT_FREE, code)}
                        alt={`QR nhận tiền của ${host.name}`}
                      />
                    )}
                  </div>

                  {hostTransfers.map((transfer) => {
                    const participant = participantById.get(
                      transfer.participantId,
                    );
                    if (!participant) return null;

                    return (
                      <div
                        key={transfer.participantId}
                        className="rounded-md border border-border p-3"
                      >
                        <p className="text-sm font-medium text-stone-950 dark:text-stone-50">
                          {transfer.toHost
                            ? `${participant.name} → ${host.name}`
                            : `${host.name} → ${participant.name}`}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="mr-auto text-sm font-bold text-violet-700 tabular dark:text-violet-400">
                            {formatMoney(transfer.amount)}
                          </span>
                          {onSettle && (
                            <ReminderButton
                              gameName={name}
                              shareUrl={shareUrl}
                              fromName={
                                transfer.toHost ? participant.name : host.name
                              }
                              toName={
                                transfer.toHost ? host.name : participant.name
                              }
                              amount={transfer.amount}
                              disabled={settlePending}
                            />
                          )}
                          {onSettle && (
                            <button
                              type="button"
                              onClick={() =>
                                onSettle(
                                  transfer.toHost
                                    ? {
                                        fromParticipantId: participant.id,
                                        toParticipantId: host.id,
                                        amount: transfer.amount,
                                      }
                                    : {
                                        fromParticipantId: host.id,
                                        toParticipantId: participant.id,
                                        amount: transfer.amount,
                                      },
                                )
                              }
                              disabled={settlePending}
                              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                              title="Ghi nhận khoản này đã được chuyển"
                            >
                              <HandCoins size={14} />
                              Đã trả
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <p className="text-sm text-fg-muted">
                  {transfers.length > 0
                    ? "Mọi người đã cân bằng, không còn ai nợ ai."
                    : "Thêm khoản chi để tính tiền."}
                </p>
              )
            ) : summary.settlements.length > 0 ? (
              summary.settlements.map((settlement) => {
                const from = participantById.get(settlement.fromParticipantId);
                const to = participantById.get(settlement.toParticipantId);
                if (!from || !to) return null;

                return (
                  <div
                    key={`${settlement.fromParticipantId}-${settlement.toParticipantId}-${settlement.amount}`}
                    className="rounded-md border border-border p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-950 dark:text-stone-50">
                          <Avatar name={from.name} size={20} />
                          <span className="min-w-0 truncate">{from.name}</span>
                          <span className="shrink-0 text-stone-400">trả</span>
                          <Avatar name={to.name} size={20} />
                          <span className="min-w-0 truncate">{to.name}</span>
                        </p>
                        <p className="mt-1 text-sm font-bold text-violet-700 tabular dark:text-violet-400">
                          {formatMoney(settlement.amount)}
                        </p>
                      </div>
                      {onSettle && (
                        <div className="flex shrink-0 flex-wrap justify-end gap-2">
                          <ReminderButton
                            gameName={name}
                            shareUrl={shareUrl}
                            fromName={from.name}
                            toName={to.name}
                            amount={settlement.amount}
                            disabled={settlePending}
                          />
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
                        </div>
                      )}
                    </div>
                    {qr.canBuild(to) && (
                      <img
                        className="mt-3 w-full rounded-md border border-stone-200 bg-white dark:border-stone-700"
                        src={qr.buildUrl(to, settlement.amount, code)}
                        alt={`QR nhận tiền của ${to.name}`}
                      />
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-fg-muted">
                {transfers.length > 0
                  ? "Mọi người đã cân bằng, không còn ai nợ ai."
                  : "Thêm khoản chi để tính tiền."}
              </p>
            )}
          </div>
        </section>
      )}

      {transfers.length > 0 && (
        <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">
            Đã trả nợ
          </h3>
          <div className="mt-4 space-y-2">
            {transfers.map((transfer) => {
              const from = participantById.get(transfer.payerParticipantId);
              const to = participantById.get(
                transfer.splits[0]?.participantId || "",
              );

              return (
                <div
                  key={transfer.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-950 dark:text-stone-50">
                      {from?.name || "Không rõ"} đã trả {to?.name || "Không rõ"}
                    </p>
                    {transfer.note && (
                      <p className="mt-0.5 truncate text-xs text-fg-muted">
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
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-danger transition hover:bg-danger-soft active:bg-rose-100 dark:active:bg-rose-500/20"
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

export function GameDashboard(props: GameDashboardProps) {
  return props.compact ? (
    <GameDashboardCompact {...props} />
  ) : (
    <GameDashboardFull {...props} />
  );
}

type DashboardView = "balances" | "transfers" | "paid" | "stats";

type TransferRow = {
  key: string;
  fromName: string;
  toName: string;
  amount: number;
  settlement: SettlementRow;
  qr?: { target: ApiParticipant; amount: number; hint: string };
};

const COMPACT_ROW_HEIGHT_PX = 56;
const VIEW_BUTTON =
  "inline-flex h-11 flex-1 items-center justify-center whitespace-nowrap rounded-md px-1 text-[13px] font-semibold transition";

function GameDashboardCompact({
  name,
  code,
  participants,
  expenseCount,
  summary,
  settlementMode,
  settlementHostId = "",
  expenses = [],
  onSettlementModeChange,
  onSettlementHostChange,
  onSettle,
  onRemoveTransfer,
  settlePending = false,
  shareUrl,
}: GameDashboardProps) {
  const [view, setView] = useState<DashboardView>("balances");
  const [activeRow, setActiveRow] = useState<TransferRow | null>(null);
  const [rowOpen, setRowOpen] = useState(false);
  const qr = getQrProvider();
  const { roundDownRefunds } = usePreferences();
  const participantById = new Map(
    participants.map((participant) => [participant.id, participant]),
  );
  const transfers = expenses.filter((expense) => expense.kind === "transfer");
  const isHostMode = settlementMode === "host" || settlementMode === "pick";
  const hostId = resolveHostParticipantId(
    summary.balances,
    settlementMode,
    settlementHostId,
  );
  const host = hostId ? participantById.get(hostId) : undefined;

  const transferRows: TransferRow[] = [];
  if (isHostMode && host) {
    for (const transfer of calculateHostTransfers(
      summary.balances,
      hostId,
      roundDownRefunds,
    )) {
      const participant = participantById.get(transfer.participantId);
      if (!participant) continue;
      const from = transfer.toHost ? participant : host;
      const to = transfer.toHost ? host : participant;
      transferRows.push({
        key: `${from.id}-${to.id}`,
        fromName: from.name,
        toName: to.name,
        amount: transfer.amount,
        settlement: {
          fromParticipantId: from.id,
          toParticipantId: to.id,
          amount: transfer.amount,
        },
        qr: transfer.toHost
          ? {
              target: host,
              amount: QR_AMOUNT_FREE,
              hint: "Quét rồi tự nhập số tiền của mình",
            }
          : undefined,
      });
    }
  } else if (!isHostMode) {
    for (const settlement of summary.settlements) {
      const from = participantById.get(settlement.fromParticipantId);
      const to = participantById.get(settlement.toParticipantId);
      if (!from || !to) continue;
      transferRows.push({
        key: `${from.id}-${to.id}-${settlement.amount}`,
        fromName: from.name,
        toName: to.name,
        amount: settlement.amount,
        settlement,
        qr: { target: to, amount: settlement.amount, hint: "" },
      });
    }
  }

  const transferEmpty =
    settlementMode === "off"
      ? "Đang tắt. Bảng tổng kết và ảnh cũng sẽ không có phần chuyển khoản."
      : transfers.length > 0
        ? "Mọi người đã cân bằng, không còn ai nợ ai."
        : "Thêm khoản chi để tính tiền.";

  function openRow(row: TransferRow) {
    setActiveRow(row);
    setRowOpen(true);
  }

  const views: Array<{ id: DashboardView; label: string }> = [
    { id: "balances", label: "Số dư" },
    { id: "transfers", label: "Chuyển khoản" },
    {
      id: "paid",
      label: transfers.length > 0 ? `Đã trả (${transfers.length})` : "Đã trả",
    },
    { id: "stats", label: "Thống kê" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <p className="shrink-0 text-xs text-fg-muted tabular">
        Tổng chi{" "}
        <b className="text-sm text-stone-950 dark:text-stone-50">
          {formatMoney(summary.totalExpense)}
        </b>{" "}
        · {participants.length} người · {expenseCount} khoản
      </p>
      <div className="flex shrink-0 gap-1 rounded-lg bg-surface-muted p-1">
        {views.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={view === item.id}
            onClick={() => setView(item.id)}
            className={`${VIEW_BUTTON} ${
              view === item.id
                ? "bg-surface text-violet-700 shadow-sm dark:text-violet-300"
                : "text-fg-muted"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {view === "transfers" && onSettlementModeChange && (
        <div className="grid shrink-0 grid-cols-[1.25fr_1.25fr_1.25fr_0.6fr] gap-1 rounded-lg bg-surface-muted p-1">
          {MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              title={option.hint}
              aria-pressed={settlementMode === option.value}
              onClick={() => onSettlementModeChange(option.value)}
              className={`h-9 whitespace-nowrap rounded-md px-0.5 text-xs font-semibold transition ${
                settlementMode === option.value
                  ? "bg-surface text-violet-700 shadow-sm dark:text-violet-300"
                  : "text-fg-muted"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      {view === "transfers" &&
        settlementMode === "pick" &&
        onSettlementHostChange && (
          <select
            aria-label="Người nhận tiền"
            value={settlementHostId}
            onChange={(event) => onSettlementHostChange(event.target.value)}
            className="h-11 w-full shrink-0 rounded-md border border-stone-300 bg-surface px-2 text-sm text-stone-950 dark:border-stone-700 dark:text-stone-50"
          >
            <option value="">Tự chọn (người ứng nhiều nhất)</option>
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.name}
              </option>
            ))}
          </select>
        )}

      <div className="min-h-0 flex-1">
        {view === "balances" && (
          <PagedList
            items={summary.balances.filter((row) =>
              participantById.has(row.participantId),
            )}
            getKey={(row) => row.participantId}
            rowHeight={COMPACT_ROW_HEIGHT_PX}
            empty={
              <p className="py-6 text-center text-sm text-fg-muted">
                Chưa có người tham gia.
              </p>
            }
            renderItem={(row) => (
              <div className="flex h-full flex-col justify-center rounded-md border border-border px-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-semibold text-stone-950 dark:text-stone-50">
                    {participantById.get(row.participantId)?.name}
                  </p>
                  <BalancePill
                    value={displayBalance(row, hostId, roundDownRefunds)}
                  />
                </div>
                <p className="truncate text-xs text-fg-muted">
                  Đã trả {formatMoney(row.paid)} · Phải chịu{" "}
                  {formatMoney(row.owed)}
                </p>
              </div>
            )}
          />
        )}
        {view === "transfers" && (
          <PagedList
            items={transferRows}
            getKey={(row) => row.key}
            rowHeight={COMPACT_ROW_HEIGHT_PX}
            empty={
              <p className="py-6 text-center text-sm text-fg-muted">
                {transferEmpty}
              </p>
            }
            renderItem={(row) => (
              <button
                type="button"
                onClick={() => openRow(row)}
                aria-label={`Chi tiết ${row.fromName} trả ${row.toName}`}
                className="flex h-full w-full items-center gap-2 rounded-md border border-border px-3 text-left transition active:bg-surface-muted"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-stone-950 dark:text-stone-50">
                    {row.fromName} → {row.toName}
                  </span>
                  <span className="block text-sm font-bold text-violet-700 tabular dark:text-violet-400">
                    {formatMoney(row.amount)}
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-fg-muted" />
              </button>
            )}
          />
        )}
        {view === "stats" && (
          <div className="h-full space-y-3 overflow-y-auto overscroll-contain">
            <SettlementTableCard
              participants={participants}
              summary={summary}
              settlementMode={settlementMode}
              settlementHostId={settlementHostId}
              roundDownRefunds={roundDownRefunds}
            />
            <PayerBreakdownCard
              expenses={expenses}
              participants={participants}
            />
            <CategoryBreakdownCard expenses={expenses} />
          </div>
        )}
        {view === "paid" && (
          <PagedList
            items={transfers}
            getKey={(transfer) => transfer.id}
            rowHeight={COMPACT_ROW_HEIGHT_PX}
            empty={
              <p className="py-6 text-center text-sm text-fg-muted">
                Chưa ghi nhận khoản trả nợ nào.
              </p>
            }
            renderItem={(transfer) => (
              <div className="flex h-full items-center gap-2 rounded-md border border-border pl-3 pr-1">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-950 dark:text-stone-50">
                    {participantById.get(transfer.payerParticipantId)?.name ||
                      "Không rõ"}{" "}
                    đã trả{" "}
                    {participantById.get(
                      transfer.splits[0]?.participantId || "",
                    )?.name || "Không rõ"}
                  </p>
                  <p className="text-sm font-semibold text-emerald-700 tabular dark:text-emerald-400">
                    {formatMoney(transfer.amount)}
                  </p>
                </div>
                {onRemoveTransfer && (
                  <button
                    type="button"
                    onClick={() => onRemoveTransfer(transfer.id)}
                    aria-label="Xóa khoản trả nợ"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-danger transition hover:bg-danger-soft"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            )}
          />
        )}
      </div>

      <AdaptiveSheet
        open={rowOpen}
        onClose={() => setRowOpen(false)}
        title={activeRow ? `${activeRow.fromName} → ${activeRow.toName}` : ""}
      >
        {activeRow && (
          <div className="flex flex-col gap-3 pb-2">
            <p className="text-lg font-bold text-violet-700 tabular dark:text-violet-400">
              {formatMoney(activeRow.amount)}
            </p>
            {activeRow.qr?.hint && (
              <p className="text-xs text-fg-muted">{activeRow.qr.hint}</p>
            )}
            {activeRow.qr && qr.canBuild(activeRow.qr.target) && (
              <img
                className="mx-auto w-full max-w-64 rounded-md border border-stone-200 bg-white dark:border-stone-700"
                src={qr.buildUrl(
                  activeRow.qr.target,
                  activeRow.qr.amount,
                  code,
                )}
                alt={`QR nhận tiền của ${activeRow.qr.target.name}`}
              />
            )}
            {onSettle && (
              <div className="flex flex-wrap items-center gap-2">
                <ReminderButton
                  gameName={name}
                  shareUrl={shareUrl}
                  fromName={activeRow.fromName}
                  toName={activeRow.toName}
                  amount={activeRow.amount}
                  disabled={settlePending}
                />
                <button
                  type="button"
                  onClick={() => {
                    setRowOpen(false);
                    onSettle(activeRow.settlement);
                  }}
                  disabled={settlePending}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
                >
                  <HandCoins size={14} />
                  Đã trả
                </button>
              </div>
            )}
          </div>
        )}
      </AdaptiveSheet>
    </div>
  );
}
