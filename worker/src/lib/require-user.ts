import type { MiddlewareHandler } from "hono";
import { createAuth } from "../auth";
import type { Env } from "../env";
import { createDb, type Db } from "./game-data";

export type AuthedEnv = {
  Bindings: Env;
  Variables: {
    userId: string;
    db: Db;
  };
};

export const requireUser: MiddlewareHandler<AuthedEnv> = async (c, next) => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "unauthorized" }, 401);
  }

  c.set("userId", session.user.id);
  c.set("db", createDb(c.env.DB));
  await next();
};
