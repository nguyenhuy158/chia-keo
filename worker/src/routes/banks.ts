import { Hono } from "hono";
import type { ApiBankListResponse } from "../../../shared/api-types";
import { createD1ApiCache } from "../adapters/d1/api-cache";
import { createDb } from "../adapters/d1/game-repository";
import { VIETQR_BANKS_URL, getBankDirectory } from "../core/application/banks";
import type { Env } from "../env";

const UPSTREAM_TIMEOUT_MS = 8_000;
// Trinh duyet cache 1 gio; TTL that (7 ngay) nam o tang D1 trong use case.
const BROWSER_CACHE_SECONDS = 3_600;

export const banksRouter = new Hono<{ Bindings: Env }>();

/** Danh ba ngan hang VietQR cho dropdown FE; du lieu cong khai, cache o D1. */
banksRouter.get("/banks", async (c) => {
  const { banks, source } = await getBankDirectory({
    cache: createD1ApiCache(createDb(c.env.DB)),
    fetchUpstream: async () => {
      const response = await fetch(VIETQR_BANKS_URL, {
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`vietqr_banks_http_${response.status}`);
      return response.json();
    },
    now: Date.now,
  });

  c.header("Cache-Control", `public, max-age=${BROWSER_CACHE_SECONDS}`);
  return c.json({ banks, source } satisfies ApiBankListResponse);
});
