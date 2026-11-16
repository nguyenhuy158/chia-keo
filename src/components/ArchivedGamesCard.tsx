import { useNavigate } from "@tanstack/react-router";
import { Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { ApiGame } from "../../shared/api-types";
import {
  useArchivedGames,
  useReopenGame,
} from "../adapters/react-query/queries";
import { formatDateTime } from "./format-datetime";
import { SkeletonCard } from "./ui";
import { usePersistentOpen } from "./use-persistent-open";

/**
 * Cuoc choi da luu tru (vi du cuoc thu nghiem). Gap lai mac dinh: chi mo khi can
 * khoi phuc hoac xem lai, nen gap lai thi khong ton request nao.
 */
export function ArchivedGamesCard({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = usePersistentOpen("archived-games", false);
  const archivedQuery = useArchivedGames(open);
  const reopenGame = useReopenGame();
  const games = archivedQuery.data || [];

  async function handleRestore(game: ApiGame) {
    try {
      await reopenGame.mutateAsync(game.id);
      toast.success(`Đã khôi phục "${game.name}"`);
    } catch {
      toast.error("Không khôi phục được");
    }
  }

  function handleOpen(game: ApiGame) {
    navigate({ to: "/games/$gameId", params: { gameId: game.id } });
    onNavigate?.();
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-800 dark:text-stone-200">
          <Archive size={16} />
          Đã lưu trữ
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-label="Đã lưu trữ"
          className="rounded-md px-2 py-1 text-xs font-semibold text-violet-700 transition hover:bg-primary-soft dark:text-violet-300"
        >
          {open ? "Ẩn" : "Xem"}
        </button>
      </div>

      {open &&
        (archivedQuery.isPending ? (
          <div className="mt-1 space-y-2">
            <SkeletonCard />
          </div>
        ) : games.length === 0 ? (
          <p className="px-1 py-3 text-sm text-fg-muted">
            Chưa lưu trữ cuộc chơi nào. Dùng “Lưu trữ” ở menu ba chấm của cuộc
            chơi.
          </p>
        ) : (
          <div className="mt-1 space-y-2">
            {games.map((game) => (
              <div
                key={game.id}
                className="rounded-md border border-border p-2.5"
              >
                <button
                  type="button"
                  onClick={() => handleOpen(game)}
                  className="block w-full text-left"
                >
                  <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                    {game.name}
                  </p>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {game.participantCount} người, {game.expenseCount} khoản
                    {game.closedAt
                      ? ` · lưu ${formatDateTime(game.closedAt)}`
                      : ""}
                  </p>
                </button>
                {game.isOwner && (
                  <button
                    type="button"
                    onClick={() => handleRestore(game)}
                    disabled={reopenGame.isPending}
                    className="mt-2 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-md border border-stone-300 text-xs font-semibold text-stone-700 transition hover:bg-surface-muted disabled:opacity-50 dark:border-stone-700 dark:text-stone-200"
                  >
                    <RotateCcw size={13} />
                    Khôi phục
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
    </section>
  );
}
