import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as schema from "../adapters/d1/schema";
import type { Env } from "../env";
import { resolveUserId } from "../lib/require-user";

/**
 * Xac minh tich hop voi Worker `mailer` qua Service Binding: goi
 * `/api/mailer-test` khi da dang nhap se gui 1 email test ve chinh email
 * cua nguoi dung. Xoa route nay sau khi xac minh xong, no khong phai tinh
 * nang san pham.
 */
export const mailerTestRouter = new Hono<{ Bindings: Env }>();

mailerTestRouter.post("/mailer-test", async (c) => {
  const userId = await resolveUserId(c.env, c.req.raw);
  if (!userId) return c.json({ error: "unauthorized" }, 401);

  const orm = drizzle(c.env.DB, { schema });
  const rows = await orm
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);

  const email = rows[0]?.email;
  if (!email) return c.json({ error: "user_has_no_email" }, 400);

  const res = await c.env.MAILER.fetch("https://mailer/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.env.MAILER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: email,
      subject: "chia-keo: mailer integration test",
      html: "<p>Neu ban thay email nay, Service Binding toi Worker mailer hoat dong dung.</p>",
    }),
  });

  const data = await res.json();
  if (!res.ok) return c.json({ error: "mailer_failed", detail: data }, 502);
  return c.json(data);
});
