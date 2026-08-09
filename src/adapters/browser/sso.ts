// Duong dang nhap thu hai: SSO dung chung cho moi app *.huyab.click.
// better-auth (username/mat khau) van giu nguyen, xem worker/src/sso.ts.

export const SSO_ISSUER = "https://auth.huyab.click";

/**
 * Cookie SSO gan `Domain=.huyab.click` nen chi domain trong huyab.click moi
 * nhan duoc. Mo tu chia-keo.pages.dev thi dang nhap xong cookie roi vao
 * chiakeo.huyab.click chu khong phai tab dang mo — nen luon dua nguoi dung ve
 * domain do, ke ca khi ho vao tu pages.dev.
 */
export const SSO_APP_ORIGIN = "https://chiakeo.huyab.click";

function appOrigin() {
  const current = window.location.origin;
  return current.endsWith(".huyab.click") ? current : SSO_APP_ORIGIN;
}

export function ssoLoginUrl() {
  return `${SSO_ISSUER}/login?redirect_uri=${encodeURIComponent(`${appOrigin()}/`)}`;
}

export function ssoLogoutUrl() {
  return `${SSO_ISSUER}/logout?redirect_uri=${encodeURIComponent(`${appOrigin()}/login`)}`;
}
