import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { ApiGameEvent } from "../../../shared/game-events";
import {
  AN,
  BINH,
  createFakeGameApi,
  createWrapper,
  GAME_ID,
  makeDetail,
} from "../../test/fake-game-api";
import {
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

let api: ReturnType<typeof createFakeGameApi>;

/**
 * Giu mot loi goi API "dang cho" de kiem tra trang thai truoc khi server tra
 * loi (cap nhat lac quan), roi tra ket qua khi da assert xong.
 */
function pending<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve: (value: T) => resolve(value) };
}

beforeEach(() => {
  api = createFakeGameApi();
});

describe("khoa cache", () => {
  it("moi nhom du lieu mot khoa rieng de khong lam moi thua", () => {
    expect(gameKeys.detail(GAME_ID)).toEqual(["games", GAME_ID]);
    expect(photoKeys.list(GAME_ID)).toEqual(["photos", GAME_ID]);
    expect(photoKeys.shareDetail("tok", "photo_1")).toEqual(["share-photo", "tok", "photo_1"]);
    expect(eventKeys.list(GAME_ID)).toEqual(["events", GAME_ID]);
    expect(contactKeys.all).toEqual(["contacts"]);
    expect(trashKeys.all).toEqual(["games-trash"]);
    expect(preferenceKeys.all).toEqual(["preferences"]);
    expect(mcpTokenKeys.all).toEqual(["mcp-tokens"]);
  });
});

describe("cac query doc du lieu", () => {
  it("useGames tai danh sach", async () => {
    const { wrapper } = createWrapper();
    const hook = renderHook(() => useGames(), { wrapper });

    await waitFor(() => expect(hook.result.current.data).toHaveLength(1));
  });

  it("useGame tai chi tiet", async () => {
    const { wrapper } = createWrapper();
    const hook = renderHook(() => useGame(GAME_ID), { wrapper });

    await waitFor(() => expect(hook.result.current.data?.name).toBe("Cầu lông"));
  });

  it("useShareView tai ban xem qua link", async () => {
    const { wrapper } = createWrapper();
    const hook = renderHook(() => useShareView("abcd"), { wrapper });

    await waitFor(() => expect(hook.result.current.data?.code).toBe("DSKVUF"));
  });

  it("useContacts tra thang mang contacts", async () => {
    api.contacts.list.mockResolvedValueOnce({ contacts: [{ name: "Hồng" }] } as never);
    const { wrapper } = createWrapper();

    const hook = renderHook(() => useContacts(), { wrapper });

    await waitFor(() => expect(hook.result.current.data).toEqual([{ name: "Hồng" }]));
  });

  it("useGameEvents chi tai khi tab lich su dang mo", async () => {
    const { wrapper } = createWrapper();

    renderHook(() => useGameEvents(GAME_ID, false), { wrapper });
    expect(api.gameEvents.list).not.toHaveBeenCalled();

    const hook = renderHook(() => useGameEvents(GAME_ID, true), { wrapper });
    await waitFor(() => expect(hook.result.current.data).toBeTruthy());
  });

  it("useTrashedGames chi tai khi the thung rac dang mo", async () => {
    const { wrapper } = createWrapper();

    renderHook(() => useTrashedGames(false), { wrapper });
    expect(api.games.trash).not.toHaveBeenCalled();

    renderHook(() => useTrashedGames(true), { wrapper });
    await waitFor(() => expect(api.games.trash).toHaveBeenCalled());
  });

  it("useShareCandidates chi tai khi panel chia se mo", async () => {
    const { wrapper } = createWrapper();

    renderHook(() => useShareCandidates(GAME_ID, false), { wrapper });
    expect(api.collaborators.listCandidates).not.toHaveBeenCalled();

    renderHook(() => useShareCandidates(GAME_ID, true), { wrapper });
    await waitFor(() => expect(api.collaborators.listCandidates).toHaveBeenCalled());
  });

  it("usePhotos, usePhoto va cac query anh qua link share", async () => {
    const { wrapper } = createWrapper();

    const photos = renderHook(() => usePhotos(GAME_ID), { wrapper });
    await waitFor(() => expect(photos.result.current.data).toHaveLength(1));

    const photo = renderHook(() => usePhoto("photo_1"), { wrapper });
    await waitFor(() => expect(photo.result.current.data?.data).toBeTruthy());

    const shared = renderHook(() => useSharePhotos("abcd"), { wrapper });
    await waitFor(() => expect(shared.result.current.data).toHaveLength(1));

    const sharedOne = renderHook(() => useSharePhoto("abcd", "photo_1"), { wrapper });
    await waitFor(() => expect(sharedOne.result.current.data?.data).toBeTruthy());
  });

  it("usePhoto khong tai khi chua chon anh nao", () => {
    const { wrapper } = createWrapper();

    renderHook(() => usePhoto(""), { wrapper });

    expect(api.photos.detail).not.toHaveBeenCalled();
  });

  it("useMcpTokens tai danh sach token", async () => {
    const { wrapper } = createWrapper();
    const hook = renderHook(() => useMcpTokens(), { wrapper });

    await waitFor(() => expect(hook.result.current.data).toBeTruthy());
  });
});

