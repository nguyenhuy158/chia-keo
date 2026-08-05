// Driving adapter phia UI: hook React Query bao quanh GameApiPort. Cac hook
// lay port tu container luc chay nen co the swap adapter (fetch/mock) ma
// khong dung den file nay.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiGameDetail, ApiPhoto } from "../../../shared/api-types";
import type {
  ExpenseInput,
  GameInput,
  McpTokenInput,
  ParticipantInput,
  PhotoInput,
  PhotoUpdateInput,
  SettlementMode,
  TransferInput,
} from "../../../shared/schemas";
import { getGameApi } from "../../core/container";

export const gameKeys = {
  all: ["games"] as const,
  detail: (gameId: string) => ["games", gameId] as const,
  share: (token: string) => ["share", token] as const,
};

/**
 * Anh dung khoa rieng, khong nam duoi ["games"], de cac mutation khoan chi
 * khong lam moi lai toan bo luoi anh.
 */
export const photoKeys = {
  list: (gameId: string) => ["photos", gameId] as const,
  detail: (photoId: string) => ["photo", photoId] as const,
  shareList: (token: string) => ["share-photos", token] as const,
  shareDetail: (token: string, photoId: string) => ["share-photo", token, photoId] as const,
};

/** Anh goc khong bao gio doi nen giu trong cache ca phien lam viec. */
const PHOTO_DETAIL_STALE_TIME = Infinity;

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

export function useDuplicateGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameId: string) => getGameApi().games.duplicate(gameId),
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

type GameDetailMutationOptions = {
  /**
   * Lam moi luon danh sach anh: dung cho cac thao tac co the xoa khoan chi,
   * vi anh dinh kem se tro thanh anh chung cua cuoc chia.
   */
  refreshPhotos?: boolean;
};

/**
 * Cac mutation tra ve ApiGameDetail moi nhat: cap nhat cache detail va lam moi
 * danh sach game (participantCount/expenseCount thay doi).
 */
function useGameDetailMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<ApiGameDetail>,
  options: GameDetailMutationOptions = {},
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (detail) => {
      queryClient.setQueryData(gameKeys.detail(detail.id), detail);
      queryClient.invalidateQueries({ queryKey: gameKeys.all });
      if (options.refreshPhotos) {
        queryClient.invalidateQueries({ queryKey: photoKeys.list(detail.id) });
      }
    },
  });
}

export function useAddParticipant(gameId: string) {
  return useGameDetailMutation((input: ParticipantInput) =>
    getGameApi().participants.create(gameId, input),
  );
}

export function useRemoveParticipant() {
  return useGameDetailMutation(
    (participantId: string) => getGameApi().participants.remove(participantId),
    { refreshPhotos: true },
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
  return useGameDetailMutation((expenseId: string) => getGameApi().expenses.remove(expenseId), {
    refreshPhotos: true,
  });
}

export function useAddTransfer(gameId: string) {
  return useGameDetailMutation((input: TransferInput) =>
    getGameApi().transfers.create(gameId, input),
  );
}

export function useRenameGame(gameId: string) {
  return useGameDetailMutation((name: string) => getGameApi().games.update(gameId, { name }));
}

export function useSetSettlementMode(gameId: string) {
  return useGameDetailMutation((settlementMode: SettlementMode) =>
    getGameApi().games.update(gameId, { settlementMode }),
  );
}

/** Dau moi cho che do "pick"; chuoi rong la de he tu chon. */
export function useSetSettlementHost(gameId: string) {
  return useGameDetailMutation((settlementHostId: string) =>
    getGameApi().games.update(gameId, { settlementHostId }),
  );
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

export function usePhotos(gameId: string) {
  return useQuery({
    queryKey: photoKeys.list(gameId),
    queryFn: () => getGameApi().photos.list(gameId),
  });
}

export function usePhoto(photoId: string) {
  return useQuery({
    queryKey: photoKeys.detail(photoId),
    queryFn: () => getGameApi().photos.detail(photoId),
    enabled: Boolean(photoId),
    staleTime: PHOTO_DETAIL_STALE_TIME,
  });
}

export function useSharePhotos(token: string) {
  return useQuery({
    queryKey: photoKeys.shareList(token),
    queryFn: () => getGameApi().share.photos(token),
    retry: false,
  });
}

export function useSharePhoto(token: string, photoId: string) {
  return useQuery({
    queryKey: photoKeys.shareDetail(token, photoId),
    queryFn: () => getGameApi().share.photo(token, photoId),
    enabled: Boolean(photoId),
    staleTime: PHOTO_DETAIL_STALE_TIME,
    retry: false,
  });
}

/** Cap nhat cache luoi anh tai cho, khong can goi lai API danh sach. */
function usePhotoListCache(gameId: string) {
  const queryClient = useQueryClient();

  return (update: (photos: ApiPhoto[]) => ApiPhoto[]) => {
    queryClient.setQueryData<ApiPhoto[]>(photoKeys.list(gameId), (photos) => update(photos || []));
  };
}

export function useAddPhoto(gameId: string) {
  const updateCache = usePhotoListCache(gameId);

  return useMutation({
    mutationFn: (input: PhotoInput) => getGameApi().photos.create(gameId, input),
    onSuccess: (photo) => updateCache((photos) => [photo, ...photos]),
  });
}

export function useUpdatePhoto(gameId: string) {
  const updateCache = usePhotoListCache(gameId);

  return useMutation({
    mutationFn: (variables: { photoId: string; input: PhotoUpdateInput }) =>
      getGameApi().photos.update(variables.photoId, variables.input),
    onSuccess: (photo) =>
      updateCache((photos) => photos.map((row) => (row.id === photo.id ? photo : row))),
  });
}

export function useRemovePhoto(gameId: string) {
  const updateCache = usePhotoListCache(gameId);

  return useMutation({
    mutationFn: (photoId: string) => getGameApi().photos.remove(photoId).then(() => photoId),
    onSuccess: (photoId) => updateCache((photos) => photos.filter((row) => row.id !== photoId)),
  });
}

/** Token MCP khong lien quan den mot cuoc chia nao nen dung khoa rieng. */
export const mcpTokenKeys = {
  all: ["mcp-tokens"] as const,
};

export function useMcpTokens() {
  return useQuery({
    queryKey: mcpTokenKeys.all,
    queryFn: () => getGameApi().mcpTokens.list(),
  });
}

export function useCreateMcpToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: McpTokenInput) => getGameApi().mcpTokens.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpTokenKeys.all });
    },
  });
}

export function useRevokeMcpToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tokenId: string) => getGameApi().mcpTokens.revoke(tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpTokenKeys.all });
    },
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
