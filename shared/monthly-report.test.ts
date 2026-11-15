import { describe, expect, it } from "vitest";
import {
  ALL_MONTHS,
  buildMonthlyCsv,
  filterByMonth,
  formatMonthLabel,
  listMonthKeys,
  monthKeyOf,
} from "./monthly-report";

describe("month keys", () => {
  it("uses Vietnam time so late night UTC lands in the next month", () => {
    expect(monthKeyOf("2026-08-31T16:59:59.000Z")).toBe("2026-08");
    expect(monthKeyOf("2026-08-31T17:00:00.000Z")).toBe("2026-09");
  });

  it("lists unique months newest first and skips open games", () => {
    expect(
      listMonthKeys([
        "2026-08-02T00:00:00Z",
        null,
        "2026-10-01T00:00:00Z",
        "2026-08-20T00:00:00Z",
      ]),
    ).toEqual(["2026-10", "2026-08"]);
  });

  it("filters by month and keeps everything for all months", () => {
    const games = [
      { id: "a", closedAt: "2026-08-02T00:00:00Z" },
      { id: "b", closedAt: "2026-10-01T00:00:00Z" },
      { id: "c", closedAt: null },
    ];
    expect(filterByMonth(games, "2026-08").map((game) => game.id)).toEqual([
      "a",
    ]);
    expect(filterByMonth(games, ALL_MONTHS)).toHaveLength(3);
  });

  it("formats a label as MM/YYYY", () => {
    expect(formatMonthLabel("2026-08")).toBe("08/2026");
  });
});

describe("buildMonthlyCsv", () => {
  const participants = [
    { id: "p1", name: "An" },
    { id: "p2", name: "Bình, Lê" },
    { id: "p3", name: "=cmd" },
    { id: "p4", name: "An" },
  ];
  const expenses = [
    {
      id: "e1",
      kind: "expense",
      category: "food",
      amount: 90_000,
      payerParticipantId: "p1",
    },
    {
      id: "e2",
      kind: "expense",
      category: "",
      amount: 30_000,
      payerParticipantId: "p4",
    },
    {
      id: "e3",
      kind: "transfer",
      category: "food",
      amount: 50_000,
      payerParticipantId: "p2",
    },
  ];
  const splits = [
    { expenseId: "e1", participantId: "p1", amount: 45_000 },
    { expenseId: "e1", participantId: "p2", amount: 45_000 },
    { expenseId: "e2", participantId: "p3", amount: 30_000 },
    { expenseId: "e3", participantId: "p1", amount: 50_000 },
  ];

  it("totals by category and person, ignoring transfers and merging same names", () => {
    const lines = buildMonthlyCsv(expenses, splits, participants)
      .slice(1)
      .trimEnd()
      .split("\r\n");
    expect(lines).toEqual([
      "Nhóm,Tên,Số tiền (VND)",
      "Tổng chi,,120000",
      "Danh mục,Ăn uống,90000",
      "Danh mục,Chưa phân loại,30000",
      "Người đã chi,An,120000",
      "Người phải chịu,An,45000",
      'Người phải chịu,"Bình, Lê",45000',
      "Người phải chịu,'=cmd,30000",
    ]);
  });

  it("ignores excluded expenses", () => {
    const lines = buildMonthlyCsv(
      [
        { ...expenses[0] },
        { ...expenses[1], excluded: true },
      ],
      splits,
      participants,
    )
      .slice(1)
      .trimEnd()
      .split("\r\n");
    expect(lines).toContain("Tổng chi,,90000");
    expect(lines.some((line) => line.includes("Chưa phân loại"))).toBe(false);
    expect(lines).not.toContain("Người phải chịu,'=cmd,30000");
  });

  it("starts with a BOM so Excel reads Vietnamese", () => {
    expect(buildMonthlyCsv([], [], []).startsWith("\uFEFF")).toBe(true);
  });

  it("returns only the header and a zero total for an empty month", () => {
    expect(
      buildMonthlyCsv([], [], []).slice(1).trimEnd().split("\r\n"),
    ).toEqual(["Nhóm,Tên,Số tiền (VND)", "Tổng chi,,0"]);
  });
});
