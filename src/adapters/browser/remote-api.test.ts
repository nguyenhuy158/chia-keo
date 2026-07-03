import { afterEach, describe, expect, it, vi } from "vitest";
import { createShareSnapshot } from "./remote-api";
import type { Game } from "../../core/domain/types";

const game: Game = {
  id: "game_1",
  code: "ABC123",
  name: "Cuộc chơi mẫu",
  participants: [
    { id: "participant_1", name: "Huy" },
    { id: "participant_2", name: "Nam" },
  ],
  expenses: [
    {
      id: "expense_1",
      title: "Taxi",
      amount: 100000,
      categoryId: "transport",
      payerId: "participant_1",
      splitParticipantIds: ["participant_1", "participant_2"],
      createdAt: "2026-07-03T00:00:00.000Z",
    },
  ],
  receipts: [],
  shareToken: "share_1",
  createdAt: "2026-07-03T00:00:00.000Z",
};

describe("createShareSnapshot", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("tạo link share bằng cookie session không cần Authorization", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ shareToken: "share_1", url: "/share/share_1", permission: "view" }),
      } as Response),
    );
    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await createShareSnapshot(game, "view");
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
    const [, init] = calls[0];

    expect(snapshot.url).toBe("/share/share_1");
    expect(fetchMock).toHaveBeenCalledWith("/api/share", expect.any(Object));
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(init.credentials).toBe("same-origin");
    expect(JSON.parse(String(init.body))).toEqual({ game, permission: "view" });
  });
});
