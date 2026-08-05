// Port cho backend API. Adapter hien tai la fetch (http-game-api); test hoac
// che do offline co the cam adapter khac vao container.

import type {
  ApiAiSuggestionResponse,
  ApiCreatedMcpToken,
  ApiGame,
  ApiGameDetail,
  ApiMcpToken,
  ApiPhoto,
  ApiPhotoDetail,
  ApiShareView,
} from "../../../shared/api-types";
import type { Contact } from "../../../shared/contacts";
import type {
  ExpenseInput,
  GameInput,
  GameUpdateInput,
  McpTokenInput,
  ParticipantBatchInput,
  ParticipantInput,
  PhotoInput,
  PhotoUpdateInput,
  TransferInput,
} from "../../../shared/schemas";

export type GameApiPort = {
  games: {
    list(): Promise<ApiGame[]>;
    detail(gameId: string): Promise<ApiGameDetail>;
    create(input: GameInput): Promise<ApiGameDetail>;
    update(gameId: string, input: GameUpdateInput): Promise<ApiGameDetail>;
    remove(gameId: string): Promise<{ ok: boolean }>;
    duplicate(gameId: string): Promise<ApiGameDetail>;
  };
  contacts: {
    /** Nguoi quen suy ra tu cac cuoc chia da tao, nguoi hay di cung len truoc. */
    list(): Promise<{ contacts: Contact[] }>;
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
  };
  transfers: {
    create(gameId: string, input: TransferInput): Promise<ApiGameDetail>;
  };
  shareLinks: {
    rotate(gameId: string): Promise<ApiGameDetail>;
    setEnabled(gameId: string, enabled: boolean): Promise<ApiGameDetail>;
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
