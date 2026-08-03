// Port cho backend API. Adapter hien tai la fetch (http-game-api); test hoac
// che do offline co the cam adapter khac vao container.

import type {
  ApiAiSuggestionResponse,
  ApiBank,
  ApiGame,
  ApiGameDetail,
  ApiPhoto,
  ApiPhotoDetail,
  ApiShareView,
} from "../../../shared/api-types";
import type {
  ExpenseInput,
  GameInput,
  GameUpdateInput,
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
  participants: {
    create(gameId: string, input: ParticipantInput): Promise<ApiGameDetail>;
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
  banks: {
    /** Danh ba ngan hang VietQR cho dropdown, server cache o D1. */
    list(): Promise<ApiBank[]>;
  };
  ai: {
    suggestExpense(gameId: string, text: string): Promise<ApiAiSuggestionResponse>;
    scanReceipt(
      gameId: string,
      image: { mimeType: string; data: string },
    ): Promise<ApiAiSuggestionResponse>;
  };
};
