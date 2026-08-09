import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as schema from "../adapters/d1/schema";
import type { Env } from "../env";
import { resolveUserId } from "../lib/require-user";

/**
 * Danh tinh hien tai, tra loi duoc cho CA HAI duong dang nhap.
 *
 * better-auth co client hook rieng (`authClient.useSession`) nhung no chi thay
 * session cua chinh no; nguoi vao bang cookie SSO se bi coi la chua dang nhap.
 * Route nay la nguon su that duy nhat cho frontend.
 *
 * Khong dung `protectPaths`: chua dang nhap tra 200 kem `user: null` chu khong
 * phai 401 — day la cau hoi "toi la ai", khong phai tai nguyen can bao ve.
 */
export const sessionRouter = new Hono<{ Bindings: Env }>();

sessionRouter.get("/session", async (c) => {
  const userId = await resolveUserId(c.env, c.req.raw);
  if (!userId) return c.json({ user: null });

  const orm = drizzle(c.env.DB, { schema });
  const rows = await orm
    .select({
      id: schema.user.id,
      name: schema.user.name,
      image: schema.user.image,
      displayUsername: schema.user.displayUsername,
    })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);

  const user = rows[0];
  if (!user) return c.json({ user: null });

  return c.json({
    user: {
      id: user.id,
      name: user.displayUsername || user.name,
      image: user.image,
    },
  });
});
