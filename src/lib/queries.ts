import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiGameDetail } from "../../shared/api-types";
import type { ExpenseInput, GameInput, ParticipantInput } from "../../shared/schemas";
import { api } from "./api";

export const gameKeys = {
  all: ["games"] as const,
  detail: (gameId: string) => ["games", gameId] as const,
  share: (token: string) => ["share", token] as const,
};

export function useGames() {
  return useQuery({ queryKey: gameKeys.all, queryFn: api.games.list });
}

export function useGame(gameId: string) {
  return useQuery({
    queryKey: gameKeys.detail(gameId),
    queryFn: () => api.games.detail(gameId),
  });
}

export function useShareView(token: string) {
  return useQuery({
    queryKey: gameKeys.share(token),
    queryFn: () => api.share.view(token),
    retry: false,
  });
}

export function useCreateGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: GameInput) => api.games.create(input),
    onSuccess: (detail) => {
      queryClient.setQueryData(gameKeys.detail(detail.id), detail);
      queryClient.invalidateQueries({ queryKey: gameKeys.all });
    },
  });
}

export function useDeleteGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameId: string) => api.games.remove(gameId),
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
    api.participants.create(gameId, input),
  );
}

export function useRemoveParticipant() {
  return useGameDetailMutation((participantId: string) => api.participants.remove(participantId));
}

export function useAddExpense(gameId: string) {
  return useGameDetailMutation((input: ExpenseInput) => api.expenses.create(gameId, input));
}

export function useUpdateExpense() {
  return useGameDetailMutation(
    (variables: { expenseId: string; input: Partial<ExpenseInput> }) =>
      api.expenses.update(variables.expenseId, variables.input),
  );
}

export function useRemoveExpense() {
  return useGameDetailMutation((expenseId: string) => api.expenses.remove(expenseId));
}

export function useRenameGame(gameId: string) {
  return useGameDetailMutation((name: string) => api.games.rename(gameId, { name }));
}

export function useAiSuggestExpense(gameId: string) {
  return useMutation({
    mutationFn: (text: string) => api.ai.suggestExpense(gameId, text),
  });
}

export function useAiScanReceipt(gameId: string) {
  return useMutation({
    mutationFn: (image: { mimeType: string; data: string }) => api.ai.scanReceipt(gameId, image),
  });
}

export function useRotateShareLink(gameId: string) {
  return useGameDetailMutation<void>(() => api.shareLinks.rotate(gameId));
}

export function useSetShareLinkEnabled(gameId: string) {
  return useGameDetailMutation((enabled: boolean) => api.shareLinks.setEnabled(gameId, enabled));
}
