// Driving adapter phia UI: hook React Query bao quanh GameApiPort. Cac hook
// lay port tu container luc chay nen co the swap adapter (fetch/mock) ma
// khong dung den file nay.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiGameDetail } from "../../../shared/api-types";
import type {
  ExpenseInput,
  GameInput,
  ParticipantInput,
  TransferInput,
} from "../../../shared/schemas";
import { getGameApi } from "../../core/container";

export const gameKeys = {
  all: ["games"] as const,
  detail: (gameId: string) => ["games", gameId] as const,
  share: (token: string) => ["share", token] as const,
};

export function useGames() {
  return useQuery({ queryKey: gameKeys.all, queryFn: () => getGameApi().games.list() });
}

export function useGame(gameId: string) {
  return useQuery({
    queryKey: gameKeys.detail(gameId),
    queryFn: () => getGameApi().games.detail(gameId),
  });
}

export function useShareView(token: string) {
  return useQuery({
    queryKey: gameKeys.share(token),
    queryFn: () => getGameApi().share.view(token),
    retry: false,
  });
}

export function useCreateGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: GameInput) => getGameApi().games.create(input),
    onSuccess: (detail) => {
      queryClient.setQueryData(gameKeys.detail(detail.id), detail);
      queryClient.invalidateQueries({ queryKey: gameKeys.all });
    },
  });
}

export function useDeleteGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameId: string) => getGameApi().games.remove(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameKeys.all });
    },
  });
}

/**
 * Cac mutation tra ve ApiGameDetail moi nhat: cap nhat cache detail va lam moi
 * danh sach game (participantCount/expenseCount thay doi).
 */
function useGameDetailMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<ApiGameDetail>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (detail) => {
      queryClient.setQueryData(gameKeys.detail(detail.id), detail);
      queryClient.invalidateQueries({ queryKey: gameKeys.all });
    },
  });
}

export function useAddParticipant(gameId: string) {
  return useGameDetailMutation((input: ParticipantInput) =>
    getGameApi().participants.create(gameId, input),
  );
}

export function useRemoveParticipant() {
  return useGameDetailMutation((participantId: string) =>
    getGameApi().participants.remove(participantId),
  );
}

export function useUpdateParticipant() {
  return useGameDetailMutation(
    (variables: { participantId: string; input: Partial<ParticipantInput> }) =>
      getGameApi().participants.update(variables.participantId, variables.input),
  );
}

export function useAddExpense(gameId: string) {
  return useGameDetailMutation((input: ExpenseInput) =>
    getGameApi().expenses.create(gameId, input),
  );
}

export function useUpdateExpense() {
  return useGameDetailMutation(
    (variables: { expenseId: string; input: Partial<ExpenseInput> }) =>
      getGameApi().expenses.update(variables.expenseId, variables.input),
  );
}

export function useRemoveExpense() {
  return useGameDetailMutation((expenseId: string) => getGameApi().expenses.remove(expenseId));
}

export function useAddTransfer(gameId: string) {
  return useGameDetailMutation((input: TransferInput) =>
    getGameApi().transfers.create(gameId, input),
  );
}

export function useRenameGame(gameId: string) {
  return useGameDetailMutation((name: string) => getGameApi().games.rename(gameId, { name }));
}

export function useAiSuggestExpense(gameId: string) {
  return useMutation({
    mutationFn: (text: string) => getGameApi().ai.suggestExpense(gameId, text),
  });
}

export function useAiScanReceipt(gameId: string) {
  return useMutation({
    mutationFn: (image: { mimeType: string; data: string }) =>
      getGameApi().ai.scanReceipt(gameId, image),
  });
}

export function useRotateShareLink(gameId: string) {
  return useGameDetailMutation<void>(() => getGameApi().shareLinks.rotate(gameId));
}

export function useSetShareLinkEnabled(gameId: string) {
  return useGameDetailMutation((enabled: boolean) =>
    getGameApi().shareLinks.setEnabled(gameId, enabled),
  );
}
