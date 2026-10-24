import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiPhoto } from "../../../shared/api-types";
import { provideGameApi } from "../../core/container";
import type { GameApiPort } from "../../core/ports/game-api";
import {
  PHOTO_TOO_LARGE_ERROR,
  PHOTO_UNREADABLE_ERROR,
} from "../browser/image";
import {
  PHOTO_ERROR_MESSAGES,
  toPhotoErrorMessage,
  usePhotoUploader,
} from "./photo-upload";

const { preparePhoto } = vi.hoisted(() => ({ preparePhoto: vi.fn() }));
vi.mock("../browser/image", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../browser/image")>()),
  preparePhoto,
}));

let host: HTMLDivElement;
let root: Root;
let client: QueryClient;

function mount() {
  let result!: ReturnType<typeof usePhotoUploader>;
  function Harness() {
    result = usePhotoUploader("game");
    return null;
  }
  act(() =>
    root.render(
      createElement(QueryClientProvider, { client }, createElement(Harness)),
    ),
  );
  return () => result;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  preparePhoto
    .mockReset()
    .mockResolvedValue({
      mimeType: "image/png",
      data: "base64",
      width: 2,
      height: 3,
    });
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  client.clear();
  host.remove();
});

describe("photo upload", () => {
  it("compresses and uploads each image in order with progress", async () => {
    const first = new File(["a"], "first.png", { type: "image/png" });
    const second = new File(["b"], "second.png", { type: "image/png" });
    let finish!: (photo: ApiPhoto) => void;
    const create = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<ApiPhoto>((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce({ id: "second" });
    provideGameApi({ photos: { create } } as unknown as GameApiPort);
    const current = mount();
    let upload!: Promise<ApiPhoto[]>;
    await act(async () => {
      upload = current().upload([first, second], { expenseId: "expense" });
      await vi.waitFor(() => expect(create).toHaveBeenCalledOnce());
    });
    expect(current()).toMatchObject({
      pending: true,
      done: 0,
      total: 2,
      error: "",
    });
    expect(create).toHaveBeenCalledWith("game", {
      mimeType: "image/png",
      data: "base64",
      width: 2,
      height: 3,
      caption: "",
      expenseId: "expense",
    });
    finish({ id: "first" } as ApiPhoto);
    await act(async () => {
      await upload;
    });
    expect(await upload).toEqual([{ id: "first" }, { id: "second" }]);
    expect(preparePhoto).toHaveBeenNthCalledWith(1, first);
    expect(preparePhoto).toHaveBeenNthCalledWith(2, second);
    expect(current()).toMatchObject({
      pending: false,
      done: 0,
      total: 0,
      error: "",
    });
  });

  it("returns the photos saved before a later image fails and clears the error", async () => {
    preparePhoto
      .mockResolvedValueOnce({
        mimeType: "image/png",
        data: "a",
        width: 1,
        height: 1,
      })
      .mockRejectedValueOnce(new Error(PHOTO_TOO_LARGE_ERROR));
    const create = vi.fn().mockResolvedValue({ id: "first" });
    provideGameApi({ photos: { create } } as unknown as GameApiPort);
    const current = mount();
    const files = [new File(["a"], "a.png"), new File(["b"], "b.png")];
    let result!: ApiPhoto[];
    await act(async () => {
      result = await current().upload(files);
    });
    expect(result).toEqual([{ id: "first" }]);
    expect(create).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith(
      "game",
      expect.objectContaining({ expenseId: null }),
    );
    expect(current().error).toBe(PHOTO_ERROR_MESSAGES[PHOTO_TOO_LARGE_ERROR]);
    act(() => current().clearError());
    expect(current().error).toBe("");
  });

  it("skips empty selection and handles server failures", async () => {
    const create = vi.fn().mockRejectedValue(new Error("invalid_input"));
    provideGameApi({ photos: { create } } as unknown as GameApiPort);
    const current = mount();
    await expect(current().upload([])).resolves.toEqual([]);
    expect(create).not.toHaveBeenCalled();
    await act(async () => {
      await current().upload([new File(["a"], "a.png")]);
    });
    expect(current().error).toBe(PHOTO_ERROR_MESSAGES.invalid_input);
  });

  it("maps readable image and unknown failures", () => {
    expect(toPhotoErrorMessage(new Error(PHOTO_UNREADABLE_ERROR))).toBe(
      PHOTO_ERROR_MESSAGES[PHOTO_UNREADABLE_ERROR],
    );
    expect(toPhotoErrorMessage(new Error("too_many_photos"))).toBe(
      PHOTO_ERROR_MESSAGES.too_many_photos,
    );
    expect(toPhotoErrorMessage(new Error("offline"))).toContain(
      "Tải ảnh lên thất bại",
    );
    expect(toPhotoErrorMessage("offline")).toContain("Tải ảnh lên thất bại");
  });
});
