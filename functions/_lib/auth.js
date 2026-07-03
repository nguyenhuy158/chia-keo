import { unauthorized } from "./http.js";

const SESSION_COOKIE_NAME = "chiakeo_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 180;

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

function parseCookies(header) {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .flatMap((part) => {
        const separatorIndex = part.indexOf("=");
        if (separatorIndex === -1) return [];

        return [[part.slice(0, separatorIndex), decodeURIComponent(part.slice(separatorIndex + 1))]];
      }),
  );
}

function getSessionToken(request) {
  const header = request.headers.get("Authorization") || "";
  if (header.startsWith("Bearer ")) return header.slice("Bearer ".length).trim();

  return parseCookies(request.headers.get("Cookie") || "")[SESSION_COOKIE_NAME] || "";
}

function cookieSecuritySuffix(request) {
  return new URL(request.url).protocol === "https:" ? "; Secure" : "";
}

export function createSessionCookie(token, request) {
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(
    token,
  )}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; SameSite=Lax${cookieSecuritySuffix(request)}`;
}

export function clearSessionCookie(request) {
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${cookieSecuritySuffix(request)}`;
}

export async function hashPassword(username, password) {
  const payload = `${normalizeUsername(username)}:${password}`;
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createUser(db, username, password) {
  const cleanUsername = username.trim();
  const usernameKey = normalizeUsername(cleanUsername);
  const passwordHash = await hashPassword(cleanUsername, password);
  const existingUser = await db.prepare("SELECT * FROM users WHERE username_key = ?").bind(usernameKey).first();

  if (existingUser) {
    return { duplicate: true };
  }

  const userId = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO users (id, username, username_key, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(userId, cleanUsername, usernameKey, passwordHash, now)
    .run();

  return {
    id: userId,
    username: cleanUsername,
    username_key: usernameKey,
    password_hash: passwordHash,
    created_at: now,
  };
}

export async function loginUser(db, username, password) {
  const cleanUsername = username.trim();
  const usernameKey = normalizeUsername(cleanUsername);
  const passwordHash = await hashPassword(cleanUsername, password);
  const existingUser = await db.prepare("SELECT * FROM users WHERE username_key = ?").bind(usernameKey).first();

  if (!existingUser || existingUser.password_hash !== passwordHash) return null;

  return existingUser;
}

export async function resetUserPassword(db, username, currentPassword, newPassword) {
  const user = await loginUser(db, username, currentPassword);
  if (!user) return null;

  const passwordHash = await hashPassword(user.username, newPassword);
  await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(passwordHash, user.id).run();
  await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id).run();

  return user;
}

export async function createSession(db, userId) {
  const token = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)").bind(token, userId, now).run();

  return token;
}

export async function requireUser(context) {
  const token = getSessionToken(context.request);
  if (!token) return { response: unauthorized() };

  const user = await context.env.DB.prepare(
    `SELECT users.*
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = ?`,
  )
    .bind(token)
    .first();

  if (!user) return { response: unauthorized() };

  return { user, token };
}
