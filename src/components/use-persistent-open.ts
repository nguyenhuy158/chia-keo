import { useState } from "react";

const PREFIX = "chia-keo-open:";

function readStored(key: string, defaultOpen: boolean): boolean {
  if (typeof window === "undefined") return defaultOpen;
  const stored = window.localStorage.getItem(PREFIX + key);
  return stored === null ? defaultOpen : stored === "1";
}

/**
 * Nhu useState(boolean) nhung nho lai qua cac lan tai trang — dung cho cac
 * card gap/mo o sidebar (TrashCard, HistoryPanel) de nguoi hay mo xem khong
 * phai bam lai moi lan vao app.
 */
export function usePersistentOpen(
  key: string,
  defaultOpen: boolean,
): [boolean, (next: boolean | ((current: boolean) => boolean)) => void] {
  const [open, setOpenState] = useState(() => readStored(key, defaultOpen));

  function setOpen(next: boolean | ((current: boolean) => boolean)) {
    setOpenState((current) => {
      const value = typeof next === "function" ? next(current) : next;
      try {
        window.localStorage.setItem(PREFIX + key, value ? "1" : "0");
      } catch {
        // Safari an danh/dung het quota: bo qua, chi mat kha nang nho, khong vo app.
      }
      return value;
    });
  }

  return [open, setOpen];
}
