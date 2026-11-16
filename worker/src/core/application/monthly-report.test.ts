import { describe, expect, it, vi } from "vitest";
import { InvalidInputError } from "./errors";
import { createFakeRepo, FAKE_OWNER, gameRow } from "./fake-game-repository";
import { getClosedMonthCsv, MAX_REPORT_GAMES } from "./monthly-report";

const AUGUST_CLOSED = "2026-08-10T03:00:00.000Z";
const SEPTEMBER_CLOSED = "2026-09-10T03:00:00.000Z";

function expenseRow(id: string, gameId: string, amount: number) {
  return {
    id,
    gameId,
    payerParticipantId: "p1",
    kind: "expense",
    category: "food",
    title: "Ăn tối",
    amount,
    note: "",
    splitMode: "equal",
    excluded: false,
    sequence: 0,
    createdAt: AUGUST_CLOSED,
    updatedAt: AUGUST_CLOSED,
  } as const;
}

describe("getClosedMonthCsv", () => {
  it("rejects a month that is not YYYY-MM", async () => {
    const { repo } = createFakeRepo();
    await expect(
      getClosedMonthCsv(repo, FAKE_OWNER, "2026-13"),
    ).rejects.toBeInstanceOf(InvalidInputError);
    await expect(
      getClosedMonthCsv(repo, FAKE_OWNER, ""),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("only counts closed games of that month", async () => {
    const { repo } = createFakeRepo({
      games: [
        gameRow({ id: "aug", closedAt: AUGUST_CLOSED, closeMode: "auto" }),
        gameRow({ id: "sep", closedAt: SEPTEMBER_CLOSED, closeMode: "auto" }),
        gameRow({ id: "open", closedAt: null }),
        gameRow({
          id: "archived",
          closedAt: AUGUST_CLOSED,
          closeMode: "archived",
        }),
      ],
      expenses: [
        expenseRow("e1", "aug", 90_000),
        expenseRow("e2", "sep", 10_000),
        expenseRow("e3", "open", 5_000),
        expenseRow("e4", "archived", 777_000),
      ],
      splits: [
        { expenseId: "e1", participantId: "p1", amount: 90_000, weight: null },
        { expenseId: "e2", participantId: "p1", amount: 10_000, weight: null },
      ],
    });

    vi.spyOn(repo.participants, "listIdNamesByOwner").mockResolvedValue([
      { id: "p1", name: "An", gameId: "aug" },
    ]);

    const lines = (await getClosedMonthCsv(repo, FAKE_OWNER, "2026-08"))
      .slice(1)
      .trimEnd()
      .split("\r\n");
    expect(lines).toEqual([
      "Nhóm,Tên,Số tiền (VND)",
      "Tổng chi,,90000",
      "Danh mục,Ăn uống,90000",
      "Người đã chi,An,90000",
      "Người phải chịu,An,90000",
    ]);
  });

  it("leaves out excluded expenses", async () => {
    const { repo } = createFakeRepo({
      games: [
        gameRow({ id: "aug", closedAt: AUGUST_CLOSED, closeMode: "auto" }),
      ],
      expenses: [
        expenseRow("e1", "aug", 90_000),
        { ...expenseRow("e2", "aug", 500_000), excluded: true },
      ],
    });
    const csv = await getClosedMonthCsv(repo, FAKE_OWNER, "2026-08");
    expect(csv).toContain("Tổng chi,,90000");
    expect(csv).not.toContain("500000");
  });

  it("returns a header and zero total when no game closed that month", async () => {
    const { repo } = createFakeRepo({
      games: [gameRow({ closedAt: AUGUST_CLOSED })],
    });
    const csv = await getClosedMonthCsv(repo, FAKE_OWNER, "2026-10");
    expect(csv.slice(1).trimEnd().split("\r\n")).toEqual([
      "Nhóm,Tên,Số tiền (VND)",
      "Tổng chi,,0",
    ]);
  });

  it("caps the number of games read in one export", async () => {
    const games = Array.from({ length: MAX_REPORT_GAMES + 1 }, (_, index) =>
      gameRow({
        id: `game-${index}`,
        closedAt: `2026-08-${String(index + 1).padStart(2, "0")}T03:00:00.000Z`,
        closeMode: "auto",
      }),
    );
    const { repo } = createFakeRepo({
      games,
      expenses: games.map((game, index) =>
        expenseRow(`e${index}`, game.id, 1_000),
      ),
    });
    const csv = await getClosedMonthCsv(repo, FAKE_OWNER, "2026-08");
    expect(csv).toContain(`Tổng chi,,${MAX_REPORT_GAMES * 1_000}`);
  });
});
