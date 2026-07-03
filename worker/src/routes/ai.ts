import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { normalizeAiExpense, resolveAiExpense } from "../../../shared/ai";
import * as schema from "../db/schema";
import { loadOwnedGame } from "../lib/game-data";
import { generateGeminiJson, type GeminiPart } from "../lib/gemini";
import { invalidInput, notFound, readJson } from "../lib/http";
import { requireUser, type AuthedEnv } from "../lib/require-user";

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

const GEMINI_ERROR_STATUS: Record<string, 400 | 502> = {
  gemini_not_configured: 400,
  gemini_invalid_response: 502,
  gemini_request_failed: 502,
};

async function loadParticipants(db: AuthedEnv["Variables"]["db"], gameId: string) {
  return db
    .select({ id: schema.participants.id, name: schema.participants.name })
    .from(schema.participants)
    .where(eq(schema.participants.gameId, gameId))
    .orderBy(asc(schema.participants.createdAt));
}

export const aiRouter = new Hono<AuthedEnv>();

aiRouter.use("*", requireUser);

aiRouter.post("/ai/expense", async (c) => {
  const input = await readJson(c, aiExpenseInputSchema);
  if (!input) return invalidInput(c);

  const db = c.get("db");
  const game = await loadOwnedGame(db, input.gameId, c.get("userId"));
  if (!game) return notFound(c);

  const participants = await loadParticipants(db, game.id);

  const prompt = [
    "Ban la tro ly nhap chi tieu nhom tieng Viet.",
    "Hay doc cau nhap chi va tra JSON duy nhat theo schema:",
    '{"title":"string","amount":number,"payerName":"string","splitNames":["string"],"note":"string","confidence":number}',
    "Quy doi k/nghin thanh 1000, tr/trieu thanh 1000000.",
    "Neu khong ro nguoi chia thi dung toan bo nguoi tham gia.",
    `Nguoi tham gia: ${participants.map((participant) => participant.name).join(", ") || "chua co"}.`,
    `Cau nhap: ${input.text}`,
  ].join("\n");

  const result = await generateGeminiJson(c.env, [{ text: prompt }]);
  if (!result.ok) {
    return c.json({ error: result.error }, GEMINI_ERROR_STATUS[result.error] || 502);
  }

  const suggestion = resolveAiExpense(normalizeAiExpense(result.json), participants);
  return c.json({ suggestion });
});

aiRouter.post("/ai/receipt", async (c) => {
  const input = await readJson(c, aiReceiptInputSchema);
  if (!input) return invalidInput(c);

  const db = c.get("db");
  const game = await loadOwnedGame(db, input.gameId, c.get("userId"));
  if (!game) return notFound(c);

  const participants = await loadParticipants(db, game.id);

  const prompt = [
    "Ban la tro ly OCR hoa don tieng Viet.",
    "Doc anh hoa don va tra JSON duy nhat theo schema:",
    '{"title":"string","amount":number,"note":"string","confidence":number}',
    "amount la tong tien phai tra bang VND, chi la so nguyen.",
    "title ngan gon, vi du: Hoa don an toi, Ca phe, Khach san.",
  ].join("\n");

  const parts: GeminiPart[] = [
    { text: prompt },
    { inlineData: { mimeType: input.image.mimeType, data: input.image.data } },
  ];

  const result = await generateGeminiJson(c.env, parts);
  if (!result.ok) {
    return c.json({ error: result.error }, GEMINI_ERROR_STATUS[result.error] || 502);
  }

  const normalized = normalizeAiExpense(result.json);
  const suggestion = resolveAiExpense(
    { ...normalized, title: normalized.title || "Hoa don" },
    participants,
  );
  return c.json({ suggestion });
});
