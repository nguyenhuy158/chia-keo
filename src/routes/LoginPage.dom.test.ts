import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { state, ssoLoginUrl } = vi.hoisted(() => ({
  state: { loading: false, user: null as { id: string } | null },
  ssoLoginUrl: vi.fn(),
}));

vi.mock("../adapters/react-query/session-query", () => ({
  useAppSession: () => ({ user: state.user, isPending: state.loading }),
}));
vi.mock("../adapters/browser/sso", () => ({ ssoLoginUrl }));
vi.mock("@tanstack/react-router", () => ({ Navigate: () => "home redirect" }));
vi.mock("../components/theme", () => ({ ThemeToggle: () => "theme toggle" }));
vi.mock("../components/brand", () => ({ BrandMark: () => "brand mark" }));
vi.mock("../components/ui", () => ({ LoadingState: () => "loading session" }));

import { LoginPage } from "./LoginPage";

let host: HTMLDivElement;
let root: Root;

function render() {
  act(() => root.render(createElement(LoginPage)));
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.loading = false;
  state.user = null;
  ssoLoginUrl.mockReset().mockReturnValue("https://sso.example/login");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("LoginPage", () => {
  it("waits for the session and redirects a signed-in user", () => {
    state.loading = true;
    render();
    expect(host.textContent).toContain("loading session");
    state.loading = false;
    state.user = { id: "user-1" };
    render();
    expect(host.textContent).toContain("home redirect");
  });

  it("starts Google SSO and disables repeat clicks", () => {
    const fakeWindow = Object.create(window) as Window;
    Object.defineProperty(fakeWindow, "location", {
      value: { href: "" },
      configurable: true,
    });
    vi.stubGlobal("window", fakeWindow);
    render();
    const button = host.querySelector("button") as HTMLButtonElement;
    expect(button.textContent).toContain("Tiếp tục với Google");
    act(() => button.click());
    expect(fakeWindow.location.href).toBe("https://sso.example/login");
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain("Đang chuyển...");
  });
});
