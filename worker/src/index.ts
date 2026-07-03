import { Hono } from "hono";
import { cors } from "hono/cors";
import { AUTH_BASE_PATH, createAuth, getTrustedOrigins } from "./auth";
import type { Env } from "./env";
import { rateLimitPost } from "./lib/rate-limit-middleware";
import { aiRouter } from "./routes/ai";
import { gamesRouter } from "./routes/games";
import { shareRouter } from "./routes/share";

// Chan brute-force login/dang ky va spam tao game/link share (theo IP).
const AUTH_RATE_LIMIT = { limit: 10, windowMs: 60_000 };
const CREATE_RATE_LIMIT = { limit: 30, windowMs: 60_000 };

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", (c, next) => {
  const allowedOrigins = getTrustedOrigins(c.env);

  return cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : null),
    credentials: true,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    maxAge: 600,
  })(c, next);
});

app.get("/api/health", (c) => c.json({ ok: true }));

app.use(`${AUTH_BASE_PATH}/sign-in/*`, rateLimitPost("auth", AUTH_RATE_LIMIT));
app.use(`${AUTH_BASE_PATH}/sign-up/*`, rateLimitPost("auth", AUTH_RATE_LIMIT));
app.use("/api/games", rateLimitPost("create-game", CREATE_RATE_LIMIT));
app.use("/api/games/:gameId/share-links", rateLimitPost("share-link", CREATE_RATE_LIMIT));

app.on(["GET", "POST"], `${AUTH_BASE_PATH}/*`, (c) => createAuth(c.env).handler(c.req.raw));

app.route("/api", shareRouter);
app.route("/api", aiRouter);
app.route("/api", gamesRouter);

export default app;
