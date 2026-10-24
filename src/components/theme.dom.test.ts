import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyTheme,
  getStoredTheme,
  prefersDark,
  resolveTheme,
  storeTheme,
} from "../adapters/browser/theme";
import { ThemeProvider, ThemeToggle, useTheme } from "./theme";

let host: HTMLDivElement;
let root: Root;
let dark = false;
let listeners: Array<() => void>;
let media: MediaQueryList;
let storage: Storage;

function CurrentTheme() {
  const { mode, resolved } = useTheme();
  return createElement("span", { id: "current-theme" }, `${mode}:${resolved}`);
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const values = new Map<string, string>();
  storage = {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
  vi.stubGlobal("localStorage", storage);
  document.documentElement.classList.remove("dark");
  listeners = [];
  dark = false;
  media = {
    matches: false,
    addEventListener: vi.fn((_event, listener) =>
      listeners.push(listener as () => void),
    ),
    removeEventListener: vi.fn((_event, listener) => {
      listeners = listeners.filter((item) => item !== listener);
    }),
  } as unknown as MediaQueryList;
  Object.defineProperty(media, "matches", { get: () => dark });
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => media),
  );
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.querySelector('meta[name="theme-color"]')?.remove();
  document.documentElement.classList.remove("dark");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("browser theme", () => {
  it("đọc chế độ lưu và quay về hệ thống khi dữ liệu hỏng", () => {
    for (const mode of ["light", "dark", "system"] as const) {
      localStorage.setItem("chia-keo-theme", mode);
      expect(getStoredTheme()).toBe(mode);
    }
    localStorage.setItem("chia-keo-theme", "invalid");
    expect(getStoredTheme()).toBe("system");
    vi.spyOn(storage, "getItem").mockImplementationOnce(() => {
      throw new Error("blocked");
    });
    expect(getStoredTheme()).toBe("system");
  });

  it("theo màu hệ thống và cập nhật meta theme-color khi có", () => {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.append(meta);
    expect(prefersDark()).toBe(false);
    expect(resolveTheme("system")).toBe("light");
    applyTheme("light");
    expect(meta.content).toBe("#faf5ff");
    dark = true;
    expect(prefersDark()).toBe(true);
    expect(resolveTheme("system")).toBe("dark");
    expect(resolveTheme("dark")).toBe("dark");
    applyTheme("system");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(meta.content).toBe("#0c0a09");
    meta.remove();
    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("lưu lựa chọn và bỏ qua lỗi storage", () => {
    storeTheme("dark");
    expect(localStorage.getItem("chia-keo-theme")).toBe("dark");
    vi.spyOn(storage, "setItem").mockImplementationOnce(() => {
      throw new Error("blocked");
    });
    expect(() => storeTheme("light")).not.toThrow();
  });
});

describe("ThemeProvider", () => {
  it("báo lỗi khi useTheme nằm ngoài provider", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => act(() => root.render(createElement(CurrentTheme)))).toThrow(
      "useTheme phai duoc dung ben trong ThemeProvider",
    );
    error.mockRestore();
  });

  it("đổi vòng hệ thống, sáng, tối và theo dõi hệ thống", () => {
    act(() =>
      root.render(
        createElement(
          ThemeProvider,
          null,
          createElement(CurrentTheme),
          createElement(ThemeToggle, { className: "custom" }),
        ),
      ),
    );
    const toggle = host.querySelector("button") as HTMLButtonElement;
    expect(host.querySelector("#current-theme")?.textContent).toBe(
      "system:light",
    );
    expect(toggle.getAttribute("aria-label")).toContain("Theo hệ thống");
    expect(toggle.className).toContain("custom");
    dark = true;
    act(() => {
      for (const listener of listeners) listener();
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    act(() => toggle.click());
    expect(host.querySelector("#current-theme")?.textContent).toBe(
      "light:light",
    );
    expect(localStorage.getItem("chia-keo-theme")).toBe("light");
    expect(toggle.getAttribute("title")).toContain("Sáng");
    act(() => toggle.click());
    expect(host.querySelector("#current-theme")?.textContent).toBe("dark:dark");
    expect(toggle.getAttribute("title")).toContain("Tối");
    act(() => toggle.click());
    expect(host.querySelector("#current-theme")?.textContent).toBe(
      "system:dark",
    );
    expect(media.removeEventListener).toHaveBeenCalled();
  });
});