describe("usePreferences", () => {
  it("chua tai xong thi dung mac dinh, khong de man hinh trong", () => {
    const { wrapper } = createWrapper();

    const hook = renderHook(() => usePreferences(), { wrapper });

    expect(hook.result.current).toEqual({ summaryShowQr: true, summaryShowAvatar: true });
  });

  it("cong tac lat ngay theo tay nguoi dung (cap nhat lac quan)", async () => {
    const { wrapper } = createWrapper();
    const hook = renderHook(
      () => ({ preferences: usePreferences(), update: useUpdatePreferences() }),
      { wrapper },
    );
    await waitFor(() => expect(api.preferences.get).toHaveBeenCalled());

    // Giu server "dang tra loi" de thay dung khoanh khac truoc khi co ket qua.
    const call = pending<{ preferences: { summaryShowQr: boolean; summaryShowAvatar: boolean } }>();
    api.preferences.update.mockImplementationOnce(() => call.promise);

    act(() => {
      void hook.result.current.update.mutateAsync({ summaryShowQr: false });
    });

    await waitFor(() => expect(hook.result.current.preferences.summaryShowQr).toBe(false));

    await act(async () => {
      call.resolve({ preferences: { summaryShowQr: false, summaryShowAvatar: true } });
    });
  });

  it("loi thi tra lai gia tri cu", async () => {
    api.preferences.update.mockRejectedValueOnce(new Error("mat mang"));
    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(preferenceKeys.all, {
      preferences: { summaryShowQr: true, summaryShowAvatar: true },
    });
    const hook = renderHook(
      () => ({ preferences: usePreferences(), update: useUpdatePreferences() }),
      { wrapper },
    );

    await act(async () => {
      await hook.result.current.update.mutateAsync({ summaryShowQr: false }).catch(() => {});
    });

    expect(hook.result.current.preferences.summaryShowQr).toBe(true);
  });
});

describe("mutation danh ba ghi thang vao cache", () => {
  it("them moi khong can goi lai danh sach", async () => {
    const { wrapper, queryClient } = createWrapper();
    const hook = renderHook(() => useCreateContact(), { wrapper });

    await act(async () => {
      await hook.result.current.mutateAsync({
        name: "Hồng",
        bankId: "",
        accountNo: "",
        accountName: "",
      });
    });

    expect(queryClient.getQueryData(contactKeys.all)).toEqual({ contacts: [{ name: "Hồng" }] });
    expect(api.contacts.list).not.toHaveBeenCalled();
  });

  it("sua va xoa cung ghi thang vao cache", async () => {
    const { wrapper, queryClient } = createWrapper();
    const update = renderHook(() => useUpdateContact(), { wrapper });
    const remove = renderHook(() => useDeleteContact(), { wrapper });

    await act(async () => {
      await update.result.current.mutateAsync({ contactId: "contact_1", input: { name: "Lan" } });
    });
    expect(queryClient.getQueryData(contactKeys.all)).toEqual({ contacts: [{ name: "Lan" }] });

    await act(async () => {
      await remove.result.current.mutateAsync("contact_1");
    });
    expect(queryClient.getQueryData(contactKeys.all)).toEqual({ contacts: [] });
  });
});

