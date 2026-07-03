import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { PageShell } from "./components/ui";
import { AppLayout } from "./routes/AppLayout";
import { GamePage } from "./routes/GamePage";
import { HomePage } from "./routes/HomePage";
import { LoginPage } from "./routes/LoginPage";
import { SharePage } from "./routes/SharePage";

const rootRoute = createRootRoute({
  component: () => (
    <PageShell>
      <Outlet />
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

const routeTree = rootRoute.addChildren([
  loginRoute,
  shareRoute,
  appRoute.addChildren([homeRoute, gameRoute]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
