import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../env";
import { qrRouter } from "./qr";

const app = new Hono<{ Bindings: Env }>();
app.route("/api", qrRouter);

const valid =
  "/api/qr?bank=MB&account=12345678&amount=150000&name=Nguyen%20Van%20A&code=CK01";

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => vi.unstubAllGlobals());

describe("VietQR image proxy", () => {
  it.each([
    "/api/qr",
    "/api/qr?bank=unknown&account=12345678",
    "/api/qr?bank=MB&account=123",
    "/api/qr?bank=MB&account=1234/../5678",
  ])("rejects an invalid bank or account: %s", async (path) => {
    const response = await app.request(path);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_account" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["-1", "1.5", "NaN", "1000000000001"])(
    "rejects an invalid amount: %s",
    async (amount) => {
      const response = await app.request(
        `/api/qr?bank=MB&account=12345678&amount=${amount}`,
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid_amount" });
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("fetches a validated QR image and caches it", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("png bytes", { headers: { "Content-Type": "image/png" } }),
    );
    const response = await app.request(valid);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("png bytes");
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("public, max-age=86400");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/img\.vietqr\.io\/image\/MB-12345678-/),
      expect.objectContaining({
        cf: { cacheEverything: true, cacheTtl: 86400 },
      }),
    );
  });

  it("uses the default content type when the provider omits it", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      body: null,
      headers: new Headers(),
    } as Response);
    const response = await app.request("/api/qr?bank=MB&account=12345678");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
  });

  it("reports a provider error without returning its body", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("upstream secret", { status: 503 }),
    );
    const response = await app.request(valid);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "qr_unavailable" });
  });

  it("reports a network failure", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("timeout"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await app.request(valid);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "qr_unavailable" });
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });
});
