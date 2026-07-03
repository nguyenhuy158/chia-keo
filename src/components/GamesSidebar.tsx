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

export function GamesSidebar() {
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
  });

  return (
    <aside className="space-y-4">
      <form onSubmit={handleCreate} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <label className="text-sm font-medium text-stone-700" htmlFor="game-name">
          Tao cuoc choi
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="game-name"
            {...form.register("name")}
            className="h-10 min-w-0 flex-1 rounded-md border border-stone-300 px-3 text-sm outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
            placeholder="Da Nang 2026"
          />
          <button
            type="submit"
            disabled={createGame.isPending}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-violet-600 text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-stone-300"
            aria-label="Tao cuoc choi"
          >
            <Plus size={18} />
          </button>
        </div>
        {form.formState.errors.name && (
          <p className="mt-1 text-xs text-rose-600">{form.formState.errors.name.message}</p>
        )}
      </form>

      <section className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold text-stone-800">
          <ReceiptText size={17} />
          Cuoc choi
        </div>
        {gamesQuery.isPending ? (
          <p className="px-1 py-4 text-sm text-stone-500">Dang tai...</p>
        ) : gamesQuery.data && gamesQuery.data.length > 0 ? (
          <div className="space-y-2">
            {gamesQuery.data.map((game) => (
              <Link
                key={game.id}
                to="/games/$gameId"
                params={{ gameId: game.id }}
                className="block w-full rounded-md border border-stone-200 bg-white px-3 py-3 text-left transition hover:bg-stone-50"
                activeProps={{ className: "border-violet-600 bg-violet-50" }}
              >
                <span className="block text-sm font-semibold text-stone-950">{game.name}</span>
                <span className="mt-1 block text-xs text-stone-500">
                  {game.participantCount} nguoi, {game.expenseCount} khoan
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="px-1 py-4 text-sm text-stone-500">Chua co cuoc choi nao.</p>
        )}
      </section>
    </aside>
  );
}
