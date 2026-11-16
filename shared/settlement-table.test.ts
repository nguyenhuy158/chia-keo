import { describe, expect, it } from "vitest";
import {
  buildSettlementTable,
  buildSettlementTableTsv,
  formatLastCell,
  formatPlainMoney,
} from "./settlement-table";

const people = [
  { id: "huy", name: "Huy" },
  { id: "kiet", name: "Kiệt" },
  { id: "thu", name: "Thu" },
];

const summary = {
  balances: [
    { participantId: "huy", paid: 3653500, owed: 1112102, balance: 2541398 },
    { participantId: "kiet", paid: 412000, owed: 542710, balance: -130710 },
    { participantId: "thu", paid: 0, owed: 1212435, balance: -1212435 },
  ],
};

describe("buildSettlementTable", () => {
  it("shows the transfer to the host and the host's own receive", () => {
    const table = buildSettlementTable({
      participants: people,
      summary,
      settlementMode: "pick",
      settlementHostId: "huy",
    });
    expect(table.hasHost).toBe(true);
    expect(table.lastHeader).toBe("Chuyển cho Huy");
    expect(table.rows.map((row) => row.last)).toEqual([
      { kind: "receive", amount: 2541398 },
      { kind: "pay", amount: 131000 },
      { kind: "pay", amount: 1213000 },
    ]);
    expect(table.rows[0].isHost).toBe(true);
  });

  it("shows what the host pays back, floored when the option is on", () => {
    const refund = {
      balances: [
        { participantId: "huy", paid: 0, owed: 0, balance: -8000 },
        { participantId: "kiet", paid: 0, owed: 0, balance: 7999 },
        { participantId: "thu", paid: 0, owed: 0, balance: 1 },
      ],
    };
    const input = {
      participants: people,
      summary: refund,
      settlementMode: "pick",
      settlementHostId: "huy",
    };
    expect(buildSettlementTable(input).rows.map((row) => row.last)).toEqual([
      { kind: "zero", amount: 0 },
      { kind: "receive", amount: 7999 },
      { kind: "receive", amount: 1 },
    ]);
    expect(
      buildSettlementTable({ ...input, roundDownRefunds: true }).rows.map(
        (row) => row.last,
      ),
    ).toEqual([
      { kind: "zero", amount: 0 },
      { kind: "receive", amount: 7000 },
      { kind: "zero", amount: 0 },
    ]);
  });

  it("uses the remaining balance without a host and skips unknown people", () => {
    const table = buildSettlementTable({
      participants: people.slice(0, 2),
      summary: {
        balances: [
          ...summary.balances,
          { participantId: "ghost", paid: 1, owed: 1, balance: 0 },
        ],
      },
      settlementMode: "p2p",
    });
    expect(table.hasHost).toBe(false);
    expect(table.lastHeader).toBe("Còn lại");
    expect(table.rows.map((row) => row.name)).toEqual(["Huy", "Kiệt"]);
    expect(table.rows.map((row) => row.last.kind)).toEqual(["receive", "pay"]);
  });

  it("keeps a plain header when the chosen host is no longer a participant", () => {
    const table = buildSettlementTable({
      participants: people.slice(1),
      summary,
      settlementMode: "pick",
      settlementHostId: "huy",
    });
    expect(table.lastHeader).toBe("Chuyển cho");
  });

  it("falls back to zero when nothing is left", () => {
    const table = buildSettlementTable({
      participants: people,
      summary: {
        balances: [{ participantId: "huy", paid: 5, owed: 5, balance: 0 }],
      },
    });
    expect(table.rows[0].last).toEqual({ kind: "zero", amount: 0 });
  });
});

describe("formatLastCell and buildSettlementTableTsv", () => {
  it("formats cells for both layouts", () => {
    expect(formatPlainMoney(1112102)).toBe("1.112.102");
    expect(formatLastCell(true, { kind: "receive", amount: 5000 })).toBe(
      "(nhận 5.000)",
    );
    expect(formatLastCell(true, { kind: "pay", amount: 5000 })).toBe("5.000");
    expect(formatLastCell(false, { kind: "pay", amount: 5000 })).toBe(
      "trả 5.000",
    );
    expect(formatLastCell(false, { kind: "receive", amount: 5000 })).toBe(
      "nhận 5.000",
    );
    expect(formatLastCell(false, { kind: "zero", amount: 0 })).toBe("0");
  });

  it("builds a tab separated table with a header", () => {
    const tsv = buildSettlementTableTsv({
      participants: [{ id: "huy", name: "Hu\ty" }, ...people.slice(1)],
      summary,
      settlementMode: "pick",
      settlementHostId: "huy",
    });
    expect(tsv.split("\n")).toEqual([
      "Người\tPhải chịu\tĐã trả\tChuyển cho Hu y",
      "Hu y\t1112102\t3653500\t(nhận 2.541.398)",
      "Kiệt\t542710\t412000\t131.000",
      "Thu\t1212435\t0\t1.213.000",
    ]);
  });
});
