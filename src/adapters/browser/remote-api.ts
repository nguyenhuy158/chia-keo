import { parseGame, parseGames } from "../../core/domain/schema";
import { parseAiExpenseDraft } from "../../core/application/ai-expense";
import { normalizeExpenseCategoryId } from "../../core/domain/expense-categories";
import type { AiExpenseDraft } from "../../core/application/ai-expense";
import type { ExpenseTemplate, Game, Participant, SharePermission } from "../../core/domain/types";

export type ApiSession = {
  username: string;
  displayName?: string;
};

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Không gọi được máy chủ.");
  }

  return data as T;
}

function normalizeSessionResponse(data: { session: ApiSession; games: unknown; expenseTemplates?: unknown }) {
  return {
    session: data.session,
    games: parseGames(data.games),
    expenseTemplates: parseExpenseTemplates(data.expenseTemplates),
  };
}

export async function loginRemoteUser(username: string, password: string) {
  const data = await requestJson<{ session: ApiSession; games: unknown; expenseTemplates?: unknown }>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ username, password }),
    },
  );

  return normalizeSessionResponse(data);
}

export async function registerRemoteUser(username: string, password: string) {
  const data = await requestJson<{ session: ApiSession; games: unknown; expenseTemplates?: unknown }>(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ username, password }),
    },
  );

  return normalizeSessionResponse(data);
}

export async function resetRemotePassword(currentPassword: string, newPassword: string) {
  await requestJson<{ ok: boolean }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function fetchCurrentSession() {
  const data = await requestJson<{ session: ApiSession; games: unknown; expenseTemplates?: unknown }>("/api/auth/session");

  return normalizeSessionResponse(data);
}

export async function logoutRemoteUser() {
  await requestJson<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}

export async function fetchRemoteGames() {
  const data = await requestJson<{ games: unknown }>("/api/games");

  return parseGames(data.games);
}

export async function createRemoteGame(game: Game) {
  const data = await requestJson<{ game: unknown }>("/api/games", {
    method: "POST",
    body: JSON.stringify({ game }),
  });

  return parseGame(data.game) || game;
}

export async function saveRemoteGame(game: Game) {
  const data = await requestJson<{ game: unknown }>(`/api/games/${encodeURIComponent(game.id)}`, {
    method: "PUT",
    body: JSON.stringify({ game }),
  });

  return parseGame(data.game) || game;
}

export async function createShareSnapshot(game: Game, permission: SharePermission = "view") {
  const data = await requestJson<{ shareToken: string; url: string; permission: SharePermission }>(
    "/api/share",
    {
      method: "POST",
      body: JSON.stringify({ game, permission }),
    },
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

function parseExpenseTemplates(value: unknown): ExpenseTemplate[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    const template = item as Partial<ExpenseTemplate>;
    const id = typeof template.id === "string" ? template.id.trim() : "";
    const title = typeof template.title === "string" ? template.title.trim() : "";
    const amount = Number(template.amount);
    const createdAt = typeof template.createdAt === "string" ? template.createdAt.trim() : "";
    if (!id || !title || !Number.isFinite(amount) || amount <= 0 || !createdAt) return [];

    return [
      {
        id,
        title,
        amount: Math.round(amount),
        categoryId: normalizeExpenseCategoryId(template.categoryId),
        createdAt,
      },
    ];
  });
}

export async function saveRemoteExpenseTemplates(expenseTemplates: ExpenseTemplate[]) {
  const data = await requestJson<{ expenseTemplates: unknown }>("/api/expense-templates", {
    method: "PUT",
    body: JSON.stringify({ expenseTemplates }),
  });

  return parseExpenseTemplates(data.expenseTemplates);
}

export async function updateRemoteProfile(displayName: string) {
  const data = await requestJson<{ session: ApiSession }>("/api/profile", {
    method: "PUT",
    body: JSON.stringify({ displayName }),
  });

  return data.session;
}

export async function suggestExpenseWithAi(
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
  );

  return parseAiExpenseDraft(data.expense);
}

export async function scanReceiptWithAi(
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
  );

  return parseAiExpenseDraft(data.expense);
}
