import { parseGame, parseGames } from "../../core/domain/schema";
import { parseAiExpenseDraft } from "../../core/application/ai-expense";
import type { AiExpenseDraft } from "../../core/application/ai-expense";
import type { Game, Participant, SharePermission } from "../../core/domain/types";

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

export async function createShareSnapshot(token: string, game: Game, permission: SharePermission = "view") {
  const data = await requestJson<{ shareToken: string; url: string; permission: SharePermission }>(
    "/api/share",
    {
      method: "POST",
      body: JSON.stringify({ game, permission }),
    },
    token,
  );

  return data;
}

export async function fetchShareSnapshot(shareToken: string) {
  const data = await requestJson<{ game: unknown; permission?: SharePermission }>(
    `/api/share/${encodeURIComponent(shareToken)}`,
  );

  const game = parseGame(data.game);

  return game
    ? {
        game,
        permission: data.permission === "edit" ? "edit" : "view",
      }
    : null;
}

export async function saveShareSnapshot(shareToken: string, game: Game) {
  const data = await requestJson<{ game: unknown; permission?: SharePermission }>(
    `/api/share/${encodeURIComponent(shareToken)}`,
    {
      method: "PUT",
      body: JSON.stringify({ game }),
    },
  );
  const savedGame = parseGame(data.game);

  return savedGame
    ? {
        game: savedGame,
        permission: data.permission === "edit" ? "edit" : "view",
      }
    : null;
}

export async function suggestExpenseWithAi(
  token: string,
  payload: {
    text: string;
    participants: Participant[];
  },
): Promise<AiExpenseDraft> {
  const data = await requestJson<{ expense: unknown }>(
    "/api/ai/expense",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );

  return parseAiExpenseDraft(data.expense);
}

export async function scanReceiptWithAi(
  token: string,
  payload: {
    image: {
      mimeType: string;
      data: string;
    };
  },
): Promise<AiExpenseDraft> {
  const data = await requestJson<{ expense: unknown }>(
    "/api/ai/receipt",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );

  return parseAiExpenseDraft(data.expense);
}
