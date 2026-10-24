import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiPhoto } from "../../shared/api-types";
import type { PhotoViewer } from "./PhotoViewer";

const { state, confirm, update, remove, success } = vi.hoisted(() => ({
  state: {
    detail: undefined as ApiPhoto | undefined,
    updating: false,
    removing: false,
  },
  confirm: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  success: vi.fn(),
}));

vi.mock("./ConfirmDialog", () => ({ useConfirm: () => confirm }));
vi.mock("../adapters/react-query/queries", () => ({
  usePhoto: () => ({ data: state.detail }),
  useUpdatePhoto: () => ({ mutateAsync: update, isPending: state.updating }),
  useRemovePhoto: () => ({ mutateAsync: remove, isPending: state.removing }),
}));
vi.mock("sonner", () => ({ toast: { success } }));

import { usePhotoViewer } from "./use-photo-viewer";

const photos: ApiPhoto[] = [
  {
    id: "photo-1",
    expenseId: "expense-1",
    caption: "Bữa trưa",
    mimeType: "image/jpeg",
    width: 100,
    height: 80,
    thumbData: "dGh1bWI=",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "photo-2",
    expenseId: null,
    caption: "Bữa tối",
    mimeType: "image/jpeg",
    width: 100,
    height: 80,
    thumbData: "dGh1bWI=",
    createdAt: "2026-01-02T00:00:00Z",
  },
];

let host: HTMLDivElement;
let root: Root;
let viewer: ReturnType<typeof usePhotoViewer>;

function Harness({ items = photos }: { items?: ApiPhoto[] }) {
  viewer = usePhotoViewer(
    "game-1",
    items,
    new Map([["expense-1", "Tiền sân"]]),
  );
  return null;
}

function render(items = photos) {
  act(() => root.render(createElement(Harness, { items })));
}

function props() {
  return (viewer.viewer as ReactElement<Parameters<typeof PhotoViewer>[0]>)
    .props;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.detail = undefined;
  state.updating = false;
  state.removing = false;
  confirm.mockReset().mockResolvedValue(true);
  update.mockReset().mockResolvedValue(undefined);
  remove.mockReset().mockResolvedValue(undefined);
  success.mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("usePhotoViewer", () => {
  it("opens, navigates, and closes the current photo", () => {
    render();
    expect(viewer.viewer).toBeNull();
    act(() => viewer.open(0));
    expect(props().photo.id).toBe("photo-1");
    expect(props().expenseTitle).toBe("Tiền sân");
    expect(props().total).toBe(2);
    act(() => props().onNext());
    expect(props().photo.id).toBe("photo-2");
    expect(props().expenseTitle).toBeUndefined();
    act(() => props().onPrev());
    expect(props().photo.id).toBe("photo-1");
    act(() => props().onClose());
    expect(viewer.viewer).toBeNull();
  });

  it("passes detail and saving state to the viewer", async () => {
    state.detail = photos[0];
    state.updating = true;
    render();
    act(() => viewer.open(0));
    expect(props().detail).toBe(photos[0]);
    expect(props().pending).toBe(true);
    await act(async () => props().onSaveCaption?.("Ảnh mới"));
    expect(update).toHaveBeenCalledWith({
      photoId: "photo-1",
      input: { caption: "Ảnh mới" },
    });
    state.updating = false;
    state.removing = true;
    render();
    expect(props().pending).toBe(true);
  });

  it("requires confirmation before deletion and advances after removal", async () => {
    render();
    act(() => viewer.open(0));
    confirm.mockResolvedValueOnce(false);
    await act(async () => props().onDelete?.());
    expect(remove).not.toHaveBeenCalled();
    await act(async () => props().onDelete?.());
    expect(remove).toHaveBeenCalledWith("photo-1");
    expect(success).toHaveBeenCalledWith("Đã xóa ảnh");
    expect(props().index).toBe(0);
    act(() => viewer.open(1));
    await act(async () => props().onDelete?.());
    render([]);
    expect(viewer.viewer).toBeNull();
  });
});
