import { afterEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../env";
import { createGeminiAiProvider, generateGeminiJson } from "./gemini";

function env(overrides: Partial<Env> = {}): Env {
  return { GEMINI_API_KEY: "key-test", ...overrides } as Env;
}

/** Gia lap mot phan hoi cua AI Gateway. */
function stubFetch(body: unknown, ok = true) {
  const fetchMock = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify(body), { status: ok ? 200 : 500 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function geminiText(text: string) {
  return { candidates: [{ content: { parts: [{ text }] } }] };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("generateGeminiJson", () => {
  it("chua cau hinh key thi bao ro, khong goi mang", async () => {
    const fetchMock = stubFetch({});

    expect(await generateGeminiJson(env({ GEMINI_API_KEY: undefined }), [{ text: "x" }])).toEqual({
      ok: false,
      error: "gemini_not_configured",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("doc JSON tra ve tu model", async () => {
    stubFetch(geminiText('{"title":"Nước","amount":90000}'));

    expect(await generateGeminiJson(env(), [{ text: "x" }])).toEqual({
      ok: true,
      json: { title: "Nước", amount: 90_000 },
    });
  });

  it("boc duoc JSON nam trong khoi ```json", async () => {
    stubFetch(geminiText('```json\n{"amount":1000}\n```'));

    expect(await generateGeminiJson(env(), [{ text: "x" }])).toEqual({
      ok: true,
      json: { amount: 1_000 },
    });
  });

  it("nhat duoc JSON lan giua van ban thua", async () => {
    stubFetch(geminiText('Đây là kết quả: {"amount":2000} — hết.'));

    expect(await generateGeminiJson(env(), [{ text: "x" }])).toEqual({
      ok: true,
      json: { amount: 2_000 },
    });
  });

  it("khong co JSON nao thi bao gemini_invalid_response", async () => {
    stubFetch(geminiText("xin lỗi, tôi không hiểu"));

    expect(await generateGeminiJson(env(), [{ text: "x" }])).toEqual({
      ok: false,
      error: "gemini_invalid_response",
    });
  });

  it("JSON hong trong khoi ngoac cung bi tu choi", async () => {
    stubFetch(geminiText('{"amount": khong-phai-so}'));

    expect(await generateGeminiJson(env(), [{ text: "x" }])).toMatchObject({ ok: false });
  });

  it("upstream loi thi tra ve thong bao cua no", async () => {
    stubFetch({ error: { message: "quota exceeded" } }, false);

    expect(await generateGeminiJson(env(), [{ text: "x" }])).toEqual({
      ok: false,
      error: "quota exceeded",
    });
  });

  it("upstream loi khong ro thi tra ma chung", async () => {
    stubFetch({}, false);

    expect(await generateGeminiJson(env(), [{ text: "x" }])).toEqual({
      ok: false,
      error: "gemini_request_failed",
    });
  });

  it("dung model trong env va gui key qua query", async () => {
    const fetchMock = stubFetch(geminiText("{}"));

    await generateGeminiJson(env({ GEMINI_MODEL: "gemini-3-pro" }), [{ text: "x" }]);

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("gemini-3-pro");
    expect(url).toContain("key=key-test");
  });

  it("gui kem anh khi co inlineData", async () => {
    const fetchMock = stubFetch(geminiText("{}"));
    const part = { inlineData: { mimeType: "image/webp", data: "AAAA" } };

    await generateGeminiJson(env(), [part]);

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      contents: [{ role: "user", parts: [part] }],
    });
  });
});

describe("createGeminiAiProvider", () => {
  it("tra ve provider cam dung env", async () => {
    stubFetch(geminiText('{"ok":true}'));

    const provider = createGeminiAiProvider(env());

    expect(await provider.generateJson([{ text: "x" }])).toEqual({ ok: true, json: { ok: true } });
  });
});
