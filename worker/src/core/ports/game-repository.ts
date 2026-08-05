// Port cho tang luu tru. Adapter (D1/drizzle hoac DB khac) chi can implement
// interface nay; core khong biet gi ve SQL hay driver ben duoi.

import type { ContactSourceRow } from "../../../../shared/contacts";
import type { SettlementMode } from "../../../../shared/schemas";

export type GameRow = {
  id: string;
  ownerUserId: string;
  code: string;
  name: string;
  /** Text tu do trong DB; application chuan hoa ve SettlementMode. */
  settlementMode: string;
  settlementHostId: string;
  createdAt: string;
  updatedAt: string;
};

/** Cac field cua game duoc phep sua; bo trong field nao thi giu nguyen. */
export type GameChanges = {
  name?: string;
  settlementMode?: SettlementMode;
  settlementHostId?: string;
};

export type ParticipantRow = {
  id: string;
  gameId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentProfileRow = {
  participantId: string;
  bankId: string;
  accountNo: string;
  accountName: string;
};

export type ExpenseRow = {
  id: string;
  gameId: string;
  payerParticipantId: string;
  kind: string;
  title: string;
  amount: number;
  note: string;
  splitMode: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseSplitRow = {
  expenseId: string;
  participantId: string;
  amount: number;
  weight: number | null;
};

export type ShareLinkRow = {
  gameId: string;
  token: string;
  enabled: boolean;
  createdAt: string;
  expiresAt: string | null;
};

/** Anh o dang danh sach: khong kem du lieu anh goc. */
export type PhotoRow = {
  id: string;
  gameId: string;
  expenseId: string | null;
  caption: string;
  mimeType: string;
  width: number;
  height: number;
  thumbData: string;
  createdAt: string;
};

export type PhotoDetailRow = PhotoRow & { data: string };

/** Token MCP nhu luu trong DB: chua hash, khong bao gio co ban token goc. */
export type McpTokenRow = {
  id: string;
  userId: string;
  name: string;
  tokenHash: string;
  tokenPrefix: string;
  /** Cac scope phan tach bang dau cach. */
  scopes: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
};

export type NewSplitRow = {
  id: string;
  expenseId: string;
  participantId: string;
  amount: number;
  weight: number | null;
};

/** Mot dong lich su nhu luu trong DB: payload con la JSON chua parse. */
export type GameEventRow = {
  id: string;
  gameId: string;
  kind: string;
  payload: string;
  createdAt: string;
  undoneAt: string | null;
};

export type ExpenseUpdate = Partial<
  Pick<ExpenseRow, "kind" | "title" | "note" | "amount" | "payerParticipantId" | "splitMode">
> & { updatedAt: string };

export type GameRepository = {
  games: {
    listByOwner(userId: string): Promise<GameRow[]>;
    /** So nguoi tham gia theo game; game khong co ai thi vang mat trong map. */
    countParticipants(gameIds: string[]): Promise<Map<string, number>>;
    /** So khoan chi (khong tinh transfer) theo game. */
    countExpenses(gameIds: string[]): Promise<Map<string, number>>;
    insert(row: GameRow): Promise<void>;
    getById(gameId: string): Promise<GameRow | null>;
    update(gameId: string, changes: GameChanges, updatedAt: string): Promise<void>;
    delete(gameId: string): Promise<void>;
  };
  participants: {
    listByGame(gameId: string): Promise<ParticipantRow[]>;
    listIdsByGame(gameId: string): Promise<string[]>;
    getWithGame(
      participantId: string,
    ): Promise<{ participant: ParticipantRow; game: GameRow } | null>;
    insert(
      row: ParticipantRow,
      payment: Omit<PaymentProfileRow, "participantId">,
    ): Promise<void>;
    rename(participantId: string, name: string, updatedAt: string): Promise<void>;
    upsertPaymentProfile(
      participantId: string,
      fields: Partial<Omit<PaymentProfileRow, "participantId">>,
      updatedAt: string,
    ): Promise<void>;
    delete(participantId: string): Promise<void>;
    /**
     * Moi participant thuoc moi cuoc chia cua user, kem tai khoan nhan tien.
     * Dung de dung danh ba nguoi quen — viec gop/loc lam o `shared/contacts.ts`.
     */
    listByOwner(userId: string): Promise<ContactSourceRow[]>;
  };
  paymentProfiles: {
    listByParticipantIds(participantIds: string[]): Promise<PaymentProfileRow[]>;
  };
  expenses: {
    listByGame(gameId: string): Promise<ExpenseRow[]>;
    getById(expenseId: string): Promise<ExpenseRow | null>;
    getWithGame(expenseId: string): Promise<{ expense: ExpenseRow; game: GameRow } | null>;
    insert(row: ExpenseRow): Promise<void>;
    update(expenseId: string, fields: ExpenseUpdate): Promise<void>;
    delete(expenseId: string): Promise<void>;
    /** Cac expense co split cua participant nay (de chia lai khi xoa nguoi). */
    listIdsSplitWith(participantId: string): Promise<string[]>;
  };
  splits: {
    listByExpenseIds(expenseIds: string[]): Promise<ExpenseSplitRow[]>;
    listByExpense(expenseId: string): Promise<ExpenseSplitRow[]>;
    /**
     * Splits cua expense ma participant van con ton tai, sap theo thu tu
     * tham gia (dung sau khi xoa nguoi de chia lai phan du on dinh).
     */
    listLiveByExpense(expenseId: string): Promise<ExpenseSplitRow[]>;
    replace(expenseId: string, rows: NewSplitRow[]): Promise<void>;
  };
  photos: {
    /** Anh cua mot cuoc chia, moi nhat truoc; khong kem du lieu anh goc. */
    listByGame(gameId: string): Promise<PhotoRow[]>;
    countByGame(gameId: string): Promise<number>;
    getById(photoId: string): Promise<PhotoRow | null>;
    getWithGame(photoId: string): Promise<{ photo: PhotoRow; game: GameRow } | null>;
    /** Anh kem du lieu goc, chi dung khi mo xem toan man hinh. */
    getDetail(photoId: string): Promise<PhotoDetailRow | null>;
    insert(row: PhotoDetailRow): Promise<void>;
    update(
      photoId: string,
      fields: Partial<Pick<PhotoRow, "caption" | "expenseId">>,
    ): Promise<void>;
    delete(photoId: string): Promise<void>;
  };
  mcpTokens: {
    /** Token cua mot user, moi nhat truoc; ke ca token da thu hoi. */
    listByUser(userId: string): Promise<McpTokenRow[]>;
    countActiveByUser(userId: string): Promise<number>;
    /** Tra ve ca token da thu hoi/het han: tang tren quyet dinh tu choi. */
    findByHash(tokenHash: string): Promise<McpTokenRow | null>;
    insert(row: McpTokenRow): Promise<void>;
    /** false khi token khong ton tai hoac khong thuoc user nay. */
    revoke(tokenId: string, userId: string, revokedAt: string): Promise<boolean>;
    touchLastUsed(tokenId: string, lastUsedAt: string): Promise<void>;
  };
  gameEvents: {
    /** Lich su cua mot cuoc chia, moi nhat truoc. */
    listByGame(gameId: string, limit: number): Promise<GameEventRow[]>;
    getWithGame(eventId: string): Promise<{ event: GameEventRow; game: GameRow } | null>;
    insert(row: GameEventRow): Promise<void>;
    markUndone(eventId: string, undoneAt: string): Promise<void>;
  };
  shareLinks: {
    getLatestByGame(gameId: string): Promise<ShareLinkRow | null>;
    /** Xoa link cu (neu co) va ghi link moi cho game. */
    replace(gameId: string, row: ShareLinkRow & { id: string }): Promise<void>;
    setEnabled(gameId: string, enabled: boolean): Promise<void>;
    findByToken(token: string): Promise<{ link: ShareLinkRow; game: GameRow } | null>;
  };
};
