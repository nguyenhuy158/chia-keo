import type { Context, MiddlewareHandler } from "hono";
import { createFixedWindowLimiter, type FixedWindowConfig } from "../../../shared/rate-limit";

function clientIp(c: Context) {
  return (
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * Gioi han so request theo IP (chi ap dung cho cac method trong `methods`) cho
 * mot nhom endpoint; qua nguong tra 429.
 */
export function rateLimitMethods(
  methods: string[],
  bucket: string,
  config: FixedWindowConfig,
): MiddlewareHandler {
  const limiter = createFixedWindowLimiter(config);

  return async (c, next) => {
    if (methods.includes(c.req.method) && !limiter.isAllowed(`${bucket}:${clientIp(c)}`, Date.now())) {
      return c.json({ error: "rate_limited" }, 429);
    }
    await next();
  };
}

/** Gioi han so request POST theo IP cho mot nhom endpoint; qua nguong tra 429. */
export function rateLimitPost(bucket: string, config: FixedWindowConfig): MiddlewareHandler {
  return rateLimitMethods(["POST"], bucket, config);
}
