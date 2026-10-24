import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { provideGameApi } from "../../core/container";
import type { GameApiPort } from "../../core/ports/game-api";
import { crossBalancesKeys, useCrossBalances } from "./cross-balances-query";
import { funStatsKeys, useFunStats } from "./fun-stats-query";
import {
  sessionKeys,
  useAppSession,
  useUpdateProfileName,
} from "./session-query";
import {
  shuttleKeys,
  useCreateShuttleEntry,
  useDeleteShuttleEntry,
  useShuttleStock,
} from "./shuttles-query";

let host: HTMLDivElement;
let root: Root;
let client: QueryClient;

function mount<T>(hook: () => T) {
  let result!: T;
  function Harness() {
    result = hook();
    return null;
  }
  act(() =>
    root.render(
      createElement(QueryClientProvider, { client }, createElement(Harness)),
    ),
  );
  return () => result;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  client.clear();
  host.remove();
  vi.unstubAllGlobals();
});

describe("standalone React Query hooks", () => {
  it("only fetches cross balances when enabled and fetches fun stats", async () => {
    const balances = vi.fn().mockResolvedValue({ rows: ["balance"] });
    const stats = vi.fn().mockResolvedValue({ rows: ["stats"] });
    provideGameApi({
      crossBalances: { get: balances },
      funStats: { get: stats },
    } as unknown as GameApiPort);
    const current = mount(() => ({
      balance: useCrossBalances(false),
      stats: useFunStats(),
    }));
    expect(balances).not.toHaveBeenCalled();
    await act(async () => {
      await vi.waitFor(() =>
        expect(current().stats.data).toEqual({ rows: ["stats"] }),
      );
    });
    expect(client.getQueryData(funStatsKeys.all)).toEqual({ rows: ["stats"] });
    expect(client.getQueryData(crossBalancesKeys.all)).toBeUndefined();
    mount(() => useCrossBalances());
    await act(async () => {
      await vi.waitFor(() =>
        expect(client.getQueryData(crossBalancesKeys.all)).toEqual({
          rows: ["balance"],
        }),
      );
    });
  });

  it("writes shuttle creation and deletion results straight into cache", async () => {
    const first = { entries: [{ id: "one" }] };
    const empty = { entries: [] };
    const get = vi.fn().mockResolvedValue(empty);
    const createEntry = vi.fn().mockResolvedValue(first);
    const removeEntry = vi.fn().mockResolvedValue(empty);
    provideGameApi({
      shuttles: { get, createEntry, removeEntry },
    } as unknown as GameApiPort);
    const current = mount(() => ({
      stock: useShuttleStock(),
      create: useCreateShuttleEntry(),
      remove: useDeleteShuttleEntry(),
    }));
    await vi.waitFor(() => expect(current().stock.data).toEqual(empty));
    await act(async () => {
      await current().create.mutateAsync({} as never);
    });
    expect(createEntry).toHaveBeenCalledWith({});
    expect(client.getQueryData(shuttleKeys.all)).toEqual(first);
    await act(async () => {
      await current().remove.mutateAsync("one");
    });
    expect(removeEntry).toHaveBeenCalledWith("one");
    expect(client.getQueryData(shuttleKeys.all)).toEqual(empty);
  });

  it("loads merged session and updates the cached user name", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ user: { id: "u", name: "Old", image: null } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ name: "New" }),
      });
    vi.stubGlobal("fetch", fetch);
    const current = mount(() => ({
      session: useAppSession(),
      update: useUpdateProfileName(),
    }));
    expect(current().session.isPending).toBe(true);
    await vi.waitFor(() => expect(current().session.user?.name).toBe("Old"));
    expect(fetch).toHaveBeenCalledWith("/api/session", {
      credentials: "include",
    });
    await act(async () => {
      await current().update.mutateAsync("New");
    });
    expect(fetch).toHaveBeenCalledWith("/api/profile", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: '{"name":"New"}',
    });
    expect(client.getQueryData(sessionKeys.all)).toEqual({
      user: { id: "u", name: "New", image: null },
    });
  });

  it("treats a failed session request as anonymous", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const current = mount(useAppSession);
    await vi.waitFor(() => expect(current().isPending).toBe(false));
    expect(current().user).toBeNull();
  });

  it("keeps no user in cache and reports profile update errors", async () => {
    client.setQueryData(sessionKeys.all, { user: null });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "denied" }),
      }),
    );
    const current = mount(useUpdateProfileName);
    await act(async () => {
      await expect(current().mutateAsync("New")).rejects.toThrow("denied");
    });
    expect(client.getQueryData(sessionKeys.all)).toEqual({ user: null });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ name: "New" }),
        }),
    );
    await act(async () => {
      await current().mutateAsync("New");
    });
    expect(client.getQueryData(sessionKeys.all)).toEqual({ user: null });
  });

  it("falls back to update_failed for invalid profile error JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.reject(new Error("bad JSON")),
      }),
    );
    const current = mount(useUpdateProfileName);
    await act(async () => {
      await expect(current().mutateAsync("New")).rejects.toThrow(
        "update_failed",
      );
    });
  });
});
