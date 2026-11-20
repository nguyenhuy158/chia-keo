import { act, type ComponentType, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

let host: HTMLDivElement;
let root: Root;
const OptionalField = Field as ComponentType<{
  label: string;
  error?: string;
  children?: ReactNode;
}>;

function render(element: ReactNode) {
  act(() => root.render(element));
}

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

describe("UI primitives", () => {
  it("hiển thị vỏ trang, trạng thái rỗng và tải", () => {
    render(
      createElement(
        PageShell,
        null,
        createElement(EmptyState, {
          title: "Chưa có kèo",
          description: "Tạo kèo mới",
        }),
      ),
    );
    expect(host.textContent).toContain("Chưa có kèo");
    expect(host.textContent).toContain("Tạo kèo mới");
    render(createElement(LoadingState));
    expect(host.textContent).toBe("Đang tải...");
    render(createElement(LoadingState, { label: "Đợi chút" }));
    expect(host.textContent).toBe("Đợi chút");
  });

  it("vẽ các biến thể skeleton và số ô ảnh", () => {
    render(createElement(Skeleton));
    expect(host.querySelector("[aria-hidden='true']")?.className).toContain(
      "animate-pulse",
    );
    render(createElement(Skeleton, { className: "custom" }));
    expect(host.firstElementChild?.className).toContain("custom");
    render(createElement(SkeletonCard));
    expect(host.querySelectorAll("[aria-hidden='true']")).toHaveLength(2);
    render(createElement(SkeletonListRow));
    expect(host.querySelectorAll("[aria-hidden='true']")).toHaveLength(2);
    render(createElement(SkeletonListRow, { icon: true }));
    expect(host.querySelectorAll("[aria-hidden='true']")).toHaveLength(3);
    render(createElement(SkeletonPhotoGrid));
    expect(host.querySelectorAll("[aria-hidden='true']")).toHaveLength(6);
    render(createElement(SkeletonPhotoGrid, { count: 2 }));
    expect(host.querySelectorAll("[aria-hidden='true']")).toHaveLength(2);
  });

  it("giữ bố cục skeleton cho trang chia hoặc trang một cột", () => {
    render(createElement(GamePageSkeleton));
    expect(
      host.querySelector(".lg\\:grid-cols-\\[minmax\\(0\\,1fr\\)_360px\\]"),
    ).not.toBeNull();
    render(createElement(GamePageSkeleton, { split: false }));
    expect(
      host.querySelector(".lg\\:grid-cols-\\[minmax\\(0\\,1fr\\)_360px\\]"),
    ).toBeNull();
  });

  it("hiển thị field, lỗi và metric", () => {
    render(
      createElement(OptionalField, { label: "Tên" }, createElement("input")),
    );
    expect(host.textContent).toBe("Tên");
    expect(host.querySelector("input")).not.toBeNull();
    render(
      createElement(
        OptionalField,
        { label: "Tên", error: "Bắt buộc" },
        createElement("input"),
      ),
    );
    expect(host.textContent).toContain("Bắt buộc");
    render(createElement(Metric, { label: "Tổng", value: "100.000 ₫" }));
    expect(host.textContent).toContain("Tổng");
    expect(host.textContent).toContain("100.000 ₫");
  });

  it("đảo trạng thái công tắc từ cả hai phía", () => {
    const onChange = vi.fn();
    render(createElement(Switch, { checked: false, onChange, label: "Bật" }));
    let button = host.querySelector("button") as HTMLButtonElement;
    expect(button.getAttribute("aria-checked")).toBe("false");
    act(() => button.click());
    expect(onChange).toHaveBeenCalledWith(true);
    render(createElement(Switch, { checked: true, onChange, label: "Tắt" }));
    button = host.querySelector("button") as HTMLButtonElement;
    expect(button.getAttribute("aria-checked")).toBe("true");
    act(() => button.click());
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("hiển thị số dư nhận, trả hoặc đủ", () => {
    render(createElement(BalancePill, { value: 100_000 }));
    expect(host.textContent).toContain("Nhận 100.000");
    render(createElement(BalancePill, { value: -50_000 }));
    expect(host.textContent).toContain("Trả 50.000");
    render(createElement(BalancePill, { value: 0 }));
    expect(host.textContent).toBe("Đủ");
  });
});
