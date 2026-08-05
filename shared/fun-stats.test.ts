import { describe, expect, it } from "vitest";
import { buildFunStats, type FunStatsExpenseInput, type FunStatsGameInput } from "./fun-stats";

const names = [
  { id: "p1", name: "Huy" },
  { id: "p2", name: "Hồng" },
  { id: "p3", name: "Kiệt" },
];

const gameA: FunStatsGameInput = {
  code: "AAA111",
  name: "Cầu lông thứ 3",
  createdAt: "2026-07-07T10:00:00.000Z", // Thu Ba
  participantCount: 3,
};
const gameB: FunStatsGameInput = {
  code: "BBB222",
  name: "Cầu lông cuối tuần",
  createdAt: "2026-07-14T10:00:00.000Z", // Thu Ba tuan sau
  participantCount: 5,
};
const gameById = new Map([
  [gameA.code, gameA],
  [gameB.code, gameB],
]);

function expenseOf(gameId: string, overrides: Partial<FunStatsExpenseInput>): FunStatsExpenseInput {
  return {
    gameId,
    kind: "expense",
    title: "Sân",
    amount: 100_000,
    payerParticipantId: "p1",
    ...overrides,
  };
}

describe("buildFunStats — khong co cuoc chia nao", () => {
  it("tra ve tat ca null, khong throw", () => {
    const stats = buildFunStats([], [], new Map(), [], 0);

    expect(stats).toMatchObject({
      gameCount: 0,
      totalExpense: 0,
      topPayer: null,
      mostActive: null,
      biggestExpense: null,
      biggestGame: null,
      favoriteWeekday: null,
    });
  });
});

describe("buildFunStats — tong chi", () => {
  it("cong het expense, tru income, bo qua transfer", () => {
    const expenses = [
      expenseOf(gameA.code, { kind: "expense", amount: 300_000 }),
      expenseOf(gameA.code, { kind: "income", amount: 50_000 }),
      expenseOf(gameA.code, { kind: "transfer", amount: 999_999 }),
    ];

    const stats = buildFunStats([gameA], expenses, gameById, names, 0);

    expect(stats.totalExpense).toBe(250_000);
  });
});

describe("buildFunStats — nguoi ung tien nhieu nhat", () => {
  it("cong don theo nguoi tra, khong tinh transfer/income", () => {
    const expenses = [
      expenseOf(gameA.code, { payerParticipantId: "p1", amount: 200_000 }),
      expenseOf(gameA.code, { payerParticipantId: "p1", amount: 100_000 }),
      expenseOf(gameA.code, { payerParticipantId: "p2", amount: 150_000 }),
      expenseOf(gameA.code, { payerParticipantId: "p2", kind: "transfer", amount: 999_999 }),
    ];

    const stats = buildFunStats([gameA], expenses, gameById, names, 0);

    expect(stats.topPayer).toMatchObject({ name: "Huy", totalPaid: 300_000 });
  });

  it("gop theo ten da chuan hoa giua cac cuoc, khong phai theo participantId", () => {
    const expenses = [
      expenseOf(gameA.code, { payerParticipantId: "p1", amount: 100_000 }),
      // "q1" o cuoc khac nhung cung ten Huy (id khac vi la participant rieng cua cuoc B).
      expenseOf(gameB.code, { payerParticipantId: "q1", amount: 200_000 }),
    ];
    const namesWithDup = [...names, { id: "q1", name: "huy" }];

    const stats = buildFunStats([gameA, gameB], expenses, gameById, namesWithDup, 0);

    expect(stats.topPayer).toMatchObject({ name: "Huy", totalPaid: 300_000, gameCount: 2 });
  });

  it("nguoi tra khong con trong danh sach ten thi bi bo qua, khong lam sai nguoi khac", () => {
    const expenses = [
      expenseOf(gameA.code, { payerParticipantId: "p_da_bi_xoa", amount: 500_000 }),
      expenseOf(gameA.code, { payerParticipantId: "p1", amount: 50_000 }),
    ];

    const stats = buildFunStats([gameA], expenses, gameById, names, 0);

    expect(stats.topPayer).toMatchObject({ name: "Huy", totalPaid: 50_000 });
  });
});

describe("buildFunStats — nguoi co mat nhieu cuoc nhat", () => {
  it("dem so cuoc khac nhau, khong dem trung du nhieu khoan trong cung cuoc", () => {
    const expenses = [
      expenseOf(gameA.code, { payerParticipantId: "p1" }),
      expenseOf(gameA.code, { payerParticipantId: "p1" }),
      expenseOf(gameB.code, { payerParticipantId: "p1" }),
      expenseOf(gameA.code, { payerParticipantId: "p2" }),
    ];

    const stats = buildFunStats([gameA, gameB], expenses, gameById, names, 0);

    expect(stats.mostActive).toMatchObject({ name: "Huy", gameCount: 2 });
  });
});

describe("buildFunStats — khoan chi lon nhat", () => {
  it("chon dung khoan va cuoc chia tuong ung", () => {
    const expenses = [
      expenseOf(gameA.code, { title: "Sân", amount: 100_000 }),
      expenseOf(gameB.code, { title: "Lẩu bò", amount: 900_000 }),
    ];

    const stats = buildFunStats([gameA, gameB], expenses, gameById, names, 0);

    expect(stats.biggestExpense).toMatchObject({
      title: "Lẩu bò",
      amount: 900_000,
      gameName: gameB.name,
      gameCode: gameB.code,
    });
  });

  it("khong tinh transfer/income vao khoan chi lon nhat", () => {
    const expenses = [
      expenseOf(gameA.code, { kind: "transfer", amount: 5_000_000 }),
      expenseOf(gameA.code, { kind: "expense", amount: 100_000 }),
    ];

    const stats = buildFunStats([gameA], expenses, gameById, names, 0);

    expect(stats.biggestExpense?.amount).toBe(100_000);
  });
});

describe("buildFunStats — cuoc chia dong nguoi nhat va thu quen", () => {
  it("chon cuoc co participantCount cao nhat", () => {
    const stats = buildFunStats([gameA, gameB], [], gameById, names, 0);

    expect(stats.biggestGame).toMatchObject({ name: gameB.name, participantCount: 5 });
  });

  it("ca hai cuoc cung tao vao Thu Ba nen do la thu hay choi nhat", () => {
    const stats = buildFunStats([gameA, gameB], [], gameById, names, 0);

    // 2026-07-07 va 2026-07-14 deu la Thu Ba (getDay() = 2).
    expect(stats.favoriteWeekday).toBe(2);
  });
});

describe("buildFunStats — omittedGameCount di qua nguyen ven", () => {
  it("giu dung so bi bo bot ma khong tinh lai", () => {
    const stats = buildFunStats([gameA], [], gameById, names, 7);

    expect(stats.omittedGameCount).toBe(7);
  });
});
