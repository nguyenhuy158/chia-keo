import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadAvatarUri } from "../adapters/browser/avatar-uri";
import { Avatar } from "./Avatar";

const SVG_DATA_URI_PREFIX = "data:image/svg+xml";
const DEFAULT_SIZE = "28";

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

describe("Avatar", () => {
  it("hiển thị ảnh trang trí cùng kích thước mặc định khi tải xong", async () => {
    act(() => {
      root.render(createElement(Avatar, { name: "Lan Anh" }));
    });
    await vi.waitFor(() => expect(host.querySelector("img")).not.toBeNull());
    const img = host.querySelector("img");

    expect(img?.getAttribute("aria-hidden")).toBe("true");
    expect(img?.getAttribute("width")).toBe(DEFAULT_SIZE);
    expect(img?.getAttribute("height")).toBe(DEFAULT_SIZE);
    expect(img?.getAttribute("src")).toContain(SVG_DATA_URI_PREFIX);
  });

  it("hiện khung giữ chỗ trước khi avatar tải xong", () => {
    act(() => {
      root.render(
        createElement(Avatar, { name: "Chưa tải", size: 40, className: "x" }),
      );
    });
    const placeholder = host.querySelector("span");

    expect(host.querySelector("img")).toBeNull();
    expect(placeholder?.getAttribute("aria-hidden")).toBe("true");
    expect(placeholder?.style.width).toBe("40px");
    expect(placeholder?.className).toContain("x");
  });

  it("dùng cache ngay lần render đầu và giữ avatar ổn định khi đổi hoa thường", async () => {
    const uri = await loadAvatarUri("Hồng", 40);
    act(() => {
      root.render(createElement(Avatar, { name: " HỒNG ", size: 40 }));
    });

    expect(host.querySelector("img")?.getAttribute("src")).toBe(uri);
  });

  it("bỏ qua kết quả tải nếu đã gỡ trước khi xong", async () => {
    act(() => {
      root.render(createElement(Avatar, { name: "Gỡ sớm", size: 20 }));
    });
    act(() => root.unmount());
    await loadAvatarUri("Gỡ sớm", 20);
    root = createRoot(host);

    expect(host.querySelector("img")).toBeNull();
  });
});
