import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  BalancePill,
  EmptyState,
  Field,
  GamePageSkeleton,
  LoadingState,
  Metric,
  PageShell,
  Skeleton,
  SkeletonCard,
  SkeletonListRow,
  SkeletonPhotoGrid,
  Switch,
} from "./ui";

describe("khung trang", () => {
  it("PageShell boc noi dung", () => {
    render(
      <PageShell>
        <p>nội dung</p>
      </PageShell>,
    );

    expect(screen.getByText("nội dung")).toBeInTheDocument();
  });

  it("EmptyState hien tieu de va mo ta", () => {
    render(<EmptyState title="Chưa có cuộc chia" description="Tạo một cuộc để bắt đầu" />);

    expect(screen.getByRole("heading", { name: "Chưa có cuộc chia" })).toBeInTheDocument();
    expect(screen.getByText("Tạo một cuộc để bắt đầu")).toBeInTheDocument();
  });

  it("LoadingState dung nhan mac dinh hoac nhan rieng", () => {
    const { rerender } = render(<LoadingState />);
    expect(screen.getByText("Đang tải...")).toBeInTheDocument();

    rerender(<LoadingState label="Đang tính..." />);
    expect(screen.getByText("Đang tính...")).toBeInTheDocument();
  });
});

describe("skeleton", () => {
  it("khoi xam khong doc len cho trinh doc man hinh", () => {
    const { container } = render(<Skeleton className="h-4" />);

    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("SkeletonCard va SkeletonListRow render duoc", () => {
    const { container } = render(
      <>
        <SkeletonCard />
        <SkeletonListRow />
        <SkeletonListRow icon />
      </>,
    );

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(4);
  });

  it("GamePageSkeleton co ca kieu chia cot va kieu doc", () => {
    const split = render(<GamePageSkeleton />);
    expect(split.container.querySelector(".lg\\:grid-cols-\\[minmax\\(0\\,1fr\\)_360px\\]")).not.toBeNull();

    const stacked = render(<GamePageSkeleton split={false} />);
    expect(stacked.container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("SkeletonPhotoGrid dung so o theo yeu cau", () => {
    const { container } = render(<SkeletonPhotoGrid count={3} />);

    expect(container.querySelectorAll(".aspect-square")).toHaveLength(3);
  });

  it("SkeletonPhotoGrid mac dinh 6 o", () => {
    const { container } = render(<SkeletonPhotoGrid />);

    expect(container.querySelectorAll(".aspect-square")).toHaveLength(6);
  });
});

describe("Field", () => {
  it("gan nhan vao o nhap", () => {
    render(
      <Field label="Tên">
        <input />
      </Field>,
    );

    expect(screen.getByLabelText("Tên")).toBeInTheDocument();
  });

  it("hien loi khi co", () => {
    render(
      <Field label="Tên" error="Không được bỏ trống">
        <input />
      </Field>,
    );

    expect(screen.getByText("Không được bỏ trống")).toBeInTheDocument();
  });
});

describe("Metric", () => {
  it("hien nhan va gia tri", () => {
    render(<Metric label="Tổng chi" value="90.000 ₫" />);

    expect(screen.getByText("Tổng chi")).toBeInTheDocument();
    expect(screen.getByText("90.000 ₫")).toBeInTheDocument();
  });
});

describe("Switch", () => {
  it("bao trang thai cho trinh doc man hinh", () => {
    render(<Switch checked label="Hiện QR" onChange={() => {}} />);

    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("bam thi lat gia tri", async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} label="Hiện QR" onChange={onChange} />);

    await userEvent.click(screen.getByRole("switch"));

    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("BalancePill", () => {
  it("duong la duoc nhan lai", () => {
    render(<BalancePill value={60_000} />);

    expect(screen.getByText(/Nhận/)).toBeInTheDocument();
  });

  it("am la con phai tra", () => {
    render(<BalancePill value={-30_000} />);

    // Hien so duong kem chu "Trả", khong hien dau tru.
    expect(screen.getByText(/Trả/)).toBeInTheDocument();
    expect(screen.queryByText(/-30/)).toBeNull();
  });

  it("bang khong la da du", () => {
    render(<BalancePill value={0} />);

    expect(screen.getByText("Đủ")).toBeInTheDocument();
  });
});
