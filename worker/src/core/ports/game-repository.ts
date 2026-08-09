// Port cho tang luu tru. Adapter (D1/drizzle hoac DB khac) chi can implement
// interface nay; core khong biet gi ve SQL hay driver ben duoi.

import type { ContactBookRow, ContactSourceRow } from "../../../../shared/contacts";
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
  /** Luc bi cho vao thung rac; null la dang dung. */
  deletedAt: string | null;
};

/** Cac field cua game duoc phep sua; bo trong field nao thi giu nguyen. */
export type GameChanges = {
  name?: string;
  settlementMode?: SettlementMode;
  settlementHostId?: string;
};

export type UserPreferenceRow = {
  key: string;
  /** JSON cua gia tri; tang tren tu parse va bo qua dong hong. */
  value: string;
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
    /** Chi cac cuoc chia dang dung; cuoc trong thung rac khong tinh. */
    listByOwner(userId: string): Promise<GameRow[]>;
    /** Cuoc chia trong thung rac, moi xoa truoc. */
    listDeletedByOwner(userId: string): Promise<GameRow[]>;
    /** So nguoi tham gia theo game; game khong co ai thi vang mat trong map. */
    countParticipants(gameIds: string[]): Promise<Map<string, number>>;
    /** So khoan chi (khong tinh transfer) theo game. */
    countExpenses(gameIds: string[]): Promise<Map<string, number>>;
    insert(row: GameRow): Promise<void>;
    getById(gameId: string): Promise<GameRow | null>;
    update(gameId: string, changes: GameChanges, updatedAt: string): Promise<void>;
    /** Xoa mem: dua vao/lay ra khoi thung rac. */
    setDeletedAt(gameId: string, deletedAt: string | null): Promise<void>;
    /** Xoa that, keo theo cascade moi thu thuoc cuoc chia. Khong lay lai duoc. */
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
    /**
     * id + ten cua moi participant thuoc moi cuoc chia cua user, trong MOT
     * truy van. Dung de doi payerParticipantId sang ten khi gop nhieu cuoc —
     * rieng vi khac cot voi ContactSourceRow (co id, khong co tai khoan).
     */
    listIdNamesByOwner(userId: string): Promise<{ id: string; name: string; gameId: string }[]>;
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
    /**
     * Khoan chi cua nhieu cuoc chia trong MOT truy van (IN...), khong phai
     * vong lap tung cuoc. Dung cho thong ke gop nhieu cuoc — N cuoc chia thi
     * van la mot round-trip DB chu khong phai N.
     */
    listByGameIds(gameIds: string[]): Promise<ExpenseRow[]>;
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
  userPreferences: {
    /** Toan bo tuy chon da luu cua user; key la du do tang tren hieu. */
    listByUser(userId: string): Promise<UserPreferenceRow[]>;
    /** Ghi de gia tri cu cua dung key do — moi user mot dong tren moi key. */
    upsert(userId: string, key: string, value: string, updatedAt: string): Promise<void>;
  };
  contacts: {
    listByOwner(userId: string): Promise<ContactBookRow[]>;
    getOwned(contactId: string, userId: string): Promise<ContactBookRow | null>;
    /** Cung nameKey thi ghi de dong cu: danh ba khong duoc co hai "Hồng". */
    upsert(row: ContactBookRow & { ownerUserId: string; nameKey: string; createdAt: string }): Promise<void>;
    update(
      contactId: string,
      fields: Partial<Pick<ContactBookRow, "name" | "bankId" | "accountNo" | "accountName">> & {
        nameKey?: string;
      },
      updatedAt: string,
    ): Promise<void>;
    delete(contactId: string): Promise<void>;
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
