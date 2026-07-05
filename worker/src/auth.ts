import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/schema";
import type { Env } from "./env";

export const AUTH_BASE_PATH = "/api/auth";

/** Origin cua vite dev server khi FE goi Pages Functions local. */
export const DEV_ORIGINS = ["http://127.0.0.1:5173", "http://localhost:5173"];

export function parseAllowedOrigins(value: string | undefined) {
  return (value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseOrigin(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

export function getTrustedOrigins(env: Env, requestUrl?: string) {
  return [
    ...parseAllowedOrigins(env.ALLOWED_ORIGINS),
    parseOrigin(env.BETTER_AUTH_URL),
    parseOrigin(requestUrl),
    ...DEV_ORIGINS,
  ].filter((origin): origin is string => Boolean(origin));
}

export function createAuth(env: Env, requestUrl?: string) {
  const db = drizzle(env.DB, { schema });

  return betterAuth({
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL || parseOrigin(requestUrl),
    basePath: AUTH_BASE_PATH,
    trustedOrigins: getTrustedOrigins(env, requestUrl),
    onAPIError: {
      // Better Auth tu nuot loi va tra 500 rong; log ra de xem duoc trong Cloudflare.
      onError(error) {
        console.error("Better Auth error:", error);
      },
    },
    emailAndPassword: {
      enabled: true,
    },
    plugins: [username()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
