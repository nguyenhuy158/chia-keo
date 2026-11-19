import { Hono } from "hono";
import { createDb, createGameRepository } from "../adapters/d1/game-repository";
import type { Env } from "../env";
import { handleMcpHttpRequest } from "../mcp/http";

/** Driving adapter mong: cam D1 vao va giao viec cho tang MCP. */
export const mcpRouter = new Hono<{ Bindings: Env }>();

mcpRouter.all("/mcp", (c) =>
  handleMcpHttpRequest({
    request: c.req.raw,
    repo: createGameRepository(createDb(c.env)),
    waitUntil: (promise) => c.executionCtx.waitUntil(promise),
  }),
);
