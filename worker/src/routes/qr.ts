import { Hono } from "hono";
import {
  VIETQR_ACCOUNT_PATTERN,
  buildVietQrUrl,
  resolveVietQrBankId,
} from "../../../shared/vietqr";
import type { Env } from "../env";

const MAX_AMOUNT = 1_000_000_000_000;
const CACHE_SECONDS = 86_400;
const UPSTREAM_TIMEOUT_MS = 8_000;

export const qrRouter = new Hono<{ Bindings: Env }>();

/**
 * Proxy anh VietQR qua origin cua minh. Chi nhan tham so da duoc kiem tra roi
 * tu dung URL upstream, khong bao gio nhan URL tu client, de endpoint nay
 * khong tro thanh open proxy.
 */
qrRouter.get("/qr", async (c) => {
  const bankId = resolveVietQrBankId(c.req.query("bank") || "");
  const accountNo = (c.req.query("account") || "").trim();
  const amount = Number(c.req.query("amount") || "");

  if (!bankId || !VIETQR_ACCOUNT_PATTERN.test(accountNo)) {
    return c.json({ error: "invalid_account" }, 400);
  }

  if (!Number.isInteger(amount) || amount < 0 || amount > MAX_AMOUNT) {
    return c.json({ error: "invalid_amount" }, 400);
  }

  const upstream = buildVietQrUrl(
    { bankId, accountNo, accountName: c.req.query("name") || "" },
    amount,
    c.req.query("code") || "",
  );

  try {
    const response = await fetch(upstream, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      cf: { cacheEverything: true, cacheTtl: CACHE_SECONDS },
    });

    if (!response.ok) return c.json({ error: "qr_unavailable" }, 502);

    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "image/png",
        "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
      },
    });
  } catch (error) {
    console.error("VietQR proxy failed:", error);
    return c.json({ error: "qr_unavailable" }, 502);
  }
});
