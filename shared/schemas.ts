import { z } from "zod";

export const GAME_NAME_MAX_LENGTH = 100;
export const PARTICIPANT_NAME_MAX_LENGTH = 50;
export const EXPENSE_TITLE_MAX_LENGTH = 100;
export const EXPENSE_NOTE_MAX_LENGTH = 500;
export const MAX_EXPENSE_AMOUNT = 1_000_000_000_000;
// Hang so domain nam o shared/split.ts, re-export de cho import cu.
export { MAX_SPLIT_WEIGHT } from "./split";
export const DEFAULT_EXPENSE_TITLE = "Khoản chi";
export const DEFAULT_TRANSFER_TITLE = "Trả nợ";

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
export const DEFAULT_SETTLEMENT_MODE = "p2p";

export const settlementModeSchema = z.enum(SETTLEMENT_MODES);

export const gameInputSchema = z.object({
  name: z.string().trim().min(1).max(GAME_NAME_MAX_LENGTH),
  settlementMode: settlementModeSchema.default(DEFAULT_SETTLEMENT_MODE),
});

export const gameUpdateSchema = gameInputSchema.partial();

export const participantInputSchema = z.object({
  name: z.string().trim().min(1).max(PARTICIPANT_NAME_MAX_LENGTH),
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

export const expenseInputSchema = z.object({
  title: z
    .string()
    .trim()
    .max(EXPENSE_TITLE_MAX_LENGTH)
    .default("")
    .transform((value) => value || DEFAULT_EXPENSE_TITLE),
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

export type SettlementMode = z.infer<typeof settlementModeSchema>;
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
