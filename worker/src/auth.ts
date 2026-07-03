import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/schema";
import type { Env } from "./env";

export const AUTH_BASE_PATH = "/api/auth";

/** Origin cua vite dev server; production cung origin voi Worker nen khong can. */
export const DEV_ORIGINS = ["http://127.0.0.1:5173", "http://localhost:5173"];

export function parseAllowedOrigins(value: string | undefined) {
  return (value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getTrustedOrigins(env: Env) {
  return [...parseAllowedOrigins(env.ALLOWED_ORIGINS), ...DEV_ORIGINS];
}

export function createAuth(env: Env) {
  const db = drizzle(env.DB, { schema });

  return betterAuth({
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: AUTH_BASE_PATH,
    trustedOrigins: getTrustedOrigins(env),
    emailAndPassword: {
      enabled: true,
    },
    plugins: [username()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
