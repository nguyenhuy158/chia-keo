import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ApiCollaborator,
  ApiShareCandidate,
} from "../../shared/api-types";

const { state, confirm, add, remove, removePending } = vi.hoisted(() => ({
  state: {
    candidates: undefined as ApiShareCandidate[] | undefined,
    adding: false,
    removing: false,
    removingPending: false,
  },
  confirm: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
  removePending: vi.fn(),
}));

vi.mock("./ConfirmDialog", () => ({ useConfirm: () => confirm }));
vi.mock("../adapters/react-query/queries", () => ({
  useShareCandidates: () => ({ data: state.candidates }),
  useAddCollaborator: () => ({ mutateAsync: add, isPending: state.adding }),
  useRemoveCollaborator: () => ({
    mutateAsync: remove,
    isPending: state.removing,
  }),
  useRemovePendingCollaborator: () => ({
    mutateAsync: removePending,
    isPending: state.removingPending,
  }),
}));

import { CollaboratorsPanel } from "./CollaboratorsPanel";

let host: HTMLDivElement;
let root: Root;

function render(isOwner = true, collaborators: ApiCollaborator[] = []) {
  act(() =>
    root.render(
      createElement(CollaboratorsPanel, {
        gameId: "game-1",
        isOwner,
        collaborators,
      }),
    ),
  );
}

function button(label: string) {
  return [...host.querySelectorAll("button")].find(
    (item) =>
      item.textContent?.includes(label) ||
      item.getAttribute("aria-label")?.includes(label),
  ) as HTMLButtonElement | undefined;
}

function input() {
  return host.querySelector("input") as HTMLInputElement;
}

function enterEmail(value: string) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input(), value);
    input().dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.candidates = undefined;
  state.adding = false;
  state.removing = false;
  state.removingPending = false;
  confirm.mockReset().mockResolvedValue(true);
  add.mockReset().mockResolvedValue(undefined);
  remove.mockReset().mockResolvedValue(undefined);
  removePending.mockReset().mockResolvedValue(undefined);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("CollaboratorsPanel", () => {
  it("hides empty shared access and shows registered and pending collaborators", () => {
    render(false);
    expect(host.textContent).toBe("");
    render(false, [
      { userId: "user-1", name: "An", email: "an@example.com" },
      { userId: null, name: "", email: "binh@example.com" },
    ]);
    expect(host.textContent).toContain("an@example.com");
    expect(host.textContent).toContain("binh@example.com");
    expect(host.textContent).toContain("Chờ đăng nhập");
    expect(button("Bỏ chia sẻ")).toBeUndefined();
  });

  it("adds a trimmed email and reports known and unknown failures", async () => {
    render();
    expect(button("Chia sẻ")?.disabled).toBe(true);
    await act(async () =>
      input().dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
    );
    expect(add).not.toHaveBeenCalled();
    enterEmail("  an@example.com  ");
    await act(async () => button("Chia sẻ")?.click());
    expect(add).toHaveBeenCalledWith("an@example.com");
    expect(input().value).toBe("");
    enterEmail("an@example.com");
    add.mockRejectedValueOnce(new Error("already_shared"));
    await act(async () => button("Chia sẻ")?.click());
    expect(host.textContent).toContain("Người này đã được chia sẻ rồi.");
    add.mockRejectedValueOnce(new Error("offline"));
    await act(async () => button("Chia sẻ")?.click());
    expect(host.textContent).toContain("Chia sẻ thất bại, thử lại sau.");
    add.mockRejectedValueOnce("offline");
    await act(async () =>
      input().dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
    );
    expect(host.textContent).toContain("Chia sẻ thất bại, thử lại sau.");
    state.adding = true;
    render();
    expect(button("Chia sẻ")?.disabled).toBe(true);
  });

  it("filters suggestions and adds the selected candidate", async () => {
    state.candidates = [
      { id: "1", name: "An", email: "an@example.com" },
      { id: "2", name: "", email: "binh@example.com" },
    ];
    render();
    act(() => input().focus());
    expect(host.textContent).toContain("binh@example.com");
    enterEmail("AN@");
    expect(host.textContent).not.toContain("binh@example.com");
    act(() =>
      button("An")?.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
      ),
    );
    await act(async () => button("An")?.click());
    expect(add).toHaveBeenCalledWith("an@example.com");
    act(() => input().focus());
    act(() => input().blur());
    expect(button("binh@example.com")).toBeUndefined();
    act(() => input().focus());
    act(() =>
      input().dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    expect(button("binh@example.com")).toBeUndefined();
  });

  it("confirms removal of active and pending collaborators", async () => {
    render(true, [
      { userId: "user-1", name: "An", email: "an@example.com" },
      { userId: null, name: "", email: "binh@example.com" },
    ]);
    confirm.mockResolvedValueOnce(false);
    await act(async () => button("Bỏ chia sẻ với An")?.click());
    expect(remove).not.toHaveBeenCalled();
    await act(async () => button("Bỏ chia sẻ với An")?.click());
    expect(remove).toHaveBeenCalledWith("user-1");
    await act(async () => button("Bỏ chia sẻ với binh@example.com")?.click());
    expect(removePending).toHaveBeenCalledWith("binh@example.com");
    state.removing = true;
    render(true, [{ userId: "user-1", name: "An", email: "an@example.com" }]);
    expect(button("Bỏ chia sẻ với An")?.disabled).toBe(true);
    state.removing = false;
    state.removingPending = true;
    render();
  });
});
