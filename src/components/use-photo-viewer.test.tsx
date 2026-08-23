import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createFakeGameApi,
  createTestQueryClient,
  GAME_ID,
  makePhoto,
} from "../test/fake-game-api";
import { ConfirmProvider } from "./ConfirmDialog";
import { usePhotoViewer } from "./use-photo-viewer";

let api: ReturnType<typeof createFakeGameApi>;

const PHOTOS = [
  makePhoto({ id: "photo_1", caption: "Ảnh một" }),
  makePhoto({ id: "photo_2", caption: "Ảnh hai", expenseId: "expense_1" }),
];

function Host() {
  const { open, viewer } = usePhotoViewer(
    GAME_ID,
    PHOTOS,
    new Map([["expense_1", "Tiền nước"]]),
  );

  return (
    <>
      <button type="button" onClick={() => open(0)}>
        mở ảnh đầu
      </button>
      <button type="button" onClick={() => open(1)}>
        mở ảnh hai
      </button>
      {viewer}
    </>
  );
}

function renderHost() {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ConfirmProvider>
        <Host />
      </ConfirmProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  api = createFakeGameApi();
});

describe("usePhotoViewer", () => {
  it("chua mo thi khong ve lop xem anh", () => {
    renderHost();

    expect(screen.queryByRole("button", { name: "Đóng ảnh" })).toBeNull();
  });

  it("mo dung anh duoc chon", async () => {
    const user = renderHost();

    await user.click(screen.getByRole("button", { name: "mở ảnh đầu" }));

    expect(screen.getByRole("button", { name: "Đóng ảnh" })).toBeInTheDocument();
    expect(screen.getByText(/1\s*\/\s*2/)).toBeInTheDocument();
  });

  it("hien ten khoan chi cua anh dinh kem", async () => {
    const user = renderHost();

    await user.click(screen.getByRole("button", { name: "mở ảnh hai" }));

    expect(screen.getAllByText(/Tiền nước/).length).toBeGreaterThan(0);
  });

  it("chuyen qua lai giua cac anh", async () => {
    const user = renderHost();
    await user.click(screen.getByRole("button", { name: "mở ảnh đầu" }));

    await user.click(screen.getByRole("button", { name: "Ảnh sau" }));

    expect(screen.getByText(/2\s*\/\s*2/)).toBeInTheDocument();
  });

  it("dong lai duoc", async () => {
    const user = renderHost();
    await user.click(screen.getByRole("button", { name: "mở ảnh đầu" }));

    await user.click(screen.getByRole("button", { name: "Đóng ảnh" }));

    expect(screen.queryByRole("button", { name: "Đóng ảnh" })).toBeNull();
  });

  it("sua chu thich goi API", async () => {
    const user = renderHost();
    await user.click(screen.getByRole("button", { name: "mở ảnh đầu" }));

    await user.click(screen.getByRole("button", { name: "Sửa chú thích" }));
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "Hoá đơn");
    await user.click(screen.getByRole("button", { name: "Lưu chú thích" }));

    await waitFor(() =>
      expect(api.photos.update).toHaveBeenCalledWith("photo_1", { caption: "Hoá đơn" }),
    );
  });

  it("xoa anh sau khi xac nhan", async () => {
    const user = renderHost();
    await user.click(screen.getByRole("button", { name: "mở ảnh đầu" }));

    await user.click(screen.getByRole("button", { name: "Xóa ảnh" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Đồng ý" }));

    await waitFor(() => expect(api.photos.remove).toHaveBeenCalledWith("photo_1"));
  });

  it("bam huy thi khong xoa", async () => {
    const user = renderHost();
    await user.click(screen.getByRole("button", { name: "mở ảnh đầu" }));

    await user.click(screen.getByRole("button", { name: "Xóa ảnh" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Hủy" }));

    expect(api.photos.remove).not.toHaveBeenCalled();
  });
});
