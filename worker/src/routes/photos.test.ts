import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeRepo,
  FAKE_GAME_ID,
  FAKE_OWNER,
} from "../core/application/fake-game-repository";
import type { PhotoDetailRow } from "../core/ports/game-repository";
import type { AuthedEnv } from "../lib/require-user";

vi.mock("../lib/require-user", () => ({ protectPaths: vi.fn() }));

import { photosRouter } from "./photos";

let app: Hono<AuthedEnv>;
let fake: ReturnType<typeof createFakeRepo>;
let photos: PhotoDetailRow[];

function request(method: string, path: string, body?: unknown) {
  return app.request(`/api${path}`, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
}

beforeEach(() => {
  fake = createFakeRepo();
  photos = [];
  fake.repo.photos.listByGame = async (gameId) =>
    photos.filter((row) => row.gameId === gameId);
  fake.repo.photos.countByGame = async (gameId) =>
    photos.filter((row) => row.gameId === gameId).length;
  fake.repo.photos.getById = async (photoId) =>
    photos.find((row) => row.id === photoId) || null;
  fake.repo.photos.getDetail = async (photoId) =>
    photos.find((row) => row.id === photoId) || null;
  fake.repo.photos.getWithGame = async (photoId) => {
    const photo = photos.find((row) => row.id === photoId);
    const game = fake.state.games.find((row) => row.id === photo?.gameId);
    return photo && game ? { photo, game } : null;
  };
  fake.repo.photos.insert = async (row) => {
    photos.push(row);
  };
  fake.repo.photos.update = async (photoId, fields) => {
    const row = photos.find((item) => item.id === photoId);
    if (row) Object.assign(row, fields);
  };
  fake.repo.photos.delete = async (photoId) => {
    photos = photos.filter((row) => row.id !== photoId);
  };
  app = new Hono<AuthedEnv>();
  app.use("*", async (c, next) => {
    c.set("repo", fake.repo);
    c.set("userId", FAKE_OWNER);
    await next();
  });
  app.route("/api", photosRouter);
});

describe("photo HTTP routes", () => {
  it("validates uploads and changes", async () => {
    expect(
      (await request("POST", `/games/${FAKE_GAME_ID}/photos`, {})).status,
    ).toBe(400);
    expect(
      (await request("PATCH", "/photos/missing", { caption: 42 })).status,
    ).toBe(400);
    expect((await request("GET", "/photos/missing")).status).toBe(404);
  });

  it("adds, lists, reads, updates, and removes a photo", async () => {
    const uploaded = await request("POST", `/games/${FAKE_GAME_ID}/photos`, {
      mimeType: "image/png",
      data: "original",
      thumbData: "thumbnail",
      width: 640,
      height: 480,
      caption: "Sân tối",
    });
    expect(uploaded.status).toBe(201);
    const photo = (await uploaded.json()) as { id: string; caption: string };
    expect(photo.caption).toBe("Sân tối");
    const listed = await request("GET", `/games/${FAKE_GAME_ID}/photos`);
    expect(await listed.json()).toMatchObject([
      { id: photo.id, caption: "Sân tối" },
    ]);
    const detail = await request("GET", `/photos/${photo.id}`);
    expect(await detail.json()).toMatchObject({
      id: photo.id,
      data: "original",
    });
    const changed = await request("PATCH", `/photos/${photo.id}`, {
      caption: "Ảnh mới",
    });
    expect(await changed.json()).toMatchObject({
      id: photo.id,
      caption: "Ảnh mới",
    });
    const removed = await request("DELETE", `/photos/${photo.id}`);
    expect(await removed.json()).toEqual({ ok: true });
    expect(photos).toHaveLength(0);
  });

  it("does not expose photos or albums from an unknown game", async () => {
    expect((await request("GET", "/games/missing/photos")).status).toBe(404);
    expect(
      (
        await request("POST", "/games/missing/photos", {
          mimeType: "image/png",
          data: "original",
          thumbData: "thumbnail",
          width: 1,
          height: 1,
        })
      ).status,
    ).toBe(404);
    expect(
      (await request("PATCH", "/photos/missing", { caption: "new" })).status,
    ).toBe(404);
    expect((await request("DELETE", "/photos/missing")).status).toBe(404);
  });
});
