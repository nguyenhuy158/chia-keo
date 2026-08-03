// Port cho backend API. Adapter hien tai la fetch (http-game-api); test hoac
// che do offline co the cam adapter khac vao container.

import type {
  ApiAiSuggestionResponse,
  ApiGame,
  ApiGameDetail,
  ApiShareView,
} from "../../../shared/api-types";
import type {
  ExpenseInput,
  GameInput,
  ParticipantInput,
  TransferInput,
} from "../../../shared/schemas";

export type GameApiPort = {
  games: {
    list(): Promise<ApiGame[]>;
    detail(gameId: string): Promise<ApiGameDetail>;
    create(input: GameInput): Promise<ApiGameDetail>;
    rename(gameId: string, input: GameInput): Promise<ApiGameDetail>;
    remove(gameId: string): Promise<{ ok: boolean }>;
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
  share: {
    view(token: string): Promise<ApiShareView>;
  };
  ai: {
    suggestExpense(gameId: string, text: string): Promise<ApiAiSuggestionResponse>;
    scanReceipt(
      gameId: string,
      image: { mimeType: string; data: string },
    ): Promise<ApiAiSuggestionResponse>;
  };
};
