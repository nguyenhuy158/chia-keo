import { requireUser } from "../../_lib/auth.js";
import { generateGeminiJson } from "../../_lib/gemini.js";
import { badRequest, json, readJson } from "../../_lib/http.js";

const categoryIds = ["food", "transport", "lodging", "shopping", "entertainment", "other"];

function normalizeAiExpense(value) {
  const title = typeof value?.title === "string" ? value.title.trim() : "";
  const amount = Number(value?.amount);
  const categoryId = categoryIds.includes(value?.categoryId) ? value.categoryId : "other";
  const payerName = typeof value?.payerName === "string" ? value.payerName.trim() : "";
  const splitNames = Array.isArray(value?.splitNames)
    ? value.splitNames.flatMap((name) => (typeof name === "string" && name.trim() ? [name.trim()] : []))
    : [];
  const confidence = Number(value?.confidence);

  return {
    title,
    amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0,
    categoryId,
    payerName,
    splitNames,
    note: typeof value?.note === "string" ? value.note.trim() : "",
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
  };
}

export async function onRequestPost(context) {
  const auth = await requireUser(context);
  if (auth.response) return auth.response;

  const body = await readJson(context.request);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const participants = Array.isArray(body?.participants)
    ? body.participants.flatMap((participant) =>
        typeof participant?.name === "string" ? [{ name: participant.name.trim() }] : [],
      )
    : [];

  if (!text) return badRequest("Nhập nội dung cần AI phân tích.");

  const prompt = [
    "Bạn là trợ lý nhập chi tiêu nhóm tiếng Việt.",
    "Hãy đọc câu nhập chi và trả JSON duy nhất theo schema:",
    '{"title":"string","amount":number,"categoryId":"food|transport|lodging|shopping|entertainment|other","payerName":"string","splitNames":["string"],"note":"string","confidence":number}',
    "Quy đổi k/nghìn thành 1000, tr/triệu thành 1000000.",
    "Nếu không rõ người chia thì dùng toàn bộ người tham gia.",
    `Người tham gia: ${participants.map((participant) => participant.name).join(", ") || "chưa có"}.`,
    `Câu nhập: ${text}`,
  ].join("\n");

  const result = await generateGeminiJson(context.env, [{ text: prompt }]);
  if (result.response) return result.response;

  return json({ expense: normalizeAiExpense(result.json) });
}
