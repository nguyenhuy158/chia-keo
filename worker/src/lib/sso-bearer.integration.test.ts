import { Hono } from "hono";
import { afterEach, expect, it, vi } from "vitest";
import type { Env } from "../env";

const { createAuth, resolveSsoUserId, createRepo } = vi.hoisted(() => ({
  createAuth: vi.fn(() => ({ api: { getSession: async () => null } })),
  resolveSsoUserId: vi.fn(async () => "native-user"),
  createRepo: vi.fn(() => ({ kind: "test-repo" })),
}));

vi.mock("../auth", () => ({ createAuth }));
vi.mock("../sso-user", () => ({ resolveSsoUserId }));
vi.mock("../adapters/d1/game-repository", () => ({
  createD1GameRepository: createRepo,
}));

import { type AuthedEnv, protectPaths } from "./require-user";

afterEach(() => vi.unstubAllGlobals());

it("accepts a signed SSO Bearer JWT on a protected route", async () => {
  const keyPair = (await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ keys: [jwk] }))),
  );
  const base64url = (value: Uint8Array) =>
    btoa(String.fromCharCode(...value))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  const encode = (value: unknown) =>
    base64url(new TextEncoder().encode(JSON.stringify(value)));
  const content = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: "https://auth.huyab.click",
    sub: "native-subject",
    email: "native@example.test",
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    keyPair.privateKey,
    new TextEncoder().encode(content),
  );
  const token = `${content}.${base64url(new Uint8Array(signature))}`;

  const app = new Hono<AuthedEnv>();
  protectPaths(app, "/private");
  app.get("/private", (c) => c.json({ userId: c.get("userId") }));
  const env = { DB: { kind: "test-database" } } as unknown as Env;
  const response = await app.request(
    "/private",
    { headers: { Authorization: `Bearer ${token}` } },
    env,
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ userId: "native-user" });
  expect(resolveSsoUserId).toHaveBeenCalledWith(
    env.DB,
    expect.objectContaining({
      sub: "native-subject",
      email: "native@example.test",
    }),
  );
  expect(fetch).toHaveBeenCalledWith(
    "https://auth.huyab.click/.well-known/jwks.json",
  );
});
