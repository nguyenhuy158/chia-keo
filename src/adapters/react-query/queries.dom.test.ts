import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiGameDetail, ApiPhoto } from "../../../shared/api-types";
import type { ApiGameEvent } from "../../../shared/game-events";
import { DEFAULT_USER_PREFERENCES } from "../../../shared/schemas";
import { provideGameApi } from "../../core/container";
import type { GameApiPort } from "../../core/ports/game-api";
import {
  closedGameKeys,
  contactKeys,
  eventKeys,
  findUndoableExpenseRemoval,
  gameKeys,
  mcpTokenKeys,
  photoKeys,
  preferenceKeys,
  trashKeys,
  useAddCollaborator,
  useAddExpense,
  useAddParticipant,
  useAddParticipants,
  useAddPhoto,
  useAddTransfer,
  useAiScanReceipt,
  useAiSuggestExpense,
  useClosedGames,
  useCloseGame,
  useContacts,
  useCreateContact,
  useCreateGame,
  useCreateMcpToken,
  useDeleteContact,
  useDeleteGame,
  useDuplicateGame,
  useGame,
  useGameEvents,
  useGames,
  useMcpTokens,
  usePhoto,
  usePhotos,
  usePreferences,
  usePurgeGame,
  useRemoveCollaborator,
  useRemoveExpense,
  useRemoveParticipant,
  useRemovePendingCollaborator,
  useRemovePhoto,
  useRenameGame,
  useReopenGame,
  useReorderExpenses,
  useReorderParticipants,
  useRestoreGame,
  useRevokeMcpToken,
  useRotateShareLink,
  useSetSettlementHost,
  useSetSettlementMode,
  useSetShareLinkEnabled,
  useShareCandidates,
  useSharePhoto,
  useSharePhotos,
  useShareView,
  useTrashedGames,
  useUndoGameEvent,
  useUpdateContact,
  useUpdateExpense,
  useUpdateParticipant,
  useUpdatePhoto,
  useUpdatePreferences,
} from "./queries";

let host: HTMLDivElement;
let root: Root;
let client: QueryClient;
const photo = (id: string): ApiPhoto => ({
  id,
  expenseId: null,
  caption: id,
  mimeType: "image/png",
  width: 2,
  height: 2,
  thumbData: "thumb",
  createdAt: "2026-01-01T00:00:00.000Z",
});

