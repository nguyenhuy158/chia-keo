import { Hono } from "hono";
import { cors } from "hono/cors";
import { AUTH_BASE_PATH, createAuth, getTrustedOrigins } from "./auth";
import type { Env } from "./env";
import { gamesRouter } from "./routes/games";
import { shareRouter } from "./routes/share";

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

app.on(["GET", "POST"], `${AUTH_BASE_PATH}/*`, (c) => createAuth(c.env).handler(c.req.raw));

app.route("/api", shareRouter);
app.route("/api", gamesRouter);

export default app;
