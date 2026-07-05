import { z } from "zod";

export const GAME_NAME_MAX_LENGTH = 100;
export const PARTICIPANT_NAME_MAX_LENGTH = 50;
export const EXPENSE_TITLE_MAX_LENGTH = 100;
export const EXPENSE_NOTE_MAX_LENGTH = 500;
export const MAX_EXPENSE_AMOUNT = 1_000_000_000_000;
export const DEFAULT_EXPENSE_TITLE = "Khoản chi";

export const gameInputSchema = z.object({
  name: z.string().trim().min(1).max(GAME_NAME_MAX_LENGTH),
});

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

export type GameInput = z.infer<typeof gameInputSchema>;
export type ParticipantInput = z.infer<typeof participantInputSchema>;
export type ExpenseInput = z.infer<typeof expenseInputSchema>;
