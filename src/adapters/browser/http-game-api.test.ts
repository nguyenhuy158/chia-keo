import { afterEach, describe, expect, it, vi } from "vitest";
import { createHttpGameApi } from "./http-game-api";

const api = createHttpGameApi();
const input = { name: "Trip" };
type RequestCase = readonly [string, string, () => Promise<unknown>, string?];

afterEach(() => vi.unstubAllGlobals());

describe("HTTP Game API", () => {
  const requests: RequestCase[] = [
    ["GET", "/api/games", () => api.games.list()],
    ["GET", "/api/games/g", () => api.games.detail("g")],
    [
      "POST",
      "/api/games",
      () => api.games.create(input as never),
      JSON.stringify(input),
    ],
    [
      "PATCH",
      "/api/games/g",
      () => api.games.update("g", input),
      JSON.stringify(input),
    ],
    ["DELETE", "/api/games/g", () => api.games.remove("g")],
    ["POST", "/api/games/g/duplicate", () => api.games.duplicate("g")],
    ["GET", "/api/games/closed", () => api.games.listClosed()],
    ["POST", "/api/games/g/close", () => api.games.close("g")],
    ["POST", "/api/games/g/reopen", () => api.games.reopen("g")],
    ["GET", "/api/games/trash", () => api.games.trash()],
    ["POST", "/api/games/g/restore", () => api.games.restore("g")],
    ["DELETE", "/api/games/g/purge", () => api.games.purge("g")],
    ["GET", "/api/fun-stats", () => api.funStats.get()],
    ["GET", "/api/cross-balances", () => api.crossBalances.get()],
    ["GET", "/api/games/g/events", () => api.gameEvents.list("g")],
    ["POST", "/api/events/e/undo", () => api.gameEvents.undo("e")],
    ["GET", "/api/preferences", () => api.preferences.get()],
    [
      "PATCH",
      "/api/preferences",
      () => api.preferences.update(input as never),
      JSON.stringify(input),
    ],
    ["GET", "/api/shuttles", () => api.shuttles.get()],
    [
      "POST",
      "/api/shuttles/entries",
      () => api.shuttles.createEntry(input as never),
      JSON.stringify(input),
    ],
    ["DELETE", "/api/shuttles/entries/e", () => api.shuttles.removeEntry("e")],
    ["GET", "/api/contacts", () => api.contacts.list()],
    [
      "POST",
      "/api/contacts",
      () => api.contacts.create(input as never),
      JSON.stringify(input),
    ],
    [
      "PATCH",
      "/api/contacts/c",
      () => api.contacts.update("c", input),
      JSON.stringify(input),
    ],
    ["DELETE", "/api/contacts/c", () => api.contacts.remove("c")],
    [
      "POST",
      "/api/games/g/participants",
      () => api.participants.create("g", input as never),
      JSON.stringify(input),
    ],
    [
      "POST",
      "/api/games/g/participants/batch",
      () => api.participants.createMany("g", input as never),
      JSON.stringify(input),
    ],
    [
      "PATCH",
      "/api/participants/p",
      () => api.participants.update("p", input),
      JSON.stringify(input),
    ],
    ["DELETE", "/api/participants/p", () => api.participants.remove("p")],
    [
      "PATCH",
      "/api/games/g/participants/reorder",
      () => api.participants.reorder("g", ["p"]),
      '{"participantIds":["p"]}',
    ],
    [
      "POST",
      "/api/games/g/expenses",
      () => api.expenses.create("g", input as never),
      JSON.stringify(input),
    ],
    [
      "PATCH",
      "/api/expenses/e",
      () => api.expenses.update("e", input as never),
      JSON.stringify(input),
    ],
    ["DELETE", "/api/expenses/e", () => api.expenses.remove("e")],
    [
      "PATCH",
      "/api/games/g/expenses/reorder",
      () => api.expenses.reorder("g", ["e"]),
      '{"expenseIds":["e"]}',
    ],
    [
      "POST",
      "/api/games/g/transfers",
      () => api.transfers.create("g", input as never),
      JSON.stringify(input),
    ],
    ["POST", "/api/games/g/share-links", () => api.shareLinks.rotate("g")],
    [
      "PATCH",
      "/api/games/g/share-link",
      () => api.shareLinks.setEnabled("g", true),
      '{"enabled":true}',
    ],
    [
      "POST",
      "/api/games/g/collaborators",
      () => api.collaborators.add("g", "a@b.co"),
      '{"email":"a@b.co"}',
    ],
    [
      "DELETE",
      "/api/games/g/collaborators/u",
      () => api.collaborators.remove("g", "u"),
    ],
    [
      "DELETE",
      "/api/games/g/collaborators/pending/a%2Bb%40c.co",
      () => api.collaborators.removePending("g", "a+b@c.co"),
    ],
    [
      "GET",
      "/api/games/g/collaborators/candidates",
      () => api.collaborators.listCandidates("g"),
    ],
    ["GET", "/api/games/g/photos", () => api.photos.list("g")],
    ["GET", "/api/photos/p", () => api.photos.detail("p")],
    [
      "POST",
      "/api/games/g/photos",
      () => api.photos.create("g", input as never),
      JSON.stringify(input),
    ],
    [
      "PATCH",
      "/api/photos/p",
      () => api.photos.update("p", input as never),
      JSON.stringify(input),
    ],
    ["DELETE", "/api/photos/p", () => api.photos.remove("p")],
    ["GET", "/api/share/token", () => api.share.view("token")],
    ["GET", "/api/share/token/photos", () => api.share.photos("token")],
    ["GET", "/api/share/token/photos/p", () => api.share.photo("token", "p")],
    ["GET", "/api/mcp-tokens", () => api.mcpTokens.list()],
    [
      "POST",
      "/api/mcp-tokens",
      () => api.mcpTokens.create(input as never),
      JSON.stringify(input),
    ],
    ["DELETE", "/api/mcp-tokens/t", () => api.mcpTokens.revoke("t")],
    [
      "POST",
      "/api/ai/expense",
      () => api.ai.suggestExpense("g", "dinner"),
      '{"gameId":"g","text":"dinner"}',
    ],
    [
      "POST",
      "/api/ai/receipt",
      () => api.ai.scanReceipt("g", { mimeType: "image/png", data: "a" }),
      '{"gameId":"g","image":{"mimeType":"image/png","data":"a"}}',
    ],
  ];

  for (const [method, path, call, body] of requests) {
    it(`${method} ${path}`, async () => {
      const fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ done: true }),
      });
      vi.stubGlobal("fetch", fetch);
      await expect(call()).resolves.toEqual({ done: true });
      expect(fetch).toHaveBeenCalledWith(path, {
        credentials: "include",
        ...(method === "GET" ? {} : { method }),
        ...(body === undefined ? {} : { body }),
        headers:
          body === undefined ? {} : { "Content-Type": "application/json" },
      });
    });
  }

  it("uses API error payload when a request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: "forbidden" }),
      }),
    );
    await expect(api.games.list()).rejects.toThrow("forbidden");
  });

  it("falls back to HTTP status when error payload is invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.reject(new Error("invalid JSON")),
      }),
    );
    await expect(api.games.list()).rejects.toThrow("http_503");
  });
});
