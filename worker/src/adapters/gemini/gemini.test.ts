import { afterEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../env";
import { createGeminiAiProvider, generateGeminiJson } from "./gemini";

const env = (model?: string) =>
  ({
    GEMINI_API_KEY: "test-key",
    GEMINI_MODEL: model,
  }) as Env;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Gemini adapter", () => {
  it("báo thiếu cấu hình trước khi gọi mạng", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await generateGeminiJson({} as Env, [{ text: "test" }])).toEqual({
      ok: false,
      error: "gemini_not_configured",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("gửi nội dung qua gateway với model mặc định", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"amount":100}' }] } }],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await createGeminiAiProvider(env()).generateJson([
      { text: "test" },
    ]);
    expect(result).toEqual({ ok: true, json: { amount: 100 } });
    expect(fetchMock.mock.calls[0]?.[0]).toContain("gemini-2.0-flash");
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body as string).contents[0].parts).toEqual([
      { text: "test" },
    ]);
  });

  it("đọc JSON trong markdown hoặc văn bản với model được chọn", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: '```json\n{"title":"Cà phê"}\n```' }],
                },
              },
            ],
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [
              { content: { parts: [{ text: 'Kết quả: {"amount":42}.' }] } },
            ],
          }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    expect(
      await generateGeminiJson(env("custom-model"), [{ text: "test" }]),
    ).toEqual({
      ok: true,
      json: { title: "Cà phê" },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toContain("custom-model");
    expect(await generateGeminiJson(env(), [{ text: "test" }])).toEqual({
      ok: true,
      json: { amount: 42 },
    });
  });

  it("trả lỗi của gateway hoặc lỗi mặc định khi response không hợp lệ", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "quota" } }), {
          status: 429,
        }),
      )
      .mockResolvedValueOnce(new Response("not-json", { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [] })))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "No JSON here" }] } }],
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "Value: {broken}" }] } }],
          }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const parts = [{ text: "test" }];
    expect(await generateGeminiJson(env(), parts)).toEqual({
      ok: false,
      error: "quota",
    });
    expect(await generateGeminiJson(env(), parts)).toEqual({
      ok: false,
      error: "gemini_request_failed",
    });
    expect(await generateGeminiJson(env(), parts)).toEqual({
      ok: false,
      error: "gemini_invalid_response",
    });
    expect(await generateGeminiJson(env(), parts)).toEqual({
      ok: false,
      error: "gemini_invalid_response",
    });
    expect(await generateGeminiJson(env(), parts)).toEqual({
      ok: false,
      error: "gemini_invalid_response",
    });
  });
});
