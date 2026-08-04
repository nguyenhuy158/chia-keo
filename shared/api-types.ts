import type { ResolvedAiExpense } from "./ai";
import type { McpScope, SettlementMode } from "./schemas";
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

/** Phan cua mot nguoi trong mot cuoc chia, khi gop nhieu cuoc lai. */
export type ApiCrossGamePersonGame = {
  code: string;
  name: string;
  balance: number;
};

export type ApiCrossGamePerson = {
  /** Doi chieu nguoi giua cac cuoc bang ten — khong co thuc the "nguoi" toan cuc. */
  name: string;
  paid: number;
  owed: number;
  /** paid - owed gop tat ca cuoc: duong la duoc nhan lai, am la con phai tra. */
  net: number;
  games: ApiCrossGamePersonGame[];
};

/** So du gop cua nhieu cuoc chia, kem mot bo chuyen tien duy nhat cho tat ca. */
export type ApiCrossGameBalances = {
  games: { code: string; name: string }[];
  /** So cuoc bi bo bot vi vuot tran; 0 la da tinh het. */
  omittedGameCount: number;
  totalExpense: number;
  people: ApiCrossGamePerson[];
  settlements: { from: string; to: string; amount: number }[];
  /** Ten chi thay o mot cuoc: co the la go ten khac nhau nen khong gop duoc. */
  namesInOneGameOnly: string[];
};

/** Token MCP nhu tra ve cho client: khong bao gio kem hash hay ban goc. */
export type ApiMcpToken = {
  id: string;
  name: string;
  /** Vai ky tu dau cua token goc, du de doi chieu voi config da luu. */
  tokenPrefix: string;
  scopes: McpScope[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  /** Suy ra o server de FE khong phai tu so sanh moc thoi gian. */
  active: boolean;
};

export type ApiCreatedMcpToken = {
  token: ApiMcpToken;
  /** Ban goc, chi tra ve dung lan tao nay. */
  secret: string;
};

export type ApiError = {
  error: string;
};
