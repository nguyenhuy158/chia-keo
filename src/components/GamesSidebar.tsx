import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, ReceiptText } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useCreateGame, useGames } from "../lib/queries";

const gameFormSchema = z.object({
  name: z.string().trim().min(1, "Nhap ten cuoc choi"),
});

type GameFormValues = z.infer<typeof gameFormSchema>;

export function GamesSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const gamesQuery = useGames();
  const createGame = useCreateGame();

  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: { name: "" },
  });

  const handleCreate = form.handleSubmit(async (values) => {
    const detail = await createGame.mutateAsync(values);
    form.reset({ name: "" });
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
          Tao cuoc choi
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="game-name"
            {...form.register("name")}
            className="h-11 min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-violet-600 focus:ring-2 focus:ring-violet-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:ring-violet-900/40 sm:h-10"
            placeholder="Da Nang 2026"
          />
          <button
            type="submit"
            disabled={createGame.isPending}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-violet-600 text-white transition hover:bg-violet-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700 sm:h-10 sm:w-10"
            aria-label="Tao cuoc choi"
          >
            <Plus size={18} />
          </button>
        </div>
        {form.formState.errors.name && (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            {form.formState.errors.name.message}
          </p>
        )}
      </form>

      <section className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold text-stone-800 dark:text-stone-200">
          <ReceiptText size={17} />
          Cuoc choi
        </div>
        {gamesQuery.isPending ? (
          <p className="px-1 py-4 text-sm text-stone-500 dark:text-stone-400">Dang tai...</p>
        ) : gamesQuery.data && gamesQuery.data.length > 0 ? (
          <div className="space-y-2">
            {gamesQuery.data.map((game) => (
              <Link
                key={game.id}
                to="/games/$gameId"
                params={{ gameId: game.id }}
                onClick={() => onNavigate?.()}
                className="block w-full rounded-md border border-stone-200 bg-white px-3 py-3 text-left transition hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800"
                activeProps={{
                  className:
                    "border-violet-600 bg-violet-50 dark:border-violet-500 dark:bg-violet-500/15",
                }}
              >
                <span className="block text-sm font-semibold text-stone-950 dark:text-stone-50">
                  {game.name}
                </span>
                <span className="mt-1 block text-xs text-stone-500 dark:text-stone-400">
                  {game.participantCount} nguoi, {game.expenseCount} khoan
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="px-1 py-4 text-sm text-stone-500 dark:text-stone-400">Chua co cuoc choi nao.</p>
        )}
      </section>
    </aside>
  );
}
