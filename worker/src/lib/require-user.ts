import type { Hono, MiddlewareHandler } from "hono";
import { createD1GameRepository } from "../adapters/d1/game-repository";
import { createAuth } from "../auth";
import type { GameRepository } from "../core/ports/game-repository";
import type { Env } from "../env";
import { readSsoCookie, verifySsoToken } from "../sso";
import { resolveSsoUserId } from "../sso-user";

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

/**
 * Hai duong dang nhap chay song song. better-auth di truoc vi la duong cu va
 * doc session ngay trong D1 cua app; cookie SSO chi duoc hoi khi khong co
 * session nao — nguoi dang nhap bang username khong phai cho mot lan verify
 * chu ky thua moi request.
 *
 * Ca hai deu tra ve userId trong cung bang `user`, nen tang duoi (games,
 * contacts, preferences) khong can biet nguoi dung vao bang duong nao.
 */
export async function resolveUserId(env: Env, request: Request): Promise<string | null> {
  const auth = createAuth(env, request.url);
  const session = await auth.api.getSession({ headers: request.headers });
  if (session) return session.user.id;

  const token = readSsoCookie(request.headers);
  if (!token) return null;

  const claims = await verifySsoToken(token);
  if (!claims) return null;

  return resolveSsoUserId(env.DB, claims);
}

export const requireUser: MiddlewareHandler<AuthedEnv> = async (c, next) => {
  const userId = await resolveUserId(c.env, c.req.raw);
  if (!userId) {
    return c.json({ error: "unauthorized" }, 401);
  }

  c.set("userId", userId);
  c.set("repo", createD1GameRepository(c.env.DB));
  await next();
};
