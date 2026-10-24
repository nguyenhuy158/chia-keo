import { act, createElement, Fragment } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiPhoto } from "../../shared/api-types";
import { SUMMARY_IMAGE_BACKGROUNDS } from "../adapters/browser/summary-image-backgrounds";
import { BrandMark } from "./brand";
import { formatDateTime, formatTime } from "./format-datetime";
import { MobileShellContext, useMobileShell } from "./mobile-shell";
import { PhotoGrid } from "./PhotoGrid";
import { usePersistentOpen } from "./use-persistent-open";
import { useSummaryImageBackground } from "./use-summary-image-background";

let host: HTMLDivElement;
let root: Root;
let stored: Map<string, string>;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  stored = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
    removeItem: (key: string) => stored.delete(key),
    clear: () => stored.clear(),
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("shared display widgets", () => {
  it("opens the selected photo and labels receipt photos accessibly", () => {
    const photos = [
      {
        id: "first",
        expenseId: "expense",
        caption: "",
        mimeType: "image/png",
        thumbData: "thumb",
      },
      {
        id: "second",
        expenseId: null,
        caption: "Ảnh sân",
        mimeType: "image/png",
        thumbData: "thumb",
      },
      {
        id: "third",
        expenseId: null,
        caption: "",
        mimeType: "image/png",
        thumbData: "thumb",
      },
    ] as ApiPhoto[];
    const onOpen = vi.fn();
    act(() =>
      root.render(
        createElement(PhotoGrid, {
          photos,
          expenseTitleById: new Map([["expense", "Tiền sân"]]),
          onOpen,
        }),
      ),
    );
    expect(
      host
        .querySelector("button[aria-label='Tiền sân'] img")
        ?.getAttribute("src"),
    ).toBe("data:image/png;base64,thumb");
    expect(host.querySelector("button[aria-label='Ảnh sân']")).not.toBeNull();
    act(() =>
      (
        host.querySelector("button[aria-label='Ảnh 3']") as HTMLButtonElement
      ).click(),
    );
    expect(onOpen).toHaveBeenCalledWith(2);
  });

  it("keeps gradient ids separate for two marks and accepts size and class", () => {
    act(() =>
      root.render(
        createElement(
          Fragment,
          null,
          createElement(BrandMark),
          createElement(BrandMark, { size: 32, className: "small" }),
        ),
      ),
    );
    const marks = host.querySelectorAll("svg[aria-label='Chia kèo']");
    expect(marks).toHaveLength(2);
    expect(marks[0].getAttribute("width")).toBe("44");
    expect(marks[1].getAttribute("width")).toBe("32");
    expect(marks[1].getAttribute("class")).toBe("small");
    expect(marks[0].querySelector("linearGradient")?.id).not.toBe(
      marks[1].querySelector("linearGradient")?.id,
    );
  });

  it("provides the mobile game drawer action through context", () => {
    const openGames = vi.fn();
    function DrawerButton() {
      const shell = useMobileShell();
      return createElement(
        "button",
        { type: "button", onClick: () => shell?.openGames() },
        shell ? "Open" : "No shell",
      );
    }
    act(() => root.render(createElement(DrawerButton)));
    expect(host.textContent).toBe("No shell");
    act(() =>
      root.render(
        createElement(
          MobileShellContext.Provider,
          { value: { openGames } },
          createElement(DrawerButton),
        ),
      ),
    );
    act(() => (host.querySelector("button") as HTMLButtonElement).click());
    expect(openGames).toHaveBeenCalledOnce();
  });

  it("formats Vietnamese date and time with an optional year", () => {
    const date = "2026-10-24T07:00:00.000Z";
    expect(formatDateTime(date)).toContain("2026");
    expect(formatDateTime(date, { includeYear: false })).not.toContain("2026");
    expect(formatTime(date)).toMatch(/\d{2}:\d{2}/);
  });
});

describe("persistent UI choices", () => {
  it("uses default open state during server rendering", () => {
    function Panel() {
      const [open] = usePersistentOpen("server", true);
      return createElement("span", null, open ? "Open" : "Closed");
    }
    const browserWindow = window;
    vi.stubGlobal("window", undefined);
    expect(renderToString(createElement(Panel))).toContain("Open");
    vi.stubGlobal("window", browserWindow);
  });

  it("restores a saved open or closed state on a fresh render", () => {
    function Panel() {
      const [open] = usePersistentOpen("history", false);
      return createElement("span", null, open ? "Open" : "Closed");
    }
    stored.set("chia-keo-open:history", "1");
    expect(renderToString(createElement(Panel))).toContain("Open");
    stored.set("chia-keo-open:history", "0");
    expect(renderToString(createElement(Panel))).toContain("Closed");
  });

  it("stores both direct and functional open state changes", () => {
    function Panel() {
      const [open, setOpen] = usePersistentOpen("history", false);
      return createElement(
        "button",
        { type: "button", onClick: () => setOpen((value) => !value) },
        open ? "Open" : "Closed",
      );
    }
    act(() => root.render(createElement(Panel)));
    expect(host.textContent).toBe("Closed");
    act(() => (host.querySelector("button") as HTMLButtonElement).click());
    expect(host.textContent).toBe("Open");
    expect(localStorage.getItem("chia-keo-open:history")).toBe("1");
    act(() =>
      root.render(
        createElement(
          Fragment,
          null,
          createElement(Panel),
          createElement("span"),
        ),
      ),
    );
    expect(host.textContent).toContain("Open");
    act(() => (host.querySelector("button") as HTMLButtonElement).click());
    expect(localStorage.getItem("chia-keo-open:history")).toBe("0");
  });

  it("uses default state when browser storage is unavailable", () => {
    const original = window.localStorage;
    vi.spyOn(original, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(original, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    function Panel() {
      const [open, setOpen] = usePersistentOpen("trash", true);
      return createElement(
        "button",
        { type: "button", onClick: () => setOpen(false) },
        open ? "Open" : "Closed",
      );
    }
    act(() => root.render(createElement(Panel)));
    expect(host.textContent).toBe("Open");
    act(() => (host.querySelector("button") as HTMLButtonElement).click());
    expect(host.textContent).toBe("Closed");
    vi.restoreAllMocks();
  });

  it("syncs summary background selection between two mounted controls", () => {
    const chosen = SUMMARY_IMAGE_BACKGROUNDS[1].id;
    function Choice({ name }: { name: string }) {
      const [id, choose] = useSummaryImageBackground();
      return createElement(
        "button",
        { type: "button", onClick: () => choose(chosen) },
        `${name}: ${id}`,
      );
    }
    act(() =>
      root.render(
        createElement(
          Fragment,
          null,
          createElement(Choice, { name: "menu" }),
          createElement(Choice, { name: "preview" }),
        ),
      ),
    );
    act(() => (host.querySelector("button") as HTMLButtonElement).click());
    expect(
      [...host.querySelectorAll("button")].map((button) => button.textContent),
    ).toEqual([`menu: ${chosen}`, `preview: ${chosen}`]);
  });
});
