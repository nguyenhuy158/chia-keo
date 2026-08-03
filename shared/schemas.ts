import { z } from "zod";

export const GAME_NAME_MAX_LENGTH = 100;
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
 * - "off": khong hien phan chuyen tien
 */
export const SETTLEMENT_MODES = ["p2p", "host", "off"] as const;
export const DEFAULT_SETTLEMENT_MODE = "host";

export const settlementModeSchema = z.enum(SETTLEMENT_MODES);

export const gameInputSchema = z.object({
  name: z.string().trim().min(1).max(GAME_NAME_MAX_LENGTH),
  settlementMode: settlementModeSchema.default(DEFAULT_SETTLEMENT_MODE),
  /**
   * Tao san bay nhieu nguoi ten mac dinh de vao viec ngay, sua ten sau.
   * 0 la khong tao ai (hanh vi cu).
   */
  participantCount: z.number().int().min(0).max(MAX_QUICK_PARTICIPANTS).default(0),
});

// participantCount chi co nghia luc tao, bo khoi schema sua de khong nhan cho vui.
export const gameUpdateSchema = gameInputSchema.omit({ participantCount: true }).partial();

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

export const splitModeSchema = z.enum(["equal", "shares", "amount"]);

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
export type ExpenseInput = z.infer<typeof expenseInputSchema>;
export type ExpenseSplitInput = z.infer<typeof expenseSplitInputSchema>;
export type SplitMode = z.infer<typeof splitModeSchema>;
export type TransferInput = z.infer<typeof transferInputSchema>;
export type PhotoInput = z.infer<typeof photoInputSchema>;
export type PhotoUpdateInput = z.infer<typeof photoUpdateSchema>;
