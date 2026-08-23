import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHttpGameApi } from "./http-game-api";

type Call = { url: string; init: RequestInit | undefined };

let calls: Call[] = [];
let nextResponse: () => Response;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  calls = [];
  nextResponse = () => jsonResponse({ ok: true });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return nextResponse();
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const api = createHttpGameApi();

describe("request", () => {
  it("luon gui kem cookie session", async () => {
    await api.games.list();

    expect(calls[0].init?.credentials).toBe("include");
  });

  it("GET khong dat Content-Type (khong co body)", async () => {
    await api.games.list();

    expect((calls[0].init?.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });

  it("POST co body thi dat Content-Type JSON", async () => {
    await api.games.create({ name: "Cầu lông" });

    expect((calls[0].init?.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
    expect(calls[0].init?.body).toBe(JSON.stringify({ name: "Cầu lông" }));
  });

  it("loi co ma tu server thi nem dung ma do", async () => {
    nextResponse = () => jsonResponse({ error: "too_many_photos" }, 400);

    await expect(api.games.list()).rejects.toThrow("too_many_photos");
  });

  it("loi khong doc duoc body thi nem theo status", async () => {
    nextResponse = () => new Response("<html>502</html>", { status: 502 });

    await expect(api.games.list()).rejects.toThrow("http_502");
  });
});

describe("duong dan cua tung nhom endpoint", () => {
  const cases: [string, () => Promise<unknown>, string, string][] = [
    ["games.list", () => api.games.list(), "GET", "/api/games"],
    ["games.detail", () => api.games.detail("game_1"), "GET", "/api/games/game_1"],
    ["games.create", () => api.games.create({ name: "X" }), "POST", "/api/games"],
    ["games.update", () => api.games.update("game_1", { name: "Y" }), "PATCH", "/api/games/game_1"],
    ["games.remove", () => api.games.remove("game_1"), "DELETE", "/api/games/game_1"],
    ["games.duplicate", () => api.games.duplicate("game_1"), "POST", "/api/games/game_1/duplicate"],
    ["games.trash", () => api.games.trash(), "GET", "/api/games/trash"],
    ["games.restore", () => api.games.restore("game_1"), "POST", "/api/games/game_1/restore"],
    ["games.purge", () => api.games.purge("game_1"), "DELETE", "/api/games/game_1/purge"],
    ["funStats.get", () => api.funStats.get(), "GET", "/api/fun-stats"],
    ["crossBalances.get", () => api.crossBalances.get(), "GET", "/api/cross-balances"],
    ["gameEvents.list", () => api.gameEvents.list("game_1"), "GET", "/api/games/game_1/events"],
    ["gameEvents.undo", () => api.gameEvents.undo("event_1"), "POST", "/api/events/event_1/undo"],
    ["preferences.get", () => api.preferences.get(), "GET", "/api/preferences"],
    [
      "preferences.update",
      () => api.preferences.update({ summaryShowQr: false }),
      "PATCH",
      "/api/preferences",
    ],
    ["contacts.list", () => api.contacts.list(), "GET", "/api/contacts"],
    [
      "contacts.create",
      () => api.contacts.create({ name: "Hồng", bankId: "", accountNo: "", accountName: "" }),
      "POST",
      "/api/contacts",
    ],
    [
      "contacts.update",
      () => api.contacts.update("contact_1", { name: "Lan" }),
      "PATCH",
      "/api/contacts/contact_1",
    ],
    ["contacts.remove", () => api.contacts.remove("contact_1"), "DELETE", "/api/contacts/contact_1"],
    [
      "participants.create",
      () => api.participants.create("game_1", { name: "An", bankId: "", accountNo: "", accountName: "" }),
      "POST",
      "/api/games/game_1/participants",
    ],
    [
      "participants.createMany",
      () => api.participants.createMany("game_1", { people: [{ name: "An" }] }),
      "POST",
      "/api/games/game_1/participants/batch",
    ],
    [
      "participants.update",
      () => api.participants.update("participant_1", { name: "An" }),
      "PATCH",
      "/api/participants/participant_1",
    ],
    [
      "participants.remove",
      () => api.participants.remove("participant_1"),
      "DELETE",
      "/api/participants/participant_1",
    ],
    [
      "participants.reorder",
      () => api.participants.reorder("game_1", ["p1", "p2"]),
      "PATCH",
      "/api/games/game_1/participants/reorder",
    ],
    [
      "expenses.update",
      () => api.expenses.update("expense_1", { amount: 1 }),
      "PATCH",
      "/api/expenses/expense_1",
    ],
    ["expenses.remove", () => api.expenses.remove("expense_1"), "DELETE", "/api/expenses/expense_1"],
    [
      "expenses.reorder",
      () => api.expenses.reorder("game_1", ["e1"]),
      "PATCH",
      "/api/games/game_1/expenses/reorder",
    ],
    [
      "shareLinks.rotate",
      () => api.shareLinks.rotate("game_1"),
      "POST",
      "/api/games/game_1/share-links",
    ],
    [
      "shareLinks.setEnabled",
      () => api.shareLinks.setEnabled("game_1", false),
      "PATCH",
      "/api/games/game_1/share-link",
    ],
    [
      "collaborators.add",
      () => api.collaborators.add("game_1", "ban@example.com"),
      "POST",
      "/api/games/game_1/collaborators",
    ],
    [
      "collaborators.remove",
      () => api.collaborators.remove("game_1", "user_1"),
      "DELETE",
      "/api/games/game_1/collaborators/user_1",
    ],
    [
      "collaborators.listCandidates",
      () => api.collaborators.listCandidates("game_1"),
      "GET",
      "/api/games/game_1/collaborators/candidates",
    ],
    ["photos.list", () => api.photos.list("game_1"), "GET", "/api/games/game_1/photos"],
    ["photos.detail", () => api.photos.detail("photo_1"), "GET", "/api/photos/photo_1"],
    [
      "photos.update",
      () => api.photos.update("photo_1", { caption: "x" }),
      "PATCH",
      "/api/photos/photo_1",
    ],
    ["photos.remove", () => api.photos.remove("photo_1"), "DELETE", "/api/photos/photo_1"],
    ["share.view", () => api.share.view("abcd"), "GET", "/api/share/abcd"],
    ["share.photos", () => api.share.photos("abcd"), "GET", "/api/share/abcd/photos"],
    [
      "share.photo",
      () => api.share.photo("abcd", "photo_1"),
      "GET",
      "/api/share/abcd/photos/photo_1",
    ],
    ["mcpTokens.list", () => api.mcpTokens.list(), "GET", "/api/mcp-tokens"],
    [
      "mcpTokens.create",
      () => api.mcpTokens.create({ name: "token" }),
      "POST",
      "/api/mcp-tokens",
    ],
    ["mcpTokens.revoke", () => api.mcpTokens.revoke("token_1"), "DELETE", "/api/mcp-tokens/token_1"],
    [
      "ai.suggestExpense",
      () => api.ai.suggestExpense("game_1", "an ứng 90k"),
      "POST",
      "/api/ai/expense",
    ],
    [
      "ai.scanReceipt",
      () => api.ai.scanReceipt("game_1", { mimeType: "image/webp", data: "AAAA" }),
      "POST",
      "/api/ai/receipt",
    ],
  ];

  for (const [name, run, method, path] of cases) {
    it(`${name} -> ${method} ${path}`, async () => {
      await run();

      expect(calls[0].url).toBe(path);
      expect(calls[0].init?.method || "GET").toBe(method);
    });
  }

  it("expenses.create gui dung body", async () => {
    await api.expenses.create("game_1", {
      kind: "expense",
      title: "Nước",
      amount: 90_000,
      note: "",
      payerParticipantId: "participant_an",
      splitMode: "equal",
      splitParticipantIds: ["participant_an"],
      splits: [],
    });

    expect(calls[0].url).toBe("/api/games/game_1/expenses");
    expect(JSON.parse(String(calls[0].init?.body))).toMatchObject({ amount: 90_000 });
  });

  it("transfers.create gui dung body", async () => {
    await api.transfers.create("game_1", {
      fromParticipantId: "p1",
      toParticipantId: "p2",
      amount: 1_000,
      note: "",
    });

    expect(calls[0].url).toBe("/api/games/game_1/transfers");
  });

  it("photos.create gui dung duong dan", async () => {
    await api.photos.create("game_1", {
      mimeType: "image/webp",
      data: "AAAA",
      thumbData: "AAAA",
      width: 10,
      height: 10,
      caption: "",
      expenseId: null,
    });

    expect(calls[0].url).toBe("/api/games/game_1/photos");
  });

  it("email trong duong dan invite duoc url-encode", async () => {
    await api.collaborators.removePending("game_1", "ai+do@example.com");

    expect(calls[0].url).toBe(
      "/api/games/game_1/collaborators/pending/ai%2Bdo%40example.com",
    );
  });
});
