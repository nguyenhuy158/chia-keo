import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiExpense, ApiPhoto } from "../../shared/api-types";
import { MAX_PHOTOS_PER_GAME } from "../../shared/schemas";

const { uploader, viewer, upload, open, success } = vi.hoisted(() => ({
  uploader: {
    pending: false,
    done: 0,
    total: 0,
    error: "",
  },
  viewer: { viewer: null as React.ReactNode },
  upload: vi.fn(),
  open: vi.fn(),
  success: vi.fn(),
}));

vi.mock("../adapters/react-query/photo-upload", () => ({
  usePhotoUploader: () => ({ ...uploader, upload }),
}));
vi.mock("./use-photo-viewer", () => ({
  usePhotoViewer: () => ({ ...viewer, open }),
}));
vi.mock("sonner", () => ({ toast: { success } }));

import { PhotoPanel, PhotoPickerButton } from "./PhotoPanel";

let host: HTMLDivElement;
let root: Root;

function photo(id: string): ApiPhoto {
  return {
    id,
    expenseId: null,
    caption: "",
    mimeType: "image/png",
    thumbData: "thumb",
    createdAt: "2026-08-01T00:00:00.000Z",
  } as ApiPhoto;
}

function panel(
  photos: ApiPhoto[] = [],
  loading = false,
  expenses: ApiExpense[] = [],
) {
  act(() =>
    root.render(
      createElement(PhotoPanel, {
        gameId: "game",
        photos,
        expenses,
        loading,
      }),
    ),
  );
}

function picker() {
  return host.querySelector("input[type='file']") as HTMLInputElement;
}

function selectFiles(files: File[] | null) {
  Object.defineProperty(picker(), "files", {
    configurable: true,
    value: files,
  });
  act(() => picker().dispatchEvent(new Event("change", { bubbles: true })));
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Object.assign(uploader, { pending: false, done: 0, total: 0, error: "" });
  viewer.viewer = null;
  upload.mockReset().mockResolvedValue([]);
  open.mockReset();
  success.mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("PhotoPanel", () => {
  it("shows an empty album with an accessible multi-file picker", () => {
    panel();
    expect(host.textContent).toContain("Lưu ảnh hóa đơn");
    expect(picker().multiple).toBe(true);
    expect(picker().accept).toContain("image/heic");
    expect(picker().closest("label")?.getAttribute("aria-label")).toBe(
      "Thêm ảnh vào album",
    );
  });

  it("uploads selected files and reports only successful additions", async () => {
    upload.mockResolvedValueOnce([photo("one")]).mockResolvedValueOnce([]);
    panel();
    const file = new File(["image"], "image.png", { type: "image/png" });
    selectFiles([file]);
    await vi.waitFor(() =>
      expect(success).toHaveBeenCalledWith("Đã thêm 1 ảnh"),
    );
    expect(upload).toHaveBeenCalledWith([file]);
    selectFiles(null);
    await vi.waitFor(() => expect(upload).toHaveBeenCalledTimes(2));
    expect(upload).toHaveBeenLastCalledWith([]);
    expect(success).toHaveBeenCalledTimes(1);
  });

  it("shows loading, upload error, and pending progress", () => {
    uploader.pending = true;
    uploader.done = 1;
    uploader.total = 3;
    uploader.error = "Upload failed";
    panel();
    expect(host.textContent).toContain("Upload failed");
    expect(host.textContent).toContain("Đang tải 2/3");
    expect(picker().disabled).toBe(true);
    panel([], true);
    expect(picker()).toBeNull();
  });

  it("opens photos and stops accepting files at the limit", () => {
    const photos = Array.from({ length: MAX_PHOTOS_PER_GAME }, (_, index) =>
      photo(`photo-${index}`),
    );
    viewer.viewer = createElement("div", null, "Photo viewer");
    photos[0].expenseId = "expense-1";
    panel(photos, false, [{ id: "expense-1", title: "Sân" } as ApiExpense]);
    expect(host.textContent).toContain("Photo viewer");
    expect(host.textContent).toContain(`Đã đủ ${MAX_PHOTOS_PER_GAME} ảnh`);
    expect(picker().disabled).toBe(true);
    act(() =>
      (
        host.querySelector("button[aria-label='Sân']") as HTMLButtonElement
      ).click(),
    );
    expect(open).toHaveBeenCalledWith(0);
  });

  it("uses the picker label when no separate accessible name is provided", () => {
    const onPick = vi.fn();
    act(() =>
      root.render(
        createElement(PhotoPickerButton, { label: "Camera", onPick }),
      ),
    );
    expect(picker().closest("label")?.getAttribute("aria-label")).toBe(
      "Camera",
    );
    expect(picker().disabled).toBe(false);
  });
});
