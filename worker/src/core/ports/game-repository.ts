// Port cho tang luu tru. Adapter (D1/drizzle hoac DB khac) chi can implement
// interface nay; core khong biet gi ve SQL hay driver ben duoi.

export type GameRow = {
  id: string;
  ownerUserId: string;
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
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

export type NewSplitRow = {
  id: string;
  expenseId: string;
  participantId: string;
  amount: number;
  weight: number | null;
};

export type ExpenseUpdate = Partial<
  Pick<ExpenseRow, "title" | "note" | "amount" | "payerParticipantId" | "splitMode">
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
    rename(gameId: string, name: string, updatedAt: string): Promise<void>;
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
  shareLinks: {
    getLatestByGame(gameId: string): Promise<ShareLinkRow | null>;
    /** Xoa link cu (neu co) va ghi link moi cho game. */
    replace(gameId: string, row: ShareLinkRow & { id: string }): Promise<void>;
    setEnabled(gameId: string, enabled: boolean): Promise<void>;
    findByToken(token: string): Promise<{ link: ShareLinkRow; game: GameRow } | null>;
  };
};
