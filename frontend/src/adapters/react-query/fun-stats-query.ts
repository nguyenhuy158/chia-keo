// Hook rieng cho thong ke vui — tach khoi queries.ts vi khong lien quan gi
// den cache cua mot cuoc chia cu the (khong invalidate theo gameKeys).

import { useQuery } from "@tanstack/react-query";
import { getGameApi } from "../../core/container";

export const funStatsKeys = { all: ["fun-stats"] as const };

export function useFunStats() {
  return useQuery({
    queryKey: funStatsKeys.all,
    queryFn: () => getGameApi().funStats.get(),
  });
}
