import { beforeEach, describe, expect, it } from "vitest";
import type { ExpenseInput } from "../../../../shared/schemas";
import { InvalidInputError, NotFoundError } from "./errors";
import {
  addExpense,
  recordTransfer,
  removeExpense,
  reorderExpenses,
  updateExpense,
} from "./expenses";
import {
  createFakeRepo,
  FAKE_GAME_ID,
  FAKE_OWNER,
  gameRow,
  participantRow,
  splitsOf,
} from "./fake-game-repository";
import { removeParticipant } from "./participants";

const AN = "participant_an";
const BINH = "participant_binh";
const CUONG = "participant_cuong";

function threePeople() {
  return createFakeRepo({
    participants: [
      participantRow(AN, "An", { sequence: 0 }),
      participantRow(BINH, "Bình", { sequence: 1 }),
      participantRow(CUONG, "Cường", { sequence: 2 }),
    ],
  });
}

function expenseInput(overrides: Partial<ExpenseInput> = {}): ExpenseInput {
  return {
    kind: "expense",
    category: "",
    title: "Nước",
    amount: 90_000,
    note: "",
    payerParticipantId: AN,
    splitMode: "equal",
    splitParticipantIds: [AN, BINH, CUONG],
    splits: [],
    ...overrides,
  };
}

