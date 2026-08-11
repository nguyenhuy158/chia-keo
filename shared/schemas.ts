import { z } from "zod";

export const GAME_NAME_MAX_LENGTH = 100;
/** Do dai toi da cua mot id do server sinh (`createId`), du de chan rac. */
export const ID_MAX_LENGTH = 64;
export const PARTICIPANT_NAME_MAX_LENGTH = 50;
export const EXPENSE_TITLE_MAX_LENGTH = 100;
export const EXPENSE_NOTE_MAX_LENGTH = 500;
export const MAX_EXPENSE_AMOUNT = 1_000_000_000_000;
// Hang so domain nam o shared/split.ts, re-export de cho import cu.
export { MAX_SPLIT_WEIGHT } from "./split";
export const DEFAULT_EXPENSE_TITLE = "Khoản chi";
export const DEFAULT_INCOME_TITLE = "Khoản thu";
export const DEFAULT_TRANSFER_TITLE = "Trả nợ";
/** So nguoi toi da tao nhanh khi mo cuoc choi ("Người 1", "Người 2"...). */
export const MAX_QUICK_PARTICIPANTS = 30;
export const QUICK_PARTICIPANT_PREFIX = "Người";

/**
 * So ngay giu cuoc chia trong thung rac truoc khi xoa han. Viec don dep chay
 * luc mo thung rac (khong co cron o Pages Functions).
 */
export const TRASH_RETENTION_DAYS = 30;

export const PHOTO_CAPTION_MAX_LENGTH = 140;
export const MAX_PHOTOS_PER_GAME = 60;
/** Canh dai nhat cua anh goc va anh thu nho sau khi nen o trinh duyet. */
export const PHOTO_MAX_EDGE = 1600;
export const PHOTO_THUMB_MAX_EDGE = 480;
/**
 * Anh duoc luu base64 trong D1 nen phai chan kich thuoc: ~1MB cho anh goc va
 * ~180KB cho anh thu nho, van duoi gioi han 2MB moi dong cua D1.
 */
export const PHOTO_DATA_MAX_LENGTH = 1_400_000;
export const PHOTO_THUMB_DATA_MAX_LENGTH = 250_000;
export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * Cach hien phan chuyen tien cua mot cuoc choi:
 * - "p2p": chuyen truc tiep giua tung cap, it luot chuyen nhat
 * - "host": moi nguoi chuyen ve mot dau moi, chi can mot QR
 * - "pick": nhu "host" nhung dau moi do nguoi dung chon (settlementHostId)
 * - "off": khong hien phan chuyen tien
 */
export const SETTLEMENT_MODES = ["p2p", "host", "pick", "off"] as const;
export const DEFAULT_SETTLEMENT_MODE = "host";

export const settlementModeSchema = z.enum(SETTLEMENT_MODES);

const gameNameSchema = z.string().trim().min(1).max(GAME_NAME_MAX_LENGTH);
/**
 * Dau moi cho che do "pick". Chuoi rong la chua chon; luc do va khi nguoi duoc
 * chon khong con trong cuoc thi quay ve nguoi ung nhieu nhat.
 */
const settlementHostIdSchema = z.string().trim().max(ID_MAX_LENGTH);

export const gameInputSchema = z.object({
  name: gameNameSchema,
  settlementMode: settlementModeSchema.default(DEFAULT_SETTLEMENT_MODE),
  settlementHostId: settlementHostIdSchema.default(""),
  /**
   * Tao san bay nhieu nguoi ten mac dinh de vao viec ngay, sua ten sau.
   * 0 la khong tao ai (hanh vi cu).
   */
  participantCount: z.number().int().min(0).max(MAX_QUICK_PARTICIPANTS).default(0),
});

/**
 * Khong dung `gameInputSchema.partial()`: `.partial()` chi lam field optional
 * chu khong bo `.default()`, nen mot PATCH chi doi ten se bi zod bồi thêm
 * settlementMode mac dinh va am tham ghi de che do chuyen tien.
 * participantCount cung chi co nghia luc tao nen khong co o day.
 */
export const gameUpdateSchema = z
  .object({
    name: gameNameSchema,
    settlementMode: settlementModeSchema,
    settlementHostId: settlementHostIdSchema,
  })
  .partial();

/** Viet hoa chu cai dau ten nguoi cho dong bo, khong dong het chu con lai. */
export function capitalizeName(name: string) {
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : name;
}

