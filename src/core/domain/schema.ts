import { z } from "zod";
import { EXPENSE_CATEGORY_IDS } from "./expense-categories";
import type { Game } from "./types";

const PaymentProfileSchema = z.object({
  bankId: z.string(),
  accountNo: z.string(),
  accountName: z.string(),
});

const ParticipantSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarSeed: z.string().optional(),
});

const ExpenseSchema = z.object({
  id: z.string(),
  title: z.string(),
  amount: z.number().nonnegative(),
  categoryId: z.enum(EXPENSE_CATEGORY_IDS).optional(),
  payerId: z.string(),
  splitParticipantIds: z.array(z.string()),
  createdAt: z.string(),
});

export const GameSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  paymentProfile: PaymentProfileSchema.optional(),
  participants: z.array(ParticipantSchema),
  expenses: z.array(ExpenseSchema),
  shareToken: z.string(),
  createdAt: z.string(),
});

export function parseGame(value: unknown): Game | null {
  const result = GameSchema.safeParse(value);

  return result.success ? result.data : null;
}

export function parseGames(value: unknown): Game[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const game = parseGame(item);

    return game ? [game] : [];
  });
}
