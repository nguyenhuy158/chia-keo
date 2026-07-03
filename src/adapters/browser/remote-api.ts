import { parseGame, parseGames } from "../../core/domain/schema";
import type { Game } from "../../core/domain/types";

export type ApiSession = {
  token: string;
  username: string;
};

async function requestJson<T>(path: string, init: RequestInit = {}, token = ""): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Không gọi được máy chủ.");
  }

  return data as T;
}

export async function loginOrCreateRemoteUser(username: string, password: string) {
  const data = await requestJson<{ session: ApiSession; games: unknown }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  return {
    session: data.session,
    games: parseGames(data.games),
  };
}

export async function logoutRemoteUser(token: string) {
  await requestJson<{ ok: boolean }>("/api/auth/logout", { method: "POST" }, token);
}

export async function fetchRemoteGames(token: string) {
  const data = await requestJson<{ games: unknown }>("/api/games", {}, token);

  return parseGames(data.games);
}

export async function createRemoteGame(token: string, game: Game) {
  const data = await requestJson<{ game: unknown }>(
    "/api/games",
    {
      method: "POST",
      body: JSON.stringify({ game }),
    },
    token,
  );

  return parseGame(data.game) || game;
}

export async function saveRemoteGame(token: string, game: Game) {
  const data = await requestJson<{ game: unknown }>(
    `/api/games/${encodeURIComponent(game.id)}`,
    {
      method: "PUT",
      body: JSON.stringify({ game }),
    },
    token,
  );

  return parseGame(data.game) || game;
}

export async function createShareSnapshot(token: string, game: Game) {
  const data = await requestJson<{ shareToken: string; url: string }>(
    "/api/share",
    {
      method: "POST",
      body: JSON.stringify({ game }),
    },
    token,
  );

  return data;
}

export async function fetchShareSnapshot(shareToken: string) {
  const data = await requestJson<{ game: unknown }>(`/api/share/${encodeURIComponent(shareToken)}`);

  return parseGame(data.game);
}
