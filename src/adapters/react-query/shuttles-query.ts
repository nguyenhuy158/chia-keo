// Hook cho kho cau — tach khoi queries.ts: kho cau thuoc tai khoan, khong
// nam trong cache cua mot cuoc chia nao nen khong dung gameKeys.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiShuttleStock } from "../../../shared/api-types";
import type { ShuttleEntryInput } from "../../../shared/schemas";
import { getGameApi } from "../../core/container";

export const shuttleKeys = { all: ["shuttles"] as const };

export function useShuttleStock() {
  return useQuery({
    queryKey: shuttleKeys.all,
    queryFn: () => getGameApi().shuttles.get(),
  });
}

/**
 * Cac mutation deu tra ve nguyen trang thai kho sau khi ghi, nen ghi thang vao
 * cache: bam "-1" la thay so doi ngay, khong cho mot vong fetch lai.
 */
function useShuttleMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<ApiShuttleStock>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      queryClient.setQueryData(shuttleKeys.all, data);
    },
  });
}

export function useCreateShuttleEntry() {
  return useShuttleMutation((input: ShuttleEntryInput) =>
    getGameApi().shuttles.createEntry(input),
  );
}

export function useDeleteShuttleEntry() {
  return useShuttleMutation((entryId: string) => getGameApi().shuttles.removeEntry(entryId));
}
