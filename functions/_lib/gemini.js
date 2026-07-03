import { badRequest } from "./http.js";

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

function extractJson(text) {
  const cleanText = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

  try {
    return JSON.parse(cleanText);
  } catch {
    const match = cleanText.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export async function generateGeminiJson(env, parts) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return { response: badRequest("Chưa cấu hình GEMINI_API_KEY.") };

  const model = env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts,
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    },
  );
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      response: badRequest(data?.error?.message || "Gemini không xử lý được yêu cầu."),
    };
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const json = extractJson(text);
  if (!json) return { response: badRequest("Gemini trả dữ liệu không hợp lệ.") };

  return { json };
}
