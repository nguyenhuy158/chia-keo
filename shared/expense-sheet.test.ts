import { describe, expect, it } from "vitest";
import type { ApiExpense, ApiParticipant, ApiSummary } from "./api-types";
import {
  buildExpenseSheetFileName,
  buildExpenseSheetModel,
} from "./expense-sheet";

const people: ApiParticipant[] = ["a", "b", "c"].map((id) => ({
  id,
  name: id.toUpperCase(),
  bankId: "",
  accountNo: "",
  accountName: "",
}));

function expense(
  id: string,
  amount: number,
  split: string[],
  patch: Partial<ApiExpense> = {},
): ApiExpense {
  return {
    id,
    kind: "expense",
    category: "",
    title: `e${id}`,
    amount,
    note: "",
    payerParticipantId: "a",
    splitMode: "equal",
    splitParticipantIds: split,
    splits: [],
    excluded: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...patch,
  };
}

const summary: ApiSummary = {
  totalExpense: 0,
  settlements: [],
  balances: [
    { participantId: "a", paid: 300, owed: 200, balance: 100 },
    { participantId: "b", paid: 0, owed: 100, balance: -100 },
  ],
};

describe("buildExpenseSheetModel", () => {
  it("lists expenses oldest first with a TRUE/FALSE column per person", () => {
    const model = buildExpenseSheetModel({
      participants: people,
      summary,
      expenses: [expense("2", 100, ["a"]), expense("1", 300, ["a", "b", "c"])],
    });
    expect(model.rows.map((row) => row.title)).toEqual(["e1", "e2"]);
    expect(model.rows[0]).toMatchObject({
      count: 3,
      perPerson: 100,
      included: [true, true, true],
    });
    expect(model.rows[1].included).toEqual([true, false, false]);
  });

  it("skips transfers and excluded expenses", () => {
    const model = buildExpenseSheetModel({
      participants: people,
      summary,
      expenses: [
        expense("1", 10, ["a"], { kind: "transfer" }),
        expense("2", 10, ["a"], { excluded: true }),
        expense("3", 10, ["a"]),
      ],
    });
    expect(model.rows).toHaveLength(1);
  });

  it("gives an expense with nobody in the split a share of 0", () => {
    const model = buildExpenseSheetModel({
      participants: people,
      summary,
      expenses: [expense("1", 90, [])],
    });
    expect(model.rows[0]).toMatchObject({ count: 0, perPerson: 0 });
  });

  it("reads paid and owed per person, 0 when missing", () => {
    const model = buildExpenseSheetModel({
      participants: people,
      summary,
      expenses: [],
    });
    expect(model.paid).toEqual([300, 0, 0]);
    expect(model.owed).toEqual([200, 100, 0]);
  });
});

describe("buildExpenseSheetFileName", () => {
  it("strips Vietnamese accents and falls back to the code", () => {
    expect(buildExpenseSheetFileName("Phú Yên đi chơi", "AB12")).toBe(
      "phu-yen-di-choi.xlsx",
    );
    expect(buildExpenseSheetFileName("!!!", "AB12")).toBe("AB12.xlsx");
  });
});
