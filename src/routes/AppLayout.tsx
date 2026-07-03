import { Navigate, Outlet, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { GamesSidebar } from "../components/GamesSidebar";
import { LoadingState } from "../components/ui";
import { authClient } from "../lib/auth-client";

export function AppLayout() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

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
    <>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-xl font-semibold text-stone-950">Chia keo</h1>
            <p className="text-sm text-stone-600">Tinh tien nhom va sinh QR nhan tien.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-stone-600 sm:inline">{displayName}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            >
              <LogOut size={16} />
              Thoat
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <GamesSidebar />
        <section>
          <Outlet />
        </section>
      </main>
    </>
  );
}
