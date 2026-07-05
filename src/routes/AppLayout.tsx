import { Navigate, Outlet, useNavigate } from "@tanstack/react-router";
import { LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { GamesSidebar } from "../components/GamesSidebar";
import { MobileShellContext } from "../components/mobile-shell";
import { Drawer } from "../components/overlays";
import { ThemeToggle } from "../components/theme";
import { LoadingState } from "../components/ui";
import { authClient } from "../lib/auth-client";

export function AppLayout() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [gamesOpen, setGamesOpen] = useState(false);

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-7xl px-5 py-10">
        <LoadingState />
      </div>
    );
  }

  if (!session?.user) {
    return <Navigate to="/login" />;
  }

  async function handleLogout() {
    await authClient.signOut();
    navigate({ to: "/login" });
  }

  const displayName = session.user.displayUsername || session.user.name;

  return (
    <MobileShellContext.Provider value={{ openGames: () => setGamesOpen(true) }}>
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setGamesOpen(true)}
              aria-label="Danh sách cuộc chơi"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-stone-300 text-stone-700 transition hover:bg-stone-50 active:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800 dark:active:bg-stone-700 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-lg font-extrabold text-transparent sm:text-xl">
                Chia kèo
              </h1>
              <p className="hidden text-sm text-stone-600 dark:text-stone-400 sm:block">
                Tính tiền nhóm và sinh QR nhận tiền.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-stone-600 dark:text-stone-400 sm:inline">
              {displayName}
            </span>
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 active:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800 dark:active:bg-stone-700"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Thoát</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-4 sm:px-5 sm:py-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <GamesSidebar />
        </div>
        <section>
          <Outlet />
        </section>
      </main>

      <Drawer open={gamesOpen} onClose={() => setGamesOpen(false)} title="Cuộc chơi">
        <GamesSidebar onNavigate={() => setGamesOpen(false)} />
      </Drawer>
    </MobileShellContext.Provider>
  );
}
