import { afterEach, describe, expect, it, vi } from "vitest";
import { SSO_APP_ORIGIN, SSO_ISSUER, ssoLoginUrl, ssoLogoutUrl } from "./sso";

function setOrigin(origin: string) {
  vi.spyOn(window, "location", "get").mockReturnValue({ origin } as Location);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("duong dang nhap SSO", () => {
  it("dang o domain huyab.click thi quay ve dung domain do", () => {
    setOrigin("https://chiakeo.huyab.click");

    expect(ssoLoginUrl()).toBe(
      `${SSO_ISSUER}/login?redirect_uri=${encodeURIComponent("https://chiakeo.huyab.click/")}`,
    );
  });

  it("vao tu pages.dev thi van dua ve domain nhan duoc cookie SSO", () => {
    setOrigin("https://chia-keo.pages.dev");

    // Cookie SSO gan Domain=.huyab.click nen dang nhap tu pages.dev se roi vao
    // domain khac tab dang mo — luon dua nguoi dung ve SSO_APP_ORIGIN.
    expect(ssoLoginUrl()).toContain(encodeURIComponent(`${SSO_APP_ORIGIN}/`));
  });

  it("duong dang xuat quay ve trang login", () => {
    setOrigin("https://chiakeo.huyab.click");

    expect(ssoLogoutUrl()).toContain(
      encodeURIComponent("https://chiakeo.huyab.click/login"),
    );
  });
});
