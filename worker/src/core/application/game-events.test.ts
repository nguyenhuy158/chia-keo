import { describe, expect, it } from "vitest";
import type { GameEventPayload, RestorableExpense } from "../../../../shared/game-events";
import type { ExpenseRow, GameEventRow, GameRepository, NewSplitRow } from "../ports/game-repository";
import { InvalidInputError, NotFoundError } from "./errors";
import { undoGameEvent } from "./game-events";

const OWNER = "user_1";

const restore: RestorableExpense = {
  payerParticipantId: "p1",
  kind: "expense",
  title: "Lẩu bò",
  amount: 425_000,
  note: "ghi chú",
  splitMode: "equal",
  splits: [
    { participantId: "p1", amount: 212_500, weight: null },
    { participantId: "p2", amount: 212_500, weight: null },
  ],
};

/**
 * Repo toi thieu cho undoGameEvent: chi cai dat nhung method ham nay dung, con
 * lai de undefined va ep kieu — goi ngoai du kien se no ngay trong test.
 */
function stubRepo(options: {
  payload: GameEventPayload;
  undoneAt?: string | null;
  ownerUserId?: string;
  aliveParticipantIds?: string[];
}) {
  const inserted: ExpenseRow[] = [];
  const splits: NewSplitRow[] = [];
  const undone: string[] = [];
  const events: GameEventRow[] = [];

  const eventRow: GameEventRow = {
    id: "ev_1",
    gameId: "game_1",
    kind: options.payload.kind,
    payload: JSON.stringify(options.payload),
    createdAt: "2026-08-05T10:00:00.000Z",
    undoneAt: options.undoneAt ?? null,
  };

  const repo = {
    gameEvents: {
      getWithGame: async () => ({
        event: eventRow,
        game: {
          id: "game_1",
          ownerUserId: options.ownerUserId ?? OWNER,
          code: "ABC123",
          name: "Cầu lông",
          settlementMode: "host",
          settlementHostId: "",
          createdAt: eventRow.createdAt,
          updatedAt: eventRow.createdAt,
        },
      }),
      insert: async (row: GameEventRow) => {
        events.push(row);
      },
      markUndone: async (eventId: string) => {
        undone.push(eventId);
      },
      listByGame: async () => [],
    },
    participants: {
      listIdsByGame: async () => options.aliveParticipantIds ?? ["p1", "p2"],
      listByGame: async () => [],
    },
    expenses: {
      insert: async (row: ExpenseRow) => {
        inserted.push(row);
      },
      listByGame: async () => inserted,
    },
    splits: {
      replace: async (_expenseId: string, rows: NewSplitRow[]) => {
        splits.push(...rows);
      },
      listByExpenseIds: async () => [],
    },
    paymentProfiles: { listByParticipantIds: async () => [] },
    photos: { countByGame: async () => 0 },
    shareLinks: { getLatestByGame: async () => null },
  } as unknown as GameRepository;

  return { repo, inserted, splits, undone, events };
}

describe("undoGameEvent", () => {
  const removed: GameEventPayload = {
    kind: "expense_removed",
    title: "Lẩu bò",
    amount: 425_000,
    payerName: "Hồng",
    restore,
  };

  it("dung lai khoan chi cung cac phan chia da luu", async () => {
    const stub = stubRepo({ payload: removed });

    await undoGameEvent(stub.repo, OWNER, "ev_1");

    expect(stub.inserted).toHaveLength(1);
    expect(stub.inserted[0]).toMatchObject({
      payerParticipantId: "p1",
      title: "Lẩu bò",
      amount: 425_000,
      note: "ghi chú",
      splitMode: "equal",
    });
    expect(stub.splits.map((split) => [split.participantId, split.amount])).toEqual([
      ["p1", 212_500],
      ["p2", 212_500],
    ]);
  });

  it("danh dau da hoan tac va ghi mot dong lich su moi", async () => {
    const stub = stubRepo({ payload: removed });

    await undoGameEvent(stub.repo, OWNER, "ev_1");

    expect(stub.undone).toEqual(["ev_1"]);
    expect(stub.events.map((event) => event.kind)).toEqual(["expense_restored"]);
  });

  it("khoan dung lai co id moi, khong dung lai id cu", async () => {
    const stub = stubRepo({ payload: removed });

    await undoGameEvent(stub.repo, OWNER, "ev_1");

    expect(stub.inserted[0].id).not.toBe("ev_1");
    expect(stub.splits.every((split) => split.expenseId === stub.inserted[0].id)).toBe(true);
  });

  it("tu choi khi nguoi lien quan da bi xoa khoi cuoc chia", async () => {
    // p2 khong con: chen lai se vi pham khoa ngoai o expense_splits.
    const stub = stubRepo({ payload: removed, aliveParticipantIds: ["p1"] });

    await expect(undoGameEvent(stub.repo, OWNER, "ev_1")).rejects.toThrow(InvalidInputError);
    expect(stub.inserted).toHaveLength(0);
  });

  it("tu choi khi da hoan tac roi", async () => {
    const stub = stubRepo({ payload: removed, undoneAt: "2026-08-05T11:00:00.000Z" });

    await expect(undoGameEvent(stub.repo, OWNER, "ev_1")).rejects.toThrow(InvalidInputError);
    expect(stub.inserted).toHaveLength(0);
  });

  it("tu choi cac loai thao tac khong ho tro hoan tac", async () => {
    const stub = stubRepo({ payload: { kind: "participant_removed", name: "Kiệt" } });

    await expect(undoGameEvent(stub.repo, OWNER, "ev_1")).rejects.toThrow(InvalidInputError);
  });

  it("khong cho hoan tac lich su cua cuoc chia nguoi khac", async () => {
    const stub = stubRepo({ payload: removed, ownerUserId: "user_khac" });

    await expect(undoGameEvent(stub.repo, OWNER, "ev_1")).rejects.toThrow(NotFoundError);
    expect(stub.inserted).toHaveLength(0);
  });
});
