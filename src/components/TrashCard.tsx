import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePersistentOpen } from "./use-persistent-open";
import type { ApiTrashGame } from "../../shared/api-types";
import { TRASH_RETENTION_DAYS } from "../../shared/schemas";
import { usePurgeGame, useRestoreGame, useTrashedGames } from "../adapters/react-query/queries";
import { useConfirm } from "./ConfirmDialog";
import { SkeletonCard } from "./ui";

/** Con bao nhieu ngay nua truoc khi cuoc chia bi xoa han. */
function daysLeft(deletedAt: string) {
  const deleted = new Date(deletedAt).getTime();
  if (Number.isNaN(deleted)) return TRASH_RETENTION_DAYS;

  const elapsed = (Date.now() - deleted) / 86_400_000;
  return Math.max(0, Math.ceil(TRASH_RETENTION_DAYS - elapsed));
}

/**
 * Thung rac cuoc chia. Gap lai mac dinh: day la cho nguoi dung chi ghe khi bam
 * nham, khong phai thu can nhin moi lan mo app — va gap lai thi khong ton mot
 * request cho danh sach ma khong ai xem.
 */
export function TrashCard() {
  const confirm = useConfirm();
  const [open, setOpen] = usePersistentOpen("trash", false);
  const trashQuery = useTrashedGames(open);
  const restoreGame = useRestoreGame();
  const purgeGame = usePurgeGame();

  const pending = restoreGame.isPending || purgeGame.isPending;
  const games = trashQuery.data || [];

  async function handleRestore(game: ApiTrashGame) {
    try {
      await restoreGame.mutateAsync(game.id);
      toast.success(`Đã phục hồi "${game.name}"`);
    } catch {
      toast.error("Không phục hồi được");
    }
  }

  async function handlePurge(game: ApiTrashGame) {
    // Buoc nay khong hoan tac duoc nen phai hoi, va hoi kem ten cho khoi nham.
    const ok = await confirm({
      title: `Xóa hẳn "${game.name}"?`,
      description: "Không lấy lại được.",
      confirmLabel: "Xóa hẳn",
      destructive: true,
    });
    if (!ok) return;

    try {
      await purgeGame.mutateAsync(game.id);
      toast.success("Đã xóa hẳn");
    } catch {
      toast.error("Không xóa được");
    }
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-800 dark:text-stone-200">
          <Trash2 size={16} />
          Thùng rác
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="rounded-md px-2 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10"
        >
          {open ? "Ẩn" : "Xem"}
        </button>
      </div>

      {open && (
        <>
          {trashQuery.isPending ? (
            <div className="mt-1 space-y-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : games.length === 0 ? (
            <p className="px-1 py-3 text-sm text-stone-500 dark:text-stone-400">
              Trống. Cuộc chơi đã xóa nằm ở đây {TRASH_RETENTION_DAYS} ngày.
            </p>
          ) : (
            <div className="mt-1 space-y-2">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="rounded-md border border-stone-200 p-2.5 dark:border-stone-800"
                >
                  <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                    {game.name}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                    {game.participantCount} người, {game.expenseCount} khoản · còn{" "}
                    {daysLeft(game.deletedAt)} ngày
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestore(game)}
                      disabled={pending}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-stone-300 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                    >
                      <RotateCcw size={13} />
                      Phục hồi
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePurge(game)}
                      disabled={pending}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-rose-200 px-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/40 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 size={13} />
                      Xóa hẳn
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