export const participantInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(PARTICIPANT_NAME_MAX_LENGTH)
    .transform(capitalizeName),
  bankId: z.string().trim().max(20).default(""),
  accountNo: z.string().trim().max(30).default(""),
  accountName: z.string().trim().max(50).default(""),
});

/**
 * Mot dong danh ba. Cung field voi participant nhung khong dung chung schema:
 * participant thuoc mot cuoc chia, danh ba thuoc tai khoan — hai thu doi doc
 * lap nhau nen gop schema se rang buoc sai cho.
 */
export const contactInputSchema = z.object({
  name: z.string().trim().min(1).max(PARTICIPANT_NAME_MAX_LENGTH).transform(capitalizeName),
  bankId: z.string().trim().max(20).default(""),
  accountNo: z.string().trim().max(30).default(""),
  accountName: z.string().trim().max(50).default(""),
});

/** Sua danh ba: khong dung .partial() de khong keo theo .default() — xem gameUpdateSchema. */
export const contactUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(PARTICIPANT_NAME_MAX_LENGTH).transform(capitalizeName),
    bankId: z.string().trim().max(20),
    accountNo: z.string().trim().max(30),
    accountName: z.string().trim().max(50),
  })
  .partial();

/**
 * Them nhieu nguoi mot luot (chon tu danh ba). Gui mot request thay vi N
 * request: FE khong phai xu ly ca "them duoc 3/5 nguoi roi loi".
 */
export const participantBatchInputSchema = z.object({
  people: z.array(participantInputSchema).min(1).max(MAX_QUICK_PARTICIPANTS),
});

export const splitModeSchema = z.enum(["equal", "shares", "amount"]);

/** Danh sach id khoan chi theo thu tu hien thi moi nguoi dung keo tha. */
export const expenseReorderInputSchema = z.object({
  expenseIds: z.array(z.string().min(1)).min(1),
});

/**
 * Mot dong chia tuy chinh: `value` la so phan (mode "shares") hoac so tien
 * (mode "amount") cua participant tuong ung.
 */
export const expenseSplitInputSchema = z.object({
  participantId: z.string().min(1),
  value: z.number().int().positive().max(MAX_EXPENSE_AMOUNT),
});

/**
 * Loai ban ghi nguoi dung tu tao. "transfer" khong co o day vi tra no di qua
 * endpoint rieng (/transfers) voi payload khac.
 */
export const expenseKindSchema = z.enum(["expense", "income"]);

export const expenseInputSchema = z.object({
  kind: expenseKindSchema.default("expense"),
  // Bo trong thi application dien ten mac dinh theo `kind`.
  title: z.string().trim().max(EXPENSE_TITLE_MAX_LENGTH).default(""),
  amount: z.number().int().positive().max(MAX_EXPENSE_AMOUNT),
  note: z.string().trim().max(EXPENSE_NOTE_MAX_LENGTH).default(""),
  payerParticipantId: z.string().min(1),
  splitMode: splitModeSchema.default("equal"),
  // Mode "equal" dung splitParticipantIds; mode "shares"/"amount" dung splits.
  splitParticipantIds: z.array(z.string().min(1)).default([]),
  splits: z.array(expenseSplitInputSchema).default([]),
});

export const transferInputSchema = z
  .object({
    fromParticipantId: z.string().min(1),
    toParticipantId: z.string().min(1),
    amount: z.number().int().positive().max(MAX_EXPENSE_AMOUNT),
    note: z.string().trim().max(EXPENSE_NOTE_MAX_LENGTH).default(""),
  })
  .refine((value) => value.fromParticipantId !== value.toParticipantId, {
    message: "Người trả và người nhận phải khác nhau",
  });

export const shareLinkInputSchema = z.object({
  enabled: z.boolean(),
});

export const MCP_TOKEN_NAME_MAX_LENGTH = 60;
export const MAX_MCP_TOKENS_PER_USER = 20;

/**
 * Quyen cua mot token MCP, chon luc tao va khong sua duoc sau do (muon quyen
 * khac thi tao token khac). Moi tool khai bao dung mot scope no can:
 * - "games:read": xem danh sach va chi tiet cuoc chia cua chinh minh
 * - "summary:read": lay ban tom tat dang chu (chua ten nguoi va so tien)
 * - "share:read": doc cuoc chia bat ky qua token trong link share
 */
