import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./adapters/d1/schema";
import type { SsoClaims } from "./sso";

/**
 * Doi claims SSO thanh mot dong trong bang `user` cua app.
 *
 * Doi chieu bang EMAIL chu khong phai `sub`: tai khoan tao truoc day bang
 * Google (qua better-auth social) da co san email that, ghep duoc ngay. Tai
 * khoan username/mat khau thi email la email gia (`<username>@chia-keo.local`)
 * nen khong bao gio trung — dung nhu mong doi, do la hai danh tinh khac nhau.
 *
 * Dung chung bang `user` voi better-auth de moi thu phia sau (games, contacts,
 * preferences deu khoa theo userId) khong phai biet nguoi dung dang nhap kieu
 * nao.
 */
export async function resolveSsoUserId(db: D1Database, claims: SsoClaims): Promise<string> {
  const orm = drizzle(db, { schema });

  const existing = await orm
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, claims.email))
    .limit(1);

  if (existing[0]) return existing[0].id;

  const now = new Date();
  const id = crypto.randomUUID();

  await orm.insert(schema.user).values({
    id,
    name: claims.name || claims.email,
    email: claims.email,
    // Google da xac minh email roi; danh dau luon de khong hien loi "chua xac minh".
    emailVerified: true,
    image: claims.picture || null,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}
