import { unauthorized } from "./http.js";

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

export async function hashPassword(username, password) {
  const payload = `${normalizeUsername(username)}:${password}`;
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function loginOrCreateUser(db, username, password) {
  const cleanUsername = username.trim();
  const usernameKey = normalizeUsername(cleanUsername);
  const passwordHash = await hashPassword(cleanUsername, password);
  const existingUser = await db.prepare("SELECT * FROM users WHERE username_key = ?").bind(usernameKey).first();

  if (existingUser) {
    if (existingUser.password_hash !== passwordHash) return null;

    return existingUser;
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

export async function createSession(db, userId) {
  const token = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)").bind(token, userId, now).run();

  return token;
}

export async function requireUser(context) {
  const header = context.request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
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

