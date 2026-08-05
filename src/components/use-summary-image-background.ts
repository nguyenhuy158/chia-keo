import { useCallback, useEffect, useState } from "react";
import {
  getStoredSummaryImageBackgroundId,
  storeSummaryImageBackgroundId,
} from "../adapters/browser/summary-image-backgrounds";

/**
 * Nen anh duoc chon o hai cho (menu Copy va card xem truoc) nhung phai la mot.
 * Moi cho tu giu state rieng thi doi ben nay ben kia van hien nen cu, va nguoi
 * dung copy ra anh khac voi anh dang xem. Danh sach listener nay de moi cho
 * dang mo cung duoc cap nhat.
 */
const listeners = new Set<(id: string) => void>();

export function useSummaryImageBackground(): [string, (id: string) => void] {
  const [backgroundId, setBackgroundId] = useState(getStoredSummaryImageBackgroundId);

  useEffect(() => {
    listeners.add(setBackgroundId);
    return () => {
      listeners.delete(setBackgroundId);
    };
  }, []);

  const chooseBackground = useCallback((id: string) => {
    storeSummaryImageBackgroundId(id);
    for (const listener of listeners) listener(id);
  }, []);

  return [backgroundId, chooseBackground];
}
