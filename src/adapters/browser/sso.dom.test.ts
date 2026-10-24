import { afterEach, describe, expect, it, vi } from "vitest";
import { SSO_APP_ORIGIN, SSO_ISSUER, ssoLoginUrl, ssoLogoutUrl } from "./sso";

afterEach(() => vi.unstubAllGlobals());

describe("SSO browser redirects", () => {
  it("returns to the custom domain from a pages.dev origin", () => {
    vi.stubGlobal("window", {
      location: { origin: "https://chia-keo.pages.dev" },
    });
    expect(ssoLoginUrl()).toBe(
      `${SSO_ISSUER}/login?redirect_uri=${encodeURIComponent(`${SSO_APP_ORIGIN}/`)}`,
    );
    expect(ssoLogoutUrl()).toBe(
      `${SSO_ISSUER}/logout?redirect_uri=${encodeURIComponent(`${SSO_APP_ORIGIN}/login`)}`,
    );
  });

  it("returns to the current app domain when already on huyab.click", () => {
    vi.stubGlobal("window", {
      location: { origin: "https://preview.huyab.click" },
    });
    expect(ssoLoginUrl()).toContain(
      encodeURIComponent("https://preview.huyab.click/"),
    );
    expect(ssoLogoutUrl()).toContain(
      encodeURIComponent("https://preview.huyab.click/login"),
    );
  });
});
