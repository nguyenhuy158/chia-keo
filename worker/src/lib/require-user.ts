import type { Hono, MiddlewareHandler } from "hono";
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
/**
 * Gan `requireUser` cho dung cac path cua mot router.
 *
 * Khong dung `router.use("*", requireUser)`: sub-app duoc mount bang
 * `app.route("/api", router)` nen dau "*" phu len toan bo `/api/*`, ke ca route
 * cua router khac duoc mount sau. Lan truoc no da lam `/api/share/*` (public)
 * tra 401 khi router mcp-tokens duoc mount truoc router share.
 */
export function protectPaths(router: Hono<AuthedEnv>, ...paths: string[]) {
  for (const path of paths) router.use(path, requireUser);
}

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
