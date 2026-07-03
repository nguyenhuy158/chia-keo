import { requireUser } from "../../_lib/auth.js";
import { generateGeminiJson } from "../../_lib/gemini.js";
import { badRequest, json, readJson } from "../../_lib/http.js";

const categoryIds = ["food", "transport", "lodging", "shopping", "entertainment", "other"];
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function normalizeReceiptExpense(value) {
  const title = typeof value?.title === "string" ? value.title.trim() : "";
  const amount = Number(value?.amount);
  const categoryId = categoryIds.includes(value?.categoryId) ? value.categoryId : "other";
  const confidence = Number(value?.confidence);

  return {
    title: title || "Hóa đơn",
    amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0,
    categoryId,
    payerName: "",
    splitNames: [],
    note: typeof value?.note === "string" ? value.note.trim() : "",
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
  };
}

export async function onRequestPost(context) {
  const auth = await requireUser(context);
  if (auth.response) return auth.response;

  const body = await readJson(context.request);
  const mimeType = typeof body?.image?.mimeType === "string" ? body.image.mimeType : "";
  const data = typeof body?.image?.data === "string" ? body.image.data : "";

  if (!allowedMimeTypes.has(mimeType) || !data) {
    return badRequest("Ảnh hóa đơn không hợp lệ.");
  }

  const prompt = [
    "Bạn là trợ lý OCR hóa đơn tiếng Việt.",
    "Đọc ảnh hóa đơn và trả JSON duy nhất theo schema:",
    '{"title":"string","amount":number,"categoryId":"food|transport|lodging|shopping|entertainment|other","note":"string","confidence":number}',
    "amount là tổng tiền phải trả bằng VND, chỉ là số nguyên.",
    "title ngắn gọn, ví dụ: Hóa đơn ăn tối, Cà phê, Khách sạn.",
  ].join("\n");

  const result = await generateGeminiJson(context.env, [
    { text: prompt },
    {
      inlineData: {
        mimeType,
        data,
      },
    },
  ]);
  if (result.response) return result.response;

  return json({ expense: normalizeReceiptExpense(result.json) });
}
