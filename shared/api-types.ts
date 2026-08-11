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
  /** false la duoc chia se vao, khong phai cuoc tu tao — an nut xoa o danh sach. */
  isOwner: boolean;
};

export type ApiParticipant = {
  id: string;
  name: string;
  bankId: string;
  accountNo: string;
  accountName: string;
};

/** Cuoc chia trong thung rac; khong kem chi tiet vi chi de liet ke va phuc hoi. */
export type ApiTrashGame = ApiGame & {
  deletedAt: string;
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

export type ApiCollaborator = {
  /** null = email da nhap luc chia se nhung chua tung dang nhap he thong. */
  userId: string | null;
  /** "" khi con dang cho (chua co ten hien thi). */
  name: string;
  email: string;
};

/** User da dang nhap he thong, goi y de click chon nhanh khi chia se. */
export type ApiShareCandidate = {
  id: string;
  name: string;
  email: string;
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
  /** Dau moi da chon cho che do "pick"; rong la chua chon. */
  settlementHostId: string;
  createdAt: string;
  participants: ApiParticipant[];
  expenses: ApiExpense[];
  summary: ApiSummary;
  shareLink: ApiShareLink | null;
  /** false neu nguoi xem chi la nguoi duoc chia se (khong xoa duoc cuoc choi). */
  isOwner: boolean;
  collaborators: ApiCollaborator[];
};

export type ApiShareView = {
  code: string;
  name: string;
  settlementMode: SettlementMode;
  settlementHostId: string;
  participants: ApiParticipant[];
  expenses: ApiExpense[];
  summary: ApiSummary;
};

/**
 * Thong ke vui gop tat ca cuoc chia dang dung cua user — khong dung de tat
 * toan, chi de xem cho vui. Tach han khoi ApiCrossGameBalances: cai do tinh
 * settlements that de chuyen tien, cai nay chi la con so giai tri.
 */
export type ApiFunStatsBadge = {
  name: string;
  totalPaid: number;
  gameCount: number;
};

export type ApiFunStatsExpense = {
  title: string;
  amount: number;
  gameName: string;
  gameCode: string;
};

export type ApiFunStats = {
  gameCount: number;
  totalExpense: number;
  /** Nguoi ung tien nhieu nhat tinh tren tat ca cuoc chia (theo tong tien tra). */
  topPayer: ApiFunStatsBadge | null;
  /** Nguoi co mat trong nhieu cuoc chia nhat. */
  mostActive: ApiFunStatsBadge | null;
  biggestExpense: ApiFunStatsExpense | null;
  biggestGame: { name: string; code: string; participantCount: number } | null;
  /** Thu trong tuan hay tao cuoc chia nhat: 0 = Chu nhat, giong Date.getDay(). */
  favoriteWeekday: number | null;
  /** So cuoc chia da tinh; bo bot cuoc qua tran de tranh vuot gioi han subrequest. */
  omittedGameCount: number;
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
