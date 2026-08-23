import { describe, expect, it } from "vitest";
import { router } from "./router";

/** Cac duong dan phai co, kem viec chung nam trong hay ngoai lop dang nhap. */
const EXPECTED_PATHS = ["/login", "/share/$token", "/", "/games/$gameId", "/settings", "/fun"];

function allRoutePaths() {
  return Object.values(router.routesById).map((route) => route.fullPath);
}

describe("cay dinh tuyen", () => {
  it("co du cac duong dan cua app", () => {
    const paths = allRoutePaths();

    for (const path of EXPECTED_PATHS) {
      expect(paths).toContain(path);
    }
  });

  it("trang chia se va dang nhap nam ngoai lop can dang nhap", () => {
    const publicIds = Object.keys(router.routesById).filter(
      (id) => id.includes("share") || id.includes("login"),
    );

    // Nam duoi "app" nghia la bi AppLayout chan lai khi chua dang nhap.
    for (const id of publicIds) {
      expect(id.startsWith("/app")).toBe(false);
    }
  });

  it("cac trang trong app deu nam duoi lop dang nhap", () => {
    for (const path of ["/games/$gameId", "/settings", "/fun"]) {
      const route = Object.values(router.routesById).find((item) => item.fullPath === path);
      expect(route?.parentRoute?.id).toBe("/app");
    }
  });

  it("co man hinh cho khi trang tai cham", () => {
    expect(router.options.defaultPendingComponent).toBeDefined();
    expect(router.options.defaultPendingMs).toBe(200);
  });

  it("goc co man hinh 404 va man hinh loi", () => {
    expect(router.routeTree.options.notFoundComponent).toBeDefined();
    expect(router.routeTree.options.errorComponent).toBeDefined();
  });
});
