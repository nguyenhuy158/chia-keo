import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SwipeToDelete } from "./SwipeToDelete";

function setup(onDelete = vi.fn()) {
  render(
    <SwipeToDelete onDelete={onDelete}>
      <p>Tiền nước</p>
    </SwipeToDelete>,
  );
  const surface = screen.getByText("Tiền nước").parentElement as HTMLElement;
  return { onDelete, surface };
}

function swipe(surface: HTMLElement, deltaX: number, deltaY = 0, pointerType = "touch") {
  fireEvent.pointerDown(surface, { clientX: 200, clientY: 100, pointerType });
  fireEvent.pointerMove(surface, { clientX: 200 + deltaX, clientY: 100 + deltaY, pointerType });
  fireEvent.pointerUp(surface, { pointerType });
}

describe("SwipeToDelete", () => {
  it("chua vuot thi khong co nut xoa do", () => {
    setup();

    expect(screen.queryByRole("button", { name: "Xóa" })).toBeNull();
  });

  it("vuot trai du xa thi lo nut xoa", () => {
    const { surface } = setup();

    swipe(surface, -80);

    expect(screen.getByRole("button", { name: "Xóa" })).toBeInTheDocument();
  });

  it("bam nut xoa moi that su xoa", async () => {
    const { surface, onDelete } = setup();

    swipe(surface, -80);
    expect(onDelete).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Xóa" }));

    // Hai buoc lien tiep: vuot khong tu xoa, tranh mat du lieu vi vuot nham.
    expect(onDelete).toHaveBeenCalled();
  });

  it("vuot chua du nguong thi dong lai nhu cu", () => {
    const { surface } = setup();

    swipe(surface, -20);

    expect(screen.queryByRole("button", { name: "Xóa" })).toBeNull();
  });

  it("chuot khong kich hoat vuot", () => {
    const { surface } = setup();

    swipe(surface, -80, 0, "mouse");

    expect(screen.queryByRole("button", { name: "Xóa" })).toBeNull();
  });

  it("cuon doc khong bi hieu nham thanh vuot ngang", () => {
    const { surface } = setup();

    swipe(surface, -4, -60);

    expect(screen.queryByRole("button", { name: "Xóa" })).toBeNull();
  });

  it("dich chuyen qua nho thi chua khoa huong nao", () => {
    const { surface } = setup();

    swipe(surface, -3, -3);

    expect(screen.queryByRole("button", { name: "Xóa" })).toBeNull();
  });

  it("dang mo thi bam vao noi dung se dong lai", async () => {
    const { surface } = setup();
    swipe(surface, -80);

    await userEvent.click(screen.getByRole("button", { name: "Đóng" }));

    expect(screen.queryByRole("button", { name: "Xóa" })).toBeNull();
  });

  it("nhan nut xoa doi duoc", () => {
    render(
      <SwipeToDelete onDelete={() => {}} deleteLabel="Bỏ">
        <p>Tiền nước</p>
      </SwipeToDelete>,
    );
    const surface = screen.getByText("Tiền nước").parentElement as HTMLElement;

    swipe(surface, -80);

    expect(screen.getByRole("button", { name: "Bỏ" })).toBeInTheDocument();
  });

  it("di chuyen khi chua cham xuong thi khong lam gi", () => {
    const { surface } = setup();

    fireEvent.pointerMove(surface, { clientX: 100, clientY: 100, pointerType: "touch" });

    expect(screen.queryByRole("button", { name: "Xóa" })).toBeNull();
  });
});
