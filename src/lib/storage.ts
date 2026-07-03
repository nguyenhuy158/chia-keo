import { z } from "zod";
import { parseGames } from "./schema";
import type { Game } from "../types";

const STORAGE_KEY = "chia-keo-games";
const SESSION_KEY = "chia-keo-session";
const USERS_KEY = "chia-keo-users";

const LocalUserSchema = z.object({
  username: z.string(),
  passwordHash: z.string(),
  createdAt: z.string(),
});

type LocalUser = z.infer<typeof LocalUserSchema>;

export function loadGames(): Game[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return parseGames(parsed);
  } catch {
    return [];
  }
}

export function saveGames(games: Game[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
}

function loadUsers(): LocalUser[] {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item) => {
      const result = LocalUserSchema.safeParse(item);

      return result.success ? [result.data] : [];
    });
  } catch {
    return [];
  }
}

function saveUsers(users: LocalUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

async function hashPassword(username: string, password: string) {
  const payload = `${normalizeUsername(username)}:${password}`;

  if (!crypto.subtle) {
    return btoa(payload);
  }

  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function loginOrCreateLocalUser(username: string, password: string) {
  const cleanUsername = username.trim();
  if (!cleanUsername || !password) {
    return { ok: false, error: "Nhập đầy đủ tên đăng nhập và mật khẩu." };
  }

  const users = loadUsers();
  const usernameKey = normalizeUsername(cleanUsername);
  const passwordHash = await hashPassword(cleanUsername, password);
  const existingUser = users.find((user) => normalizeUsername(user.username) === usernameKey);

  if (existingUser) {
    if (existingUser.passwordHash !== passwordHash) {
      return { ok: false, error: "Sai tên đăng nhập hoặc mật khẩu." };
    }

    saveSession(existingUser.username);
    return { ok: true, username: existingUser.username };
  }

  saveUsers([
    ...users,
    {
      username: cleanUsername,
      passwordHash,
      createdAt: new Date().toISOString(),
    },
  ]);
  saveSession(cleanUsername);

  return { ok: true, username: cleanUsername };
}

export function loadSession() {
  return localStorage.getItem(SESSION_KEY) || "";
}

export function saveSession(username: string) {
  localStorage.setItem(SESSION_KEY, username);
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
