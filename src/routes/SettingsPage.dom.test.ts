import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../components/McpTokenPanel", () => ({
  McpTokenPanel: () => "MCP token panel",
}));
vi.mock("../components/ProfileNamePanel", () => ({
  ProfileNamePanel: () => "Profile name panel",
}));

import { SettingsPage } from "./SettingsPage";

describe("SettingsPage", () => {
  it("shows account settings and a way back to the home page", () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    act(() => root.render(createElement(SettingsPage)));
    expect(host.textContent).toContain("Trang chính");
    expect(host.textContent).toContain("Cài đặt");
    expect(host.textContent).toContain("Profile name panel");
    expect(host.textContent).toContain("MCP token panel");
    act(() => root.unmount());
    host.remove();
  });
});
