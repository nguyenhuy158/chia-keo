import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../env";

const { repo, createRepo, shareView, listPhotos, getPhoto, mcpRequest } =
  vi.hoisted(() => ({
    repo: { name: "repo" },
    createRepo: vi.fn(),
    shareView: vi.fn(),
    listPhotos: vi.fn(),
    getPhoto: vi.fn(),
    mcpRequest: vi.fn(),
  }));

vi.mock("../adapters/d1/game-repository", () => ({
  createD1GameRepository: createRepo,
}));
vi.mock("../core/application/share-links", () => ({
  getShareViewByToken: shareView,
}));
vi.mock("../core/application/photos", () => ({
  listSharedPhotos: listPhotos,
  getSharedPhoto: getPhoto,
}));
vi.mock("../mcp/http", () => ({ handleMcpHttpRequest: mcpRequest }));

import { mcpRouter } from "./mcp";
import { shareRouter } from "./share";

const app = new Hono<{ Bindings: Env }>();
app.route("/api", shareRouter);
app.route("/api", mcpRouter);

const db = {} as D1Database;
const env = { DB: db } as Env;

beforeEach(() => {
  createRepo.mockReset().mockReturnValue(repo);
  shareView.mockReset().mockResolvedValue({ name: "Cầu tối" });
  listPhotos.mockReset().mockResolvedValue([{ id: "photo-1" }]);
  getPhoto.mockReset().mockResolvedValue({ id: "photo-1" });
  mcpRequest.mockReset().mockResolvedValue(new Response("mcp-ok"));
});

describe("public HTTP adapters", () => {
  it("passes share tokens and photo IDs to the application", async () => {
    const view = await app.request("/api/share/token-1", {}, env);
    expect(view.status).toBe(200);
    expect(await view.json()).toEqual({ name: "Cầu tối" });
    expect(shareView).toHaveBeenCalledWith(repo, "token-1");

    const photos = await app.request("/api/share/token-1/photos", {}, env);
    expect(photos.status).toBe(200);
    expect(await photos.json()).toEqual([{ id: "photo-1" }]);
    expect(listPhotos).toHaveBeenCalledWith(repo, "token-1");

    const photo = await app.request(
      "/api/share/token-1/photos/photo-1",
      {},
      env,
    );
    expect(photo.status).toBe(200);
    expect(await photo.json()).toEqual({ id: "photo-1" });
    expect(getPhoto).toHaveBeenCalledWith(repo, "token-1", "photo-1");
    expect(createRepo).toHaveBeenCalledWith(db);
  });

  it("passes the raw request and repository to MCP", async () => {
    const waitUntil = vi.fn();
    const response = await app.fetch(
      new Request("https://chia-keo.example/api/mcp", {
        method: "POST",
        body: "{}",
      }),
      env,
      { waitUntil } as unknown as ExecutionContext,
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("mcp-ok");
    expect(mcpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({ method: "POST" }),
        repo,
        waitUntil: expect.any(Function),
      }),
    );
    const wait = mcpRequest.mock.lastCall?.[0].waitUntil as (
      promise: Promise<unknown>,
    ) => void;
    const promise = Promise.resolve();
    wait(promise);
    expect(waitUntil).toHaveBeenCalledWith(promise);
  });
});
