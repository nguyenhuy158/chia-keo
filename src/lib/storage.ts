import type { Game } from "../types";

const STORAGE_KEY = "chia-keo-games";
const SESSION_KEY = "chia-keo-session";

export function loadGames(): Game[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGames(games: Game[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
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
