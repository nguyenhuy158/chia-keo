import { RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ApiTrashGame } from "../../shared/api-types";
import { TRASH_RETENTION_DAYS } from "../../shared/schemas";
import { usePurgeGame, useRestoreGame, useTrashedGames } from "../adapters/react-query/queries";
import { useToast } from "./Toast";

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
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const trashQuery = useTrashedGames(open);
  const restoreGame = useRestoreGame();
  const purgeGame = usePurgeGame();

  const pending = restoreGame.isPending || purgeGame.isPending;
  const games = trashQuery.data || [];

  async function handleRestore(game: ApiTrashGame) {
    try {
      await restoreGame.mutateAsync(game.id);
      toast(`Đã phục hồi "${game.name}"`);
    } catch {
      toast("Không phục hồi được", "error");
    }
  }

  async function handlePurge(game: ApiTrashGame) {
    // Buoc nay khong hoan tac duoc nen phai hoi, va hoi kem ten cho khoi nham.
    if (!window.confirm(`Xóa hẳn "${game.name}"? Không lấy lại được.`)) return;

    try {
      await purgeGame.mutateAsync(game.id);
      toast("Đã xóa hẳn");
    } catch {
      toast("Không xóa được", "error");
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
            <p className="px-1 py-3 text-sm text-stone-500 dark:text-stone-400">Đang tải...</p>
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
