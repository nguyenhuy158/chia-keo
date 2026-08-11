// Driving adapter phia UI: hook React Query bao quanh GameApiPort. Cac hook
// lay port tu container luc chay nen co the swap adapter (fetch/mock) ma
// khong dung den file nay.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiGameDetail, ApiPhoto } from "../../../shared/api-types";
import type { Contact } from "../../../shared/contacts";
import type {
  ContactInput,
  ContactUpdateInput,
  ExpenseInput,
  GameInput,
  McpTokenInput,
  ParticipantBatchInput,
  ParticipantInput,
  PhotoInput,
  PhotoUpdateInput,
  SettlementMode,
  TransferInput,
  UserPreferences,
  UserPreferencesPatch,
} from "../../../shared/schemas";
import { DEFAULT_USER_PREFERENCES } from "../../../shared/schemas";
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

/** Danh ba suy ra tu participant nen phai lam moi khi participant doi. */
export const contactKeys = { all: ["contacts"] as const };

/** Thung rac tach khoi ["games"] de danh sach chinh khong keo theo mot query nua. */
/** Tuy chon hien thi cua user; doc mot lan, cac man dung chung cache nay. */
export const preferenceKeys = { all: ["preferences"] as const };

export const trashKeys = { all: ["games-trash"] as const };

/**
 * Lich su co khoa rieng ngoai ["games"]: moi mutation deu sinh them dong lich
 * su nen phai lam moi, nhung nguoc lai mo tab Lich su khong can tai lai game.
 */
export const eventKeys = { list: (gameId: string) => ["events", gameId] as const };

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

/**
 * Tuy chon lay tu server nen chua co du lieu la con dung mac dinh — component
 * khong phai xu ly trang thai "chua biet".
 */
export function usePreferences(): UserPreferences {
  const query = useQuery({
    queryKey: preferenceKeys.all,
    queryFn: () => getGameApi().preferences.get(),
  });

  return query.data?.preferences || DEFAULT_USER_PREFERENCES;
}

/**
 * Cap nhat lac quan: cong tac phai lat ngay theo tay nguoi dung, ket qua tu
 * server ve sau chi de xac nhan. Loi thi tra lai gia tri cu.
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: UserPreferencesPatch) => getGameApi().preferences.update(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: preferenceKeys.all });
      const previous = queryClient.getQueryData<{ preferences: UserPreferences }>(
        preferenceKeys.all,
      );

      queryClient.setQueryData(preferenceKeys.all, {
        preferences: { ...(previous?.preferences || DEFAULT_USER_PREFERENCES), ...patch },
      });

      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(preferenceKeys.all, context.previous);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(preferenceKeys.all, data);
    },
  });
}

export function useContacts() {
  return useQuery({
    queryKey: contactKeys.all,
    queryFn: () => getGameApi().contacts.list(),
    select: (data) => data.contacts,
  });
}

/**
 * Cac mutation danh ba tra ve luon danh sach da gop, nen ghi thang vao cache:
 * khoi mot vong invalidate + fetch lai cho moi lan sua mot dong.
 */
function useContactMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<{ contacts: Contact[] }>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      queryClient.setQueryData(contactKeys.all, data);
    },
  });
}

export function useCreateContact() {
  return useContactMutation((input: ContactInput) => getGameApi().contacts.create(input));
}

export function useUpdateContact() {
  return useContactMutation((variables: { contactId: string; input: ContactUpdateInput }) =>
    getGameApi().contacts.update(variables.contactId, variables.input),
  );
}

export function useDeleteContact() {
  return useContactMutation((contactId: string) => getGameApi().contacts.remove(contactId));
}

export function useGameEvents(gameId: string, enabled: boolean) {
  return useQuery({
    queryKey: eventKeys.list(gameId),
    queryFn: () => getGameApi().gameEvents.list(gameId),
    select: (data) => data.events,
    // Chi tai khi nguoi dung thuc su mo tab Lich su.
    enabled,
  });
}

