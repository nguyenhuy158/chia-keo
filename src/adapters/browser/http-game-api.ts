// Adapter fetch cho GameApiPort: goi backend qua HTTP, cookie session di kem.

import type { ApiError } from "../../../shared/api-types";
import type { GameApiPort } from "../../core/ports/game-api";

export const API_BASE = import.meta.env.VITE_API_URL || "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(body?.error || `http_${response.status}`);
  }

  return (await response.json()) as T;
}

function post<T>(path: string, body?: unknown) {
  return request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
}

function patch<T>(path: string, body: unknown) {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

function destroy<T>(path: string) {
  return request<T>(path, { method: "DELETE" });
}

export function createHttpGameApi(): GameApiPort {
  return {
    games: {
      list: () => request(`/api/games`),
      detail: (gameId) => request(`/api/games/${gameId}`),
      create: (input) => post(`/api/games`, input),
      update: (gameId, input) => patch(`/api/games/${gameId}`, input),
      remove: (gameId) => destroy(`/api/games/${gameId}`),
      duplicate: (gameId) => post(`/api/games/${gameId}/duplicate`),
      trash: () => request(`/api/games/trash`),
      restore: (gameId) => post(`/api/games/${gameId}/restore`),
      purge: (gameId) => destroy(`/api/games/${gameId}/purge`),
    },
    funStats: {
      get: () => request(`/api/fun-stats`),
    },
    gameEvents: {
      list: (gameId) => request(`/api/games/${gameId}/events`),
      undo: (eventId) => post(`/api/events/${eventId}/undo`),
    },
    preferences: {
      get: () => request(`/api/preferences`),
      update: (input) => patch(`/api/preferences`, input),
    },
    contacts: {
      list: () => request(`/api/contacts`),
      create: (input) => post(`/api/contacts`, input),
      update: (contactId, input) => patch(`/api/contacts/${contactId}`, input),
      remove: (contactId) => destroy(`/api/contacts/${contactId}`),
    },
    participants: {
      create: (gameId, input) => post(`/api/games/${gameId}/participants`, input),
      createMany: (gameId, input) => post(`/api/games/${gameId}/participants/batch`, input),
      update: (participantId, input) => patch(`/api/participants/${participantId}`, input),
      remove: (participantId) => destroy(`/api/participants/${participantId}`),
    },
    expenses: {
      create: (gameId, input) => post(`/api/games/${gameId}/expenses`, input),
      update: (expenseId, input) => patch(`/api/expenses/${expenseId}`, input),
      remove: (expenseId) => destroy(`/api/expenses/${expenseId}`),
    },
    transfers: {
      create: (gameId, input) => post(`/api/games/${gameId}/transfers`, input),
    },
    shareLinks: {
      rotate: (gameId) => post(`/api/games/${gameId}/share-links`),
      setEnabled: (gameId, enabled) => patch(`/api/games/${gameId}/share-link`, { enabled }),
    },
    photos: {
      list: (gameId) => request(`/api/games/${gameId}/photos`),
      detail: (photoId) => request(`/api/photos/${photoId}`),
      create: (gameId, input) => post(`/api/games/${gameId}/photos`, input),
      update: (photoId, input) => patch(`/api/photos/${photoId}`, input),
      remove: (photoId) => destroy(`/api/photos/${photoId}`),
    },
    share: {
      view: (token) => request(`/api/share/${token}`),
      photos: (token) => request(`/api/share/${token}/photos`),
      photo: (token, photoId) => request(`/api/share/${token}/photos/${photoId}`),
    },
    mcpTokens: {
      list: () => request(`/api/mcp-tokens`),
      create: (input) => post(`/api/mcp-tokens`, input),
      revoke: (tokenId) => destroy(`/api/mcp-tokens/${tokenId}`),
    },
    ai: {
      suggestExpense: (gameId, text) => post(`/api/ai/expense`, { gameId, text }),
      scanReceipt: (gameId, image) => post(`/api/ai/receipt`, { gameId, image }),
    },
  };
}
