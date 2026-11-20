import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BankSelect } from "./BankSelect";

const onChange = () => {};

describe("BankSelect", () => {
  it("hiển thị ngân hàng đã chọn và chuẩn hóa alias cũ", () => {
    const html = renderToStaticMarkup(
      createElement(BankSelect, {
        value: "MBB",
        onChange,
        ariaLabel: "Ngân hàng nhận",
      }),
    );

    expect(html).toContain("MB Bank");
    expect(html).toContain('aria-label="Ngân hàng nhận"');
  });

  it("giữ mã ngân hàng cũ chưa nhận ra để người dùng sửa", () => {
    const html = renderToStaticMarkup(
      createElement(BankSelect, { value: "LEGACY", onChange }),
    );

    expect(html).toContain("LEGACY (không rõ)");
  });

  it("nhắc chọn ngân hàng khi chưa có giá trị", () => {
    const html = renderToStaticMarkup(
      createElement(BankSelect, { value: "", onChange }),
    );

    expect(html).toContain("Chọn ngân hàng");
  });
});
