import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "../core/application/errors";
import type { Env } from "../env";

const { repo, createRepo, previewData, pageMeta } = vi.hoisted(() => ({
  repo: { name: "repo" },
  createRepo: vi.fn(),
  previewData: vi.fn(),
  pageMeta: vi.fn(),
}));

vi.mock("../adapters/d1/game-repository", () => ({
  createD1GameRepository: createRepo,
}));
vi.mock("../core/application/share-links", () => ({
  getShareViewByToken: vi.fn(),
  getSharePreviewData: previewData,
  findSharePageMeta: pageMeta,
}));

import { shareRouter } from "./share";
import { sharePageRouter } from "./share-page";

class FakeHtmlRewriter {
  private appended = "";

  on(
    _selector: string,
    handler: { element(head: { append(html: string): void }): void },
  ) {
    handler.element({ append: (html) => (this.appended += html) });
    return this;
  }

  transform(page: Response) {
    return new Response(`${this.appended}|${page.status}`);
  }
}
vi.stubGlobal("HTMLRewriter", FakeHtmlRewriter);

const app = new Hono<{ Bindings: Env }>();
app.route("/api", shareRouter);
app.route("/", sharePageRouter);
app.onError(() => new Response("boom", { status: 500 }));

const assetsFetch = vi.fn();
const env = {
  DB: {} as D1Database,
  ASSETS: { fetch: assetsFetch },
} as unknown as Env;

beforeEach(() => {
  createRepo.mockReset().mockReturnValue(repo);
  previewData.mockReset();
  pageMeta.mockReset();
  assetsFetch
    .mockReset()
    .mockImplementation(async () => new Response("<html></html>"));
});

describe("share preview image", () => {
  it("serves the stored JPEG bytes for the token", async () => {
    previewData.mockResolvedValue(btoa("jpeg-bytes"));

    const response = await app.request("/api/share/AbCd/preview.jpg", {}, env);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(await response.text()).toBe("jpeg-bytes");
    expect(previewData).toHaveBeenCalledWith(repo, "AbCd");
  });

  it("returns 404 when there is no shared preview", async () => {
    previewData.mockRejectedValue(new NotFoundError());

    const response = await app.request("/api/share/AbCd/preview.jpg", {}, env);

    expect(response.status).toBe(404);
  });

  it("lets unexpected errors reach the app error handler", async () => {
    previewData.mockRejectedValue(new Error("d1 down"));

    const response = await app.request("/api/share/AbCd/preview.jpg", {}, env);

    expect(response.status).toBe(500);
  });
});

describe("share page", () => {
  it("injects meta tags for a live share token", async () => {
    pageMeta.mockResolvedValue({ name: "Cầu tối", previewVersion: "v1" });

    const response = await app.request(
      "https://chiakeo.example/share/AbCd",
      {},
      env,
    );

    const body = await response.text();
    expect(body).toContain('content="Cầu tối · Chia Kèo"');
    expect(body).toContain("/api/share/AbCd/preview.jpg?v=v1");
    expect(body.endsWith("|200")).toBe(true);
    expect(pageMeta).toHaveBeenCalledWith(repo, "AbCd");
    expect(assetsFetch.mock.calls[0][0].toString()).toBe(
      "https://chiakeo.example/",
    );
  });

  it("returns the plain app shell for unknown tokens", async () => {
    pageMeta.mockResolvedValue(null);

    const response = await app.request(
      "https://chiakeo.example/share/zzzz",
      {},
      env,
    );

    expect(await response.text()).toBe("<html></html>");
  });

  it("still serves the app shell when the meta lookup fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    pageMeta.mockRejectedValue(new Error("d1 down"));

    const response = await app.request(
      "https://chiakeo.example/share/AbCd",
      {},
      env,
    );

    expect(await response.text()).toBe("<html></html>");
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
