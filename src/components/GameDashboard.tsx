import { HandCoins, Trash2 } from "lucide-react";
import type {
  ApiExpense,
  ApiParticipant,
  ApiSummary,
} from "../../shared/api-types";
import type { SettlementMode } from "../../shared/schemas";
import {
  calculateHostTransfers,
  resolveHostParticipantId,
  type SettlementRow,
} from "../../shared/split";
import { getQrProvider } from "../core/container";
import { formatMoney } from "../core/domain/money";
import { Avatar } from "./Avatar";
import { BalancePill, Metric } from "./ui";

/** QR chung cua host khong gan san so tien vi moi nguoi chuyen mot muc khac. */
const QR_AMOUNT_FREE = 0;

const MODE_OPTIONS: Array<{
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

type GameDashboardProps = {
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
};

export function GameDashboard({
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
}: GameDashboardProps) {
  const participantById = new Map(
    participants.map((participant) => [participant.id, participant]),
  );
  const transfers = expenses.filter((expense) => expense.kind === "transfer");
  const qr = getQrProvider();

  const canEditMode = Boolean(onSettlementModeChange);
  const isHostMode = settlementMode === "host" || settlementMode === "pick";
  const hostId = resolveHostParticipantId(
    summary.balances,
    settlementMode,
    settlementHostId,
  );
  const host = hostId ? participantById.get(hostId) : undefined;
  const hostTransfers = host
    ? calculateHostTransfers(summary.balances, hostId)
    : [];

  return (
    <aside className="space-y-5">
      {showHeader && (
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <p className="text-sm font-medium text-violet-600 dark:text-violet-400">
            {code}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-stone-950 dark:text-stone-50">
            {name}
          </h1>
        </section>
      )}

      <section className="grid grid-cols-3 gap-3">
        <Metric label="Tổng chi" value={formatMoney(summary.totalExpense)} />
        <Metric label="Số người" value={String(participants.length)} />
        <Metric label="Khoản chi" value={String(expenseCount)} />
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">
          Cân bằng
        </h3>
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
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Chưa có người tham gia.
            </p>
          )}
        </div>
      </section>

      {(canEditMode || settlementMode !== "off") && (
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
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
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                Người nhận tiền
              </span>
              <select
                value={settlementHostId}
                onChange={(event) => onSettlementHostChange(event.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-stone-300 bg-white px-2 text-sm text-stone-950 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
              >
                <option value="">Tự chọn (người ứng nhiều nhất)</option>
                {participants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.name}
                  </option>
                ))}
              </select>
              {settlementHostId && settlementHostId !== hostId && (
                <span className="mt-1 block text-xs text-amber-600 dark:text-amber-400">
                  Người đã chọn không còn trong cuộc, đang tạm gom về{" "}
                  {host?.name || "người ứng nhiều nhất"}.
                </span>
              )}
            </label>
          )}

          <div className="mt-4 space-y-3">
            {settlementMode === "off" ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Đang tắt. Bảng tổng kết và ảnh cũng sẽ không có phần chuyển
                khoản.
              </p>
            ) : isHostMode ? (
              host && hostTransfers.length > 0 ? (
                <>
                  <div className="rounded-md border border-stone-200 p-3 dark:border-stone-800">
                    <p className="text-sm font-semibold text-stone-950 dark:text-stone-50">
                      Chuyển cho {host.name}
                    </p>
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
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
                        className="flex items-center justify-between gap-3 rounded-md border border-stone-200 p-3 dark:border-stone-800"
                      >
                        <p className="min-w-0 truncate text-sm font-medium text-stone-950 dark:text-stone-50">
                          {transfer.toHost
                            ? `${participant.name} → ${host.name}`
                            : `${host.name} → ${participant.name}`}
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-sm font-bold text-violet-700 tabular dark:text-violet-400">
                            {formatMoney(transfer.amount)}
                          </span>
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
                <p className="text-sm text-stone-500 dark:text-stone-400">
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
                    className="rounded-md border border-stone-200 p-3 dark:border-stone-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-950 dark:text-stone-50">
                          <Avatar name={from.name} size={20} />
                          <span className="truncate">{from.name}</span>
                          <span className="shrink-0 text-stone-400 dark:text-stone-500">trả</span>
                          <Avatar name={to.name} size={20} />
                          <span className="truncate">{to.name}</span>
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
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {transfers.length > 0
                  ? "Mọi người đã cân bằng, không còn ai nợ ai."
                  : "Thêm khoản chi để tính tiền."}
              </p>
            )}
          </div>
        </section>
      )}

      {transfers.length > 0 && (
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
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
