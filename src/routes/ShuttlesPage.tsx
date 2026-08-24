import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ApiShuttleEntry } from "../../shared/api-types";
import {
  MAX_SHUTTLE_QUANTITY,
  SHUTTLE_NOTE_MAX_LENGTH,
  type ShuttleEntryKind,
} from "../../shared/shuttles";
import {
  useCreateShuttleEntry,
  useDeleteShuttleEntry,
  useShuttleStock,
} from "../adapters/react-query/shuttles-query";
import { useConfirm } from "../components/ConfirmDialog";
import { formatDateTime } from "../components/format-datetime";
import { EmptyState, LoadingState, SkeletonListRow } from "../components/ui";

/** Cac buoc bam nhanh: mot buoi thuong het 1-4 trai, mot hop thuong 12 trai. */
const USE_STEPS = [1, 2, 3, 4] as const;
const ADD_STEPS = [1, 6, 10, 12] as const;

/** Cau canh bao cho tung ma loi tu server; ma la khong doan bua ra chu tieng Viet. */
const ERROR_MESSAGES: Record<string, string> = {
  shuttle_stock_negative: "Trong kho không còn đủ cầu cho thao tác này.",
  shuttle_stock_too_large: "Số cầu quá lớn.",
};

function errorMessage(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  return ERROR_MESSAGES[code] || "Không ghi được, thử lại sau.";
}

const KIND_LABELS: Record<ShuttleEntryKind, string> = {
  add: "Thêm cầu",
  use: "Dùng cầu",
  set: "Chốt lại số cầu",
};

function EntryRow({
  entry,
  onDelete,
  deleting,
}: {
  entry: ApiShuttleEntry;
  onDelete: () => void;
  deleting: boolean;
}) {
  const positive = entry.delta > 0;

  return (
    <div className="flex items-center gap-3 py-2.5">
      <span
        className={`inline-flex h-8 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          positive
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
            : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
        }`}
      >
        {positive ? `+${entry.delta}` : entry.delta}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-stone-950 dark:text-stone-50">
          {KIND_LABELS[entry.kind]}
          <span className="ml-1 font-normal text-stone-500 dark:text-stone-400">
            · còn {entry.stockAfter}
          </span>
        </p>
        <p className="truncate text-xs text-stone-500 dark:text-stone-400">
          {formatDateTime(entry.createdAt, { includeYear: false })}
          {entry.note && ` · ${entry.note}`}
        </p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        aria-label="Xóa lần ghi này"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-stone-300 text-stone-500 transition hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

/**
 * Kho cau ung truoc cho team: chi can biet trong ong con bao nhieu trai. Nut
 * "-" tru cau da danh trong buoi, "+" cong cau moi mua, con o "Chốt lại" dung
 * khi da dem tay va muon lay con so do lam chuan (khong phai cong tru gi nua).
 */
export function ShuttlesPage() {
  const stockQuery = useShuttleStock();
  const createEntry = useCreateShuttleEntry();
  const deleteEntry = useDeleteShuttleEntry();
  const confirm = useConfirm();
  const [note, setNote] = useState("");
  const [countDraft, setCountDraft] = useState("");

  const stock = stockQuery.data?.stock ?? 0;
  const entries = stockQuery.data?.entries ?? [];
  const pending = createEntry.isPending;

  async function submit(kind: ShuttleEntryKind, quantity: number) {
    try {
      await createEntry.mutateAsync({ kind, quantity, note: note.trim() });
      setNote("");
      if (kind === "set") setCountDraft("");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function handleSetExact() {
    const parsed = Number(countDraft);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_SHUTTLE_QUANTITY) {
      toast.error(`Nhập số cầu từ 0 đến ${MAX_SHUTTLE_QUANTITY}.`);
      return;
    }
    await submit("set", parsed);
  }

  async function handleDelete(entry: ApiShuttleEntry) {
    const ok = await confirm({
      title: "Xóa lần ghi này?",
      description: `${KIND_LABELS[entry.kind]} (${entry.delta > 0 ? "+" : ""}${entry.delta} trái). Số cầu trong kho sẽ được tính lại.`,
      confirmLabel: "Xóa",
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteEntry.mutateAsync(entry.id);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  if (stockQuery.isError) {
    return <EmptyState title="Không tải được kho cầu" description="Thử tải lại trang." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link
          to="/"
          aria-label="Về trang chính"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50 active:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          <ArrowLeft size={14} />
          Trang chính
        </Link>
        <h1 className="text-sm font-semibold text-stone-950 dark:text-stone-50">Kho cầu</h1>
      </div>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        {stockQuery.isPending ? (
          <LoadingState label="Đang đếm cầu..." />
        ) : (
          <>
            <p className="text-center text-sm text-stone-500 dark:text-stone-400">
              Trong ống còn
            </p>
            <p
              aria-live="polite"
              className="text-center text-6xl font-extrabold tabular-nums text-stone-950 dark:text-stone-50"
            >
              {stock}
            </p>
            <p className="text-center text-sm text-stone-500 dark:text-stone-400">trái cầu</p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1.5 text-xs font-medium text-stone-500 dark:text-stone-400">
                  Đã dùng
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {USE_STEPS.map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => submit("use", step)}
                      disabled={pending || step > stock}
                      aria-label={`Dùng ${step} trái`}
                      className="inline-flex h-11 items-center justify-center gap-0.5 rounded-md bg-rose-600 text-sm font-semibold text-white transition hover:bg-rose-700 active:bg-rose-800 disabled:opacity-40"
                    >
                      <Minus size={13} />
                      {step}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-stone-500 dark:text-stone-400">
                  Mua thêm
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {ADD_STEPS.map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => submit("add", step)}
                      disabled={pending}
                      aria-label={`Thêm ${step} trái`}
                      className="inline-flex h-11 items-center justify-center gap-0.5 rounded-md bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40"
                    >
                      <Plus size={13} />
                      {step}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSetExact();
              }}
              className="mt-3 flex items-center gap-2"
            >
              <input
                value={countDraft}
                onChange={(event) => setCountDraft(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder="Đếm lại · vd 8"
                aria-label="Chốt lại số cầu đang có"
                className="field w-32"
              />
              <button
                type="submit"
                disabled={pending || countDraft === ""}
                className="inline-flex h-11 items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
              >
                <Check size={15} />
                Chốt lại
              </button>
            </form>

            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={SHUTTLE_NOTE_MAX_LENGTH}
              placeholder="Ghi chú cho lần ghi tới (không bắt buộc)"
              aria-label="Ghi chú"
              className="field mt-2"
            />
          </>
        )}
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-sm font-semibold text-stone-950 dark:text-stone-50">Lịch sử</h2>
        {stockQuery.isPending ? (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow />
          </div>
        ) : entries.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            Chưa ghi gì. Bấm "Chốt lại" để nhập số cầu đang có trong ống.
          </p>
        ) : (
          <div className="max-h-64 divide-y divide-stone-100 overflow-y-auto dark:divide-stone-800">
            {entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                deleting={deleteEntry.isPending}
                onDelete={() => handleDelete(entry)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
