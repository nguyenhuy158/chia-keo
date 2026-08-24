import { useNavigate } from "@tanstack/react-router";
import { CircleCheckBig, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { ApiGame } from "../../shared/api-types";
import { describeCloseMode } from "../../shared/game-closing";
import { useClosedGames, useReopenGame } from "../adapters/react-query/queries";
import { formatDateTime } from "./format-datetime";
import { usePersistentOpen } from "./use-persistent-open";
import { SkeletonCard } from "./ui";

/**
 * Cuoc choi da dong. Gap lai mac dinh giong thung rac: danh sach chinh chi nen
 * co viec dang lam, con day la cho ghe lai khi can xem lai hoac mo lai — gap
 * lai thi cung khong ton mot request cho danh sach khong ai xem.
 */
export function ClosedGamesCard({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = usePersistentOpen("closed-games", false);
  const closedQuery = useClosedGames(open);
  const reopenGame = useReopenGame();

  const games = closedQuery.data || [];

  async function handleReopen(game: ApiGame) {
    try {
      await reopenGame.mutateAsync(game.id);
      toast.success(`Đã mở lại "${game.name}"`);
    } catch {
      toast.error("Không mở lại được");
    }
  }

  function handleOpen(game: ApiGame) {
    navigate({ to: "/games/$gameId", params: { gameId: game.id } });
    onNavigate?.();
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-800 dark:text-stone-200">
          <CircleCheckBig size={16} />
          Đã đóng
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="rounded-md px-2 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10"
        >
          {open ? "Ẩn" : "Xem"}
        </button>
      </div>

      {open && (
        <>
          {closedQuery.isPending ? (
            <div className="mt-1 space-y-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : games.length === 0 ? (
            <p className="px-1 py-3 text-sm text-stone-500 dark:text-stone-400">
              Chưa có cuộc chơi nào đóng. Trả xong tiền là cuộc tự đóng.
            </p>
          ) : (
            <div className="mt-1 space-y-2">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="rounded-md border border-stone-200 p-2.5 dark:border-stone-800"
                >
                  <button
                    type="button"
                    onClick={() => handleOpen(game)}
                    className="block w-full text-left"
                  >
                    <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                      {game.name}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                      {game.participantCount} người, {game.expenseCount} khoản ·{" "}
                      {describeCloseMode(game.closeMode)}
                      {game.closedAt ? ` · ${formatDateTime(game.closedAt)}` : ""}
                    </p>
                  </button>
                  {game.isOwner && (
                    <button
                      type="button"
                      onClick={() => handleReopen(game)}
                      disabled={reopenGame.isPending}
                      className="mt-2 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-md border border-stone-300 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                    >
                      <RotateCcw size={13} />
                      Mở lại
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
