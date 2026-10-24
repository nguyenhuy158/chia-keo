import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const issuer = "https://auth.huyab.click";
let keyPair: CryptoKeyPair;
let jwk: JsonWebKey;

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function jsonPart(value: unknown) {
  return base64url(new TextEncoder().encode(JSON.stringify(value)));
}

async function signedToken(claims: Record<string, unknown>) {
  const content = `${jsonPart({ alg: "RS256", typ: "JWT" })}.${jsonPart(claims)}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    keyPair.privateKey,
    new TextEncoder().encode(content),
  );
  return `${content}.${base64url(new Uint8Array(signature))}`;
}

function validClaims() {
  return {
    iss: issuer,
    sub: "user-1",
    email: "an@example.com",
    name: "An",
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
}

beforeEach(async () => {
  vi.resetModules();
  keyPair = (await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  jwk = (await crypto.subtle.exportKey("jwk", keyPair.publicKey)) as JsonWebKey;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ keys: [jwk] }))),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("SSO JWT verification", () => {
  it("reads only the named cookie", async () => {
    const { readSsoCookie } = await import("./sso");
    expect(readSsoCookie(new Headers())).toBeNull();
    expect(readSsoCookie(new Headers({ Cookie: "other=abc" }))).toBeNull();
    expect(
      readSsoCookie(
        new Headers({ Cookie: "other=abc; huyab_sso=token-1; x=2" }),
      ),
    ).toBe("token-1");
  });

  it("reads Bearer tokens when the SSO cookie is absent", async () => {
    const { readSsoToken } = await import("./sso");
    expect(readSsoToken(new Headers())).toBeNull();
    expect(readSsoToken(new Headers({ Authorization: "Basic token" }))).toBeNull();
    expect(readSsoToken(new Headers({ Authorization: "Bearer   " }))).toBeNull();
    expect(readSsoToken(new Headers({ Authorization: "Bearer token-1" }))).toBe("token-1");
    expect(readSsoToken(new Headers({ Authorization: "bearer\ttoken-2 " }))).toBe("token-2");
    expect(readSsoToken(new Headers({ Authorization: "Bearer two tokens" }))).toBeNull();
    expect(
      readSsoToken(new Headers({
        Cookie: "huyab_sso=cookie-token",
        Authorization: "Bearer bearer-token",
      })),
    ).toBe("cookie-token");
  });

  it("verifies a signed JWT supplied through Bearer", async () => {
    const { readSsoToken, verifySsoToken } = await import("./sso");
    const token = await signedToken(validClaims());
    const bearer = readSsoToken(new Headers({ Authorization: `Bearer ${token}` }));
    expect(bearer).toBe(token);
    expect(await verifySsoToken(bearer as string)).toMatchObject({
      sub: "user-1",
      email: "an@example.com",
    });
  });

  it("rejects incomplete and malformed tokens", async () => {
    const { verifySsoToken } = await import("./sso");
    expect(await verifySsoToken("")).toBeNull();
    expect(await verifySsoToken("header.payload")).toBeNull();
    expect(await verifySsoToken("header..signature")).toBeNull();
    expect(await verifySsoToken("header.payload.")).toBeNull();
    expect(await verifySsoToken("a.b.c")).toBeNull();
  });

  it("verifies a signed token and reuses the imported JWKS key", async () => {
    const { verifySsoToken } = await import("./sso");
    const token = await signedToken(validClaims());
    expect(await verifySsoToken(token)).toMatchObject({
      sub: "user-1",
      email: "an@example.com",
    });
    expect(await verifySsoToken(token)).toMatchObject({ name: "An" });
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(`${issuer}/.well-known/jwks.json`);
  });

  it("rejects wrong signatures and invalid claims", async () => {
    const { verifySsoToken } = await import("./sso");
    const token = await signedToken(validClaims());
    expect(await verifySsoToken(`${token.slice(0, -2)}AA`)).toBeNull();
    for (const override of [
      { iss: "https://wrong.example" },
      { exp: 0 },
      { exp: Math.floor(Date.now() / 1000) - 1 },
      { sub: "" },
      { email: "" },
    ]) {
      expect(
        await verifySsoToken(
          await signedToken({ ...validClaims(), ...override }),
        ),
      ).toBeNull();
    }
  });

  it("returns null when JWKS is unavailable, empty, or malformed", async () => {
    const token = await signedToken(validClaims());
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 503 }));
    expect(await (await import("./sso")).verifySsoToken(token)).toBeNull();
    vi.resetModules();
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ keys: [] })),
    );
    expect(await (await import("./sso")).verifySsoToken(token)).toBeNull();
    vi.resetModules();
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ keys: [{}] })),
    );
    expect(await (await import("./sso")).verifySsoToken(token)).toBeNull();
  });
});
