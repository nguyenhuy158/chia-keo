// Xac thuc cookie SSO cua auth.huyab.click, chay SONG SONG voi better-auth chu
// khong thay the: tai khoan username/mat khau cu van dang nhap binh thuong.
//
// Token la JWT RS256 do SSO ky; app chi giu khoa cong khai lay tu JWKS nen
// khong the tu phat token cho minh hay cho app khac.

const ISSUER = "https://auth.huyab.click";
const COOKIE_NAME = "huyab_sso";

export type SsoClaims = {
  iss: string;
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  exp: number;
};

// Cache o module scope: Worker giu nguyen isolate qua nhieu request nen tranh
// duoc mot round-trip toi JWKS moi lan goi API.
let cachedKey: CryptoKey | null = null;

async function publicKey() {
  if (cachedKey) return cachedKey;

  const response = await fetch(`${ISSUER}/.well-known/jwks.json`);
  if (!response.ok) throw new Error("jwks_unavailable");

  const { keys } = (await response.json()) as { keys: JsonWebKey[] };
  if (!keys?.length) throw new Error("jwks_empty");

  cachedKey = await crypto.subtle.importKey(
    "jwk",
    { ...keys[0], ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return cachedKey;
}

function decodeBase64Url(part: string) {
  const padded = part.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "=")), (char) =>
    char.charCodeAt(0),
  );
}

export function readSsoCookie(headers: Headers) {
  return headers.get("Cookie")?.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))?.[1] || null;
}

/**
 * Tra ve claims neu cookie hop le, null cho MOI truong hop khac (thieu cookie,
 * chu ky sai, het han, JWKS khong lay duoc). Khong nem loi: day la duong dang
 * nhap phu, hong thi phai roi ve better-auth chu khong lam sap ca request.
 */
export async function verifySsoToken(token: string): Promise<SsoClaims | null> {
  try {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) return null;

    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      await publicKey(),
      decodeBase64Url(signature),
      new TextEncoder().encode(`${header}.${payload}`),
    );
    if (!valid) return null;

    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload))) as SsoClaims;
    if (claims.iss !== ISSUER) return null;
    if (!claims.exp || claims.exp <= Date.now() / 1000) return null;
    if (!claims.sub || !claims.email) return null;

    return claims;
  } catch {
    return null;
  }
}
