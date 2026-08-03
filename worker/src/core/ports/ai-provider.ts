// Port cho model AI sinh JSON. Adapter hien tai la Gemini; doi provider
// (Claude, OpenAI, ...) chi can implement generateJson.

export type AiContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export type AiJsonResult = { ok: true; json: unknown } | { ok: false; error: string };

export type AiProvider = {
  generateJson(parts: AiContentPart[]): Promise<AiJsonResult>;
};
