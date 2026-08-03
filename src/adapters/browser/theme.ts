export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "chia-keo-theme";
const DARK_THEME_COLOR = "#0c0a09";
const LIGHT_THEME_COLOR = "#faf5ff";

export function getStoredTheme(): ThemeMode {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    // localStorage co the bi chan; ve mac dinh theo he thong.
  }
  return "system";
}

export function prefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") return prefersDark() ? "dark" : "light";
  return mode;
}

export function applyTheme(mode: ThemeMode) {
  const resolved = resolveTheme(mode);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
  }
}

export function storeTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Bo qua neu khong luu duoc.
  }
}
