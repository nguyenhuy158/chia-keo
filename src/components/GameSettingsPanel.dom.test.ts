import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { preferences, mutate } = vi.hoisted(() => ({
  preferences: {
    summaryShowQr: true,
    summaryShowAvatar: true,
    roundDownRefunds: false,
  },
  mutate: vi.fn(),
}));

vi.mock("../adapters/react-query/queries", () => ({
  usePreferences: () => preferences,
  useUpdatePreferences: () => ({ mutate }),
}));

import { GameSettingsPanel } from "./GameSettingsPanel";

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mutate.mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(createElement(GameSettingsPanel)));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function toggle(label: string) {
  return [...host.querySelectorAll<HTMLButtonElement>("[role='switch']")].find(
    (item) => item.textContent?.includes(label),
  ) as HTMLButtonElement;
}

describe("GameSettingsPanel", () => {
  it("shows the saved values and saves each toggle", () => {
    expect(toggle("Không hoàn tiền lẻ").getAttribute("aria-checked")).toBe(
      "false",
    );
    expect(toggle("Hiện QR").getAttribute("aria-checked")).toBe("true");
    act(() => toggle("Không hoàn tiền lẻ").click());
    expect(mutate).toHaveBeenCalledWith({ roundDownRefunds: true });
    act(() => toggle("Hiện QR").click());
    expect(mutate).toHaveBeenCalledWith({ summaryShowQr: false });
    act(() => toggle("Hiện avatar").click());
    expect(mutate).toHaveBeenCalledWith({ summaryShowAvatar: false });
  });
});
