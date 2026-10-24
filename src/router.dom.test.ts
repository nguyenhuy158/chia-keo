import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  routes: [] as Array<Record<string, unknown>>,
  lazy: [] as Array<() => Promise<unknown>>,
  routerOptions: undefined as Record<string, unknown> | undefined,
}));

vi.mock("@tanstack/react-router", async () => {
  const { createElement: element } = await import("react");
  const makeRoute = (options: Record<string, unknown>) => {
    state.routes.push(options);
    return {
      options,
      addChildren: (children: unknown[]) => ({ options, children }),
    };
  };
  return {
    Link: ({ children }: { children: string }) => element("a", null, children),
    Outlet: () => element("span", null, "outlet"),
    createRootRoute: makeRoute,
    createRoute: makeRoute,
    createRouter: (options: Record<string, unknown>) => {
      state.routerOptions = options;
      return options;
    },
    lazyRouteComponent: (loader: () => Promise<unknown>) => {
      state.lazy.push(loader);
      return () => element("span", null, "lazy");
    },
  };
});
vi.mock("./components/ui", () => ({
  EmptyState: ({ title }: { title: string }) => title,
  LoadingState: () => "loading",
  PageShell: ({ children }: { children: unknown }) => children,
}));
vi.mock("./routes/AppLayout", () => ({ AppLayout: () => "app" }));
vi.mock("./routes/HomePage", () => ({ HomePage: () => "home" }));
vi.mock("./routes/LoginPage", () => ({ LoginPage: () => "login" }));

import { router } from "./router";

let host: HTMLDivElement;
let root: Root;

function render(component: unknown) {
  act(() =>
    root.render(createElement(component as () => import("react").ReactNode)),
  );
}

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("router", () => {
  it("wires all routes and renders root, error and missing pages", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    expect(router).toBe(state.routerOptions);
    expect(state.routes).toHaveLength(9);
    expect(state.routes.map((route) => route.path)).toEqual([
      undefined,
      "/login",
      "/share/$token",
      undefined,
      "/",
      "/games/$gameId",
      "/settings",
      "/shuttles",
      "/fun",
    ]);
    for (const route of state.routes) {
      if (route.getParentRoute)
        expect((route.getParentRoute as () => unknown)()).toBeDefined();
    }
    const rootRoute = state.routes[0];
    render(rootRoute.component);
    expect(host.textContent).toContain("outlet");
    render(rootRoute.notFoundComponent);
    expect(host.textContent).toContain("Không tìm thấy trang");
    expect(host.textContent).toContain("Về trang chủ");
    render(rootRoute.errorComponent);
    expect(host.textContent).toContain("Có lỗi xảy ra");
    expect(state.lazy).toHaveLength(5);
    for (const loader of state.lazy) expect(await loader()).toBeDefined();
  });
});
