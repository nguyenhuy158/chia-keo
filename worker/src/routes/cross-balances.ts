import { Hono } from "hono";
import { getBalancesAcrossGames } from "../core/application/cross-game-balances";
import { respond } from "../lib/http";
import { protectPaths, type AuthedEnv } from "../lib/require-user";

/**
 * So du gop cua nhieu cuoc chia. Logic da co san va dang duoc MCP dung
 * (mcp/tools.ts); router nay chi mo them duong HTTP de trang chu hoi "ai con
 * no minh, minh con no ai" ma khong phai tai chi tiet tung cuoc.
 *
 * Khong nhan gameIds: trang chu luon hoi toan bo cac cuoc gan nhat. Muon gioi
 * han pham vi thi dung MCP tool, noi nguoi goi biet ro minh chon cuoc nao.
 */
export const crossBalancesRouter = new Hono<AuthedEnv>();

protectPaths(crossBalancesRouter, "/cross-balances");

crossBalancesRouter.get("/cross-balances", (c) =>
  respond(c, () => getBalancesAcrossGames(c.get("repo"), c.get("userId"))),
);
