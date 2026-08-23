import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("la anh trang tri, khong doc len cho trinh doc man hinh", () => {
    const { container } = render(<Avatar name="An" />);

    // Ten hien thi ngay canh avatar roi, doc lai la thua.
    expect(container.querySelector("img")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("cung mot nguoi luon ra cung mot avatar du go hoa hay thuong", () => {
    const upper = render(<Avatar name="HỒNG" />).container.querySelector("img")?.src;
    const lower = render(<Avatar name="hồng" />).container.querySelector("img")?.src;

    expect(upper).toBe(lower);
  });

  it("hai nguoi khac nhau ra hai avatar khac nhau", () => {
    const an = render(<Avatar name="An" />).container.querySelector("img")?.src;
    const binh = render(<Avatar name="Bình" />).container.querySelector("img")?.src;

    expect(an).not.toBe(binh);
  });

  it("ten rong van co avatar de khong vo bo cuc", () => {
    const { container } = render(<Avatar name="" />);

    expect(container.querySelector("img")?.src).toContain("data:image/svg+xml");
  });

  it("nhan kich thuoc rieng", () => {
    const { container } = render(<Avatar name="An" size={48} />);

    expect(container.querySelector("img")).toHaveAttribute("width", "48");
  });
});
