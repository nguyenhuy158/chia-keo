import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Dropdown } from "./Dropdown";

const BANKS = [
  { value: "970436", label: "Vietcombank" },
  { value: "970407", label: "Techcombank" },
  { value: "970403", label: "Sacombank" },
];

function setup(props: Partial<Parameters<typeof Dropdown>[0]> = {}) {
  const onChange = vi.fn();
  render(
    <Dropdown options={BANKS} value="" onChange={onChange} ariaLabel="Ngân hàng" {...props} />,
  );
  return { onChange, user: userEvent.setup() };
}

describe("Dropdown", () => {
  it("chua chon gi thi hien placeholder", () => {
    setup({ placeholder: "Chọn ngân hàng" });

    expect(screen.getByRole("button", { name: "Ngân hàng" })).toHaveTextContent("Chọn ngân hàng");
  });

  it("hien nhan cua muc dang chon", () => {
    setup({ value: "970407" });

    expect(screen.getByRole("button", { name: "Ngân hàng" })).toHaveTextContent("Techcombank");
  });

  it("bam mo danh sach, bam lan hai thi dong", async () => {
    const { user } = setup();
    const trigger = screen.getByRole("button", { name: "Ngân hàng" });

    await user.click(trigger);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.click(trigger);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("chon mot muc thi bao ra ngoai va dong lai", async () => {
    const { onChange, user } = setup();

    await user.click(screen.getByRole("button", { name: "Ngân hàng" }));
    await user.click(screen.getByRole("option", { name: /Techcombank/ }));

    expect(onChange).toHaveBeenCalledWith("970407");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("danh dau muc dang chon cho trinh doc man hinh", async () => {
    const { user } = setup({ value: "970403" });

    await user.click(screen.getByRole("button", { name: "Ngân hàng" }));

    expect(screen.getByRole("option", { name: /Sacombank/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("o tim bo dau: go 'techcom' van ra Techcombank", async () => {
    const { user } = setup({ searchable: true });

    await user.click(screen.getByRole("button", { name: "Ngân hàng" }));
    await user.type(screen.getByLabelText("Tìm trong danh sách"), "techcom");

    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option", { name: /Techcombank/ })).toBeInTheDocument();
  });

  it("khong tim thay thi bao ro thay vi danh sach trong", async () => {
    const { user } = setup({ searchable: true });

    await user.click(screen.getByRole("button", { name: "Ngân hàng" }));
    await user.type(screen.getByLabelText("Tìm trong danh sách"), "khong-co-ngan-hang-nay");

    expect(screen.getByText("Không tìm thấy")).toBeInTheDocument();
  });

  it("mo ra la con tro nam san o o tim", async () => {
    const { user } = setup({ searchable: true });

    await user.click(screen.getByRole("button", { name: "Ngân hàng" }));

    await waitFor(() => expect(screen.getByLabelText("Tìm trong danh sách")).toHaveFocus());
  });

  it("Esc dong lai va tra con tro ve nut", async () => {
    const { user } = setup();
    const trigger = screen.getByRole("button", { name: "Ngân hàng" });

    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("mui ten len/xuong doi muc dang sang, Enter thi chon", async () => {
    const { onChange, user } = setup();

    await user.click(screen.getByRole("button", { name: "Ngân hàng" }));
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowUp}{Enter}");

    expect(onChange).toHaveBeenCalledWith("970407");
  });

  it("mui ten khong vuot ra ngoai danh sach", async () => {
    const { onChange, user } = setup();

    await user.click(screen.getByRole("button", { name: "Ngân hàng" }));
    await user.keyboard("{ArrowUp}{ArrowUp}{Enter}");

    // Da o dau danh sach, len nua van la muc dau.
    expect(onChange).toHaveBeenCalledWith("970436");
  });

  it("bam ra ngoai thi dong lai", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Ngân hàng" }));
    await user.click(document.body);

    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("bi khoa thi khong mo duoc", async () => {
    const { user } = setup({ disabled: true });

    await user.click(screen.getByRole("button", { name: "Ngân hàng" }));

    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
