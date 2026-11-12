import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "./cn";

export type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "ui-theme";

function readStored(): ThemeMode {
  if (typeof localStorage === "undefined") return "system";
  const value = localStorage.getItem(STORAGE_KEY);
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", resolveTheme(mode) === "dark");
}

type ThemeContextValue = {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme phai nam trong ThemeProvider");
  return value;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStored);

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  // Che do "system" phai doi theo cai dat may ngay ca khi app dang mo.
  useEffect(() => {
    if (mode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, next);
    setModeState(next);
  }, []);

  const value = useMemo(
    () => ({ mode, resolved: resolveTheme(mode), setMode }),
    [mode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

const NEXT: Record<ThemeMode, ThemeMode> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const LABEL: Record<ThemeMode, string> = {
  system: "Theo hệ thống",
  light: "Sáng",
  dark: "Tối",
};

const ICON: Record<ThemeMode, ReactNode> = {
  system: (
    <path d="M4 5h16v10H4zM8 19h8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10l1.4 1.4m0-12.8l-1.4 1.4m-10 10l-1.4 1.4" strokeLinecap="round" />
    </>
  ),
  dark: <path d="M20 13a8 8 0 11-9-9 6.5 6.5 0 009 9z" strokeLinejoin="round" />,
};

/** Nut nho xoay vong system -> light -> dark. */
export function ThemeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setMode(NEXT[mode])}
      aria-label={`Giao diện: ${LABEL[mode]}. Nhấn để đổi`}
      title={`Giao diện: ${LABEL[mode]}`}
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-ui text-fg-muted transition",
        "hover:bg-surface-muted hover:text-fg outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-10 sm:w-10",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
        {ICON[mode]}
      </svg>
    </button>
  );
}
