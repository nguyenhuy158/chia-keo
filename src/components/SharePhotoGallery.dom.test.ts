import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiExpense, ApiPhoto } from "../../shared/api-types";

const { state, useSharePhoto } = vi.hoisted(() => ({
  state: { photos: undefined as ApiPhoto[] | undefined, pending: false },
  useSharePhoto: vi.fn(),
}));

vi.mock("../adapters/react-query/queries", () => ({
  useSharePhotos: () => ({ data: state.photos, isPending: state.pending }),
  useSharePhoto: (token: string, id: string) => {
    useSharePhoto(token, id);
    return { data: { id } };
  },
}));
vi.mock("./PhotoViewer", () => ({
  PhotoViewer: ({
    onPrev,
    onNext,
    onClose,
    expenseTitle,
  }: {
    onPrev: () => void;
    onNext: () => void;
    onClose: () => void;
    expenseTitle?: string;
  }) =>
    createElement(
      "div",
      null,
      createElement("span", null, expenseTitle || "general photo"),
      createElement("button", { type: "button", onClick: onPrev }, "Previous"),
      createElement("button", { type: "button", onClick: onNext }, "Next"),
      createElement("button", { type: "button", onClick: onClose }, "Close"),
    ),
}));

import { SharePhotoGallery } from "./SharePhotoGallery";

let host: HTMLDivElement;
let root: Root;

function photo(id: string, expenseId: string | null = null): ApiPhoto {
  return {
    id,
    expenseId,
    caption: "",
    mimeType: "image/png",
    thumbData: "thumb",
    createdAt: "2026-08-01T00:00:00.000Z",
  } as ApiPhoto;
}

function render(expenses: ApiExpense[] = []) {
  act(() =>
    root.render(
      createElement(SharePhotoGallery, { token: "share-token", expenses }),
    ),
  );
}

function button(text: string) {
  return [...host.querySelectorAll("button")].find(
    (item) => item.textContent === text,
  ) as HTMLButtonElement;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.photos = undefined;
  state.pending = false;
  useSharePhoto.mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("SharePhotoGallery", () => {
  it("shows loading and empty states without fetching an individual photo", () => {
    state.pending = true;
    render();
    expect(host.textContent).not.toContain("Chưa có ảnh");
    expect(useSharePhoto).toHaveBeenLastCalledWith("share-token", "");
    state.pending = false;
    state.photos = [];
    render();
    expect(host.textContent).toContain("Chưa có ảnh");
  });

  it("opens photos, shows expense name, cycles, and closes the viewer", () => {
    state.photos = [photo("one", "expense"), photo("two")];
    render([{ id: "expense", title: "Tiền sân" } as ApiExpense]);
    expect(host.textContent).toContain("Ảnh (2)");
    act(() =>
      (
        host.querySelector("button[aria-label='Tiền sân']") as HTMLButtonElement
      ).click(),
    );
    expect(useSharePhoto).toHaveBeenLastCalledWith("share-token", "one");
    expect(host.textContent).toContain("Tiền sân");
    act(() => button("Next").click());
    expect(useSharePhoto).toHaveBeenLastCalledWith("share-token", "two");
    expect(host.textContent).toContain("general photo");
    act(() => button("Previous").click());
    expect(useSharePhoto).toHaveBeenLastCalledWith("share-token", "one");
    act(() => button("Close").click());
    expect(button("Close")).toBeUndefined();
  });
});
