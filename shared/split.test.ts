import { describe, expect, it } from "vitest";
import {
  allocateAmount,
  allocateByWeights,
  calculateBalances,
  calculateSettlements,
  computeSplitRows,
  MAX_SPLIT_WEIGHT,
  type BalanceRow,
  type ExpenseInput,
  resolveHostParticipantId,
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

describe("allocateByWeights", () => {
  it("chia theo ty le so phan", () => {
    expect(
      allocateByWeights(400, [
        { participantId: "a", weight: 1 },
        { participantId: "b", weight: 3 },
      ]),
    ).toEqual([
      { participantId: "a", amount: 100 },
      { participantId: "b", amount: 300 },
    ]);
  });

  it("trong so bang nhau cho ket qua nhu allocateAmount", () => {
    const ids = ["a", "b", "c"];
    expect(allocateByWeights(100, ids.map((id) => ({ participantId: id, weight: 1 })))).toEqual(
      allocateAmount(100, ids),
    );
  });

  it("cong phan du lan luot cho nguoi dau danh sach", () => {
    expect(
      allocateByWeights(101, [
        { participantId: "a", weight: 1 },
        { participantId: "b", weight: 1 },
        { participantId: "c", weight: 1 },
      ]),
    ).toEqual([
      { participantId: "a", amount: 34 },
      { participantId: "b", amount: 34 },
      { participantId: "c", amount: 33 },
    ]);
  });

  it("tong split luon bang tong tien goc voi trong so bat ky", () => {
    const entries = [
      { participantId: "a", weight: 3 },
      { participantId: "b", weight: 7 },
      { participantId: "c", weight: 11 },
      { participantId: "d", weight: 1 },
    ];
    for (const amount of [1, 99, 1000, 123457, 999999999]) {
      const total = allocateByWeights(amount, entries).reduce(
        (sum, share) => sum + share.amount,
        0,
      );
      expect(total).toBe(amount);
    }
  });

  it("bo qua nguoi co trong so 0 va khong tran so voi trong so lon", () => {
    const shares = allocateByWeights(1_000_000_000_000, [
      { participantId: "a", weight: 999_999_999_999 },
      { participantId: "b", weight: 1 },
      { participantId: "c", weight: 0 },
    ]);
    expect(shares.map((share) => share.participantId)).toEqual(["a", "b"]);
    expect(shares.reduce((sum, share) => sum + share.amount, 0)).toBe(1_000_000_000_000);
  });

  it("tra ve mang rong khi khong co trong so hop le", () => {
    expect(allocateByWeights(100, [])).toEqual([]);
    expect(allocateByWeights(100, [{ participantId: "a", weight: 0 }])).toEqual([]);
  });
});

describe("computeSplitRows", () => {
  it("mode equal chia deu, khong luu weight", () => {
    expect(computeSplitRows(300, "equal", ["a", "b", "c"], [])).toEqual([
      { participantId: "a", amount: 100, weight: null },
      { participantId: "b", amount: 100, weight: null },
      { participantId: "c", amount: 100, weight: null },
    ]);
  });

  it("mode shares chia theo so phan va luu weight", () => {
    expect(
      computeSplitRows(400, "shares", [], [
        { participantId: "a", value: 1 },
        { participantId: "b", value: 3 },
      ]),
    ).toEqual([
      { participantId: "a", amount: 100, weight: 1 },
      { participantId: "b", amount: 300, weight: 3 },
    ]);
  });

  it("mode amount giu nguyen so tien nhap", () => {
    expect(
      computeSplitRows(90, "amount", [], [
        { participantId: "a", value: 30 },
        { participantId: "b", value: 60 },
      ]),
    ).toEqual([
      { participantId: "a", amount: 30, weight: null },
      { participantId: "b", amount: 60, weight: null },
    ]);
  });

  it("tra ve null cho input khong hop le", () => {
    // Khong co ai chia
    expect(computeSplitRows(100, "equal", [], [])).toBeNull();
    expect(computeSplitRows(100, "shares", [], [])).toBeNull();
    // Trung nguoi
    expect(
      computeSplitRows(100, "amount", [], [
        { participantId: "a", value: 50 },
        { participantId: "a", value: 50 },
      ]),
    ).toBeNull();
    // So phan qua lon
    expect(
      computeSplitRows(100, "shares", [], [
        { participantId: "a", value: MAX_SPLIT_WEIGHT + 1 },
      ]),
    ).toBeNull();
    // Tong tien tuy chinh lech tong khoan chi
    expect(
      computeSplitRows(100, "amount", [], [
        { participantId: "a", value: 30 },
        { participantId: "b", value: 60 },
      ]),
    ).toBeNull();
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

  it("khoan tra no (mot nguoi nhan toan bo) can bang lai cong no", () => {
    // b no a 100 sau khoan chi dau; b tra no 100 -> ca hai ve 0.
    const expenses: ExpenseInput[] = [
      { payerParticipantId: "a", amount: 200, shares: allocateAmount(200, ["a", "b"]) },
      { payerParticipantId: "b", amount: 100, shares: [{ participantId: "a", amount: 100 }] },
    ];

    const balances = calculateBalances(["a", "b"], expenses);
    expect(balances).toEqual([
      { participantId: "a", paid: 200, owed: 200, balance: 0 },
      { participantId: "b", paid: 100, owed: 100, balance: 0 },
    ]);
    expect(calculateSettlements(balances)).toEqual([]);
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

  it("khoan thu (income) dao nguoc dau: nguoi nhan giu tien, nguoi duoc chia bot no", () => {
    // a chi 300 chia deu 3 nguoi -> moi nguoi no a 100.
    // Sau do nhom nhan hoan tien 90, a giu tien, chia deu 3 nguoi -> moi nguoi bot 30 no.
    const expenses: ExpenseInput[] = [
      { payerParticipantId: "a", amount: 300, shares: allocateAmount(300, ["a", "b", "c"]) },
      {
        payerParticipantId: "a",
        amount: 90,
        shares: allocateAmount(90, ["a", "b", "c"]),
        kind: "income",
      },
    ];

    const balances = calculateBalances(["a", "b", "c"], expenses);
    expect(balances).toEqual([
      { participantId: "a", paid: 210, owed: 70, balance: 140 },
      { participantId: "b", paid: 0, owed: 70, balance: -70 },
      { participantId: "c", paid: 0, owed: 70, balance: -70 },
    ]);
    const totalBalance = balances.reduce((sum, row) => sum + row.balance, 0);
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

describe("resolveHostParticipantId", () => {
  const balances: BalanceRow[] = [
    { participantId: "thieu", paid: 0, owed: 300, balance: -300 },
    { participantId: "ung-nhieu", paid: 300, owed: 100, balance: 200 },
    { participantId: "ung-it", paid: 100, owed: 0, balance: 100 },
  ];

  it("lay nguoi ung nhieu nhat o che do host, bo qua nguoi da chon", () => {
    expect(resolveHostParticipantId(balances, "host", "thieu")).toBe("ung-nhieu");
  });

  it("lay dung nguoi da chon o che do pick, ke ca nguoi dang no", () => {
    expect(resolveHostParticipantId(balances, "pick", "thieu")).toBe("thieu");
  });

  it("che do pick chua chon ai thi ve nguoi ung nhieu nhat", () => {
    expect(resolveHostParticipantId(balances, "pick", "")).toBe("ung-nhieu");
    expect(resolveHostParticipantId(balances, "pick")).toBe("ung-nhieu");
  });

  it("nguoi da chon khong con trong cuoc thi ve nguoi ung nhieu nhat", () => {
    expect(resolveHostParticipantId(balances, "pick", "da-bi-xoa")).toBe("ung-nhieu");
  });

  it("khong co dau moi o cac che do khac", () => {
    expect(resolveHostParticipantId(balances, "p2p", "thieu")).toBe("");
    expect(resolveHostParticipantId(balances, "off", "thieu")).toBe("");
  });
});
