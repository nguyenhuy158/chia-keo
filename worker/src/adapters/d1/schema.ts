import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

// --- Better Auth tables ---

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  username: text("username").unique(),
  displayUsername: text("display_username"),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// --- App tables ---

export const games = sqliteTable(
  "games",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    // "p2p" | "host" | "pick" | "off" — xem SETTLEMENT_MODES o shared/schemas.ts.
    settlementMode: text("settlement_mode").notNull().default("p2p"),
    // Dau moi da chon cho che do "pick"; rong la chua chon.
    settlementHostId: text("settlement_host_id").notNull().default(""),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    /**
     * Luc bi cho vao thung rac; null la dang dung. Xoa mem vi xoa that keo theo
     * cascade ca participant, khoan chi va anh — khong co duong nao lay lai.
     */
    deletedAt: text("deleted_at"),
  },
  (table) => [index("games_owner_user_id_idx").on(table.ownerUserId)],
);

export const participants = sqliteTable(
  "participants",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("participants_game_id_idx").on(table.gameId)],
);

export const expenses = sqliteTable(
  "expenses",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    payerParticipantId: text("payer_participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    // "expense": khoan chi thuong; "transfer": ghi nhan tra no giua hai nguoi.
    kind: text("kind").notNull().default("expense"),
    title: text("title").notNull(),
    amount: integer("amount").notNull(),
    note: text("note").notNull().default(""),
    // "equal": chia deu; "shares": theo so phan; "amount": so tien cu the.
    splitMode: text("split_mode").notNull().default("equal"),
    // Thu tu hien thi nguoi dung tu sap: so lon hien truoc. Khoan moi them
    // nhan gia tri lon nhat + 1 trong cuoc chia do.
    sequence: integer("sequence").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("expenses_game_id_idx").on(table.gameId)],
);

export const expenseSplits = sqliteTable(
  "expense_splits",
  {
    id: text("id").primaryKey(),
    expenseId: text("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    // So phan khi expense chia theo mode "shares"; null cho cac mode khac.
    weight: integer("weight"),
  },
  (table) => [
    index("expense_splits_expense_id_idx").on(table.expenseId),
    uniqueIndex("expense_splits_expense_participant_idx").on(table.expenseId, table.participantId),
  ],
);

export const gamePhotos = sqliteTable(
  "game_photos",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    // Anh gan vao mot khoan chi (hoa don); null la anh chung cua cuoc chia.
    expenseId: text("expense_id").references(() => expenses.id, { onDelete: "set null" }),
    caption: text("caption").notNull().default(""),
    mimeType: text("mime_type").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    // Base64 anh goc da nen o trinh duyet va ban thu nho cho luoi anh.
    data: text("data").notNull(),
    thumbData: text("thumb_data").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("game_photos_game_id_idx").on(table.gameId),
    index("game_photos_expense_id_idx").on(table.expenseId),
  ],
);

/**
 * Danh ba nguoi quen do user tu nhap. Khac voi danh sach suy ra tu lich su
 * (shared/contacts.ts): o day luu duoc nguoi chua tham gia cuoc chia nao, va
 * sua/xoa duoc. Hai nguon duoc gop luc doc, ban tu nhap thang.
 */
export const contacts = sqliteTable(
  "contacts",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /**
     * Ten da chuan hoa (normalizeContactName). Co cot rieng vi SQLite khong
     * co unique index phan biet dau tieng Viet theo y minh — chuan hoa o code
     * roi luu lai la cach duy nhat chan duoc "Hồng" va "hồng " thanh hai dong.
     */
    nameKey: text("name_key").notNull(),
    bankId: text("bank_id").notNull().default(""),
    accountNo: text("account_no").notNull().default(""),
    accountName: text("account_name").notNull().default(""),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("contacts_owner_name_key_idx").on(table.ownerUserId, table.nameKey)],
);

/**
 * Lich su thao tac cua mot cuoc chia. `payload` la JSON anh chup luc thao tac
 * xay ra — xem shared/game-events.ts; cau chu hien cho nguoi dung sinh luc doc
 * chu khong luu o day.
 */
export const gameEvents = sqliteTable(
  "game_events",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    /** GameEventKind; de text tu do vi kind moi khong nen can migration. */
    kind: text("kind").notNull(),
    payload: text("payload").notNull(),
    createdAt: text("created_at").notNull(),
    /** Luc bam hoan tac; null la chua hoan tac. */
    undoneAt: text("undone_at"),
  },
  (table) => [index("game_events_game_id_idx").on(table.gameId)],
);

export const shareLinks = sqliteTable(
  "share_links",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at"),
  },
  (table) => [index("share_links_game_id_idx").on(table.gameId)],
);

/**
 * Token cho endpoint MCP. Moi user tao duoc nhieu token, moi token mot bo
 * scope rieng chon luc tao.
 *
 * Chi luu hash: ban goc hien dung mot lan luc tao roi khong lay lai duoc, nen
 * ke doc duoc database cung khong dung token cua nguoi khac de goi API.
 */
export const mcpTokens = sqliteTable(
  "mcp_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** SHA-256 hex cua token goc. */
    tokenHash: text("token_hash").notNull().unique(),
    /** May ky tu dau de nguoi dung doi chieu token trong danh sach. */
    tokenPrefix: text("token_prefix").notNull(),
    /** Cac scope, phan tach bang dau cach — xem MCP_SCOPES o shared/schemas.ts. */
    scopes: text("scopes").notNull(),
    createdAt: text("created_at").notNull(),
    /** Lan cuoi token duoc dung, de phat hien token bo quen hoac bi lam dung. */
    lastUsedAt: text("last_used_at"),
    expiresAt: text("expires_at"),
    revokedAt: text("revoked_at"),
  },
  (table) => [index("mcp_tokens_user_id_idx").on(table.userId)],
);

/**
 * Tuy chon hien thi cua tung user (vd bat/tat QR tren anh tong ket). De dang
 * key/value chu khong moi tuy chon mot cot: them tuy chon moi khong can
 * migration, va cot la se bi bo qua luc doc (xem USER_PREFERENCE_KEYS).
 */
export const userPreferences = sqliteTable(
  "user_preferences",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    /** Gia tri dang JSON, de sau nay chua duoc ca so va chuoi. */
    value: text("value").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("user_preferences_user_key_idx").on(table.userId, table.key)],
);

export const paymentProfiles = sqliteTable(
  "payment_profiles",
  {
    id: text("id").primaryKey(),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    bankId: text("bank_id").notNull().default(""),
    accountNo: text("account_no").notNull().default(""),
    accountName: text("account_name").notNull().default(""),
    qrType: text("qr_type").notNull().default("vietqr"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("payment_profiles_participant_id_idx").on(table.participantId)],
);
