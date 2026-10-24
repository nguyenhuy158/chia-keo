import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiParticipant } from "../../shared/api-types";
import type { Contact } from "../../shared/contacts";
import type { ParticipantInput } from "../../shared/schemas";

const { state } = vi.hoisted(() => ({
  state: { contacts: undefined as Contact[] | undefined, loading: false },
}));

vi.mock("../adapters/react-query/queries", () => ({
  useContacts: () => ({ data: state.contacts, isPending: state.loading }),
}));

import { ContactPicker } from "./ContactPicker";

let host: HTMLDivElement;
let root: Root;
let onAddMany = vi.fn(async (_people: ParticipantInput[]) => undefined);

function contact(name: string, accountNo = ""): Contact {
  return {
    key: name.toLowerCase(),
    name,
    bankId: accountNo ? "MB" : "",
    accountNo,
    accountName: accountNo ? name : "",
    gameCount: 2,
    lastUsedAt: "2026-08-01T00:00:00.000Z",
    source: "book",
    id: name.toLowerCase(),
  };
}

function participant(name: string): ApiParticipant {
  return { id: name, name, bankId: "", accountNo: "", accountName: "" };
}

function render(participants: ApiParticipant[] = [], pending = false) {
  act(() =>
    root.render(
      createElement(ContactPicker, { participants, pending, onAddMany }),
    ),
  );
}

function button(name: string) {
  return [...host.querySelectorAll("button")].find((item) =>
    item.textContent?.includes(name),
  ) as HTMLButtonElement;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.contacts = undefined;
  state.loading = false;
  onAddMany = vi.fn(async (_people: ParticipantInput[]) => undefined);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("ContactPicker", () => {
  it("stays hidden until contacts are loaded", () => {
    state.loading = true;
    render();
    expect(host.textContent).toBe("");
    state.loading = false;
    render();
    expect(host.textContent).toBe("");
    state.contacts = [];
    render();
    expect(host.textContent).toBe("");
  });

  it("sorts existing people last and selects only new contacts", async () => {
    state.contacts = [
      contact("An"),
      contact("Bình", "12345678"),
      contact("Châu"),
    ];
    render([participant("An")]);
    expect(
      [...host.querySelectorAll("button")]
        .slice(0, 3)
        .map((item) => item.textContent),
    ).toEqual(["Bình", "Châu", "An"]);
    expect(button("An").disabled).toBe(true);
    expect(button("Bình").title).toContain("12345678");
    expect(button("Châu").title).toContain("chưa có QR");
    act(() => button("Bình").click());
    act(() => button("Châu").click());
    expect(button("Thêm 2 người")).toBeDefined();
    act(() => button("Châu").click());
    expect(button("Thêm 1 người")).toBeDefined();
    await act(async () => button("Thêm 1 người").click());
    expect(onAddMany).toHaveBeenCalledWith([
      {
        name: "Bình",
        bankId: "MB",
        accountNo: "12345678",
        accountName: "Bình",
      },
    ]);
    expect(button("Thêm 1 người")).toBeUndefined();
  });

  it("removes newly added people from the pending selection", () => {
    state.contacts = [contact("Bình"), contact("Châu")];
    render();
    act(() => button("Bình").click());
    render([participant("Bình")]);
    expect(button("Bình").disabled).toBe(true);
    expect(button("Thêm 1 người")).toBeUndefined();
    render([participant("Bình")], true);
    expect(button("Châu").disabled).toBe(true);
  });
});