describe("mutation tra ve chi tiet cuoc chia", () => {
  it("ghi chi tiet moi vao cache sau khi thanh cong", async () => {
    const { wrapper, queryClient } = createWrapper();
    const hook = renderHook(() => useAddExpense(GAME_ID), { wrapper });

    await act(async () => {
      await hook.result.current.mutateAsync({
        kind: "expense",
        title: "Nước",
        amount: 90_000,
        note: "",
        payerParticipantId: AN,
        splitMode: "equal",
        splitParticipantIds: [AN, BINH],
        splits: [],
      });
    });

    expect(queryClient.getQueryData(gameKeys.detail(GAME_ID))).toMatchObject({ id: GAME_ID });
  });

  it("sap lai thu tu hien ngay truoc khi server tra loi", async () => {
    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(
      gameKeys.detail(GAME_ID),
      makeDetail({
        expenses: [
          { id: "e1", title: "A" },
          { id: "e2", title: "B" },
        ] as never,
      }),
    );
    const call = pending<ReturnType<typeof makeDetail>>();
    api.expenses.reorder.mockImplementationOnce(() => call.promise);
    const hook = renderHook(() => useReorderExpenses(GAME_ID), { wrapper });

    act(() => {
      void hook.result.current.mutateAsync(["e2", "e1"]);
    });

    await waitFor(() => {
      const detail = queryClient.getQueryData(gameKeys.detail(GAME_ID)) as { expenses: { id: string }[] };
      expect(detail.expenses.map((row) => row.id)).toEqual(["e2", "e1"]);
    });

    await act(async () => {
      call.resolve(makeDetail());
    });
  });

  it("sap lai that bai thi tra ve thu tu cu", async () => {
    api.participants.reorder.mockRejectedValueOnce(new Error("mat mang"));
    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(gameKeys.detail(GAME_ID), makeDetail());
    const hook = renderHook(() => useReorderParticipants(GAME_ID), { wrapper });

    await act(async () => {
      await hook.result.current.mutateAsync([BINH, AN]).catch(() => {});
    });

    const detail = queryClient.getQueryData(gameKeys.detail(GAME_ID)) as {
      participants: { id: string }[];
    };
    expect(detail.participants.map((row) => row.id)).toEqual([AN, BINH]);
  });

  it("doi ten hien ngay roi moi cho server", async () => {
    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(gameKeys.detail(GAME_ID), makeDetail());
    const call = pending<ReturnType<typeof makeDetail>>();
    api.games.update.mockImplementationOnce(() => call.promise);
    const hook = renderHook(() => useRenameGame(GAME_ID), { wrapper });

    act(() => {
      void hook.result.current.mutateAsync("Tên mới");
    });

    await waitFor(() =>
      expect((queryClient.getQueryData(gameKeys.detail(GAME_ID)) as { name: string }).name).toBe(
        "Tên mới",
      ),
    );

    await act(async () => {
      call.resolve(makeDetail());
    });
  });

  it("tat link share hien ngay tren cong tac", async () => {
    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(
      gameKeys.detail(GAME_ID),
      makeDetail({ shareLink: { token: "abcd", enabled: true } }),
    );
    const call = pending<ReturnType<typeof makeDetail>>();
    api.shareLinks.setEnabled.mockImplementationOnce(() => call.promise);
    const hook = renderHook(() => useSetShareLinkEnabled(GAME_ID), { wrapper });

    act(() => {
      void hook.result.current.mutateAsync(false);
    });

    await waitFor(() => {
      const detail = queryClient.getQueryData(gameKeys.detail(GAME_ID)) as {
        shareLink: { enabled: boolean };
      };
      expect(detail.shareLink.enabled).toBe(false);
    });

    await act(async () => {
      call.resolve(makeDetail());
    });
  });

  it("cuoc chia chua co link thi khong co gi de cap nhat lac quan", async () => {
    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(gameKeys.detail(GAME_ID), makeDetail({ shareLink: null }));
    const hook = renderHook(() => useSetShareLinkEnabled(GAME_ID), { wrapper });

    await act(async () => {
      await hook.result.current.mutateAsync(true);
    });

    expect(api.shareLinks.setEnabled).toHaveBeenCalledWith(GAME_ID, true);
  });
});

