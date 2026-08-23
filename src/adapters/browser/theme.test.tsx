import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyTheme, getStoredTheme, prefersDark, resolveTheme, storeTheme } from "./theme";

function stubMatchMedia(dark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: dark })),
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  document.head.innerHTML = "";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getStoredTheme", () => {
  it("chua chon gi thi theo he thong", () => {
    expect(getStoredTheme()).toBe("system");
  });

  it("doc lai lua chon da luu", () => {
    storeTheme("dark");

    expect(getStoredTheme()).toBe("dark");
  });

  it("gia tri rac trong localStorage bi bo qua", () => {
    localStorage.setItem("chia-keo-theme", "mau-hong");

    expect(getStoredTheme()).toBe("system");
  });

  it("localStorage bi chan thi ve mac dinh, khong vo", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(getStoredTheme()).toBe("system");
  });
});

describe("storeTheme", () => {
  it("localStorage bi chan thi bo qua trong im lang", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => storeTheme("light")).not.toThrow();
  });
});

describe("resolveTheme", () => {
  it("chon tay thi giu nguyen", () => {
    stubMatchMedia(true);

    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("theo he thong thi doc prefers-color-scheme", () => {
    stubMatchMedia(true);
    expect(resolveTheme("system")).toBe("dark");

    stubMatchMedia(false);
    expect(resolveTheme("system")).toBe("light");
  });

  it("prefersDark tra ve dung ket qua matchMedia", () => {
    stubMatchMedia(true);

    expect(prefersDark()).toBe(true);
  });
});

describe("applyTheme", () => {
  it("bat class dark tren the html", () => {
    stubMatchMedia(false);

    applyTheme("dark");

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("doi mau thanh trinh duyet theo theme", () => {
    stubMatchMedia(false);
    const meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);

    applyTheme("dark");
    expect(meta.getAttribute("content")).toBe("#0c0a09");

    applyTheme("light");
    expect(meta.getAttribute("content")).toBe("#faf5ff");
  });

  it("trang khong co the meta thi van chay binh thuong", () => {
    stubMatchMedia(false);

    expect(() => applyTheme("light")).not.toThrow();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
