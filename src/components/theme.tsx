import { Monitor, Moon, Sun } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyTheme,
  getStoredTheme,
  resolveTheme,
  storeTheme,
  type ThemeMode,
} from "../lib/theme";

type ThemeContextValue = {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme phai duoc dung ben trong ThemeProvider");
  return value;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  // Khi chon "system", lang nghe thay doi cua he thong.
  useEffect(() => {
    if (mode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    storeTheme(next);
    setModeState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolved: resolveTheme(mode), setMode }),
    [mode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const MODE_META: Record<ThemeMode, { icon: typeof Sun; label: string }> = {
  system: { icon: Monitor, label: "Theo hệ thống" },
  light: { icon: Sun, label: "Sáng" },
  dark: { icon: Moon, label: "Tối" },
};

/** Nut nho xoay vong system -> light -> dark. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { mode, setMode } = useTheme();
  const { icon: Icon, label } = MODE_META[mode];

  return (
    <button
      type="button"
      onClick={() => setMode(NEXT_MODE[mode])}
      aria-label={`Giao diện: ${label}. Nhấn để đổi`}
      title={`Giao diện: ${label}`}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-stone-300 text-stone-700 transition hover:bg-stone-50 active:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800 dark:active:bg-stone-700 ${className}`}
    >
      <Icon size={18} />
    </button>
  );
}
