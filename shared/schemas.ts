import { z } from "zod";

export const GAME_NAME_MAX_LENGTH = 100;
export const PARTICIPANT_NAME_MAX_LENGTH = 50;
export const EXPENSE_TITLE_MAX_LENGTH = 100;
export const EXPENSE_NOTE_MAX_LENGTH = 500;
export const MAX_EXPENSE_AMOUNT = 1_000_000_000_000;
export const DEFAULT_EXPENSE_TITLE = "Khoản chi";

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
  splitParticipantIds: z.array(z.string().min(1)).min(1),
});

export const shareLinkInputSchema = z.object({
  enabled: z.boolean(),
});

export type SettlementMode = z.infer<typeof settlementModeSchema>;
// z.input chu khong phai z.infer: phia goi API duoc bo qua field co default.
export type GameInput = z.input<typeof gameInputSchema>;
export type GameUpdateInput = z.input<typeof gameUpdateSchema>;
export type ParticipantInput = z.infer<typeof participantInputSchema>;
export type ExpenseInput = z.infer<typeof expenseInputSchema>;
