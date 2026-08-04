import { Hono } from "hono";
import { mcpTokenInputSchema } from "../../../shared/schemas";
import {
  createMcpToken,
  listMcpTokens,
  revokeMcpToken,
} from "../core/application/mcp-tokens";
import { invalidInput, readJson, respond } from "../lib/http";
import { protectPaths, type AuthedEnv } from "../lib/require-user";

/** Quan ly token MCP cua chinh minh; luon can dang nhap bang session. */
export const mcpTokensRouter = new Hono<AuthedEnv>();

protectPaths(mcpTokensRouter, "/mcp-tokens", "/mcp-tokens/*");

mcpTokensRouter.get("/mcp-tokens", (c) =>
  respond(c, () => listMcpTokens(c.get("repo"), c.get("userId"))),
);

/** Ban token goc chi nam trong phan hoi cua request nay, khong luu lai. */
mcpTokensRouter.post("/mcp-tokens", async (c) => {
  const input = await readJson(c, mcpTokenInputSchema);
  if (!input) return invalidInput(c);

  return respond(c, () => createMcpToken(c.get("repo"), c.get("userId"), input), 201);
});

mcpTokensRouter.delete("/mcp-tokens/:tokenId", (c) =>
  respond(c, () => revokeMcpToken(c.get("repo"), c.get("userId"), c.req.param("tokenId"))),
);
