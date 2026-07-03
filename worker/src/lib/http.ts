import type { Context } from "hono";
import type { z } from "zod";

export async function readJson<Schema extends z.ZodType>(
  c: Context,
  schema: Schema,
): Promise<z.output<Schema> | null> {
  const body = await c.req.json().catch(() => null);
  const result = schema.safeParse(body);
  return result.success ? result.data : null;
}

export function invalidInput(c: Context) {
  return c.json({ error: "invalid_input" }, 400);
}

export function notFound(c: Context) {
  return c.json({ error: "not_found" }, 404);
}
