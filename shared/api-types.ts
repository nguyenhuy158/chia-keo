import type { ResolvedAiExpense } from "./ai";
import type { SettlementMode } from "./schemas";
import type { BalanceRow, ExpenseKind, SettlementRow, SplitMode } from "./split";

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
  kind: ExpenseKind;
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
  settlementMode: SettlementMode;
  createdAt: string;
  participants: ApiParticipant[];
  expenses: ApiExpense[];
  summary: ApiSummary;
  shareLink: ApiShareLink | null;
};

export type ApiShareView = {
  code: string;
  name: string;
  settlementMode: SettlementMode;
  participants: ApiParticipant[];
  expenses: ApiExpense[];
  summary: ApiSummary;
};

/** Ngan hang ho tro VietQR, lay tu api.vietqr.io va cache o D1. */
export type ApiBank = {
  /** Ma BIN 6 chu so (chuan Napas). */
  bin: string;
  /** Ma ngan hang dung trong URL anh VietQR, vi du "VCB". */
  code: string;
  shortName: string;
  name: string;
};

export type ApiBankListResponse = {
  banks: ApiBank[];
  /** Du lieu den tu dau: cache/upstream/stale-cache/fallback (de chan doan). */
  source: string;
};

export type ApiError = {
  error: string;
};
