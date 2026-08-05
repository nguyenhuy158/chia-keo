import { Hono } from "hono";
import { getFunStats } from "../core/application/fun-stats";
import { respond } from "../lib/http";
import { protectPaths, type AuthedEnv } from "../lib/require-user";

/**
 * Router rieng, tach khoi gamesRouter: thong ke vui khong dung chung logic
 * nghiep vu cua cuoc chia (settlement, split...), chi doc va gop.
 */
export const funStatsRouter = new Hono<AuthedEnv>();

protectPaths(funStatsRouter, "/fun-stats");

funStatsRouter.get("/fun-stats", (c) =>
  respond(c, () => getFunStats(c.get("repo"), c.get("userId"))),
);
