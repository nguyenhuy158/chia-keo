import { Table2 } from "lucide-react";
import type { ApiParticipant, ApiSummary } from "../../shared/api-types";
import {
  buildSettlementTable,
  formatLastCell,
  formatPlainMoney,
} from "../../shared/settlement-table";

type SettlementTableCardProps = {
  participants: ApiParticipant[];
  summary: ApiSummary;
  settlementMode: string;
  settlementHostId: string;
  roundDownRefunds: boolean;
};

const CELL_CLASS = "px-2 py-1.5 text-right tabular-nums";
const HEAD_CLASS = "px-2 py-1.5 text-right font-semibold";

/**
 * Bang tong hop: moi nguoi mot dong (phai chiu, da tra, cot cuoi la so chuyen
 * cho dau moi hoac so con lai). Phep tinh nam o `buildSettlementTable` (shared).
 */
export function SettlementTableCard({
  participants,
  summary,
  settlementMode,
  settlementHostId,
  roundDownRefunds,
}: SettlementTableCardProps) {
  const table = buildSettlementTable({
    participants,
    summary,
    settlementMode,
    settlementHostId,
    roundDownRefunds,
  });

  if (table.rows.length === 0) return null;

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Table2 size={18} className="text-violet-600 dark:text-violet-400" />
        <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">
          Bảng tổng hợp
        </h3>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-xs text-stone-950 dark:text-stone-50">
          <thead className="text-fg-muted">
            <tr className="border-b border-border">
              <th className="px-2 py-1.5 text-left font-semibold">Người</th>
              <th className={HEAD_CLASS}>Phải chịu</th>
              <th className={HEAD_CLASS}>Đã trả</th>
              <th className={HEAD_CLASS}>{table.lastHeader}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {table.rows.map((row) => (
              <tr key={row.participantId}>
                <td className="max-w-[7rem] truncate px-2 py-1.5 font-medium">
                  {row.name}
                </td>
                <td className={CELL_CLASS}>{formatPlainMoney(row.owed)}</td>
                <td className={CELL_CLASS}>{formatPlainMoney(row.paid)}</td>
                <td className={`${CELL_CLASS} font-semibold`}>
                  {formatLastCell(table.hasHost, row.last)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
