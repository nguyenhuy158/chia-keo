import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Contact } from "../../shared/contacts";

const { state, confirm, create, update, remove, success, error } = vi.hoisted(
  () => ({
    state: {
      contacts: undefined as Contact[] | undefined,
      loading: false,
      creating: false,
      updating: false,
      deleting: false,
    },
    confirm: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  }),
);

vi.mock("./ConfirmDialog", () => ({ useConfirm: () => confirm }));
vi.mock("../adapters/react-query/queries", () => ({
  useContacts: () => ({ data: state.contacts, isPending: state.loading }),
  useCreateContact: () => ({ mutateAsync: create, isPending: state.creating }),
  useUpdateContact: () => ({ mutateAsync: update, isPending: state.updating }),
  useDeleteContact: () => ({ mutateAsync: remove, isPending: state.deleting }),
}));
vi.mock("sonner", () => ({ toast: { success, error } }));

import { ContactBookCard } from "./ContactBookCard";

let host: HTMLDivElement;
let root: Root;

function contact(
  name: string,
  source: Contact["source"] = "book",
  accountNo = "",
): Contact {
  return {
    key: name.toLowerCase(),
    name,
    bankId: accountNo ? "MB" : "",
    accountNo,
    accountName: accountNo ? name : "",
    gameCount: source === "history" ? 2 : 0,
    lastUsedAt: "2026-08-01T00:00:00.000Z",
    source,
    id: source === "book" ? name.toLowerCase() : null,
  };
}

function render() {
  act(() => root.render(createElement(ContactBookCard)));
}

function button(label: string) {
  const buttons = [...host.querySelectorAll("button")];
  return (buttons.find(
    (item) =>
      item.textContent?.trim() === label ||
      item.getAttribute("aria-label") === label,
  ) ||
    buttons.find(
      (item) =>
        item.textContent?.includes(label) ||
        item.getAttribute("aria-label")?.includes(label),
    )) as HTMLButtonElement | undefined;
}

function field(label: string) {
  return host.querySelector(`[aria-label="${label}"]`) as HTMLInputElement;
}

function fill(label: string, value: string) {
  act(() => {
    const input = field(label);
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.contacts = undefined;
  state.loading = false;
  state.creating = false;
  state.updating = false;
  state.deleting = false;
  confirm.mockReset().mockResolvedValue(true);
  create.mockReset().mockResolvedValue(undefined);
  update.mockReset().mockResolvedValue(undefined);
  remove.mockReset().mockResolvedValue(undefined);
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

describe("ContactBookCard", () => {
  it("shows loading, empty state, contact details, and pagination", () => {
    state.loading = true;
    render();
    expect(host.textContent).not.toContain("Chưa có ai");
    state.loading = false;
    state.contacts = [];
    render();
    expect(host.textContent).toContain("Chưa có ai");
    state.contacts = Array.from({ length: 9 }, (_, index) =>
      contact(`Người ${index + 1}`),
    );
    state.contacts[0] = contact("An", "book", "12345678");
    state.contacts[1] = contact("Bình", "history");
    render();
    expect(host.textContent).toContain("MB Bank · 12345678");
    expect(host.textContent).toContain("chưa có số tài khoản · 2 cuộc");
    expect(button("Xóa Bình")).toBeUndefined();
    expect(host.textContent).not.toContain("Người 9");
    act(() => button("Xem thêm")?.click());
    expect(host.textContent).toContain("Người 9");
  });

  it("creates a contact and resets the form", async () => {
    state.contacts = [];
    render();
    act(() => button("Thêm vào danh bạ")?.click());
    expect(button("Thêm")?.disabled).toBe(true);
    fill("Tên", "An");
    act(() => button("Ngân hàng")?.click());
    act(() => button("MB Bank")?.click());
    fill("Số tài khoản", "12345678");
    fill("Tên chủ tài khoản", "Nguyen Van An");
    await act(async () =>
      host
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
    expect(create).toHaveBeenCalledWith({
      name: "An",
      bankId: "MB",
      accountNo: "12345678",
      accountName: "Nguyen Van An",
    });
    expect(success).toHaveBeenCalledWith("Đã thêm vào danh bạ");
    expect(host.querySelector("form")).toBeNull();
    act(() => button("Thêm vào danh bạ")?.click());
    expect(field("Tên").value).toBe("");
    act(() => button("Hủy")?.click());
    expect(host.querySelector("form")).toBeNull();
  });

  it("updates saved contacts and creates entries for history contacts", async () => {
    state.contacts = [contact("An"), contact("Bình", "history")];
    render();
    act(() => button("Sửa An")?.click());
    expect(field("Tên").value).toBe("An");
    fill("Tên", "An Mới");
    await act(async () => button("Lưu")?.click());
    expect(update).toHaveBeenCalledWith({
      contactId: "an",
      input: expect.objectContaining({ name: "An Mới" }),
    });
    expect(success).toHaveBeenCalledWith("Đã lưu vào danh bạ");
    act(() => button("Sửa Bình")?.click());
    await act(async () => button("Lưu")?.click());
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Bình" }),
    );
    act(() => button("Sửa An")?.click());
    state.updating = true;
    render();
    expect(button("Lưu")?.disabled).toBe(true);
    expect(button("Hủy")?.disabled).toBe(true);
  });

  it("reports save failures without closing the form", async () => {
    state.contacts = [];
    create.mockRejectedValueOnce(new Error("offline"));
    render();
    act(() => button("Thêm vào danh bạ")?.click());
    fill("Tên", "An");
    await act(async () => button("Thêm")?.click());
    expect(error).toHaveBeenCalledWith("Không lưu được danh bạ");
    expect(field("Tên").value).toBe("An");
    state.creating = true;
    render();
    expect(button("Thêm")?.disabled).toBe(true);
  });

  it("confirms delete and reports success or failure", async () => {
    state.contacts = [contact("An")];
    render();
    confirm.mockResolvedValueOnce(false);
    await act(async () => button("Xóa An")?.click());
    expect(remove).not.toHaveBeenCalled();
    await act(async () => button("Xóa An")?.click());
    expect(remove).toHaveBeenCalledWith("an");
    expect(success).toHaveBeenCalledWith("Đã xóa khỏi danh bạ");
    remove.mockRejectedValueOnce(new Error("offline"));
    await act(async () => button("Xóa An")?.click());
    expect(error).toHaveBeenCalledWith("Không xóa được");
    state.deleting = true;
    render();
    expect(button("Xóa An")?.disabled).toBe(true);
  });

  it("does not delete a contact without a stored ID", async () => {
    state.contacts = [{ ...contact("An"), id: null }];
    render();
    await act(async () => button("Xóa An")?.click());
    expect(confirm).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
});