describe("React Query game mutations", () => {
  const detail = (name: string) =>
    ({
      id: "game",
      name,
      expenses: [{ id: "expense-a" }, { id: "expense-b" }],
      participants: [{ id: "person-a" }, { id: "person-b" }],
    }) as ApiGameDetail;

  it("cập nhật detail và làm mới các cache liên quan khi thêm người", async () => {
    const updated = detail("Sau khi thêm");
    const create = vi.fn().mockResolvedValue(updated);
    provideGameApi({ participants: { create } } as unknown as GameApiPort);
    for (const key of [
      gameKeys.all,
      closedGameKeys.all,
      eventKeys.list("game"),
      contactKeys.all,
    ]) {
      client.setQueryData(key, []);
    }
    const current = mount(() => useAddParticipant("game"));
    await act(async () => {
      await current().mutateAsync({
        name: "Bạn",
        bankId: "",
        accountNo: "",
        accountName: "",
      });
    });
    expect(create).toHaveBeenCalledWith("game", {
      name: "Bạn",
      bankId: "",
      accountNo: "",
      accountName: "",
    });
    expect(client.getQueryData(gameKeys.detail("game"))).toEqual(updated);
    for (const key of [
      gameKeys.all,
      closedGameKeys.all,
      eventKeys.list("game"),
      contactKeys.all,
    ]) {
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    }
  });

  it("làm mới ảnh khi xóa khoản chi", async () => {
    const updated = detail("Sau khi xóa");
    const remove = vi.fn().mockResolvedValue(updated);
    provideGameApi({ expenses: { remove } } as unknown as GameApiPort);
    client.setQueryData(photoKeys.list("game"), [photo("receipt")]);
    const current = mount(useRemoveExpense);
    await act(async () => {
      await current().mutateAsync("expense-a");
    });
    expect(remove).toHaveBeenCalledWith("expense-a");
    expect(client.getQueryState(photoKeys.list("game"))?.isInvalidated).toBe(
      true,
    );
  });

  it("sắp thứ tự khoản chi ngay và bỏ id không còn tồn tại", async () => {
    client.setQueryData(gameKeys.detail("game"), detail("Trước"));
    let finish!: (value: ApiGameDetail) => void;
    const reorder = vi.fn().mockImplementation(
      () =>
        new Promise<ApiGameDetail>((resolve) => {
          finish = resolve;
        }),
    );
    provideGameApi({ expenses: { reorder } } as unknown as GameApiPort);
    const current = mount(() => useReorderExpenses("game"));
    let pending!: Promise<ApiGameDetail>;
    await act(async () => {
      pending = current().mutateAsync(["expense-b", "missing", "expense-a"]);
      await vi.waitFor(() => expect(reorder).toHaveBeenCalled());
    });
    expect(
      (
        client.getQueryData(gameKeys.detail("game")) as ApiGameDetail
      ).expenses.map((row) => row.id),
    ).toEqual(["expense-b", "expense-a"]);
    finish(detail("Server"));
    await act(async () => pending);
    expect(
      (client.getQueryData(gameKeys.detail("game")) as ApiGameDetail).name,
    ).toBe("Server");
  });

  it("phục hồi tên cũ khi đổi tên thất bại", async () => {
    client.setQueryData(gameKeys.detail("game"), detail("Tên cũ"));
    provideGameApi({
      games: { update: vi.fn().mockRejectedValue(new Error("offline")) },
    } as unknown as GameApiPort);
    const current = mount(() => useRenameGame("game"));
    await act(async () => {
      await expect(current().mutateAsync("Tên mới")).rejects.toThrow("offline");
    });
    expect(
      (client.getQueryData(gameKeys.detail("game")) as ApiGameDetail).name,
    ).toBe("Tên cũ");
  });

  it("sắp lại người chơi trong cache", async () => {
    client.setQueryData(gameKeys.detail("game"), detail("Kèo"));
    const reorder = vi.fn().mockResolvedValue(detail("Kèo"));
    provideGameApi({ participants: { reorder } } as unknown as GameApiPort);
    const current = mount(() => useReorderParticipants("game"));
    await act(async () => {
      await current().mutateAsync(["person-b", "person-a"]);
    });
    expect(reorder).toHaveBeenCalledWith("game", ["person-b", "person-a"]);
    expect(
      (client.getQueryData(gameKeys.detail("game")) as ApiGameDetail).id,
    ).toBe("game");
  });

  it("tạo và nhân bản kèo, lưu detail và làm mới danh sách", async () => {
    const created = detail("Mới");
    const create = vi.fn().mockResolvedValue(created);
    const duplicate = vi.fn().mockResolvedValue({ ...created, id: "copy" });
    provideGameApi({ games: { create, duplicate } } as unknown as GameApiPort);
    client.setQueryData(gameKeys.all, []);
    const createCurrent = mount(useCreateGame);
    await act(async () => {
      await createCurrent().mutateAsync({ name: "Mới" });
    });
    expect(create).toHaveBeenCalledWith({ name: "Mới" });
    expect(client.getQueryData(gameKeys.detail("game"))).toEqual(created);
    expect(client.getQueryState(gameKeys.all)?.isInvalidated).toBe(true);
    const duplicateCurrent = mount(useDuplicateGame);
    await act(async () => {
      await duplicateCurrent().mutateAsync("game");
    });
    expect(duplicate).toHaveBeenCalledWith("game");
    expect(
      (client.getQueryData(gameKeys.detail("copy")) as ApiGameDetail).id,
    ).toBe("copy");
  });

  it("xóa mềm, khôi phục và xóa hẳn cập nhật cache đúng phạm vi", async () => {
    const remove = vi.fn().mockResolvedValue({ ok: true });
    const restore = vi.fn().mockResolvedValue(detail("Khôi phục"));
    const purge = vi.fn().mockResolvedValue({ ok: true });
    provideGameApi({
      games: { remove, restore, purge },
    } as unknown as GameApiPort);
    client.setQueryData(gameKeys.all, []);
    client.setQueryData(trashKeys.all, []);
    const deleteCurrent = mount(useDeleteGame);
    await act(async () => {
      await deleteCurrent().mutateAsync("game");
    });
    expect(remove).toHaveBeenCalledWith("game");
    expect(client.getQueryState(gameKeys.all)?.isInvalidated).toBe(true);
    expect(client.getQueryState(trashKeys.all)?.isInvalidated).toBe(true);
    const restoreCurrent = mount(useRestoreGame);
    await act(async () => {
      await restoreCurrent().mutateAsync("game");
    });
    expect(restore).toHaveBeenCalledWith("game");
    expect(client.getQueryData(gameKeys.detail("game"))).toEqual(
      detail("Khôi phục"),
    );
    const purgeCurrent = mount(usePurgeGame);
    await act(async () => {
      await purgeCurrent().mutateAsync("game");
    });
    expect(purge).toHaveBeenCalledWith("game");
  });

  it("ghi thẳng danh bạ trả về vào cache khi thêm, sửa, xóa", async () => {
    const contacts = [{ id: "contact" }];
    const create = vi.fn().mockResolvedValue({ contacts });
    const update = vi
      .fn()
      .mockResolvedValue({ contacts: [{ id: "contact", name: "Mới" }] });
    const remove = vi.fn().mockResolvedValue({ contacts: [] });
    provideGameApi({
      contacts: { create, update, remove },
    } as unknown as GameApiPort);
    const createCurrent = mount(useCreateContact);
    await act(async () => {
      await createCurrent().mutateAsync({
        name: "An",
        bankId: "",
        accountNo: "",
        accountName: "",
      });
    });
    expect(client.getQueryData(contactKeys.all)).toEqual({ contacts });
    const updateCurrent = mount(useUpdateContact);
    await act(async () => {
      await updateCurrent().mutateAsync({
        contactId: "contact",
        input: { name: "Mới" },
      });
    });
    expect(update).toHaveBeenCalledWith("contact", { name: "Mới" });
    expect(client.getQueryData(contactKeys.all)).toEqual({
      contacts: [{ id: "contact", name: "Mới" }],
    });
    const deleteCurrent = mount(useDeleteContact);
    await act(async () => {
      await deleteCurrent().mutateAsync("contact");
    });
    expect(remove).toHaveBeenCalledWith("contact");
    expect(client.getQueryData(contactKeys.all)).toEqual({ contacts: [] });
  });

  it("làm mới danh sách MCP token sau tạo và thu hồi", async () => {
    const create = vi.fn().mockResolvedValue({ id: "token" });
    const revoke = vi.fn().mockResolvedValue({ ok: true });
    provideGameApi({ mcpTokens: { create, revoke } } as unknown as GameApiPort);
    client.setQueryData(mcpTokenKeys.all, []);
    const createCurrent = mount(useCreateMcpToken);
    await act(async () => {
      await createCurrent().mutateAsync({ name: "CI", scopes: [] } as never);
    });
    expect(create).toHaveBeenCalled();
    expect(client.getQueryState(mcpTokenKeys.all)?.isInvalidated).toBe(true);
    const revokeCurrent = mount(useRevokeMcpToken);
    await act(async () => {
      await revokeCurrent().mutateAsync("token");
    });
    expect(revoke).toHaveBeenCalledWith("token");
  });

  it("gọi các thao tác game và người chơi qua port, cập nhật detail", async () => {
    const response = detail("Đã cập nhật");
    const games = {
      close: vi.fn().mockResolvedValue(response),
      reopen: vi.fn().mockResolvedValue(response),
      update: vi.fn().mockResolvedValue(response),
    };
    const participants = {
      createMany: vi.fn().mockResolvedValue(response),
      remove: vi.fn().mockResolvedValue(response),
      update: vi.fn().mockResolvedValue(response),
    };
    const expenses = {
      create: vi.fn().mockResolvedValue(response),
      update: vi.fn().mockResolvedValue(response),
    };
    const transfers = { create: vi.fn().mockResolvedValue(response) };
    const gameEvents = { undo: vi.fn().mockResolvedValue(response) };
    provideGameApi({
      games,
      participants,
      expenses,
      transfers,
      gameEvents,
    } as unknown as GameApiPort);
    await execute(useCloseGame, "game");
    await execute(useReopenGame, "game");
    await execute(() => useAddParticipants("game"), {} as never);
    await execute(useRemoveParticipant, "person-a");
    await execute(useUpdateParticipant, {
      participantId: "person-a",
      input: { name: "An" },
    });
    await execute(() => useAddExpense("game"), {} as never);
    await execute(useUpdateExpense, {
      expenseId: "expense-a",
      input: { title: "Sân" },
    });
    await execute(() => useAddTransfer("game"), {} as never);
    await execute(() => useSetSettlementMode("game"), "p2p");
    await execute(() => useSetSettlementHost("game"), "person-a");
    await execute(useUndoGameEvent, "event-a");
    expect(games.close).toHaveBeenCalledWith("game");
    expect(games.reopen).toHaveBeenCalledWith("game");
    expect(games.update).toHaveBeenCalledWith("game", {
      settlementMode: "p2p",
    });
    expect(games.update).toHaveBeenCalledWith("game", {
      settlementHostId: "person-a",
    });
    expect(participants.update).toHaveBeenCalledWith("person-a", {
      name: "An",
    });
    expect(expenses.update).toHaveBeenCalledWith("expense-a", { title: "Sân" });
    expect(gameEvents.undo).toHaveBeenCalledWith("event-a");
    expect(client.getQueryData(gameKeys.detail("game"))).toEqual(response);
  });

  it("gọi AI và thao tác chia sẻ qua port", async () => {
    const response = detail("Đã chia sẻ");
    const ai = {
      suggestExpense: vi
        .fn()
        .mockResolvedValue({ suggestion: { title: "Sân" } }),
      scanReceipt: vi.fn().mockResolvedValue({ suggestion: { title: "Cầu" } }),
    };
    const shareLinks = {
      rotate: vi.fn().mockResolvedValue(response),
      setEnabled: vi.fn().mockResolvedValue(response),
    };
    const collaborators = {
      add: vi.fn().mockResolvedValue(response),
      remove: vi.fn().mockResolvedValue(response),
      removePending: vi.fn().mockResolvedValue(response),
    };
    provideGameApi({ ai, shareLinks, collaborators } as unknown as GameApiPort);
    await execute(() => useAiSuggestExpense("game"), "An trả tiền sân");
    await execute(() => useAiScanReceipt("game"), {
      mimeType: "image/png",
      data: "base64",
    });
    await execute(() => useRotateShareLink("game"), undefined);
    await execute(() => useSetShareLinkEnabled("game"), false);
    await execute(() => useAddCollaborator("game"), "friend@example.test");
    await execute(() => useRemoveCollaborator("game"), "friend");
    await execute(
      () => useRemovePendingCollaborator("game"),
      "pending@example.test",
    );
    expect(ai.suggestExpense).toHaveBeenCalledWith("game", "An trả tiền sân");
    expect(ai.scanReceipt).toHaveBeenCalledWith("game", {
      mimeType: "image/png",
      data: "base64",
    });
    expect(shareLinks.rotate).toHaveBeenCalledWith("game");
    expect(shareLinks.setEnabled).toHaveBeenCalledWith("game", false);
    expect(collaborators.add).toHaveBeenCalledWith(
      "game",
      "friend@example.test",
    );
    expect(collaborators.remove).toHaveBeenCalledWith("game", "friend");
    expect(collaborators.removePending).toHaveBeenCalledWith(
      "game",
      "pending@example.test",
    );
  });

  it("đổi tên khi chưa có detail và xử lý lỗi không có cache cũ", async () => {
    const update = vi
      .fn()
      .mockResolvedValueOnce(detail("Server"))
      .mockRejectedValueOnce(new Error("offline"));
    provideGameApi({ games: { update } } as unknown as GameApiPort);
    await execute(() => useRenameGame("game"), "Tên mới");
    client.removeQueries({ queryKey: gameKeys.detail("game") });
    const current = mount(() => useRenameGame("game"));
    await act(async () => {
      await expect(current().mutateAsync("Tên khác")).rejects.toThrow(
        "offline",
      );
    });
    expect(update).toHaveBeenCalledTimes(2);
    expect(client.getQueryData(gameKeys.detail("game"))).toBeUndefined();
  });

  it("đổi trạng thái link chia sẻ ngay khi detail có link", async () => {
    client.setQueryData(gameKeys.detail("game"), {
      ...detail("Kèo"),
      shareLink: { token: "share", enabled: true },
    });
    let finish!: (value: ApiGameDetail) => void;
    const setEnabled = vi.fn().mockImplementation(
      () =>
        new Promise<ApiGameDetail>((resolve) => {
          finish = resolve;
        }),
    );
    provideGameApi({ shareLinks: { setEnabled } } as unknown as GameApiPort);
    const current = mount(() => useSetShareLinkEnabled("game"));
    let pending!: Promise<ApiGameDetail>;
    await act(async () => {
      pending = current().mutateAsync(false);
      await vi.waitFor(() => expect(setEnabled).toHaveBeenCalled());
    });
    expect(
      (client.getQueryData(gameKeys.detail("game")) as ApiGameDetail).shareLink
        ?.enabled,
    ).toBe(false);
    finish({ ...detail("Kèo"), shareLink: { token: "share", enabled: false } });
    await act(async () => pending);
  });
});

