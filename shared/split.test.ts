import { describe, expect, it } from "vitest";
import {
  allocateAmount,
  calculateBalances,
  calculateSettlements,
  type ExpenseInput,
} from "./split";

describe("allocateAmount", () => {
  it("chia deu khi so tien chia het", () => {
    expect(allocateAmount(300, ["a", "b", "c"])).toEqual([
      { participantId: "a", amount: 100 },
      { participantId: "b", amount: 100 },
      { participantId: "c", amount: 100 },
    ]);
  });

  it("cong phan du cho nguoi dau danh sach khi so tien le", () => {
    expect(allocateAmount(100, ["a", "b", "c"])).toEqual([
      { participantId: "a", amount: 34 },
      { participantId: "b", amount: 33 },
      { participantId: "c", amount: 33 },
    ]);
  });

  it("tong split luon bang tong tien goc", () => {
    const ids = ["a", "b", "c", "d", "e", "f", "g"];
    for (const amount of [1, 99, 1000, 123457, 999999999]) {
      const total = allocateAmount(amount, ids).reduce((sum, share) => sum + share.amount, 0);
      expect(total).toBe(amount);
    }
  });

  it("tra ve mang rong khi khong co nguoi chia", () => {
    expect(allocateAmount(100, [])).toEqual([]);
  });
});

describe("calculateBalances", () => {
  it("tinh paid/owed/balance cho tung nguoi", () => {
    const expenses: ExpenseInput[] = [
      {
        payerParticipantId: "a",
        amount: 300,
        shares: allocateAmount(300, ["a", "b", "c"]),
      },
    ];

    expect(calculateBalances(["a", "b", "c"], expenses)).toEqual([
      { participantId: "a", paid: 300, owed: 100, balance: 200 },
      { participantId: "b", paid: 0, owed: 100, balance: -100 },
      { participantId: "c", paid: 0, owed: 100, balance: -100 },
    ]);
  });

  it("bo qua khoan chi co payer khong ton tai", () => {
    const expenses: ExpenseInput[] = [
      {
        payerParticipantId: "ghost",
        amount: 100,
        shares: [{ participantId: "a", amount: 100 }],
      },
    ];

    expect(calculateBalances(["a"], expenses)).toEqual([
      { participantId: "a", paid: 0, owed: 0, balance: 0 },
    ]);
  });

  it("bo qua khoan chi khong co shares", () => {
    const expenses: ExpenseInput[] = [
      { payerParticipantId: "a", amount: 100, shares: [] },
    ];

    expect(calculateBalances(["a"], expenses)).toEqual([
      { participantId: "a", paid: 0, owed: 0, balance: 0 },
    ]);
  });

  it("tong balance cua ca nhom bang 0", () => {
    const ids = ["a", "b", "c", "d"];
    const expenses: ExpenseInput[] = [
      { payerParticipantId: "a", amount: 1001, shares: allocateAmount(1001, ids) },
      { payerParticipantId: "b", amount: 250, shares: allocateAmount(250, ["b", "c"]) },
      { payerParticipantId: "d", amount: 77, shares: allocateAmount(77, ["a", "d"]) },
    ];

    const totalBalance = calculateBalances(ids, expenses).reduce(
      (sum, row) => sum + row.balance,
      0,
    );
    expect(totalBalance).toBe(0);
  });
});

describe("calculateSettlements", () => {
  it("ghep nguoi no voi nguoi nhan", () => {
    const balances = calculateBalances(["a", "b"], [
      { payerParticipantId: "a", amount: 200, shares: allocateAmount(200, ["a", "b"]) },
    ]);

    expect(calculateSettlements(balances)).toEqual([
      { fromParticipantId: "b", toParticipantId: "a", amount: 100 },
    ]);
  });

  it("khong tao settlement khi da can bang", () => {
    expect(
      calculateSettlements([
        { participantId: "a", paid: 100, owed: 100, balance: 0 },
        { participantId: "b", paid: 100, owed: 100, balance: 0 },
      ]),
    ).toEqual([]);
  });

  it("mot nguoi no tra cho nhieu nguoi nhan theo thu tu giam dan", () => {
    const settlements = calculateSettlements([
      { participantId: "no", paid: 0, owed: 300, balance: -300 },
      { participantId: "nhan-lon", paid: 200, owed: 0, balance: 200 },
      { participantId: "nhan-nho", paid: 100, owed: 0, balance: 100 },
    ]);

    expect(settlements).toEqual([
      { fromParticipantId: "no", toParticipantId: "nhan-lon", amount: 200 },
      { fromParticipantId: "no", toParticipantId: "nhan-nho", amount: 100 },
    ]);
  });

  it("tong tien chuyen di bang tong tien nhan ve va can bang het no", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const expenses: ExpenseInput[] = [
      { payerParticipantId: "a", amount: 999999, shares: allocateAmount(999999, ids) },
      { payerParticipantId: "b", amount: 12345, shares: allocateAmount(12345, ["b", "c", "d"]) },
      { payerParticipantId: "c", amount: 67, shares: allocateAmount(67, ["d", "e"]) },
    ];
    const balances = calculateBalances(ids, expenses);
    const settlements = calculateSettlements(balances);

    const net = new Map(balances.map((row) => [row.participantId, row.balance]));
    for (const settlement of settlements) {
      net.set(settlement.fromParticipantId, net.get(settlement.fromParticipantId)! + settlement.amount);
      net.set(settlement.toParticipantId, net.get(settlement.toParticipantId)! - settlement.amount);
    }

    for (const balance of net.values()) {
      expect(balance).toBe(0);
    }
  });
});
