import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { BottomSheet, Drawer, ImageLightbox } from "./overlays";

describe("BottomSheet", () => {
  it("dong thi khong ve gi ca", () => {
    render(
      <BottomSheet open={false} onClose={() => {}} title="Thêm khoản chi">
        <p>nội dung</p>
      </BottomSheet>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("mo thi hien tieu de va noi dung", () => {
    render(
      <BottomSheet open onClose={() => {}} title="Thêm khoản chi">
        <p>nội dung</p>
      </BottomSheet>,
    );

    expect(screen.getByRole("dialog", { name: "Thêm khoản chi" })).toBeInTheDocument();
    expect(screen.getByText("nội dung")).toBeInTheDocument();
  });

  it("khoa cuon trang khi mo va tra lai khi dong", () => {
    const { rerender } = render(
      <BottomSheet open onClose={() => {}} title="X">
        <p>x</p>
      </BottomSheet>,
    );
    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <BottomSheet open={false} onClose={() => {}} title="X">
        <p>x</p>
      </BottomSheet>,
    );
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("bam nen hoac nut dong deu goi onClose", async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="X">
        <p>x</p>
      </BottomSheet>,
    );

    const closers = screen.getAllByRole("button", { name: "Đóng" });
    await userEvent.click(closers[0]);
    await userEvent.click(closers[1]);

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("Esc dong lai", async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="X">
        <p>x</p>
      </BottomSheet>,
    );

    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });

  it("phim khac khong dong", async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="X">
        <p>x</p>
      </BottomSheet>,
    );

    await userEvent.keyboard("a");

    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("tra lai tieu diem ban phim", () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Mở
        </button>
        <BottomSheet open={open} onClose={() => setOpen(false)} title="X">
          <p>x</p>
        </BottomSheet>
      </>
    );
  }

  it("dong overlay thi con tro quay ve nut da mo no", async () => {
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Mở" });

    await userEvent.click(opener);
    await userEvent.keyboard("{Escape}");

    // Khong co dong nay, nguoi dung ban phim phai Tab lai tu dau trang.
    expect(opener).toHaveFocus();
  });
});

describe("Drawer", () => {
  it("mo thi hien tieu de", () => {
    render(
      <Drawer open onClose={() => {}} title="Điều hướng">
        <p>menu</p>
      </Drawer>,
    );

    expect(screen.getByRole("dialog", { name: "Điều hướng" })).toBeInTheDocument();
  });

  it("dong thi khong ve gi", () => {
    render(
      <Drawer open={false} onClose={() => {}} title="Điều hướng">
        <p>menu</p>
      </Drawer>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Esc dong lai", async () => {
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose} title="Điều hướng">
        <p>menu</p>
      </Drawer>,
    );

    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });
});

describe("ImageLightbox", () => {
  it("dong thi khong ve gi", () => {
    render(<ImageLightbox open={false} src="x.png" alt="Ảnh" onClose={() => {}} />);

    expect(screen.queryByRole("img")).toBeNull();
  });

  it("hien anh voi mo ta", () => {
    render(<ImageLightbox open src="x.png" alt="Hoá đơn" onClose={() => {}} />);

    expect(screen.getByRole("img", { name: "Hoá đơn" })).toHaveAttribute("src", "x.png");
  });

  it("khong truyen onDownload thi khong hien nut tai ve", () => {
    render(<ImageLightbox open src="x.png" alt="Ảnh" onClose={() => {}} />);

    expect(screen.queryByRole("button", { name: "Tải ảnh về máy" })).toBeNull();
  });

  it("bam tai ve thi goi callback", async () => {
    const onDownload = vi.fn();
    render(
      <ImageLightbox open src="x.png" alt="Ảnh" onClose={() => {}} onDownload={onDownload} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Tải ảnh về máy" }));

    expect(onDownload).toHaveBeenCalled();
  });

  it("bam nen thi dong", async () => {
    const onClose = vi.fn();
    render(<ImageLightbox open src="x.png" alt="Ảnh" onClose={onClose} />);

    await userEvent.click(screen.getAllByRole("button", { name: "Đóng" })[0]);

    expect(onClose).toHaveBeenCalled();
  });
});
