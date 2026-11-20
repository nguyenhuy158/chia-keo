import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthedEnv } from "../lib/require-user";

const { repo, ai, createProvider, suggestText, suggestReceipt } = vi.hoisted(
  () => ({
    repo: { name: "repo" },
    ai: { name: "ai" },
    createProvider: vi.fn(),
    suggestText: vi.fn(),
    suggestReceipt: vi.fn(),
  }),
);

vi.mock("../lib/require-user", () => ({ protectPaths: vi.fn() }));
vi.mock("../adapters/gemini/gemini", () => ({
  createGeminiAiProvider: createProvider,
}));
vi.mock("../core/application/ai-suggestions", () => ({
  suggestExpenseFromText: suggestText,
  suggestExpenseFromReceipt: suggestReceipt,
}));

import { aiRouter } from "./ai";

const app = new Hono<AuthedEnv>();
app.use("*", async (c, next) => {
  c.set("repo", repo as unknown as AuthedEnv["Variables"]["repo"]);
  c.set("userId", "user-1");
  await next();
});
app.route("/api", aiRouter);

function post(path: string, body: unknown) {
  return app.request(`/api${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  createProvider.mockReset().mockReturnValue(ai);
  suggestText.mockReset().mockResolvedValue({ title: "Tiền sân" });
  suggestReceipt.mockReset().mockResolvedValue({ title: "Bữa tối" });
});

describe("AI HTTP routes", () => {
  it("rejects invalid text and receipt input", async () => {
    expect(
      (await post("/ai/expense", { gameId: "game-1", text: " " })).status,
    ).toBe(400);
    expect(
      (await post("/ai/expense", { gameId: "", text: "Cầu" })).status,
    ).toBe(400);
    expect(
      (
        await post("/ai/receipt", {
          gameId: "game-1",
          image: { mimeType: "text/plain", data: "abc" },
        })
      ).status,
    ).toBe(400);
    expect(suggestText).not.toHaveBeenCalled();
    expect(suggestReceipt).not.toHaveBeenCalled();
  });

  it("passes validated text to the application", async () => {
    const response = await post("/ai/expense", {
      gameId: "game-1",
      text: "  Tiền sân  ",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ title: "Tiền sân" });
    expect(suggestText).toHaveBeenCalledWith(
      { repo, ai },
      "user-1",
      "game-1",
      "Tiền sân",
    );
  });

  it("passes validated receipt images to the application", async () => {
    const image = { mimeType: "image/jpeg", data: "YWJj" };
    const response = await post("/ai/receipt", { gameId: "game-1", image });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ title: "Bữa tối" });
    expect(suggestReceipt).toHaveBeenCalledWith(
      { repo, ai },
      "user-1",
      "game-1",
      image,
    );
  });
});
