import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  AiProviderError,
  BadRequestError,
  InvalidInputError,
  NotFoundError,
} from "../core/application/errors";
import { badRequest, invalidInput, notFound, readJson, respond } from "./http";

describe("readJson", () => {
  const app = new Hono();
  app.post("/", async (context) => {
    const input = await readJson(
      context,
      z.object({ name: z.string().min(1) }),
    );
    return input ? context.json(input) : invalidInput(context);
  });

  it("nhận JSON đúng schema", async () => {
    const response = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Hồng" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ name: "Hồng" });
  });

  it("trả lỗi đầu vào cho JSON sai schema hoặc hỏng cú pháp", async () => {
    for (const body of ['{"name":""}', "not-json"]) {
      const response = await app.request("/", { method: "POST", body });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid_input" });
    }
  });
});

describe("respond", () => {
  function appFor(run: () => Promise<unknown>, status: 200 | 201 = 200) {
    const app = new Hono();
    app.get("/", (context) => respond(context, run, status));
    return app;
  }

  it("trả kết quả và status được yêu cầu", async () => {
    const response = await appFor(async () => ({ id: "game-1" }), 201).request(
      "/",
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "game-1" });
  });

  it.each([
    [new NotFoundError(), 404, "not_found"],
    [new InvalidInputError(), 400, "invalid_input"],
    [new BadRequestError("game_closed"), 400, "game_closed"],
    [
      new AiProviderError("gemini_not_configured"),
      400,
      "gemini_not_configured",
    ],
    [
      new AiProviderError("gemini_request_failed"),
      502,
      "gemini_request_failed",
    ],
    [new AiProviderError("unknown_ai_error"), 502, "unknown_ai_error"],
  ])("ánh xạ %s sang HTTP %i", async (error, status, code) => {
    const response = await appFor(async () => {
      throw error;
    }).request("/");

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: code });
  });

  it("đẩy lỗi không thuộc nhóm nghiệp vụ lên handler của app", async () => {
    const app = new Hono();
    app.get("/", async (context) => {
      try {
        return await respond(context, async () => {
          throw new Error("unexpected");
        });
      } catch (error) {
        return context.json({ message: (error as Error).message }, 500);
      }
    });

    const response = await app.request("/");

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: "unexpected" });
  });
});

describe("error responses", () => {
  it("trả đúng mã lỗi trực tiếp", async () => {
    const app = new Hono();
    app.get("/bad", (context) => badRequest(context, "bad_amount"));
    app.get("/missing", (context) => notFound(context));

    expect(await (await app.request("/bad")).json()).toEqual({
      error: "bad_amount",
    });
    expect((await app.request("/missing")).status).toBe(404);
  });
});
