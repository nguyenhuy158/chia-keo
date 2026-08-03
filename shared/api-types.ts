import type { ResolvedAiExpense } from "./ai";
import type { BalanceRow, SettlementRow, SplitMode } from "./split";

export type ApiAiSuggestionResponse = {
  suggestion: ResolvedAiExpense;
};

export type ApiUser = {
  id: string;
  username: string;
  name: string;
};

export type ApiGame = {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  participantCount: number;
  expenseCount: number;
};

export type ApiParticipant = {
  id: string;
  name: string;
  bankId: string;
  accountNo: string;
  accountName: string;
};

export type ApiExpenseSplit = {
  participantId: string;
  amount: number;
  weight: number | null;
};

export type ApiExpense = {
  id: string;
  kind: "expense" | "transfer";
  title: string;
  amount: number;
  note: string;
  payerParticipantId: string;
  splitMode: SplitMode;
  splitParticipantIds: string[];
  splits: ApiExpenseSplit[];
  createdAt: string;
};

/** Anh cua cuoc chia, chi kem ban thu nho de luoi anh tai nhanh. */
export type ApiPhoto = {
  id: string;
  expenseId: string | null;
  caption: string;
  mimeType: string;
  width: number;
  height: number;
  /** Base64 anh thu nho. */
  thumbData: string;
  createdAt: string;
};

/** Anh kem du lieu goc, chi tra khi mo xem toan man hinh. */
export type ApiPhotoDetail = ApiPhoto & {
  data: string;
};

export type ApiShareLink = {
  token: string;
  enabled: boolean;
};

export type ApiSummary = {
  totalExpense: number;
  balances: BalanceRow[];
  settlements: SettlementRow[];
};

export type ApiGameDetail = {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  participants: ApiParticipant[];
  expenses: ApiExpense[];
  summary: ApiSummary;
  shareLink: ApiShareLink | null;
};

export type ApiShareView = {
  code: string;
  name: string;
  participants: ApiParticipant[];
  expenses: ApiExpense[];
  summary: ApiSummary;
};

export type ApiError = {
  error: string;
};
