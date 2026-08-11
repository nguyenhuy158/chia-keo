// Port cho backend API. Adapter hien tai la fetch (http-game-api); test hoac
// che do offline co the cam adapter khac vao container.

import type {
  ApiAiSuggestionResponse,
  ApiCrossGameBalances,
  ApiCreatedMcpToken,
  ApiFunStats,
  ApiGame,
  ApiGameDetail,
  ApiMcpToken,
  ApiPhoto,
  ApiPhotoDetail,
  ApiShareCandidate,
  ApiShareView,
  ApiTrashGame,
} from "../../../shared/api-types";
import type { Contact } from "../../../shared/contacts";
import type { ApiGameEvent } from "../../../shared/game-events";
import type {
  ContactInput,
  ContactUpdateInput,
  ExpenseInput,
  GameInput,
  GameUpdateInput,
  McpTokenInput,
  ParticipantBatchInput,
  ParticipantInput,
  PhotoInput,
  PhotoUpdateInput,
  TransferInput,
  UserPreferences,
  UserPreferencesPatch,
} from "../../../shared/schemas";

export type GameApiPort = {
  games: {
    list(): Promise<ApiGame[]>;
    detail(gameId: string): Promise<ApiGameDetail>;
    create(input: GameInput): Promise<ApiGameDetail>;
    update(gameId: string, input: GameUpdateInput): Promise<ApiGameDetail>;
    remove(gameId: string): Promise<{ ok: boolean }>;
    duplicate(gameId: string): Promise<ApiGameDetail>;
    /** Cuoc chia trong thung rac; goi day cung don luon cac cuoc qua han giu. */
    trash(): Promise<ApiTrashGame[]>;
    restore(gameId: string): Promise<ApiGameDetail>;
    /** Xoa han, khong lay lai duoc. */
    purge(gameId: string): Promise<{ ok: boolean }>;
  };
  /** Thong ke vui, tach het khoi cac port khac; chi doc. */
  funStats: {
    get(): Promise<ApiFunStats>;
  };
  /** So du gop tat ca cuoc chia, dung cho phan "ai con no ai" o trang chu. */
  crossBalances: {
    get(): Promise<ApiCrossGameBalances>;
  };
  gameEvents: {
    /** Lich su thao tac cua cuoc chia, moi nhat truoc. */
    list(gameId: string): Promise<{ events: ApiGameEvent[] }>;
    /** Hoan tac mot thao tac (hien chi ho tro khoan chi da xoa). */
    undo(eventId: string): Promise<ApiGameDetail>;
  };
  preferences: {
    /** Tuy chon hien thi cua user, luu tren server nen doi may van con. */
    get(): Promise<{ preferences: UserPreferences }>;
    /** Chi gui field vua doi; tra ve toan bo tuy chon sau khi ghi. */
    update(patch: UserPreferencesPatch): Promise<{ preferences: UserPreferences }>;
  };
  contacts: {
    /** Danh ba tu nhap gop voi nguoi suy ra tu cac cuoc chia da tao. */
    list(): Promise<{ contacts: Contact[] }>;
    /** Ten da co trong danh ba thi cap nhat dong do, khong tao dong thu hai. */
    create(input: ContactInput): Promise<{ contacts: Contact[] }>;
    update(contactId: string, input: ContactUpdateInput): Promise<{ contacts: Contact[] }>;
    remove(contactId: string): Promise<{ contacts: Contact[] }>;
  };
  participants: {
    create(gameId: string, input: ParticipantInput): Promise<ApiGameDetail>;
    /** Them nhieu nguoi mot request; dung khi chon tu danh ba. */
    createMany(gameId: string, input: ParticipantBatchInput): Promise<ApiGameDetail>;
    update(participantId: string, input: Partial<ParticipantInput>): Promise<ApiGameDetail>;
    remove(participantId: string): Promise<ApiGameDetail>;
  };
  expenses: {
    create(gameId: string, input: ExpenseInput): Promise<ApiGameDetail>;
    update(expenseId: string, input: Partial<ExpenseInput>): Promise<ApiGameDetail>;
    remove(expenseId: string): Promise<ApiGameDetail>;
    reorder(gameId: string, expenseIds: string[]): Promise<ApiGameDetail>;
  };
  transfers: {
    create(gameId: string, input: TransferInput): Promise<ApiGameDetail>;
  };
  shareLinks: {
    rotate(gameId: string): Promise<ApiGameDetail>;
    setEnabled(gameId: string, enabled: boolean): Promise<ApiGameDetail>;
  };
  collaborators: {
    /** Chi chu cuoc choi goi duoc; nguoi duoc chia se khac chi doc `collaborators` trong detail. */
    add(gameId: string, email: string): Promise<ApiGameDetail>;
    remove(gameId: string, collaboratorUserId: string): Promise<ApiGameDetail>;
    /** Xoa invite "cho" (chua tung dang nhap nen chua co userId). */
    removePending(gameId: string, email: string): Promise<ApiGameDetail>;
    /** User da dang nhap he thong, chua duoc chia se cuoc nay — de click chon nhanh. */
    listCandidates(gameId: string): Promise<ApiShareCandidate[]>;
  };
  photos: {
    /** Danh sach anh cua cuoc chia, chi kem ban thu nho. */
    list(gameId: string): Promise<ApiPhoto[]>;
    /** Anh kem du lieu goc, dung khi mo xem toan man hinh. */
    detail(photoId: string): Promise<ApiPhotoDetail>;
    create(gameId: string, input: PhotoInput): Promise<ApiPhoto>;
    update(photoId: string, input: PhotoUpdateInput): Promise<ApiPhoto>;
    remove(photoId: string): Promise<{ ok: boolean }>;
  };
  share: {
    view(token: string): Promise<ApiShareView>;
    photos(token: string): Promise<ApiPhoto[]>;
    photo(token: string, photoId: string): Promise<ApiPhotoDetail>;
  };
  mcpTokens: {
    list(): Promise<ApiMcpToken[]>;
    /** Phan hoi kem `secret` - ban goc chi xuat hien dung lan tao nay. */
    create(input: McpTokenInput): Promise<ApiCreatedMcpToken>;
    revoke(tokenId: string): Promise<{ ok: boolean }>;
  };
  ai: {
    suggestExpense(gameId: string, text: string): Promise<ApiAiSuggestionResponse>;
    scanReceipt(
      gameId: string,
      image: { mimeType: string; data: string },
    ): Promise<ApiAiSuggestionResponse>;
  };
};
