import type { MiddlewareHandler } from "hono";
import { createD1GameRepository } from "../adapters/d1/game-repository";
import { createAuth } from "../auth";
import type { GameRepository } from "../core/ports/game-repository";
import type { Env } from "../env";

export type AuthedEnv = {
  Bindings: Env;
  Variables: {
    userId: string;
    repo: GameRepository;
  };
};

/**
 * Composition root cho request da dang nhap: xac thuc session va cam adapter
 * D1 vao port GameRepository. Doi DB chi can doi adapter o day.
 */
export const requireUser: MiddlewareHandler<AuthedEnv> = async (c, next) => {
  const auth = createAuth(c.env, c.req.url);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "unauthorized" }, 401);
  }

  c.set("userId", session.user.id);
  c.set("repo", createD1GameRepository(c.env.DB));
  await next();
};
