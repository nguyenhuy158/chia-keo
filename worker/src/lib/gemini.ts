import type { Env } from "../env";

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_TEMPERATURE = 0.2;

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export type GeminiResult =
  | { ok: true; json: unknown }
  | { ok: false; error: string };

function extractJson(text: string): unknown {
  const cleanText = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();

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

export async function generateGeminiJson(env: Env, parts: GeminiPart[]): Promise<GeminiResult> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "gemini_not_configured" };
  }

  const model = env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: GEMINI_TEMPERATURE,
        },
      }),
    },
  );

  const data = (await response.json().catch(() => null)) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;

  if (!response.ok) {
    return { ok: false, error: data?.error?.message || "gemini_request_failed" };
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const json = extractJson(text);
  if (json === null) {
    return { ok: false, error: "gemini_invalid_response" };
  }

  return { ok: true, json };
}
