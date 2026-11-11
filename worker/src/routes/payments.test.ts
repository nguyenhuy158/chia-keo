import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../env";

const { repo, createRepo, createFeed, options, create, detail } = vi.hoisted(() => ({
  repo: { name: "repo" },
  createRepo: vi.fn(),
  createFeed: vi.fn(),
  options: vi.fn(),
  create: vi.fn(),
  detail: vi.fn(),
}));

vi.mock("../adapters/d1/game-repository", () => ({ createD1GameRepository: createRepo }));
vi.mock("../adapters/sepay/sepay-bank-feed", () => ({ createSepayBankFeed: createFeed }));
vi.mock("../core/application/payments", () => ({
  getPaymentOptions: options,
  createPaymentRequest: create,
  getPaymentRequest: detail,
}));

import { paymentsRouter } from "./payments";

const app = new Hono<{ Bindings: Env }>();
app.route("/api", paymentsRouter);
const feed = { name: "feed" };
const env = { DB: {}, SEPAY_API: "secret", SEPAY_API_BASE: "https://sandbox.test" } as Env;

beforeEach(() => {
  createRepo.mockReset().mockReturnValue(repo);
  createFeed.mockReset().mockReturnValue(feed);
  options.mockReset().mockResolvedValue({ receiver: null, options: [] });
  create.mockReset().mockResolvedValue({ code: "CKAAAA2222" });
  detail.mockReset().mockResolvedValue({ status: "paid" });
});

describe("payments routes", () => {
  it("noi token va SePay vao use case", async () => {
    expect((await app.request("/api/share/tok/payments", {}, env)).status).toBe(200);
    expect(createFeed).toHaveBeenCalledWith("secret", "https://sandbox.test");
    expect(options).toHaveBeenCalledWith({ repo, bankFeed: feed }, "tok");

    const created = await app.request(
      "/api/share/tok/payments",
      { method: "POST", body: JSON.stringify({ participantIds: ["an"] }) },
      env,
    );
    expect(await created.json()).toEqual({ code: "CKAAAA2222" });
    expect(create).toHaveBeenCalledWith({ repo, bankFeed: feed }, "tok", { participantIds: ["an"] });

    const polled = await app.request("/api/share/tok/payments/CKAAAA2222", {}, env);
    expect(await polled.json()).toEqual({ status: "paid" });
    expect(detail).toHaveBeenCalledWith({ repo, bankFeed: feed }, "tok", "CKAAAA2222");
  });

  it("khong co token SePay thi bankFeed null, body sai thi 400", async () => {
    await app.request("/api/share/tok/payments", {}, { DB: {} } as Env);
    expect(options).toHaveBeenCalledWith({ repo, bankFeed: null }, "tok");

    const bad = await app.request("/api/share/tok/payments", { method: "POST", body: "{}" }, env);
    expect(bad.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});
