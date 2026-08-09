// Hook rieng, cung ly do voi fun-stats-query: so du gop khong thuoc cache cua
// mot cuoc chia cu the nen khong invalidate theo gameKeys.

import { useQuery } from "@tanstack/react-query";
import { getGameApi } from "../../core/container";

export const crossBalancesKeys = { all: ["cross-balances"] as const };

export function useCrossBalances(enabled = true) {
  return useQuery({
    queryKey: crossBalancesKeys.all,
    queryFn: () => getGameApi().crossBalances.get(),
    enabled,
  });
}