export const MCP_SCOPES = ["games:read", "summary:read", "share:read"] as const;

export const mcpScopeSchema = z.enum(MCP_SCOPES);

export const mcpTokenInputSchema = z.object({
  /** Nhan de nhan ra token trong danh sach, vd "Claude Code o may ban". */
  name: z.string().trim().min(1).max(MCP_TOKEN_NAME_MAX_LENGTH),
  /** Phai chon it nhat mot scope: token khong quyen thi vo nghia. */
  scopes: z.array(mcpScopeSchema).min(1).max(MCP_SCOPES.length),
  /** So ngay token con hieu luc; bo trong la khong tu het han. */
  expiresInDays: z.number().int().min(1).max(3650).nullable().default(null),
});

/**
 * Tuy chon hien thi cua user, luu tren server de doi may/xoa cache van con.
 * Them tuy chon moi: khai bao o day, DB khong can doi (bang key/value).
 */
export const userPreferencesSchema = z.object({
  /** Hien QR chuyen khoan tren anh tong ket. */
  summaryShowQr: z.boolean(),
  /** Hien avatar truoc ten tung nguoi tren anh tong ket. */
  summaryShowAvatar: z.boolean(),
});

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  summaryShowQr: true,
  summaryShowAvatar: true,
};

export const USER_PREFERENCE_KEYS = Object.keys(
  userPreferencesSchema.shape,
) as UserPreferenceKey[];

/** Chi gui nhung tuy chon vua doi; field vang giu nguyen gia tri cu. */
export const userPreferencesPatchSchema = userPreferencesSchema.partial();

const photoDimensionSchema = z.number().int().positive().max(20_000);

export const photoInputSchema = z.object({
  mimeType: z.enum(PHOTO_MIME_TYPES),
  /** Base64 anh goc (khong kem tien to data:). */
  data: z.string().min(1).max(PHOTO_DATA_MAX_LENGTH),
  /** Base64 anh thu nho dung cho luoi anh. */
  thumbData: z.string().min(1).max(PHOTO_THUMB_DATA_MAX_LENGTH),
  width: photoDimensionSchema,
  height: photoDimensionSchema,
  caption: z.string().trim().max(PHOTO_CAPTION_MAX_LENGTH).default(""),
  /** Gan anh vao mot khoan chi; null la anh chung cua cuoc chia. */
  expenseId: z.string().min(1).nullable().default(null),
});

export const photoUpdateSchema = z.object({
  caption: z.string().trim().max(PHOTO_CAPTION_MAX_LENGTH).optional(),
  expenseId: z.string().min(1).nullable().optional(),
});

/** Ten mac dinh khi nguoi dung khong nhap noi dung. */
export function defaultTitleForKind(kind: "expense" | "income") {
  return kind === "income" ? DEFAULT_INCOME_TITLE : DEFAULT_EXPENSE_TITLE;
}

export type SettlementMode = z.infer<typeof settlementModeSchema>;
export type ExpenseKindInput = z.infer<typeof expenseKindSchema>;
// z.input chu khong phai z.infer: phia goi API duoc bo qua field co default.
export type GameInput = z.input<typeof gameInputSchema>;
export type GameUpdateInput = z.input<typeof gameUpdateSchema>;
export type ParticipantInput = z.infer<typeof participantInputSchema>;
export type ParticipantBatchInput = z.infer<typeof participantBatchInputSchema>;
export type ContactInput = z.infer<typeof contactInputSchema>;
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;
export type ExpenseInput = z.infer<typeof expenseInputSchema>;
export type ExpenseReorderInput = z.infer<typeof expenseReorderInputSchema>;
export type ExpenseSplitInput = z.infer<typeof expenseSplitInputSchema>;
export type SplitMode = z.infer<typeof splitModeSchema>;
export type TransferInput = z.infer<typeof transferInputSchema>;
export type PhotoInput = z.infer<typeof photoInputSchema>;
export type PhotoUpdateInput = z.infer<typeof photoUpdateSchema>;
export type McpScope = z.infer<typeof mcpScopeSchema>;
export type McpTokenInput = z.input<typeof mcpTokenInputSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type UserPreferenceKey = keyof UserPreferences;
export type UserPreferencesPatch = z.infer<typeof userPreferencesPatchSchema>;
