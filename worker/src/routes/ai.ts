import { Hono } from "hono";
import { z } from "zod";
import { createGeminiAiProvider } from "../adapters/gemini/gemini";
import {
  suggestExpenseFromReceipt,
  suggestExpenseFromText,
} from "../core/application/ai-suggestions";
import { invalidInput, readJson, respond } from "../lib/http";
import { protectPaths, type AuthedEnv } from "../lib/require-user";

const AI_TEXT_MAX_LENGTH = 500;
// Base64 cua anh ~6MB; du cho anh hoa don chup dien thoai da resize.
const AI_IMAGE_DATA_MAX_LENGTH = 8_000_000;

const aiExpenseInputSchema = z.object({
  gameId: z.string().min(1),
  text: z.string().trim().min(1).max(AI_TEXT_MAX_LENGTH),
});

const aiReceiptInputSchema = z.object({
  gameId: z.string().min(1),
  image: z.object({
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    data: z.string().min(1).max(AI_IMAGE_DATA_MAX_LENGTH),
  }),
});

export const aiRouter = new Hono<AuthedEnv>();

protectPaths(aiRouter, "/ai/*");

aiRouter.post("/ai/expense", async (c) => {
  const input = await readJson(c, aiExpenseInputSchema);
  if (!input) return invalidInput(c);

  const deps = { repo: c.get("repo"), ai: createGeminiAiProvider(c.env) };
  return respond(c, () => suggestExpenseFromText(deps, c.get("userId"), input.gameId, input.text));
});

aiRouter.post("/ai/receipt", async (c) => {
  const input = await readJson(c, aiReceiptInputSchema);
  if (!input) return invalidInput(c);

  const deps = { repo: c.get("repo"), ai: createGeminiAiProvider(c.env) };
  return respond(c, () =>
    suggestExpenseFromReceipt(deps, c.get("userId"), input.gameId, input.image),
  );
});
