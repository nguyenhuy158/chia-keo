import { Hono } from "hono";
import { cors } from "hono/cors";
import { BUILD_INFO } from "../../shared/build-info";
import { AUTH_BASE_PATH, createAuth, getTrustedOrigins } from "./auth";
import type { Env } from "./env";
import { rateLimitPost } from "./lib/rate-limit-middleware";
import { aiRouter } from "./routes/ai";
import { crossBalancesRouter } from "./routes/cross-balances";
import { funStatsRouter } from "./routes/fun-stats";
import { gamesRouter } from "./routes/games";
import { mcpRouter } from "./routes/mcp";
import { mcpTokensRouter } from "./routes/mcp-tokens";
import { photosRouter } from "./routes/photos";
import { qrRouter } from "./routes/qr";
import { sessionRouter } from "./routes/session";
import { shareRouter } from "./routes/share";
import { userPreferencesRouter } from "./routes/user-preferences";

// Chan brute-force login/dang ky va spam tao game/link share (theo IP).
const AUTH_RATE_LIMIT = { limit: 10, windowMs: 60_000 };
const CREATE_RATE_LIMIT = { limit: 30, windowMs: 60_000 };
// Upload anh nang hon nen gioi han rieng, van du de chon nhieu anh mot luot.
const PHOTO_UPLOAD_RATE_LIMIT = { limit: 60, windowMs: 60_000 };
// MCP goi nhieu lan moi phien (initialize, tools/list, roi tung tools/call) nen
// nguong cao; muc dich chi la chan do token, khong phai tiet kiem tai nguyen.
const MCP_RATE_LIMIT = { limit: 120, windowMs: 60_000 };

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", (c, next) => {
  const allowedOrigins = getTrustedOrigins(c.env, c.req.url);

  return cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : null),
    credentials: true,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    // Authorization: cho client MCP chay trong trinh duyet gui bearer token.
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  })(c, next);
});

// Code dang chay tren server nay, de kiem nhanh xem deploy da len chua.
app.get("/api/version", (c) => c.json(BUILD_INFO));

app.get("/api/health", async (c) => {
  // Kiem tra D1 da chay migration chua de chan doan nhanh loi 500 khi login.
  try {
    await c.env.DB.prepare("SELECT 1 FROM user LIMIT 1").first();
    return c.json({ ok: true, db: "ok" });
  } catch (error) {
    console.error("D1 health check failed:", error);
    return c.json(
      {
        ok: false,
        db: "error",
        hint: "Chay: npx wrangler d1 migrations apply DB --remote",
      },
      500,
    );
  }
});

app.use(`${AUTH_BASE_PATH}/sign-in/*`, rateLimitPost("auth", AUTH_RATE_LIMIT));
app.use(`${AUTH_BASE_PATH}/sign-up/*`, rateLimitPost("auth", AUTH_RATE_LIMIT));
app.use("/api/games", rateLimitPost("create-game", CREATE_RATE_LIMIT));
app.use("/api/games/:gameId/share-links", rateLimitPost("share-link", CREATE_RATE_LIMIT));
app.use("/api/games/:gameId/photos", rateLimitPost("photo-upload", PHOTO_UPLOAD_RATE_LIMIT));
app.use("/api/mcp", rateLimitPost("mcp", MCP_RATE_LIMIT));
app.use("/api/mcp-tokens", rateLimitPost("mcp-token", CREATE_RATE_LIMIT));

app.on(["GET", "POST"], `${AUTH_BASE_PATH}/*`, (c) =>
  createAuth(c.env, c.req.url).handler(c.req.raw),
);

app.route("/api", qrRouter);
app.route("/api", mcpRouter);
app.route("/api", mcpTokensRouter);
app.route("/api", shareRouter);
app.route("/api", aiRouter);
app.route("/api", photosRouter);
app.route("/api", gamesRouter);
app.route("/api", funStatsRouter);
app.route("/api", crossBalancesRouter);
app.route("/api", sessionRouter);
app.route("/api", userPreferencesRouter);

app.onError((error, c) => {
  // Log ra Cloudflare de 500 khong con "cam" nhu truoc.
  console.error(`API error at ${c.req.method} ${c.req.path}:`, error);
  return c.json({ error: "INTERNAL_SERVER_ERROR" }, 500);
});

export default app;
