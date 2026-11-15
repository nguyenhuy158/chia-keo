import { useEffect, useState } from "react";

export const EXIT_MS = 150;

export function usePresence(open: boolean, exitMs = EXIT_MS) {
  const [lingering, setLingering] = useState(false);

  useEffect(() => {
    if (open) {
      setLingering(true);
      return;
    }
    const timer = window.setTimeout(() => setLingering(false), exitMs);
    return () => window.clearTimeout(timer);
  }, [open, exitMs]);

  return { mounted: open || lingering, closing: !open };
}

export function motion(closing: boolean, enter: string, exit: string) {
  return closing ? `${exit} both` : enter;
}
