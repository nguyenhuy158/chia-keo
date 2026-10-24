import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { state, navigate, signOut, ssoLogoutUrl } = vi.hoisted(() => ({
  state: { loading: false, user: null as { name: string } | null },
  navigate: vi.fn(),
  signOut: vi.fn(),
  ssoLogoutUrl: vi.fn(),
}));

vi.mock("../adapters/react-query/session-query", () => ({
  useAppSession: () => ({ user: state.user, isPending: state.loading }),
}));
vi.mock("../adapters/browser/auth-client", () => ({
  authClient: { signOut },
}));
vi.mock("../adapters/browser/sso", () => ({ ssoLogoutUrl }));
vi.mock("@tanstack/react-router", async () => {
  const { createElement: element } = await import("react");
  return {
    Link: ({ children, to, ...props }: { children: ReactNode; to: string }) =>
      element("a", { href: to, ...props }, children),
    Navigate: () => "login redirect",
    Outlet: () => "page outlet",
    useNavigate: () => navigate,
  };
});
vi.mock("../components/brand", () => ({ BrandMark: () => "brand mark" }));
vi.mock("../components/theme", () => ({ ThemeToggle: () => "theme toggle" }));
vi.mock("../components/GamesSidebar", async () => {
  const { createElement: element, useContext } = await import("react");
  const { MobileShellContext } = await import("../components/mobile-shell");
  return {
    GamesSidebar: ({ onNavigate }: { onNavigate?: () => void }) => {
      const shell = useContext(MobileShellContext);
      if (!shell) return null;
      return element(
        "div",
        null,
        "games sidebar",
        element(
          "button",
          { onClick: shell.openGames },
          "open games from context",
        ),
        onNavigate &&
          element("button", { onClick: onNavigate }, "navigate from drawer"),
      );
    },
  };
});
vi.mock("../components/ui", () => ({ LoadingState: () => "loading session" }));
vi.mock("../components/overlays", async () => {
  const { createElement: element } = await import("react");
  return {
    Drawer: ({
      open,
      onClose,
      children,
    }: {
      open: boolean;
      onClose: () => void;
      children: ReactNode;
    }) =>
      open
        ? element(
            "div",
            null,
            element("button", { onClick: onClose }, "close drawer"),
            children,
          )
        : null,
  };
});

import { AppLayout } from "./AppLayout";

let host: HTMLDivElement;
let root: Root;

function render() {
  act(() => root.render(createElement(AppLayout)));
}

function button(label: string) {
  return [...host.querySelectorAll("button")].find(
    (item) =>
      item.textContent?.trim() === label ||
      item.getAttribute("aria-label") === label,
  ) as HTMLButtonElement;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.loading = false;
  state.user = null;
  navigate.mockReset();
  signOut.mockReset().mockResolvedValue(undefined);
  ssoLogoutUrl.mockReset().mockReturnValue("https://sso.example/logout");
  vi.stubGlobal("fetch", vi.fn());
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("AppLayout", () => {
  it("waits for a session and redirects guests", () => {
    state.loading = true;
    render();
    expect(host.textContent).toContain("loading session");
    state.loading = false;
    render();
    expect(host.textContent).toContain("login redirect");
  });

  it("shows the shell and opens and closes its mobile game drawer", () => {
    state.user = { name: "An" };
    render();
    expect(host.textContent).toContain("An");
    expect(host.textContent).toContain("page outlet");
    expect(host.querySelector('a[href="/settings"]')).not.toBeNull();
    expect(host.querySelector('a[href="/fun"]')).not.toBeNull();
    expect(host.querySelector('a[href="/shuttles"]')).not.toBeNull();
    act(() => button("Danh sách cuộc chơi").click());
    expect(host.textContent).toContain("close drawer");
    act(() => button("navigate from drawer").click());
    expect(host.textContent).not.toContain("close drawer");
    act(() => button("open games from context").click());
    expect(host.textContent).toContain("close drawer");
    act(() => button("close drawer").click());
    expect(host.textContent).not.toContain("close drawer");
  });

  it("navigates locally when no session remains after logout", async () => {
    state.user = { name: "An" };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ user: null })),
    );
    render();
    await act(async () => button("Thoát").click());
    expect(signOut).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/session"),
      { credentials: "include" },
    );
    expect(navigate).toHaveBeenCalledWith({ to: "/login" });
  });

  it("logs out at SSO when a parent-domain session remains", async () => {
    state.user = { name: "An" };
    signOut.mockRejectedValueOnce(new Error("no better-auth session"));
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ user: { id: "user-1" } })),
    );
    const fakeWindow = Object.create(window) as Window;
    Object.defineProperty(fakeWindow, "location", {
      value: { href: "" },
      configurable: true,
    });
    vi.stubGlobal("window", fakeWindow);
    render();
    await act(async () => button("Thoát").click());
    expect(fakeWindow.location.href).toBe("https://sso.example/logout");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("treats a failed session response as signed out", async () => {
    state.user = { name: "An" };
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));
    render();
    await act(async () => button("Thoát").click());
    expect(navigate).toHaveBeenCalledWith({ to: "/login" });
  });
});
