import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { session, mutateAsync, success, error } = vi.hoisted(() => ({
  session: {
    user: null as { id: string; name: string } | null,
    pending: false,
  },
  mutateAsync: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../adapters/react-query/session-query", () => ({
  useAppSession: () => ({ user: session.user }),
  useUpdateProfileName: () => ({ mutateAsync, isPending: session.pending }),
}));
vi.mock("sonner", () => ({ toast: { success, error } }));

import { ProfileNamePanel } from "./ProfileNamePanel";

let host: HTMLDivElement;
let root: Root;

function render() {
  act(() => root.render(createElement(ProfileNamePanel)));
}

function input() {
  return host.querySelector("input") as HTMLInputElement;
}

function save() {
  return host.querySelector("button") as HTMLButtonElement;
}

function typeName(value: string) {
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
  session.user = { id: "owner", name: "Old Name" };
  session.pending = false;
  mutateAsync.mockReset().mockResolvedValue(undefined);
  success.mockReset();
  error.mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("ProfileNamePanel", () => {
  it("hides for anonymous users and syncs the signed-in name", () => {
    session.user = null;
    render();
    expect(host.textContent).toBe("");
    session.user = { id: "owner", name: "New session" };
    render();
    expect(input().value).toBe("New session");
    session.user = { id: "other", name: "Other user" };
    render();
    expect(input().value).toBe("Other user");
  });

  it("disables save for unchanged, empty, and pending names", () => {
    render();
    expect(save().disabled).toBe(true);
    typeName("   ");
    expect(save().disabled).toBe(true);
    typeName("  New Name  ");
    expect(save().disabled).toBe(false);
    session.pending = true;
    render();
    expect(save().disabled).toBe(true);
  });

  it("trims and saves a changed name on click", async () => {
    render();
    typeName("  New Name  ");
    await act(async () => save().click());
    expect(mutateAsync).toHaveBeenCalledWith("New Name");
    expect(success).toHaveBeenCalledWith("Đã đổi tên");
  });

  it("saves on Enter and reports an API failure", async () => {
    mutateAsync.mockRejectedValue(new Error("offline"));
    render();
    typeName("Changed");
    await act(async () =>
      input().dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
    );
    expect(mutateAsync).toHaveBeenCalledWith("Changed");
    expect(error).toHaveBeenCalledWith("Đổi tên thất bại, thử lại sau");
  });

  it("ignores Enter when the name is unchanged or another key is pressed", async () => {
    render();
    await act(async () =>
      input().dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
    );
    typeName("Changed");
    await act(async () =>
      input().dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
