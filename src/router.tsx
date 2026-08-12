import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from "@tanstack/react-router";
import { EmptyState, LoadingState, PageShell } from "./components/ui";
import { AppLayout } from "./routes/AppLayout";
import { HomePage } from "./routes/HomePage";
import { LoginPage } from "./routes/LoginPage";

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
  component: lazyRouteComponent(() => import("./routes/SharePage"), "SharePage"),
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
  component: lazyRouteComponent(() => import("./routes/GamePage"), "GamePage"),
});

const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/settings",
  component: lazyRouteComponent(() => import("./routes/SettingsPage"), "SettingsPage"),
});

const funStatsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/fun",
  component: lazyRouteComponent(() => import("./routes/FunStatsPage"), "FunStatsPage"),
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  shareRoute,
  appRoute.addChildren([homeRoute, gameRoute, settingsRoute, funStatsRoute]),
]);

export const router = createRouter({
  routeTree,
  defaultPendingComponent: LoadingState,
  defaultPendingMs: 200,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
