import type {
  ApiError,
  ApiGame,
  ApiGameDetail,
  ApiShareView,
} from "../../shared/api-types";
import type { ExpenseInput, GameInput, ParticipantInput } from "../../shared/schemas";

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

export const api = {
  games: {
    list: () => request<ApiGame[]>("/api/games"),
    detail: (gameId: string) => request<ApiGameDetail>(`/api/games/${gameId}`),
    create: (input: GameInput) => post<ApiGameDetail>("/api/games", input),
    rename: (gameId: string, input: GameInput) =>
      patch<ApiGameDetail>(`/api/games/${gameId}`, input),
    remove: (gameId: string) => destroy<{ ok: boolean }>(`/api/games/${gameId}`),
  },
  participants: {
    create: (gameId: string, input: ParticipantInput) =>
      post<ApiGameDetail>(`/api/games/${gameId}/participants`, input),
    update: (participantId: string, input: Partial<ParticipantInput>) =>
      patch<ApiGameDetail>(`/api/participants/${participantId}`, input),
    remove: (participantId: string) =>
      destroy<ApiGameDetail>(`/api/participants/${participantId}`),
  },
  expenses: {
    create: (gameId: string, input: ExpenseInput) =>
      post<ApiGameDetail>(`/api/games/${gameId}/expenses`, input),
    update: (expenseId: string, input: Partial<ExpenseInput>) =>
      patch<ApiGameDetail>(`/api/expenses/${expenseId}`, input),
    remove: (expenseId: string) => destroy<ApiGameDetail>(`/api/expenses/${expenseId}`),
  },
  shareLinks: {
    rotate: (gameId: string) => post<ApiGameDetail>(`/api/games/${gameId}/share-links`),
    setEnabled: (gameId: string, enabled: boolean) =>
      patch<ApiGameDetail>(`/api/games/${gameId}/share-link`, { enabled }),
  },
  share: {
    view: (token: string) => request<ApiShareView>(`/api/share/${token}`),
  },
};
