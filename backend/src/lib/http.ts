import type { Context } from "hono";
import type { z } from "zod";
import {
  AiProviderError,
  BadRequestError,
  InvalidInputError,
  NotFoundError,
} from "../core/application/errors";

export async function readJson<Schema extends z.ZodType>(
  c: Context,
  schema: Schema,
): Promise<z.output<Schema> | null> {
  const body = await c.req.json().catch(() => null);
  const result = schema.safeParse(body);
  return result.success ? result.data : null;
}

export function badRequest(c: Context, error: string) {
  return c.json({ error }, 400);
}

export function invalidInput(c: Context) {
  return badRequest(c, "invalid_input");
}

export function notFound(c: Context) {
  return c.json({ error: "not_found" }, 404);
}

const AI_ERROR_STATUS: Record<string, 400 | 502> = {
  gemini_not_configured: 400,
  gemini_invalid_response: 502,
  gemini_request_failed: 502,
};

/**
 * Chay use case va map loi nghiep vu (NotFound/InvalidInput/AiProvider) sang
 * HTTP status; loi khac de onError cua app xu ly (500).
 */
export async function respond<T>(
  c: Context,
  run: () => Promise<T>,
  status: 200 | 201 = 200,
): Promise<Response> {
  try {
    return c.json(await run(), status);
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(c);
    if (error instanceof InvalidInputError) return invalidInput(c);
    if (error instanceof BadRequestError) return badRequest(c, error.code);
    if (error instanceof AiProviderError) {
      return c.json({ error: error.code }, AI_ERROR_STATUS[error.code] || 502);
    }
    throw error;
  }
}
