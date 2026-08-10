import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { buildSummaryText } from "../../../shared/summary-text";
import * as schema from "../adapters/d1/schema";
import { getGameDetailForOwner } from "../core/application/games";
import { NotFoundError } from "../core/application/errors";
import { notFound } from "../lib/http";
import { protectPaths, type AuthedEnv } from "../lib/require-user";

/**
 * Gui ban tom tat (khoan chi + can chuyen) cua mot cuoc chia ve dung email
 * cua chinh chu cuoc, de ho luu lai hoac copy nhac nguoi khac — khong gui
 * thang cho participant vi participant khong co email trong schema (chi la
 * ten nguoi trong nhom, xem adapters/d1/schema.ts).
 */
export const emailSummaryRouter = new Hono<AuthedEnv>();

protectPaths(emailSummaryRouter, "/games/:gameId/email-summary");

emailSummaryRouter.post("/games/:gameId/email-summary", async (c) => {
  const gameId = c.req.param("gameId");
  const userId = c.get("userId");

  let detail: Awaited<ReturnType<typeof getGameDetailForOwner>>;
  try {
    detail = await getGameDetailForOwner(c.get("repo"), userId, gameId);
  } catch (error) {
    if (error instanceof NotFoundError) return notFound(c);
    throw error;
  }

  const orm = drizzle(c.env.DB, { schema });
  const rows = await orm
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);
  const email = rows[0]?.email;
  if (!email) return c.json({ error: "user_has_no_email" }, 400);

  const shareUrl =
    detail.shareLink?.enabled ? `${new URL(c.req.url).origin}/share/${detail.shareLink.token}` : undefined;

  const text = buildSummaryText(
    {
      code: detail.code,
      name: detail.name,
      participants: detail.participants,
      expenses: detail.expenses,
      summary: detail.summary,
      shareUrl,
      settlementMode: detail.settlementMode,
      settlementHostId: detail.settlementHostId,
    },
    "detailed",
  );

  const html = `<pre style="font-family:inherit;white-space:pre-wrap">${text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")}</pre>`;

  const res = await c.env.MAILER.fetch("https://mailer/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.env.MAILER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: email,
      subject: `Tóm tắt "${detail.name}" (${detail.code})`,
      html,
      text,
    }),
  });

  const data = await res.json();
  if (!res.ok) return c.json({ error: "mailer_failed", detail: data }, 502);
  return c.json({ sent: true });
});