describe("cac mutation con lai deu goi dung port", () => {
  const cases: [string, () => { mutateAsync: (input: never) => Promise<unknown> }, unknown, () => unknown][] = [
    ["useCreateGame", () => useCreateGame(), { name: "X" }, () => api.games.create],
    ["useDuplicateGame", () => useDuplicateGame(), GAME_ID, () => api.games.duplicate],
    ["useDeleteGame", () => useDeleteGame(), GAME_ID, () => api.games.remove],
    ["useRestoreGame", () => useRestoreGame(), GAME_ID, () => api.games.restore],
    ["usePurgeGame", () => usePurgeGame(), GAME_ID, () => api.games.purge],
    ["useUndoGameEvent", () => useUndoGameEvent(), "event_1", () => api.gameEvents.undo],
    [
      "useAddParticipant",
      () => useAddParticipant(GAME_ID),
      { name: "Cường", bankId: "", accountNo: "", accountName: "" },
      () => api.participants.create,
    ],
    [
      "useAddParticipants",
      () => useAddParticipants(GAME_ID),
      { people: [{ name: "Cường" }] },
      () => api.participants.createMany,
    ],
    ["useRemoveParticipant", () => useRemoveParticipant(), AN, () => api.participants.remove],
    [
      "useUpdateParticipant",
      () => useUpdateParticipant(),
      { participantId: AN, input: { name: "An" } },
      () => api.participants.update,
    ],
    [
      "useUpdateExpense",
      () => useUpdateExpense(),
      { expenseId: "expense_1", input: { amount: 1 } },
      () => api.expenses.update,
    ],
    ["useRemoveExpense", () => useRemoveExpense(), "expense_1", () => api.expenses.remove],
    [
      "useAddTransfer",
      () => useAddTransfer(GAME_ID),
      { fromParticipantId: AN, toParticipantId: BINH, amount: 1_000, note: "" },
      () => api.transfers.create,
    ],
    ["useSetSettlementMode", () => useSetSettlementMode(GAME_ID), "pick", () => api.games.update],
    ["useSetSettlementHost", () => useSetSettlementHost(GAME_ID), AN, () => api.games.update],
    ["useRotateShareLink", () => useRotateShareLink(GAME_ID), undefined, () => api.shareLinks.rotate],
    [
      "useAddCollaborator",
      () => useAddCollaborator(GAME_ID),
      "ban@example.com",
      () => api.collaborators.add,
    ],
    [
      "useRemoveCollaborator",
      () => useRemoveCollaborator(GAME_ID),
      "user_ban",
      () => api.collaborators.remove,
    ],
    [
      "useRemovePendingCollaborator",
      () => useRemovePendingCollaborator(GAME_ID),
      "moi@example.com",
      () => api.collaborators.removePending,
    ],
    [
      "useAiSuggestExpense",
      () => useAiSuggestExpense(GAME_ID),
      "an ứng 90k",
      () => api.ai.suggestExpense,
    ],
    [
      "useAiScanReceipt",
      () => useAiScanReceipt(GAME_ID),
      { mimeType: "image/webp", data: "AAAA" },
      () => api.ai.scanReceipt,
    ],
    [
      "useCreateMcpToken",
      () => useCreateMcpToken(),
      { name: "token", scopes: ["games:read"] },
      () => api.mcpTokens.create,
    ],
    ["useRevokeMcpToken", () => useRevokeMcpToken(), "token_1", () => api.mcpTokens.revoke],
  ];

  for (const [name, useHook, input, getSpy] of cases) {
    it(name, async () => {
      const { wrapper } = createWrapper();
      const hook = renderHook(useHook, { wrapper });

      await act(async () => {
        await hook.result.current.mutateAsync(input as never);
      });

      expect(getSpy()).toHaveBeenCalled();
    });
  }
});