export function useUndoGameEvent() {
  return useGameDetailMutation(
    (eventId: string) => getGameApi().gameEvents.undo(eventId),
    { refreshPhotos: true },
  );
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

/** Cuoc chia trong thung rac; chi tai khi nguoi dung mo phan thung rac. */
export function useTrashedGames(enabled: boolean) {
  return useQuery({
    queryKey: trashKeys.all,
    queryFn: () => getGameApi().games.trash(),
    enabled,
  });
}

/** Xoa mem: cuoc chia roi vao thung rac chu chua mat. */
export function useDeleteGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameId: string) => getGameApi().games.remove(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameKeys.all });
      queryClient.invalidateQueries({ queryKey: trashKeys.all });
    },
  });
}

export function useRestoreGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameId: string) => getGameApi().games.restore(gameId),
    onSuccess: (detail) => {
      queryClient.setQueryData(gameKeys.detail(detail.id), detail);
      queryClient.invalidateQueries({ queryKey: gameKeys.all });
      queryClient.invalidateQueries({ queryKey: trashKeys.all });
    },
  });
}

export function usePurgeGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameId: string) => getGameApi().games.purge(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trashKeys.all });
    },
  });
}

type GameDetailMutationOptions = {
  /**
   * Lam moi luon danh sach anh: dung cho cac thao tac co the xoa khoan chi,
   * vi anh dinh kem se tro thanh anh chung cua cuoc chia.
   */
  refreshPhotos?: boolean;
  /** Lam moi danh ba: dung cho thao tac them/sua/xoa nguoi tham gia. */
  refreshContacts?: boolean;
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
      // Moi thao tac deu ghi lich su, nen tab Lich su luon phai lam moi.
      queryClient.invalidateQueries({ queryKey: eventKeys.list(detail.id) });
      if (options.refreshContacts) {
        queryClient.invalidateQueries({ queryKey: contactKeys.all });
      }
    },
  });
}

export function useAddParticipant(gameId: string) {
  return useGameDetailMutation(
    (input: ParticipantInput) => getGameApi().participants.create(gameId, input),
    { refreshContacts: true },
  );
}

/** Them nhieu nguoi mot luot (chon tu danh ba). */
export function useAddParticipants(gameId: string) {
  return useGameDetailMutation(
    (input: ParticipantBatchInput) => getGameApi().participants.createMany(gameId, input),
    { refreshContacts: true },
  );
}

export function useRemoveParticipant() {
  return useGameDetailMutation(
    (participantId: string) => getGameApi().participants.remove(participantId),
    { refreshPhotos: true, refreshContacts: true },
  );
}

export function useUpdateParticipant() {
  return useGameDetailMutation(
    (variables: { participantId: string; input: Partial<ParticipantInput> }) =>
      getGameApi().participants.update(variables.participantId, variables.input),
    { refreshContacts: true },
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

export function useReorderExpenses(gameId: string) {
  return useGameDetailMutation((expenseIds: string[]) =>
    getGameApi().expenses.reorder(gameId, expenseIds),
  );
}

export function useReorderParticipants(gameId: string) {
  return useGameDetailMutation((participantIds: string[]) =>
    getGameApi().participants.reorder(gameId, participantIds),
  );
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

export function useAddCollaborator(gameId: string) {
  return useGameDetailMutation((email: string) => getGameApi().collaborators.add(gameId, email));
}

export function useRemoveCollaborator(gameId: string) {
  return useGameDetailMutation((collaboratorUserId: string) =>
    getGameApi().collaborators.remove(gameId, collaboratorUserId),
  );
}

export function useRemovePendingCollaborator(gameId: string) {
  return useGameDetailMutation((email: string) =>
    getGameApi().collaborators.removePending(gameId, email),
  );
}

/** Chi tai khi panel chia se dang mo (xem `enabled`), khong phai luc nao cung can. */
export function useShareCandidates(gameId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["share-candidates", gameId],
    queryFn: () => getGameApi().collaborators.listCandidates(gameId),
    enabled,
  });
}