describe("addExpense", () => {
  let fake: ReturnType<typeof threePeople>;

  beforeEach(() => {
    fake = threePeople();
  });

  it("chia deu va tra ve detail da tinh lai balance", async () => {
    const detail = await addExpense(fake.repo, FAKE_OWNER, FAKE_GAME_ID, expenseInput());

    const [expense] = fake.state.expenses;
    expect(splitsOf(fake.state, expense.id)).toEqual([
      [AN, 30_000],
      [BINH, 30_000],
      [CUONG, 30_000],
    ]);
    expect(detail.summary.totalExpense).toBe(90_000);
    // Nguoi tra ung 90k, chiu 30k -> con duoc nhan lai 60k.
    expect(detail.summary.balances.find((row) => row.participantId === AN)?.balance).toBe(60_000);
  });

  it("tong split luon bang tong tien du chia le", async () => {
    await addExpense(fake.repo, FAKE_OWNER, FAKE_GAME_ID, expenseInput({ amount: 100_000 }));

    const total = fake.state.splits.reduce((sum, row) => sum + row.amount, 0);
    expect(total).toBe(100_000);
  });

  it("ghi mot dong lich su expense_added", async () => {
    await addExpense(fake.repo, FAKE_OWNER, FAKE_GAME_ID, expenseInput());

    expect(fake.state.events).toHaveLength(1);
    expect(fake.state.events[0].kind).toBe("expense_added");
  });

  it("tu dat ten mac dinh khi title bo trong", async () => {
    await addExpense(fake.repo, FAKE_OWNER, FAKE_GAME_ID, expenseInput({ title: "" }));

    expect(fake.state.expenses[0].title).not.toBe("");
  });

  it("khong nhan nguoi khong thuoc cuoc chia", async () => {
    await expect(
      addExpense(
        fake.repo,
        FAKE_OWNER,
        FAKE_GAME_ID,
        expenseInput({ splitParticipantIds: [AN, "participant_la"] }),
      ),
    ).rejects.toThrow(InvalidInputError);
    expect(fake.state.expenses).toEqual([]);
  });

  it("khong nhan payer khong thuoc cuoc chia", async () => {
    await expect(
      addExpense(
        fake.repo,
        FAKE_OWNER,
        FAKE_GAME_ID,
        expenseInput({ payerParticipantId: "participant_la" }),
      ),
    ).rejects.toThrow(InvalidInputError);
    expect(fake.state.expenses).toEqual([]);
  });

  it("mode amount lech tong tien thi bi chan", async () => {
    await expect(
      addExpense(
        fake.repo,
        FAKE_OWNER,
        FAKE_GAME_ID,
        expenseInput({
          splitMode: "amount",
          splitParticipantIds: [],
          splits: [
            { participantId: AN, value: 10_000 },
            { participantId: BINH, value: 10_000 },
          ],
        }),
      ),
    ).rejects.toThrow(InvalidInputError);
  });

  it("nguoi la khong them duoc khoan chi", async () => {
    await expect(
      addExpense(fake.repo, "user_la", FAKE_GAME_ID, expenseInput()),
    ).rejects.toThrow(NotFoundError);
    expect(fake.state.expenses).toEqual([]);
  });

  it("collaborator them duoc khoan chi", async () => {
    fake.state.collaborators.push({
      id: "collab_1",
      gameId: FAKE_GAME_ID,
      userId: "user_ban",
      invitedEmail: "ban@example.com",
      name: "Bạn",
      email: "ban@example.com",
      createdAt: "2026-08-01T00:00:00.000Z",
    });

    await expect(
      addExpense(fake.repo, "user_ban", FAKE_GAME_ID, expenseInput()),
    ).resolves.toMatchObject({ id: FAKE_GAME_ID });
  });

  it("cuoc chia trong thung rac thi khong them duoc", async () => {
    const trashed = createFakeRepo({
      games: [gameRow({ deletedAt: "2026-08-02T00:00:00.000Z" })],
      participants: [participantRow(AN, "An")],
    });

    await expect(
      addExpense(trashed.repo, FAKE_OWNER, FAKE_GAME_ID, expenseInput({ splitParticipantIds: [AN] })),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("updateExpense", () => {
  it("doi so tien thi chia lai va tong khop", async () => {
    const fake = threePeople();
    await addExpense(fake.repo, FAKE_OWNER, FAKE_GAME_ID, expenseInput());
    const expenseId = fake.state.expenses[0].id;

    const detail = await updateExpense(fake.repo, FAKE_OWNER, expenseId, { amount: 60_000 });

    expect(splitsOf(fake.state, expenseId)).toEqual([
      [AN, 20_000],
      [BINH, 20_000],
      [CUONG, 20_000],
    ]);
    expect(detail.summary.totalExpense).toBe(60_000);
  });

  it("bo bot nguoi chia thi nguoi con lai ganh het", async () => {
    const fake = threePeople();
    await addExpense(fake.repo, FAKE_OWNER, FAKE_GAME_ID, expenseInput());
    const expenseId = fake.state.expenses[0].id;

    await updateExpense(fake.repo, FAKE_OWNER, expenseId, { splitParticipantIds: [AN, BINH] });

    expect(splitsOf(fake.state, expenseId)).toEqual([
      [AN, 45_000],
      [BINH, 45_000],
    ]);
  });

  it("khong sua duoc khoan tra no", async () => {
    const fake = threePeople();
    await recordTransfer(fake.repo, FAKE_OWNER, FAKE_GAME_ID, {
      fromParticipantId: BINH,
      toParticipantId: AN,
      amount: 30_000,
      note: "",
    });
    const transferId = fake.state.expenses[0].id;

    await expect(
      updateExpense(fake.repo, FAKE_OWNER, transferId, { amount: 10_000 }),
    ).rejects.toThrow(InvalidInputError);
    expect(fake.state.expenses[0].amount).toBe(30_000);
  });

  it("nguoi la khong sua duoc", async () => {
    const fake = threePeople();
    await addExpense(fake.repo, FAKE_OWNER, FAKE_GAME_ID, expenseInput());
    const expenseId = fake.state.expenses[0].id;

    await expect(
      updateExpense(fake.repo, "user_la", expenseId, { amount: 1_000 }),
    ).rejects.toThrow(NotFoundError);
    expect(fake.state.expenses[0].amount).toBe(90_000);
  });
});

describe("removeExpense", () => {
  it("xoa khoan chi va luu du lieu hoan tac trong lich su", async () => {
    const fake = threePeople();
    await addExpense(fake.repo, FAKE_OWNER, FAKE_GAME_ID, expenseInput());
    const expenseId = fake.state.expenses[0].id;

    const detail = await removeExpense(fake.repo, FAKE_OWNER, expenseId);

    expect(fake.state.expenses).toEqual([]);
    expect(fake.state.splits).toEqual([]);
    expect(detail.summary.totalExpense).toBe(0);

    const removedEvent = fake.state.events.find((row) => row.kind === "expense_removed");
    const payload = JSON.parse(removedEvent?.payload || "{}");
    // Khong co payload nay thi toast "hoan tac" khong khoi phuc lai duoc gi.
    expect(payload.restore.splits).toHaveLength(3);
    expect(payload.restore.amount).toBe(90_000);
  });

  it("nguoi la khong xoa duoc", async () => {
    const fake = threePeople();
    await addExpense(fake.repo, FAKE_OWNER, FAKE_GAME_ID, expenseInput());

    await expect(
      removeExpense(fake.repo, "user_la", fake.state.expenses[0].id),
    ).rejects.toThrow(NotFoundError);
    expect(fake.state.expenses).toHaveLength(1);
  });
});

describe("recordTransfer", () => {
  it("tra no lam can bang hai ben va khong tinh vao tong chi", async () => {
    const fake = threePeople();
    await addExpense(fake.repo, FAKE_OWNER, FAKE_GAME_ID, expenseInput());

    const detail = await recordTransfer(fake.repo, FAKE_OWNER, FAKE_GAME_ID, {
      fromParticipantId: BINH,
      toParticipantId: AN,
      amount: 30_000,
      note: "",
    });

    expect(detail.summary.totalExpense).toBe(90_000);
    expect(detail.summary.balances.find((row) => row.participantId === BINH)?.balance).toBe(0);
    expect(detail.summary.balances.find((row) => row.participantId === AN)?.balance).toBe(30_000);
  });

  it("khong tra no cho nguoi ngoai cuoc chia", async () => {
    const fake = threePeople();

    await expect(
      recordTransfer(fake.repo, FAKE_OWNER, FAKE_GAME_ID, {
        fromParticipantId: AN,
        toParticipantId: "participant_la",
        amount: 10_000,
        note: "",
      }),
    ).rejects.toThrow(InvalidInputError);
    expect(fake.state.expenses).toEqual([]);
  });
});

describe("danh muc chi tieu", () => {
  it("luu danh muc hop le va bo danh muc la", async () => {
    const fake = threePeople();
    await addExpense(fake.repo, FAKE_OWNER, FAKE_GAME_ID, expenseInput({ category: "food" }));
    await addExpense(
      fake.repo,
      FAKE_OWNER,
      FAKE_GAME_ID,
      expenseInput({ category: "khong-co-that" }),
    );

    expect(fake.state.expenses.map((row) => row.category)).toEqual(["food", ""]);
  });

  it("sua khoan chi khong gui danh muc thi giu nguyen danh muc cu", async () => {
    const fake = threePeople();
    await addExpense(fake.repo, FAKE_OWNER, FAKE_GAME_ID, expenseInput({ category: "transport" }));
    const expenseId = fake.state.expenses[0].id;

    await updateExpense(fake.repo, FAKE_OWNER, expenseId, { amount: 60_000 });
    expect(fake.state.expenses[0].category).toBe("transport");

    await updateExpense(fake.repo, FAKE_OWNER, expenseId, { category: "" });
    expect(fake.state.expenses[0].category).toBe("");
  });

  it("khoan tra no khong mang danh muc", async () => {
    const fake = threePeople();
    await recordTransfer(fake.repo, FAKE_OWNER, FAKE_GAME_ID, {
      fromParticipantId: BINH,
      toParticipantId: AN,
      amount: 30_000,
      note: "",
    });

    expect(fake.state.expenses[0].category).toBe("");
  });
});

describe("reorderExpenses", () => {
  it("sap lai thu tu hien thi", async () => {
    const fake = threePeople();
    await addExpense(fake.repo, FAKE_OWNER, FAKE_GAME_ID, expenseInput({ title: "Nước" }));
    await addExpense(fake.repo, FAKE_OWNER, FAKE_GAME_ID, expenseInput({ title: "Sân" }));
    const [first, second] = fake.state.expenses.map((row) => row.id);

    const detail = await reorderExpenses(fake.repo, FAKE_OWNER, FAKE_GAME_ID, [first, second]);

    expect(detail.expenses.map((row) => row.id)).toEqual([first, second]);
  });

  it("tu choi danh sach thieu hoac trung id", async () => {
    const fake = threePeople();
    await addExpense(fake.repo, FAKE_OWNER, FAKE_GAME_ID, expenseInput());
    const expenseId = fake.state.expenses[0].id;

    await expect(
      reorderExpenses(fake.repo, FAKE_OWNER, FAKE_GAME_ID, [expenseId, expenseId]),
    ).rejects.toThrow(InvalidInputError);
    await expect(
      reorderExpenses(fake.repo, FAKE_OWNER, FAKE_GAME_ID, ["expense_la"]),
    ).rejects.toThrow(InvalidInputError);
  });
});

describe("chia lai sau khi xoa nguoi", () => {
  it("mode equal: nguoi con lai chia deu lai va tong van khop", async () => {
    const fake = threePeople();
    await addExpense(fake.repo, FAKE_OWNER, FAKE_GAME_ID, expenseInput());
    const expenseId = fake.state.expenses[0].id;

    await removeParticipant(fake.repo, FAKE_OWNER, CUONG);

    expect(splitsOf(fake.state, expenseId)).toEqual([
      [AN, 45_000],
      [BINH, 45_000],
    ]);
  });

  it("mode amount: chia lai theo ty le phan cu, tong van bang tong tien", async () => {
    const fake = threePeople();
    await addExpense(
      fake.repo,
      FAKE_OWNER,
      FAKE_GAME_ID,
      expenseInput({
        amount: 100_000,
        splitMode: "amount",
        splitParticipantIds: [],
        splits: [
          { participantId: AN, value: 50_000 },
          { participantId: BINH, value: 30_000 },
          { participantId: CUONG, value: 20_000 },
        ],
      }),
    );
    const expenseId = fake.state.expenses[0].id;

    await removeParticipant(fake.repo, FAKE_OWNER, CUONG);

    const rows = splitsOf(fake.state, expenseId);
    expect(rows.map(([id]) => id)).toEqual([AN, BINH]);
    expect(rows.reduce((sum, [, amount]) => sum + amount, 0)).toBe(100_000);
  });

  it("khoan chi khong con ai chiu thi bi xoa han", async () => {
    const fake = createFakeRepo({
      participants: [participantRow(AN, "An"), participantRow(BINH, "Bình", { sequence: 1 })],
    });
    await addExpense(
      fake.repo,
      FAKE_OWNER,
      FAKE_GAME_ID,
      expenseInput({ payerParticipantId: BINH, splitParticipantIds: [AN] }),
    );

    await removeParticipant(fake.repo, FAKE_OWNER, AN);

    expect(fake.state.expenses).toEqual([]);
  });

  it("khoan tra no giu nguyen khi nguoi nhan van con", async () => {
    const fake = threePeople();
    await recordTransfer(fake.repo, FAKE_OWNER, FAKE_GAME_ID, {
      fromParticipantId: BINH,
      toParticipantId: AN,
      amount: 30_000,
      note: "",
    });
    const transferId = fake.state.expenses[0].id;

    await removeParticipant(fake.repo, FAKE_OWNER, CUONG);

    expect(splitsOf(fake.state, transferId)).toEqual([[AN, 30_000]]);
  });
});