describe("cache luoi anh", () => {
  it("them anh thi chen len dau danh sach", async () => {
    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(photoKeys.list(GAME_ID), []);
    const hook = renderHook(() => useAddPhoto(GAME_ID), { wrapper });

    await act(async () => {
      await hook.result.current.mutateAsync({
        mimeType: "image/webp",
        data: "AAAA",
        thumbData: "AAAA",
        width: 10,
        height: 10,
        caption: "",
        expenseId: null,
      });
    });

    const photos = queryClient.getQueryData(photoKeys.list(GAME_ID)) as { id: string }[];
    expect(photos.map((row) => row.id)).toEqual(["photo_moi"]);
  });

  it("sua chu thich thi thay dong tuong ung tai cho", async () => {
    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(photoKeys.list(GAME_ID), [
      { id: "photo_1", caption: "cũ" },
      { id: "photo_2", caption: "khác" },
    ]);
    const hook = renderHook(() => useUpdatePhoto(GAME_ID), { wrapper });

    await act(async () => {
      await hook.result.current.mutateAsync({ photoId: "photo_1", input: { caption: "Sân" } });
    });

    const photos = queryClient.getQueryData(photoKeys.list(GAME_ID)) as { caption: string }[];
    expect(photos[0].caption).toBe("Sân");
    expect(photos[1].caption).toBe("khác");
  });

  it("xoa anh thi bo khoi danh sach", async () => {
    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(photoKeys.list(GAME_ID), [{ id: "photo_1" }, { id: "photo_2" }]);
    const hook = renderHook(() => useRemovePhoto(GAME_ID), { wrapper });

    await act(async () => {
      await hook.result.current.mutateAsync("photo_1");
    });

    const photos = queryClient.getQueryData(photoKeys.list(GAME_ID)) as { id: string }[];
    expect(photos.map((row) => row.id)).toEqual(["photo_2"]);
  });

  it("cache chua co gi thi tu coi nhu danh sach rong", async () => {
    const { wrapper, queryClient } = createWrapper();
    const hook = renderHook(() => useAddPhoto(GAME_ID), { wrapper });

    await act(async () => {
      await hook.result.current.mutateAsync({
        mimeType: "image/webp",
        data: "AAAA",
        thumbData: "AAAA",
        width: 10,
        height: 10,
        caption: "",
        expenseId: null,
      });
    });

    expect(queryClient.getQueryData(photoKeys.list(GAME_ID))).toHaveLength(1);
  });
});

describe("findUndoableExpenseRemoval", () => {
  const removalEvent: ApiGameEvent = {
    id: "event_1",
    createdAt: "2026-08-01T00:00:00.000Z",
    undoneAt: null,
    payload: {
      kind: "expense_removed",
      title: "Nước",
      amount: 90_000,
      payerName: "An",
      restore: {
        payerParticipantId: AN,
        kind: "expense",
        title: "Nước",
        amount: 90_000,
        note: "",
        splitMode: "equal",
        splits: [],
      },
    },
  };

  /** Cac mock tra ve mang rong nen phai noi ro kieu cho `mockResolvedValueOnce`. */
  function withEvents(events: ApiGameEvent[]) {
    api.gameEvents.list.mockResolvedValueOnce({ events } as never);
  }

  it("tim thay dong vua xoa thi tra ve id de moi toast hoan tac", async () => {
    withEvents([removalEvent]);

    expect(
      await findUndoableExpenseRemoval(GAME_ID, { title: "Nước", amount: 90_000 }),
    ).toBe("event_1");
  });

  it("dong moi nhat khong khop ten/so tien thi khong hoan tac nham", async () => {
    withEvents([removalEvent]);

    expect(await findUndoableExpenseRemoval(GAME_ID, { title: "Sân", amount: 90_000 })).toBeNull();
  });

  it("dong moi nhat khong phai 'da xoa khoan chi' thi bo qua", async () => {
    withEvents([{ ...removalEvent, payload: { kind: "game_created", name: "X" } }]);

    expect(
      await findUndoableExpenseRemoval(GAME_ID, { title: "Nước", amount: 90_000 }),
    ).toBeNull();
  });

  it("chua co lich su nao thi tra ve null", async () => {
    withEvents([]);

    expect(
      await findUndoableExpenseRemoval(GAME_ID, { title: "Nước", amount: 90_000 }),
    ).toBeNull();
  });

  it("dong da hoan tac roi thi khong hoan tac lan hai", async () => {
    withEvents([{ ...removalEvent, undoneAt: "2026-08-02T00:00:00.000Z" }]);

    expect(
      await findUndoableExpenseRemoval(GAME_ID, { title: "Nước", amount: 90_000 }),
    ).toBeNull();
  });
});
