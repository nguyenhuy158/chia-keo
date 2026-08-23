// Ha tang test cho tang UI: GameApiPort gia + wrapper React Query.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { vi } from "vitest";
import type { ApiGameDetail, ApiPhoto } from "../../shared/api-types";
import { provideGameApi, provideQrProvider } from "../core/container";
import type { GameApiPort } from "../core/ports/game-api";
import { vietQrProvider } from "../adapters/browser/vietqr";

export const GAME_ID = "game_1";
export const AN = "participant_an";
export const BINH = "participant_binh";

export function makeDetail(overrides: Partial<ApiGameDetail> = {}): ApiGameDetail {
  return {
    id: GAME_ID,
    code: "DSKVUF",
    name: "Cầu lông",
    settlementMode: "host",
    settlementHostId: "",
    createdAt: "2026-08-01T00:00:00.000Z",
    shareLink: null,
    isOwner: true,
    collaborators: [],
    participants: [
      { id: AN, name: "An", bankId: "970436", accountNo: "0123456789", accountName: "AN" },
      { id: BINH, name: "Bình", bankId: "", accountNo: "", accountName: "" },
    ],
    expenses: [],
    summary: { totalExpense: 0, balances: [], settlements: [] },
    ...overrides,
  };
}

export function makePhoto(overrides: Partial<ApiPhoto> = {}): ApiPhoto {
  return {
    id: "photo_1",
    expenseId: null,
    caption: "",
    mimeType: "image/webp",
    width: 100,
    height: 100,
    thumbData: "data:image/webp;base64,AAAA",
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

/** GameApiPort gia: moi method la vi.fn() tra ve du lieu hop le. */
export function createFakeGameApi() {
  const detail = async () => makeDetail();

  const api = {
    games: {
      list: vi.fn(async () => [
        {
          id: GAME_ID,
          code: "DSKVUF",
          name: "Cầu lông",
          createdAt: "2026-08-01T00:00:00.000Z",
          participantCount: 2,
          expenseCount: 0,
          isOwner: true,
        },
      ]),
      detail: vi.fn(detail),
      create: vi.fn(detail),
      update: vi.fn(detail),
      remove: vi.fn(async () => ({ ok: true as const })),
      duplicate: vi.fn(detail),
      trash: vi.fn(async () => []),
      restore: vi.fn(detail),
      purge: vi.fn(async () => ({ ok: true as const })),
    },
    funStats: { get: vi.fn(async () => ({ gameCount: 0 })) },
    crossBalances: { get: vi.fn(async () => ({ people: [] })) },
    gameEvents: {
      list: vi.fn(async () => ({ events: [] })),
      undo: vi.fn(detail),
    },
    preferences: {
      get: vi.fn(async () => ({
        preferences: { summaryShowQr: true, summaryShowAvatar: true },
      })),
      update: vi.fn(async () => ({
        preferences: { summaryShowQr: false, summaryShowAvatar: true },
      })),
    },
    contacts: {
      list: vi.fn(async () => ({ contacts: [] })),
      create: vi.fn(async () => ({ contacts: [{ name: "Hồng" }] })),
      update: vi.fn(async () => ({ contacts: [{ name: "Lan" }] })),
      remove: vi.fn(async () => ({ contacts: [] })),
    },
    participants: {
      create: vi.fn(detail),
      createMany: vi.fn(detail),
      update: vi.fn(detail),
      remove: vi.fn(detail),
      reorder: vi.fn(detail),
    },
    expenses: {
      create: vi.fn(detail),
      update: vi.fn(detail),
      remove: vi.fn(detail),
      reorder: vi.fn(detail),
    },
    transfers: { create: vi.fn(detail) },
    shareLinks: { rotate: vi.fn(detail), setEnabled: vi.fn(detail) },
    collaborators: {
      add: vi.fn(detail),
      remove: vi.fn(detail),
      removePending: vi.fn(detail),
      listCandidates: vi.fn(async () => []),
    },
    photos: {
      list: vi.fn(async () => [makePhoto()]),
      detail: vi.fn(async () => ({ ...makePhoto(), data: "data:image/webp;base64,AAAA" })),
      create: vi.fn(async () => makePhoto({ id: "photo_moi" })),
      update: vi.fn(async () => makePhoto({ caption: "Sân" })),
      remove: vi.fn(async () => ({ ok: true as const })),
    },
    share: {
      view: vi.fn(async () => ({
        code: "DSKVUF",
        name: "Cầu lông",
        settlementMode: "host" as const,
        settlementHostId: "",
        participants: [],
        expenses: [],
        summary: { totalExpense: 0, balances: [], settlements: [] },
      })),
      photos: vi.fn(async () => [makePhoto()]),
      photo: vi.fn(async () => ({ ...makePhoto(), data: "data:image/webp;base64,AAAA" })),
    },
    mcpTokens: {
      list: vi.fn(async () => ({ tokens: [] })),
      create: vi.fn(async () => ({ token: "mcp_abc", id: "token_1" })),
      revoke: vi.fn(async () => ({ ok: true as const })),
    },
    ai: {
      suggestExpense: vi.fn(async () => ({ suggestion: { title: "Nước", amount: 90_000 } })),
      scanReceipt: vi.fn(async () => ({ suggestion: { title: "Hóa đơn", amount: 250_000 } })),
    },
  };

  provideGameApi(api as unknown as GameApiPort);
  provideQrProvider(vietQrProvider);

  return api;
}

/**
 * QueryClient cho test: khong retry (test loi phai nhanh). KHONG dat gcTime: 0
 * — cache khong co observer se bi don ngay, lam moi assert tren
 * `getQueryData` sau mutation deu doc ra undefined.
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function createWrapper(queryClient = createTestQueryClient()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { wrapper, queryClient };
}
