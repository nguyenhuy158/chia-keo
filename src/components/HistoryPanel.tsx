import {
  ArrowLeftRight,
  History,
  Pencil,
  PlusCircle,
  Settings2,
  Trash2,
  Undo2,
  UserMinus,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePersistentOpen } from "./use-persistent-open";
import {
  type ApiGameEvent,
  canUndoEvent,
  describeGameEvent,
  type GameEventKind,
} from "../../shared/game-events";
import { useGameEvents, useUndoGameEvent } from "../adapters/react-query/queries";
import { toast } from "sonner";
import { formatDateTime, formatTime } from "./format-datetime";
import { EmptyState, SkeletonListRow } from "./ui";

const ICONS: Record<GameEventKind, LucideIcon> = {
  game_created: History,
  game_renamed: Pencil,
  settlement_changed: Settings2,
  participant_added: UserPlus,
  participant_renamed: Pencil,
  participant_removed: UserMinus,
  expense_added: PlusCircle,
  expense_updated: Pencil,
  expense_removed: Trash2,
  expense_restored: Undo2,
  transfer_added: ArrowLeftRight,
};

/** Mau chu cho cac viec "pha" (xoa) de quet mat thay ngay giua danh sach dai. */
const DESTRUCTIVE: GameEventKind[] = ["expense_removed", "participant_removed"];

/** Trong ngay thi chi can gio; khac ngay thi kem ngay/thang. */
function formatWhen(iso: string, now: Date) {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";

  const sameDay = at.toDateString() === now.toDateString();
  return sameDay ? formatTime(iso) : formatDateTime(iso, { includeYear: false });
}

function EventRow({
  event,
  onUndo,
  pending,
  now,
}: {
  event: ApiGameEvent;
  onUndo: (eventId: string) => void;
  pending: boolean;
  now: Date;
}) {
  const { title, detail } = describeGameEvent(event.payload);
  const Icon = ICONS[event.payload.kind] || History;
  const destructive = DESTRUCTIVE.includes(event.payload.kind);

  return (
    <li className="flex items-start gap-3 py-2.5">
      <span
        className={`mt-0.5 shrink-0 ${
          destructive ? "text-rose-500 dark:text-rose-400" : "text-stone-400 dark:text-stone-500"
        }`}
      >
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-stone-900 dark:text-stone-100">{title}</p>
        {detail && (
          <p className="mt-0.5 break-words text-xs text-stone-500 dark:text-stone-400">{detail}</p>
        )}
        {event.undoneAt && (
          <p className="mt-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            đã hoàn tác
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-[11px] tabular-nums text-stone-400 dark:text-stone-500">
          {formatWhen(event.createdAt, now)}
        </span>
        {canUndoEvent(event) && (
          <button
            type="button"
            onClick={() => onUndo(event.id)}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-md border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700 transition hover:bg-stone-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            <Undo2 size={13} />
            Hoàn tác
          </button>
        )}
      </div>
    </li>
  );
}

type HistoryPanelProps = {
  gameId: string;
  /**
   * Desktop hien ca trang mot luc nen lich su de dang gap lai: chua mo thi
   * khong goi API, do la mot request cho mot thong tin khong ai doi hoi.
   */
  collapsible?: boolean;
};

export function HistoryPanel({ gameId, collapsible = false }: HistoryPanelProps) {
  // Chi nho trang thai khi co the gap (desktop); mobile luon mo, khong co gi de nho.
  const [persistedOpen, setPersistedOpen] = usePersistentOpen("history", false);
  const open = collapsible ? persistedOpen : true;
  const eventsQuery = useGameEvents(gameId, open);
  const undoEvent = useUndoGameEvent();
  // Mot moc thoi gian cho ca danh sach: moi dong tu tinh se ra ket qua lech nhau.
  const now = new Date();

  async function handleUndo(eventId: string) {
    try {
      await undoEvent.mutateAsync(eventId);
      toast.success("Đã dựng lại khoản chi");
    } catch {
      // Hay gap nhat: nguoi tra hoac nguoi chia da bi xoa khoi cuoc chia.
      toast.error("Không hoàn tác được — người liên quan không còn trong cuộc chia");
    }
  }

  const events = eventsQuery.data || [];

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History size={18} className="text-violet-600 dark:text-violet-400" />
          <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">Lịch sử</h3>
        </div>
        {collapsible && (
          <button
            type="button"
            onClick={() => setPersistedOpen((current) => !current)}
            aria-expanded={open}
            className="rounded-md px-2 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10"
          >
            {open ? "Ẩn" : "Xem"}
          </button>
        )}
      </div>

      {open && (
        <>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Ai đã làm gì trong cuộc chia này. Khoản chi bị xóa có thể dựng lại.
          </p>

          {eventsQuery.isPending ? (
            <div className="mt-2 divide-y divide-stone-100 dark:divide-stone-800">
              <SkeletonListRow icon />
              <SkeletonListRow icon />
              <SkeletonListRow icon />
            </div>
          ) : events.length === 0 ? (
            <div className="mt-2">
              <EmptyState
                title="Chưa có gì trong lịch sử"
                description="Các thao tác từ giờ trở đi sẽ được ghi lại ở đây."
              />
            </div>
          ) : (
            <ul className="mt-2 divide-y divide-stone-100 dark:divide-stone-800">
              {events.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  now={now}
                  onUndo={handleUndo}
                  pending={undoEvent.isPending}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
