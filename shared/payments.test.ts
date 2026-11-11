import { describe, expect, it } from "vitest";
import type { ApiSummary } from "./api-types";
import { listDueTransfers, samePaymentItems } from "./payments";

const summary: ApiSummary = {
  totalExpense: 300_000,
  balances: [
    { participantId: "huy", balance: 200_500 },
    { participantId: "an", balance: -100_250 },
    { participantId: "binh", balance: -100_250 },
  ],
  settlements: [
    { fromParticipantId: "an", toParticipantId: "huy", amount: 100_250 },
    { fromParticipantId: "binh", toParticipantId: "huy", amount: 100_250 },
  ],
} as ApiSummary;

describe("listDueTransfers", () => {
  it("che do gom ve mot nguoi thi lam tron len nhu QR", () => {
    expect(listDueTransfers(summary, "host", "")).toEqual([
      { fromParticipantId: "an", toParticipantId: "huy", amount: 101_000 },
      { fromParticipantId: "binh", toParticipantId: "huy", amount: 101_000 },
    ]);
  });

  it("p2p dung settlements, off thi khong co gi", () => {
    expect(listDueTransfers(summary, "p2p", "")).toBe(summary.settlements);
    expect(listDueTransfers(summary, "off", "")).toEqual([]);
  });
});

describe("payment helpers", () => {
  it("so sanh lua chon khong phu thuoc thu tu", () => {
    const a = [
      { participantId: "an", amount: 1 },
      { participantId: "binh", amount: 2 },
    ];
    expect(samePaymentItems(a, [...a].reverse())).toBe(true);
    expect(samePaymentItems(a, [a[0]])).toBe(false);
  });
});
