import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dropdown, type DropdownOption } from "./Dropdown";

const options: DropdownOption[] = [
  { value: "vcb", label: "Vietcombank" },
  { value: "mb", label: "MB Bank" },
];

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function renderDropdown(
  overrides: Partial<Parameters<typeof Dropdown>[0]> = {},
) {
  const onChange = vi.fn();
  act(() => {
    root.render(
      createElement(Dropdown, {
        options,
        value: "",
        onChange,
        ariaLabel: "Ngân hàng",
        ...overrides,
      }),
    );
  });
  return onChange;
}

function trigger() {
  return host.querySelector(
    "button[aria-haspopup='listbox']",
  ) as HTMLButtonElement;
}

describe("Dropdown", () => {
  it("hiển thị placeholder và không mở khi bị khóa", () => {
    renderDropdown({ disabled: true });

    expect(trigger().textContent).toContain("Chọn");
    expect(trigger().disabled).toBe(true);
    act(() => trigger().click());
    expect(host.querySelector("[role='listbox']")).toBeNull();
  });

  it("mở danh sách và chọn ngân hàng", () => {
    const onChange = renderDropdown({ value: "vcb" });

    expect(trigger().textContent).toContain("Vietcombank");
    act(() => trigger().click());
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(host.querySelectorAll("[role='option']")).toHaveLength(2);
    expect(host.querySelector("[aria-selected='true']")?.textContent).toContain(
      "Vietcombank",
    );

    const option = host.querySelectorAll(
      "[role='option']",
    )[1] as HTMLButtonElement;
    act(() => {
      option.focus();
      option.click();
    });

    expect(onChange).toHaveBeenCalledWith("mb");
    expect(host.querySelector("[role='listbox']")).toBeNull();
  });

  it("chọn mục bằng phím mũi tên và Enter", () => {
    const onChange = renderDropdown();
    act(() => trigger().click());
    act(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      ),
    );
    expect(trigger().getAttribute("aria-activedescendant")).toBe(
      (host.querySelectorAll("[role='option']")[1] as HTMLButtonElement).id,
    );
    act(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
    );
    expect(onChange).toHaveBeenCalledWith("mb");
    expect(host.querySelector("[role='listbox']")).toBeNull();
  });

  it("đóng khi bấm Escape hoặc ngoài danh sách", () => {
    renderDropdown();
    act(() => trigger().click());
    act(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    expect(host.querySelector("[role='listbox']")).toBeNull();
    act(() => trigger().click());
    act(() =>
      document.body.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true }),
      ),
    );
    expect(host.querySelector("[role='listbox']")).toBeNull();
  });

  it("giữ danh sách khi click trong widget và đóng khi focus rời widget", () => {
    renderDropdown();
    act(() => trigger().click());
    act(() =>
      trigger().dispatchEvent(new MouseEvent("mousedown", { bubbles: true })),
    );
    expect(host.querySelector("[role='listbox']")).not.toBeNull();
    act(() =>
      trigger().dispatchEvent(
        new FocusEvent("focusout", {
          bubbles: true,
          relatedTarget: document.body,
        }),
      ),
    );
    expect(host.querySelector("[role='listbox']")).toBeNull();
  });

  it("giữ danh sách khi focus chuyển giữa các phần tử trong widget", () => {
    renderDropdown();
    act(() => trigger().click());
    act(() =>
      trigger().dispatchEvent(
        new FocusEvent("focusout", {
          bubbles: true,
          relatedTarget: host.querySelector("[role='option']"),
        }),
      ),
    );
    expect(host.querySelector("[role='listbox']")).not.toBeNull();
  });

  it("giữ chỉ số bàn phím trong giới hạn danh sách", () => {
    renderDropdown();
    act(() => trigger().click());
    act(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }),
      ),
    );
    expect(trigger().getAttribute("aria-activedescendant")).toBe(
      (host.querySelectorAll("[role='option']")[0] as HTMLButtonElement).id,
    );
    act(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "x", bubbles: true }),
      ),
    );
    expect(host.querySelector("[role='listbox']")).not.toBeNull();
  });

  it("lọc ngân hàng theo chữ không dấu và báo khi không có kết quả", () => {
    const onChange = renderDropdown({ searchable: true });
    act(() => trigger().click());
    const input = host.querySelector(
      "input[aria-label='Tìm trong danh sách']",
    ) as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    act(() => {
      setValue?.call(input, "viet");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(host.querySelectorAll("[role='option']")).toHaveLength(1);
    act(() => {
      setValue?.call(input, "khong-co");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(host.textContent).toContain("Không tìm thấy");
    expect(host.querySelectorAll("[role='option']")).toHaveLength(0);
    act(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
    );
    expect(onChange).not.toHaveBeenCalled();
  });
});
