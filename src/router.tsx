import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { EmptyState, PageShell } from "./components/ui";
import { AppLayout } from "./routes/AppLayout";
import { FunStatsPage } from "./routes/FunStatsPage";
import { GamePage } from "./routes/GamePage";
import { HomePage } from "./routes/HomePage";
import { LoginPage } from "./routes/LoginPage";
import { SettingsPage } from "./routes/SettingsPage";
import { SharePage } from "./routes/SharePage";

function ErrorScreen({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <EmptyState title={title} description={description} />
      <Link
        to="/"
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
      >
        Về trang chủ
      </Link>
    </div>
  );
}

const rootRoute = createRootRoute({
  component: () => (
    <PageShell>
      <Outlet />
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <ErrorScreen title="Không tìm thấy trang" description="Đường dẫn này không tồn tại hoặc đã bị xóa." />
    </PageShell>
  ),
  errorComponent: () => (
    <PageShell>
      <ErrorScreen title="Có lỗi xảy ra" description="Đã có sự cố ngoài dự kiến. Thử tải lại trang." />
    </PageShell>
  ),
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const shareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/share/$token",
  component: SharePage,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: AppLayout,
});

const homeRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  component: HomePage,
});

const gameRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/games/$gameId",
  component: GamePage,
});

const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/settings",
  component: SettingsPage,
});

const funStatsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/fun",
  component: FunStatsPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  shareRoute,
  appRoute.addChildren([homeRoute, gameRoute, settingsRoute, funStatsRoute]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
