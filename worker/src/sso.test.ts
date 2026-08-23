import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readSsoCookie, verifySsoToken } from "./sso";

const ISSUER = "https://auth.huyab.click";

/**
 * Ky token that bang mot cap khoa RSA sinh tai cho: dung dung duong ma worker
 * chay (JWKS -> importKey -> verify), khong gia lap crypto.
 */
async function createSigner() {
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);

  function toBase64Url(bytes: Uint8Array) {
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  // btoa chi nhan latin1 — claims co tieng Viet nen phai qua UTF-8 truoc.
  function encode(value: object) {
    return toBase64Url(new TextEncoder().encode(JSON.stringify(value)));
  }

  async function sign(claims: Record<string, unknown>) {
    const body = `${encode({ alg: "RS256", typ: "JWT" })}.${encode(claims)}`;
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      pair.privateKey,
      new TextEncoder().encode(body),
    );
    return `${body}.${toBase64Url(new Uint8Array(signature))}`;
  }

  return { jwk, sign };
}

function futureExp() {
  return Math.floor(Date.now() / 1000) + 3600;
}

let signer: Awaited<ReturnType<typeof createSigner>>;

beforeEach(async () => {
  signer = await createSigner();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ keys: [signer.jwk] }))),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readSsoCookie", () => {
  it("doc token trong cookie", () => {
    const headers = new Headers({ Cookie: "other=1; huyab_sso=abc.def.ghi; more=2" });

    expect(readSsoCookie(headers)).toBe("abc.def.ghi");
  });

  it("khong co cookie thi null", () => {
    expect(readSsoCookie(new Headers())).toBeNull();
  });

  it("co cookie khac nhung khong co cookie SSO thi null", () => {
    expect(readSsoCookie(new Headers({ Cookie: "session=1" }))).toBeNull();
  });
});

describe("verifySsoToken", () => {
  it("token hop le tra ve claims", async () => {
    const token = await signer.sign({
      iss: ISSUER,
      sub: "user_sso_1",
      email: "ai@example.com",
      name: "Ai Đó",
      exp: futureExp(),
    });

    expect(await verifySsoToken(token)).toMatchObject({
      sub: "user_sso_1",
      email: "ai@example.com",
    });
  });

  it("token het han thi tu choi", async () => {
    const token = await signer.sign({
      iss: ISSUER,
      sub: "user_sso_1",
      email: "ai@example.com",
      exp: Math.floor(Date.now() / 1000) - 10,
    });

    expect(await verifySsoToken(token)).toBeNull();
  });

  it("token cua issuer khac thi tu choi", async () => {
    const token = await signer.sign({
      iss: "https://ke-gia-mao.example",
      sub: "user_sso_1",
      email: "ai@example.com",
      exp: futureExp(),
    });

    expect(await verifySsoToken(token)).toBeNull();
  });

  it("thieu sub hoac email thi tu choi", async () => {
    const token = await signer.sign({ iss: ISSUER, exp: futureExp() });

    expect(await verifySsoToken(token)).toBeNull();
  });

  it("chu ky sai thi tu choi", async () => {
    const token = await signer.sign({
      iss: ISSUER,
      sub: "user_sso_1",
      email: "ai@example.com",
      exp: futureExp(),
    });
    const tampered = `${token.slice(0, -4)}AAAA`;

    expect(await verifySsoToken(tampered)).toBeNull();
  });

  it("token khong du ba phan thi tu choi", async () => {
    expect(await verifySsoToken("khong-phai-jwt")).toBeNull();
  });

  it("JWKS khong lay duoc thi tu choi, khong lam sap request", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));

    expect(await verifySsoToken("a.b.c")).toBeNull();
  });

  it("JWKS rong thi tu choi", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ keys: [] }))));

    expect(await verifySsoToken("a.b.c")).toBeNull();
  });
});
