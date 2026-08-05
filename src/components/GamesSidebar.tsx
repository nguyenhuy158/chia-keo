import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { Copy, Minus, Plus, ReceiptText } from "lucide-react";
import type { MouseEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { MAX_QUICK_PARTICIPANTS } from "../../shared/schemas";
import { useCreateGame, useDuplicateGame, useGames } from "../adapters/react-query/queries";
import { ContactBookCard } from "./ContactBookCard";
import { TrashCard } from "./TrashCard";

const gameFormSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên cuộc chơi"),
  participantCount: z.number().int().min(0).max(MAX_QUICK_PARTICIPANTS),
});

type GameFormValues = z.infer<typeof gameFormSchema>;

export function GamesSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const gamesQuery = useGames();
  const createGame = useCreateGame();
  const duplicateGame = useDuplicateGame();

  async function handleDuplicate(event: MouseEvent, gameId: string) {
    event.preventDefault();
    event.stopPropagation();
    const detail = await duplicateGame.mutateAsync(gameId);
    navigate({ to: "/games/$gameId", params: { gameId: detail.id } });
    onNavigate?.();
  }

  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: { name: "", participantCount: 0 },
  });
  const participantCount = form.watch("participantCount");

  function stepParticipantCount(delta: number) {
    form.setValue(
      "participantCount",
      Math.min(MAX_QUICK_PARTICIPANTS, Math.max(0, participantCount + delta)),
    );
  }

  const handleCreate = form.handleSubmit(async (values) => {
    const detail = await createGame.mutateAsync(values);
    form.reset({ name: "", participantCount: 0 });
    navigate({ to: "/games/$gameId", params: { gameId: detail.id } });
    onNavigate?.();
  });

  return (
    <aside className="space-y-4">
      <form
        onSubmit={handleCreate}
        className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
      >
        <label className="text-sm font-medium text-stone-700 dark:text-stone-300" htmlFor="game-name">
          Tạo cuộc chơi
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="game-name"
            {...form.register("name")}
            className="h-11 min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-3 text-base text-stone-950 sm:text-sm outline-none transition placeholder:text-stone-400 focus:border-violet-600 focus:ring-2 focus:ring-violet-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:ring-violet-900/40 sm:h-10"
            placeholder="Đà Nẵng 2026"
          />
          <button
            type="submit"
            disabled={createGame.isPending}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-violet-600 text-white transition hover:bg-violet-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700 sm:h-10 sm:w-10"
            aria-label="Tạo cuộc chơi"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Tao san N nguoi "Người 1", "Người 2"... de vao viec ngay, sua ten
            sau. 0 nguoi thi khong tao ai (hanh vi cu, tu them tay). */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-stone-500 dark:text-stone-400">Tạo sẵn số người</span>
          <div className="flex h-9 items-center overflow-hidden rounded-lg border border-stone-300 dark:border-stone-700">
            <button
              type="button"
              onClick={() => stepParticipantCount(-1)}
              disabled={participantCount <= 0}
              aria-label="Giảm số người tạo sẵn"
              className="flex h-full w-9 items-center justify-center text-stone-600 transition hover:bg-stone-100 active:bg-stone-200 disabled:opacity-30 disabled:hover:bg-transparent dark:text-stone-300 dark:hover:bg-stone-700 dark:active:bg-stone-600"
            >
              <Minus size={14} />
            </button>
            <span className="tabular w-8 text-center text-sm font-medium text-stone-900 dark:text-stone-100">
              {participantCount}
            </span>
            <button
              type="button"
              onClick={() => stepParticipantCount(1)}
              disabled={participantCount >= MAX_QUICK_PARTICIPANTS}
              aria-label="Tăng số người tạo sẵn"
              className="flex h-full w-9 items-center justify-center text-stone-600 transition hover:bg-stone-100 active:bg-stone-200 disabled:opacity-30 disabled:hover:bg-transparent dark:text-stone-300 dark:hover:bg-stone-700 dark:active:bg-stone-600"
            >
              <Plus size={14} />
            </button>
          </div>
          {participantCount > 0 && (
            <span className="text-xs text-stone-400 dark:text-stone-500">
              “Người 1”…“Người {participantCount}”
            </span>
          )}
        </div>
        {form.formState.errors.name && (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            {form.formState.errors.name.message}
          </p>
        )}
      </form>

      <ContactBookCard />

      <section className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold text-stone-800 dark:text-stone-200">
          <ReceiptText size={17} />
          Cuộc chơi
        </div>
        {gamesQuery.isPending ? (
          <p className="px-1 py-4 text-sm text-stone-500 dark:text-stone-400">Đang tải...</p>
        ) : gamesQuery.data && gamesQuery.data.length > 0 ? (
          <div className="space-y-2">
            {gamesQuery.data.map((game) => (
              <Link
                key={game.id}
                to="/games/$gameId"
                params={{ gameId: game.id }}
                onClick={() => onNavigate?.()}
                className="relative block w-full rounded-md border border-stone-200 bg-white px-3 py-3 pr-11 text-left transition hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800"
                activeProps={{
                  className:
                    "border-violet-600 bg-violet-50 dark:border-violet-500 dark:bg-violet-500/15",
                }}
              >
                <span className="block text-sm font-semibold text-stone-950 dark:text-stone-50">
                  {game.name}
                </span>
                <span className="mt-1 block text-xs text-stone-500 dark:text-stone-400">
                  {game.participantCount} người, {game.expenseCount} khoản
                </span>
                <button
                  type="button"
                  onClick={(event) => handleDuplicate(event, game.id)}
                  disabled={duplicateGame.isPending}
                  aria-label="Nhân bản cuộc chơi"
                  title="Nhân bản"
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-stone-400 transition hover:bg-stone-200 hover:text-stone-700 disabled:opacity-40 dark:text-stone-500 dark:hover:bg-stone-700 dark:hover:text-stone-200"
                >
                  <Copy size={15} />
                </button>
              </Link>
            ))}
          </div>
        ) : (
          <p className="px-1 py-4 text-sm text-stone-500 dark:text-stone-400">Chưa có cuộc chơi nào.</p>
        )}
      </section>
      <TrashCard />
    </aside>
  );
}