describe("undoable expense removal", () => {
  const removed = (overrides: Partial<ApiGameEvent> = {}): ApiGameEvent => ({
    id: "event",
    createdAt: "2026-01-01T00:00:00.000Z",
    undoneAt: null,
    payload: {
      kind: "expense_removed",
      title: "Sân",
      amount: 100_000,
      payerName: "An",
      restore: {
        payerParticipantId: "an",
        kind: "expense",
        title: "Sân",
        amount: 100_000,
        note: "",
        splitMode: "equal",
        splits: [],
      },
    },
    ...overrides,
  });

  it("chỉ nhận sự kiện xóa mới nhất, còn hoàn tác được, khớp tên và số tiền", async () => {
    const list = vi.fn();
    provideGameApi({ gameEvents: { list } } as unknown as GameApiPort);
    const match = { title: "Sân", amount: 100_000 };
    for (const events of [
      [],
      [removed({ undoneAt: "2026-01-02T00:00:00.000Z" })],
      [removed({ payload: { kind: "game_created", name: "Kèo" } })],
      [
        removed({
          payload: {
            ...removed().payload,
            restore: null,
          } as ApiGameEvent["payload"],
        }),
      ],
      [
        removed({
          payload: {
            ...removed().payload,
            title: "Cầu",
          } as ApiGameEvent["payload"],
        }),
      ],
      [
        removed({
          payload: {
            ...removed().payload,
            amount: 50_000,
          } as ApiGameEvent["payload"],
        }),
      ],
    ]) {
      list.mockResolvedValueOnce({ events });
      expect(await findUndoableExpenseRemoval("game", match)).toBeNull();
    }
    list.mockResolvedValueOnce({ events: [removed()] });
    expect(await findUndoableExpenseRemoval("game", match)).toBe("event");
    expect(list).toHaveBeenCalledWith("game");
  });
});

