import { describe, expect, it } from "vitest";
import { buildPayerBreakdown, UNKNOWN_PAYER_NAME } from "./payer-breakdown";

const people = [
  { id: "a", name: "An" },
  { id: "b", name: "Bình" },
  { id: "c", name: "Chi" },
];

function expense(
  id: string,
  payer: string,
  amount: number,
  patch: Record<string, unknown> = {},
) {
  return {
    id,
    kind: "expense" as const,
    title: `e${id}`,
    amount,
    payerParticipantId: payer,
    excluded: false,
    ...patch,
  };
}

describe("buildPayerBreakdown", () => {
  it("groups by payer, biggest total first, biggest expense first inside", () => {
    const result = buildPayerBreakdown(
      [
        expense("1", "a", 100),
        expense("2", "b", 300),
        expense("3", "a", 200),
        expense("4", "b", 50),
      ],
      people,
    );
    expect(result.total).toBe(650);
    expect(result.count).toBe(4);
    expect(result.rows.map((row) => row.name)).toEqual(["Bình", "An"]);
    expect(result.rows[0]).toMatchObject({ count: 2, total: 350, percent: 54 });
    expect(result.rows[0].expenses.map((item) => item.id)).toEqual(["2", "4"]);
    expect(result.rows[1].expenses.map((item) => item.id)).toEqual(["3", "1"]);
  });

  it("ignores income, transfers and excluded expenses", () => {
    const result = buildPayerBreakdown(
      [
        expense("1", "a", 100),
        expense("2", "a", 10, { kind: "income" }),
        expense("3", "a", 10, { kind: "transfer" }),
        expense("4", "a", 10, { excluded: true }),
      ],
      people,
    );
    expect(result.count).toBe(1);
    expect(result.total).toBe(100);
  });

  it("breaks ties by participant order and names a removed payer", () => {
    const result = buildPayerBreakdown(
      [
        expense("1", "x", 100),
        expense("2", "c", 100),
        expense("3", "y", 100),
        expense("4", "a", 100),
      ],
      people,
    );
    expect(result.rows.map((row) => row.name)).toEqual([
      "An",
      "Chi",
      UNKNOWN_PAYER_NAME,
      UNKNOWN_PAYER_NAME,
    ]);
  });

  it("returns no rows and 0 percent when there is nothing to count", () => {
    expect(buildPayerBreakdown([], people)).toEqual({
      total: 0,
      count: 0,
      rows: [],
    });
    const zero = buildPayerBreakdown([expense("1", "a", 0)], people);
    expect(zero.rows[0].percent).toBe(0);
  });
});
