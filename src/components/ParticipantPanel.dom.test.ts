import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiParticipant } from "../../shared/api-types";

const { confirm, success, error } = vi.hoisted(() => ({
  confirm: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("./ConfirmDialog", () => ({ useConfirm: () => confirm }));
vi.mock("sonner", () => ({ toast: { success, error } }));
vi.mock("./ContactPicker", () => ({ ContactPicker: () => null }));

import { ParticipantPanel } from "./ParticipantPanel";

let host: HTMLDivElement;
let root: Root;
let onAdd = vi.fn();
let onAddMany = vi.fn();
let onUpdate = vi.fn();
let onRemove = vi.fn();
let onReorder = vi.fn();

function person(id: string, bankId = "", accountNo = ""): ApiParticipant {
  return { id, name: id, bankId, accountNo, accountName: "" };
}

function render(
  participants: ApiParticipant[] = [],
  pending = false,
  compact = false,
) {
  act(() =>
    root.render(
      createElement(ParticipantPanel, {
        participants,
        pending,
        compact,
        onAdd,
        onAddMany,
        onUpdate,
        onRemove,
        onReorder,
      }),
    ),
  );
}

function button(label: string) {
  return [...host.querySelectorAll("button")].find(
    (item) =>
      item.textContent?.trim() === label ||
      item.getAttribute("aria-label") === label,
  ) as HTMLButtonElement | undefined;
}

function bankToggle() {
  return [...host.querySelectorAll("button")].find((item) =>
    item.textContent?.includes("Tài khoản nhận tiền"),
  ) as HTMLButtonElement | undefined;
}

function field(label: string) {
  return [...host.querySelectorAll("label")]
    .find((item) => item.querySelector("span")?.textContent?.includes(label))
    ?.querySelector("input") as HTMLInputElement;
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

async function submit() {
  await act(async () =>
    host
      .querySelector("form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  confirm.mockReset().mockResolvedValue(true);
  success.mockReset();
  error.mockReset();
  onAdd = vi.fn().mockResolvedValue(undefined);
  onAddMany = vi.fn().mockResolvedValue(undefined);
  onUpdate = vi.fn().mockResolvedValue(undefined);
  onRemove = vi.fn();
  onReorder = vi.fn();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("ParticipantPanel", () => {
  it("validates and adds a participant, then resets the form", async () => {
    render();
    await submit();
    expect(host.textContent).toContain("Nhập tên người tham gia");
    expect(onAdd).not.toHaveBeenCalled();
    fill("Tên", "  An  ");
    expect(host.querySelector('input[placeholder="0123456789"]')).toBeNull();
    expect(bankToggle()?.getAttribute("aria-expanded")).toBe("false");
    act(() => bankToggle()?.click());
    expect(bankToggle()?.getAttribute("aria-expanded")).toBe("true");
    act(() =>
      (
        host.querySelector('[aria-haspopup="listbox"]') as HTMLButtonElement
      ).click(),
    );
    act(() =>
      [...host.querySelectorAll('[role="option"]')]
        .find((item) => item.textContent?.includes("MB Bank"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    fill("Số tài khoản", "12345678");
    await submit();
    expect(onAdd).toHaveBeenCalledWith({
      name: "An",
      bankId: "MB",
      accountNo: "12345678",
      accountName: "",
    });
    expect(success).toHaveBeenCalledWith("Đã thêm người tham gia");
    expect(field("Tên").value).toBe("");
    expect(host.querySelector('input[placeholder="0123456789"]')).toBeNull();
  });

  it("shows the bank fields while editing even when the section is folded", () => {
    render([person("An", "MB", "12345678")]);
    expect(host.querySelector('input[placeholder="0123456789"]')).toBeNull();
    act(() => button("Sửa An")?.click());
    expect(
      host.querySelector('input[placeholder="0123456789"]'),
    ).not.toBeNull();
    expect(bankToggle()).toBeUndefined();
  });

  it("reports add and update errors", async () => {
    render([person("An")]);
    fill("Tên", "Bình");
    onAdd.mockRejectedValueOnce(new Error("offline"));
    await submit();
    expect(error).toHaveBeenCalledWith("Không lưu được");
    act(() => button("Sửa An")?.click());
    onUpdate.mockRejectedValueOnce(new Error("offline"));
    await submit();
    expect(error).toHaveBeenCalledTimes(2);
    expect(button("Lưu thông tin")).toBeDefined();
  });

  it("edits a participant and cancels another edit", async () => {
    render([person("An", "MB", "12345678"), person("Bình")]);
    expect(host.textContent).toContain("MB Bank · 12345678");
    expect(host.textContent).toContain("Chưa có thông tin QR");
    act(() => button("Sửa An")?.click());
    expect(field("Tên").value).toBe("An");
    fill("Tên", "An Mới");
    await submit();
    expect(onUpdate).toHaveBeenCalledWith(
      "An",
      expect.objectContaining({ name: "An Mới" }),
    );
    expect(success).toHaveBeenCalledWith("Đã lưu thông tin");
    act(() => button("Sửa Bình")?.click());
    act(() => button("Hủy")?.click());
    expect(button("Thêm người")).toBeDefined();
  });

  it("reorders people and disables boundary moves", () => {
    render([person("An"), person("Bình"), person("Châu")]);
    expect(button("Đưa An lên")?.disabled).toBe(true);
    expect(button("Đưa Châu xuống")?.disabled).toBe(true);
    act(() => button("Đưa Bình lên")?.click());
    expect(onReorder).toHaveBeenCalledWith(["Bình", "An", "Châu"]);
    act(() => button("Đưa Bình xuống")?.click());
    expect(onReorder).toHaveBeenCalledWith(["An", "Châu", "Bình"]);
    render([person("An")], true);
    expect(button("Sửa An")?.disabled).toBe(true);
    expect(button("Xóa An")?.disabled).toBe(true);
    expect(button("Thêm người")?.disabled).toBe(true);
  });

  it("confirms before removing a participant", async () => {
    render([person("An")]);
    confirm.mockResolvedValueOnce(false);
    await act(async () => button("Xóa An")?.click());
    expect(onRemove).not.toHaveBeenCalled();
    await act(async () => button("Xóa An")?.click());
    expect(onRemove).toHaveBeenCalledWith("An");
    expect(success).toHaveBeenCalledWith("Đã xóa An");
  });
});

describe("ParticipantPanel compact", () => {
  function sheetButton(label: string) {
    return [...document.body.querySelectorAll("button")].find(
      (item) =>
        !host.contains(item) &&
        (item.textContent?.trim() === label ||
          item.getAttribute("aria-label") === label),
    ) as HTMLButtonElement | undefined;
  }

  function sheetName() {
    return document.body.querySelector(
      "input[placeholder='Huy']",
    ) as HTMLInputElement | null;
  }

  function typeName(value: string) {
    act(() => {
      const input = sheetName() as HTMLInputElement;
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  async function submitSheet() {
    await act(async () =>
      document.body
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
  }

  function pressEscape() {
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
  }

  function openActions(name: string) {
    act(() => button(`Tùy chọn ${name}`)?.click());
  }

  it("hiện trạng thái trống, số người và thông tin QR", () => {
    render([], false, true);
    expect(host.textContent).toContain("Chưa có người tham gia.");
    expect(host.textContent).toContain("0 người");
    render([person("An", "MB", "123"), person("Bình")], false, true);
    expect(host.textContent).toContain("2 người");
    expect(host.textContent).toContain("123");
    expect(host.textContent).toContain("Chưa có thông tin QR");
  });

  it("thêm người trong Sheet rồi đóng bằng Escape", async () => {
    render([person("An")], false, true);
    expect(sheetName()).toBeNull();
    act(() => button("Mở form thêm người")?.click());
    typeName("Châu");
    await submitSheet();
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Châu" }),
    );
    pressEscape();
    await vi.waitFor(() => expect(sheetName()).toBeNull());
  });

  it("đưa lên, đưa xuống và khóa nút ở đầu, cuối danh sách", () => {
    render([person("An"), person("Bình"), person("Châu")], false, true);
    openActions("An");
    expect(sheetButton("Đưa lên")?.disabled).toBe(true);
    act(() => sheetButton("Đưa xuống")?.click());
    expect(onReorder).toHaveBeenLastCalledWith(["Bình", "An", "Châu"]);
    openActions("Châu");
    expect(sheetButton("Đưa xuống")?.disabled).toBe(true);
    act(() => sheetButton("Đưa lên")?.click());
    expect(onReorder).toHaveBeenLastCalledWith(["An", "Châu", "Bình"]);
  });

  it("sửa người trong Sheet và lưu thì đóng Sheet", async () => {
    render([person("An")], false, true);
    openActions("An");
    act(() => sheetButton("Sửa")?.click());
    expect(document.body.textContent).toContain("Sửa người");
    expect(sheetName()?.value).toBe("An");
    typeName("Anh");
    await submitSheet();
    expect(onUpdate).toHaveBeenCalledWith(
      "An",
      expect.objectContaining({ name: "Anh" }),
    );
    await vi.waitFor(() => expect(sheetName()).toBeNull());
  });

  it("xóa người sau khi xác nhận và đóng Sheet tùy chọn bằng Escape", async () => {
    render([person("An")], false, true);
    openActions("An");
    pressEscape();
    await vi.waitFor(() => expect(sheetButton("Xóa")).toBeUndefined());
    openActions("An");
    await act(async () => sheetButton("Xóa")?.click());
    expect(confirm).toHaveBeenCalled();
    expect(onRemove).toHaveBeenCalledWith("An");
  });

  it("khóa các nút tùy chọn khi đang lưu", () => {
    render([person("An"), person("Bình")], true, true);
    openActions("An");
    expect(sheetButton("Sửa")?.disabled).toBe(true);
  });
});
