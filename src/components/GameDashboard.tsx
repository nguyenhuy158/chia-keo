import type { ApiParticipant, ApiSummary } from "../../shared/api-types";
import type { SettlementMode } from "../../shared/schemas";
import { calculateHostTransfers, pickHostParticipantId } from "../../shared/split";
import { formatMoney } from "../lib/money";
import { buildVietQrUrl, canBuildVietQr } from "../lib/vietqr";
import { BalancePill, Metric } from "./ui";

/** QR chung cua host khong gan san so tien vi moi nguoi chuyen mot muc khac. */
const QR_AMOUNT_FREE = 0;

const MODE_OPTIONS: Array<{ value: SettlementMode; label: string; hint: string }> = [
  { value: "p2p", label: "Nhiều chiều", hint: "Chuyển thẳng giữa từng cặp, ít lượt nhất" },
  { value: "host", label: "Gom 1 người", hint: "Ai cũng chuyển về một đầu mối, chỉ một QR" },
  { value: "off", label: "Tắt", hint: "Không hiện phần chuyển khoản" },
];

type GameDashboardProps = {
  code: string;
  name: string;
  participants: ApiParticipant[];
  expenseCount: number;
  summary: ApiSummary;
  settlementMode: SettlementMode;
  showHeader?: boolean;
  /** Chi truyen o trang chu cuoc choi; trang share xem thi bo trong. */
  onSettlementModeChange?: (mode: SettlementMode) => void;
};

function SettlementCard({
  title,
  amount,
  payee,
  code,
  qrAmount,
  note,
}: {
  title: string;
  amount: number;
  payee?: ApiParticipant;
  code: string;
  qrAmount: number;
  note?: string;
}) {
  return (
    <div className="rounded-md border border-stone-200 p-3 dark:border-stone-800">
      <p className="text-sm font-semibold text-stone-950 dark:text-stone-50">{title}</p>
      <p className="mt-1 text-sm font-bold text-violet-700 tabular dark:text-violet-400">
        {formatMoney(amount)}
      </p>
      {note && <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{note}</p>}
      {payee && canBuildVietQr(payee) && (
        <img
          className="mt-3 w-full rounded-md border border-stone-200 bg-white dark:border-stone-700"
          src={buildVietQrUrl(payee, qrAmount, code)}
          alt={`QR nhận tiền của ${payee.name}`}
        />
      )}
    </div>
  );
}

export function GameDashboard({
  code,
  name,
  participants,
  expenseCount,
  summary,
  settlementMode,
  showHeader = false,
  onSettlementModeChange,
}: GameDashboardProps) {
  const participantById = new Map(participants.map((participant) => [participant.id, participant]));
  const canEditMode = Boolean(onSettlementModeChange);
  const hostId = settlementMode === "host" ? pickHostParticipantId(summary.balances) : "";
  const host = hostId ? participantById.get(hostId) : undefined;
  const hostTransfers = host ? calculateHostTransfers(summary.balances, hostId) : [];

  const settlementTitle =
    settlementMode === "host" && host ? `Gom về ${host.name}` : "Chuyển khoản tối ưu";

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

      {(canEditMode || settlementMode !== "off") && (
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">
            {settlementTitle}
          </h3>

          {canEditMode && (
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-stone-100 p-1 dark:bg-stone-950">
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

          <div className="mt-4 space-y-3">
            {settlementMode === "off" ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Đang tắt. Bảng tổng kết và ảnh cũng sẽ không có phần chuyển khoản.
              </p>
            ) : settlementMode === "host" ? (
              <HostSettlements
                code={code}
                host={host}
                transfers={hostTransfers}
                participantById={participantById}
              />
            ) : (
              <PeerSettlements
                code={code}
                summary={summary}
                participantById={participantById}
              />
            )}
          </div>
        </section>
      )}
    </aside>
  );
}

function PeerSettlements({
  code,
  summary,
  participantById,
}: {
  code: string;
  summary: ApiSummary;
  participantById: Map<string, ApiParticipant>;
}) {
  if (summary.settlements.length === 0) {
    return <p className="text-sm text-stone-500 dark:text-stone-400">Thêm khoản chi để tính tiền.</p>;
  }

  return (
    <>
      {summary.settlements.map((settlement) => {
        const from = participantById.get(settlement.fromParticipantId);
        const to = participantById.get(settlement.toParticipantId);
        if (!from || !to) return null;

        return (
          <SettlementCard
            key={`${settlement.fromParticipantId}-${settlement.toParticipantId}-${settlement.amount}`}
            title={`${from.name} trả ${to.name}`}
            amount={settlement.amount}
            payee={to}
            code={code}
            qrAmount={settlement.amount}
          />
        );
      })}
    </>
  );
}

function HostSettlements({
  code,
  host,
  transfers,
  participantById,
}: {
  code: string;
  host: ApiParticipant | undefined;
  transfers: ReturnType<typeof calculateHostTransfers>;
  participantById: Map<string, ApiParticipant>;
}) {
  if (!host || transfers.length === 0) {
    return <p className="text-sm text-stone-500 dark:text-stone-400">Thêm khoản chi để tính tiền.</p>;
  }

  return (
    <>
      <SettlementCard
        title={`Chuyển cho ${host.name}`}
        amount={transfers.filter((row) => row.toHost).reduce((total, row) => total + row.amount, 0)}
        payee={host}
        code={code}
        qrAmount={QR_AMOUNT_FREE}
        note="Quét rồi tự nhập số tiền của mình"
      />

      {transfers.map((transfer) => {
        const participant = participantById.get(transfer.participantId);
        if (!participant) return null;

        return (
          <div
            key={transfer.participantId}
            className="flex items-center justify-between gap-3 rounded-md border border-stone-200 p-3 dark:border-stone-800"
          >
            <p className="min-w-0 truncate text-sm font-medium text-stone-950 dark:text-stone-50">
              {transfer.toHost
                ? `${participant.name} → ${host.name}`
                : `${host.name} trả lại ${participant.name}`}
            </p>
            <span className="shrink-0 text-sm font-bold text-violet-700 tabular dark:text-violet-400">
              {formatMoney(transfer.amount)}
            </span>
          </div>
        );
      })}
    </>
  );
}