function mount<T>(hook: () => T) {
  let current!: T;
  function Probe() {
    current = hook();
    return null;
  }
  act(() =>
    root.render(
      createElement(QueryClientProvider, { client }, createElement(Probe)),
    ),
  );
  return () => current;
}

async function execute<TVariables>(
  hook: () => { mutateAsync: (variables: TVariables) => Promise<unknown> },
  variables: TVariables,
) {
  const current = mount(hook);
  await act(async () => {
    await current().mutateAsync(variables);
  });
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

describe("React Query reads", () => {
  it("đọc các dữ liệu đang mở và áp dụng select cho danh bạ, lịch sử", async () => {
    const methods = {
      games: {
        list: vi.fn().mockResolvedValue([{ id: "game" }]),
        detail: vi.fn().mockResolvedValue({ id: "game" }),
        trash: vi.fn().mockResolvedValue([{ id: "deleted" }]),
        listClosed: vi.fn().mockResolvedValue([{ id: "closed" }]),
      },
      share: {
        view: vi.fn().mockResolvedValue({ id: "share" }),
        photos: vi.fn().mockResolvedValue([photo("shared")]),
        photo: vi.fn().mockResolvedValue({ ...photo("shared"), data: "full" }),
      },
      contacts: {
        list: vi.fn().mockResolvedValue({ contacts: [{ id: "contact" }] }),
      },
      gameEvents: {
        list: vi.fn().mockResolvedValue({ events: [{ id: "event" }] }),
      },
      photos: {
        list: vi.fn().mockResolvedValue([photo("owned")]),
        detail: vi.fn().mockResolvedValue({ ...photo("owned"), data: "full" }),
      },
      mcpTokens: { list: vi.fn().mockResolvedValue([{ id: "token" }]) },
      collaborators: {
        listCandidates: vi.fn().mockResolvedValue([{ id: "candidate" }]),
      },
    };
    provideGameApi(methods as unknown as GameApiPort);
    const current = mount(() => ({
      games: useGames(),
      game: useGame("game"),
      shared: useShareView("share-token"),
      contacts: useContacts(),
      events: useGameEvents("game", true),
      trash: useTrashedGames(true),
      closed: useClosedGames(true),
      photos: usePhotos("game"),
      photo: usePhoto("owned"),
      sharedPhotos: useSharePhotos("share-token"),
      sharedPhoto: useSharePhoto("share-token", "shared"),
      tokens: useMcpTokens(),
      candidates: useShareCandidates("game", true),
    }));
    await vi.waitFor(() =>
      expect(current().candidates.data).toEqual([{ id: "candidate" }]),
    );
    expect(current().games.data).toEqual([{ id: "game" }]);
    expect(current().game.data).toEqual({ id: "game" });
    expect(current().shared.data).toEqual({ id: "share" });
    expect(current().contacts.data).toEqual([{ id: "contact" }]);
    expect(current().events.data).toEqual([{ id: "event" }]);
    expect(current().trash.data).toEqual([{ id: "deleted" }]);
    expect(current().closed.data).toEqual([{ id: "closed" }]);
    expect(current().photos.data).toEqual([photo("owned")]);
    expect(current().photo.data?.data).toBe("full");
    expect(current().sharedPhotos.data).toEqual([photo("shared")]);
    expect(current().sharedPhoto.data?.data).toBe("full");
    expect(current().tokens.data).toEqual([{ id: "token" }]);
    expect(methods.gameEvents.list).toHaveBeenCalledWith("game");
    expect(methods.collaborators.listCandidates).toHaveBeenCalledWith("game");
  });

  it("không tải các panel đóng và ảnh chưa chọn", () => {
    const methods = {
      gameEvents: { list: vi.fn() },
      games: { trash: vi.fn(), listClosed: vi.fn() },
      photos: { detail: vi.fn() },
      share: { photo: vi.fn() },
      collaborators: { listCandidates: vi.fn() },
    };
    provideGameApi(methods as unknown as GameApiPort);
    mount(() => ({
      events: useGameEvents("game", false),
      trash: useTrashedGames(false),
      closed: useClosedGames(false),
      photo: usePhoto(""),
      sharedPhoto: useSharePhoto("token", ""),
      candidates: useShareCandidates("game", false),
    }));
    expect(methods.gameEvents.list).not.toHaveBeenCalled();
    expect(methods.games.trash).not.toHaveBeenCalled();
    expect(methods.games.listClosed).not.toHaveBeenCalled();
    expect(methods.photos.detail).not.toHaveBeenCalled();
    expect(methods.share.photo).not.toHaveBeenCalled();
    expect(methods.collaborators.listCandidates).not.toHaveBeenCalled();
  });
});

afterEach(() => {
  act(() => root.unmount());
  client.clear();
  host.remove();
});

describe("React Query preferences", () => {
  it("dùng mặc định trước khi API trả lời rồi dùng cache server", async () => {
    provideGameApi({
      preferences: { get: () => new Promise(() => {}) },
    } as unknown as GameApiPort);
    const current = mount(usePreferences);
    expect(current()).toEqual(DEFAULT_USER_PREFERENCES);
    const preferences = { ...DEFAULT_USER_PREFERENCES, summaryShowQr: false };
    await act(async () => {
      client.setQueryData(preferenceKeys.all, { preferences });
    });
    await vi.waitFor(() => expect(current()).toEqual(preferences));
  });

  it("ghi kết quả thành công vào cache", async () => {
    const preferences = { ...DEFAULT_USER_PREFERENCES };
    const update = vi.fn().mockResolvedValue({ preferences });
    provideGameApi({ preferences: { update } } as unknown as GameApiPort);
    const current = mount(useUpdatePreferences);
    await act(async () => {
      await current().mutateAsync({});
    });
    expect(update).toHaveBeenCalledWith({});
    expect(client.getQueryData(preferenceKeys.all)).toEqual({ preferences });
  });

  it("phục hồi cache cũ khi cập nhật thất bại", async () => {
    const previous = { preferences: { ...DEFAULT_USER_PREFERENCES } };
    client.setQueryData(preferenceKeys.all, previous);
    provideGameApi({
      preferences: { update: vi.fn().mockRejectedValue(new Error("offline")) },
    } as unknown as GameApiPort);
    const current = mount(useUpdatePreferences);
    await act(async () => {
      await expect(current().mutateAsync({})).rejects.toThrow("offline");
    });
    expect(client.getQueryData(preferenceKeys.all)).toEqual(previous);
  });

  it("trở về mặc định khi cập nhật lỗi trước lần tải đầu", async () => {
    provideGameApi({
      preferences: { update: vi.fn().mockRejectedValue(new Error("offline")) },
    } as unknown as GameApiPort);
    const current = mount(useUpdatePreferences);
    await act(async () => {
      await expect(
        current().mutateAsync({ summaryShowQr: false }),
      ).rejects.toThrow("offline");
    });
    expect(client.getQueryData(preferenceKeys.all)).toEqual({
      preferences: DEFAULT_USER_PREFERENCES,
    });
  });
});

describe("React Query photo cache", () => {
  it("thêm ảnh vào cache trống sau khi API trả lời", async () => {
    const create = vi.fn().mockResolvedValue(photo("new"));
    provideGameApi({ photos: { create } } as unknown as GameApiPort);
    const current = mount(() => useAddPhoto("game"));
    await act(async () => {
      await current().mutateAsync({} as never);
    });
    expect(create).toHaveBeenCalledWith("game", {});
    expect(client.getQueryData(photoKeys.list("game"))).toEqual([photo("new")]);
  });

  it("thay ảnh đúng id và giữ ảnh còn lại", async () => {
    client.setQueryData(photoKeys.list("game"), [
      photo("first"),
      photo("second"),
    ]);
    const changed = { ...photo("second"), caption: "Đã sửa" };
    const update = vi.fn().mockResolvedValue(changed);
    provideGameApi({ photos: { update } } as unknown as GameApiPort);
    const current = mount(() => useUpdatePhoto("game"));
    await act(async () => {
      await current().mutateAsync({
        photoId: "second",
        input: { caption: "Đã sửa" },
      });
    });
    expect(update).toHaveBeenCalledWith("second", { caption: "Đã sửa" });
    expect(client.getQueryData(photoKeys.list("game"))).toEqual([
      photo("first"),
      changed,
    ]);
  });

  it("xóa ảnh khỏi cache sau khi API xác nhận", async () => {
    client.setQueryData(photoKeys.list("game"), [
      photo("first"),
      photo("second"),
    ]);
    const remove = vi.fn().mockResolvedValue({ ok: true });
    provideGameApi({ photos: { remove } } as unknown as GameApiPort);
    const current = mount(() => useRemovePhoto("game"));
    await act(async () => {
      await current().mutateAsync("first");
    });
    expect(remove).toHaveBeenCalledWith("first");
    expect(client.getQueryData(photoKeys.list("game"))).toEqual([
      photo("second"),
    ]);
  });
});
