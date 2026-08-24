import { beforeEach, describe, expect, it } from "vitest";
import type { ExpenseInput } from "../../../../shared/schemas";
import { BadRequestError, NotFoundError } from "./errors";
import { addExpense, recordTransfer } from "./expenses";
import {
  createFakeRepo,
  FAKE_GAME_ID,
  FAKE_OWNER,
  gameRow,
  participantRow,
} from "./fake-game-repository";
import { closeGame, listAllGames, listClosedGames, listGames, reopenGame } from "./games";
import { countRealExpenses } from "./game-closing";

const AN = "participant_an";
const BINH = "participant_binh";
const OTHER_USER = "user_2";

function twoPeople(game = gameRow()) {
  return createFakeRepo({
    games: [game],
    participants: [
      participantRow(AN, "An", { gameId: game.id, sequence: 0 }),
      participantRow(BINH, "Bình", { gameId: game.id, sequence: 1 }),
    ],
  });
}

function expenseInput(overrides: Partial<ExpenseInput> = {}): ExpenseInput {
  return {
    kind: "expense",
    category: "",
    title: "Sân",
    amount: 100_000,
    note: "",
    payerParticipantId: AN,
    splitMode: "equal",
    splitParticipantIds: [AN, BINH],
    splits: [],
    ...overrides,
  };
}

/** An ung 100k cho ca hai -> Binh no An 50k. */
async function addDebt(fake: ReturnType<typeof twoPeople>) {
  return addExpense(fake.repo, FAKE_OWNER, FAKE_GAME_ID, expenseInput());
}

describe("countRealExpenses", () => {
  it("khong tinh khoan tra no", () => {
    expect(countRealExpenses(["expense", "income", "transfer"])).toBe(2);
  });
});

describe("tu dong dong", () => {
  let fake: ReturnType<typeof twoPeople>;

  beforeEach(() => {
    fake = twoPeople();
  });

  it("cuoc vua tao chua co khoan chi thi khong tu dong dong", async () => {
    const detail = await addExpense(fake.repo, FAKE_OWNER, FAKE_GAME_ID, expenseInput());

    // Co khoan chi nhung con lech -> dang choi.
    expect(detail.closedAt).toBeNull();
    expect(fake.state.games[0].closedAt).toBeNull();
  });

  it("tra xong het thi dong voi mode auto va ghi lich su", async () => {
    await addDebt(fake);

    const detail = await recordTransfer(fake.repo, FAKE_OWNER, FAKE_GAME_ID, {
      fromParticipantId: BINH,
      toParticipantId: AN,
      amount: 50_000,
      note: "",
    });

    expect(detail.closedAt).not.toBeNull();
    expect(detail.closeMode).toBe("auto");
    expect(fake.state.events.map((row) => row.kind)).toContain("game_closed");
  });

  it("cuoc tu dong dong tu mo lai khi so du lech tro lai", async () => {
    await addDebt(fake);
    await recordTransfer(fake.repo, FAKE_OWNER, FAKE_GAME_ID, {
      fromParticipantId: BINH,
      toParticipantId: AN,
      amount: 50_000,
      note: "",
    });

    const detail = await addExpense(
      fake.repo,
      FAKE_OWNER,
      FAKE_GAME_ID,
      expenseInput({ title: "Cầu", amount: 60_000 }),
    );

    expect(detail.closedAt).toBeNull();
    expect(detail.closeMode).toBe("");
    expect(fake.state.events.map((row) => row.kind)).toContain("game_reopened");
  });

  it("cuoc dong tay khong tu mo lai du con no nhau", async () => {
    await addDebt(fake);
    await closeGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID);

    const detail = await addExpense(
      fake.repo,
      FAKE_OWNER,
      FAKE_GAME_ID,
      expenseInput({ title: "Cầu", amount: 60_000 }),
    );

    expect(detail.closedAt).not.toBeNull();
    expect(detail.closeMode).toBe("manual");
  });
});

describe("closeGame", () => {
  let fake: ReturnType<typeof twoPeople>;

  beforeEach(() => {
    fake = twoPeople();
  });

  it("dong tay du con no nhau", async () => {
    await addDebt(fake);

    const detail = await closeGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID);

    expect(detail.closeMode).toBe("manual");
    expect(fake.state.games[0].closedAt).not.toBeNull();
    expect(fake.state.events.map((row) => row.kind)).toContain("game_closed");
  });

  it("chi chu cuoc choi dong duoc", async () => {
    await expect(closeGame(fake.repo, OTHER_USER, FAKE_GAME_ID)).rejects.toThrow(NotFoundError);
  });

  it("dong hai lan la loi trang thai", async () => {
    await closeGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID);

    await expect(closeGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID)).rejects.toThrow(BadRequestError);
  });
});

describe("reopenGame", () => {
  let fake: ReturnType<typeof twoPeople>;

  beforeEach(() => {
    fake = twoPeople();
  });

  it("mo lai cuoc da dong tay", async () => {
    await addDebt(fake);
    await closeGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID);

    const detail = await reopenGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID);

    expect(detail.closedAt).toBeNull();
    expect(detail.closeMode).toBe("");
  });

  it("mo cuoc dang choi la loi trang thai", async () => {
    await expect(reopenGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID)).rejects.toThrow(BadRequestError);
  });

  it("chi chu cuoc choi mo lai duoc", async () => {
    await closeGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID);

    await expect(reopenGame(fake.repo, OTHER_USER, FAKE_GAME_ID)).rejects.toThrow(NotFoundError);
  });
});

describe("danh sach cuoc choi", () => {
  it("mac dinh chi tra cuoc dang choi; cuoc da dong nam o danh sach rieng", async () => {
    const fake = twoPeople();
    await addDebt(fake);

    expect((await listGames(fake.repo, FAKE_OWNER)).map((game) => game.id)).toEqual([
      FAKE_GAME_ID,
    ]);
    expect(await listClosedGames(fake.repo, FAKE_OWNER)).toEqual([]);

    await closeGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID);

    expect(await listGames(fake.repo, FAKE_OWNER)).toEqual([]);
    const closed = await listClosedGames(fake.repo, FAKE_OWNER);
    expect(closed.map((game) => game.id)).toEqual([FAKE_GAME_ID]);
    expect(closed[0].closeMode).toBe("manual");
  });

  it("duong tra cuu (MCP) van thay cuoc da dong", async () => {
    const fake = twoPeople();
    await addDebt(fake);
    await closeGame(fake.repo, FAKE_OWNER, FAKE_GAME_ID);

    expect((await listAllGames(fake.repo, FAKE_OWNER)).map((game) => game.id)).toEqual([
      FAKE_GAME_ID,
    ]);
  });
});
