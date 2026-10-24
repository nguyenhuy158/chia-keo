import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { migrate } from "drizzle-orm/d1/migrator";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "./adapters/d1/schema";
import type { SsoClaims } from "./sso";
import { resolveSsoUserId } from "./sso-user";

let miniflare: Miniflare;
let DB: D1Database;

function claims(email: string, overrides: Partial<SsoClaims> = {}): SsoClaims {
  return {
    iss: "https://auth.huyab.click",
    sub: `sso-${email}`,
    email,
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}

beforeAll(async () => {
  miniflare = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok'); } }",
    compatibilityDate: "2026-07-01",
    d1Databases: { DB: "test-sso-user" },
    d1Persist: false,
  });
  DB = await miniflare.getD1Database("DB");
  await migrate(drizzle(DB), { migrationsFolder: "./drizzle" });
});

afterAll(async () => miniflare.dispose());

describe("resolveSsoUserId", () => {
  it("reuses a Better Auth account with the same email", async () => {
    const orm = drizzle(DB, { schema });
    await orm.insert(schema.user).values({
      id: "existing",
      name: "Existing Name",
      email: "existing@example.test",
      createdAt: new Date(0),
      updatedAt: new Date(0),
    });
    expect(
      await resolveSsoUserId(
        DB,
        claims("existing@example.test", { name: "Changed" }),
      ),
    ).toBe("existing");
    const rows = await orm
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, "existing@example.test"));
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Existing Name");
  });

  it("creates an SSO user and claims pending invitations by email", async () => {
    const orm = drizzle(DB, { schema });
    await orm.insert(schema.games).values({
      id: "game-1",
      ownerUserId: "existing",
      code: "CK01",
      name: "Cầu",
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    });
    await orm.insert(schema.gameCollaborators).values([
      {
        id: "pending",
        gameId: "game-1",
        invitedEmail: "NEW@EXAMPLE.TEST",
        createdAt: new Date(0).toISOString(),
      },
      {
        id: "other",
        gameId: "game-1",
        invitedEmail: "other@example.test",
        createdAt: new Date(0).toISOString(),
      },
    ]);
    const id = await resolveSsoUserId(
      DB,
      claims("new@example.test", { name: "New User", picture: "avatar.png" }),
    );
    const users = await orm
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, id));
    expect(users[0]).toMatchObject({
      name: "New User",
      email: "new@example.test",
      image: "avatar.png",
      emailVerified: true,
    });
    const pending = await orm
      .select()
      .from(schema.gameCollaborators)
      .where(eq(schema.gameCollaborators.id, "pending"));
    const other = await orm
      .select()
      .from(schema.gameCollaborators)
      .where(eq(schema.gameCollaborators.id, "other"));
    expect(pending[0].userId).toBe(id);
    expect(other[0].userId).toBeNull();
  });

  it("falls back to email for a missing name and keeps an empty picture null", async () => {
    const orm = drizzle(DB, { schema });
    const id = await resolveSsoUserId(DB, claims("fallback@example.test"));
    const rows = await orm
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, id));
    expect(rows[0]).toMatchObject({
      name: "fallback@example.test",
      image: null,
    });
  });
});
