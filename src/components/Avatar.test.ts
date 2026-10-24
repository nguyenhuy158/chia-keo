import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("hiển thị ảnh trang trí cùng kích thước mặc định", () => {
    const html = renderToStaticMarkup(createElement(Avatar, { name: "Hồng" }));

    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('width="28"');
    expect(html).toContain('height="28"');
    expect(html).toContain('src="data:image/svg+xml');
  });

  it("giữ avatar ổn định khi tên đổi hoa thường và hỗ trợ tên rỗng", () => {
    const first = renderToStaticMarkup(
      createElement(Avatar, { name: " HỒNG ", size: 40 }),
    );
    const second = renderToStaticMarkup(
      createElement(Avatar, { name: "hồng", size: 40 }),
    );
    const empty = renderToStaticMarkup(
      createElement(Avatar, { name: "", className: "custom" }),
    );

    expect(first).toBe(second);
    expect(first).toContain('width="40"');
    expect(empty).toContain("custom");
    expect(empty).toContain('src="data:image/svg+xml');
  });
});
