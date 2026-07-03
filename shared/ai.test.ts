import { describe, expect, it } from "vitest";
import { normalizeAiExpense, resolveAiExpense } from "./ai";

describe("normalizeAiExpense", () => {
  it("chuan hoa du lieu hop le", () => {
    expect(
      normalizeAiExpense({
        title: " An toi ",
        amount: 150000.4,
        payerName: " Huy ",
        splitNames: ["Huy", " Lan ", ""],
        note: " chia deu ",
        confidence: 0.9,
      }),
    ).toEqual({
      title: "An toi",
      amount: 150000,
      payerName: "Huy",
      splitNames: ["Huy", "Lan"],
      note: "chia deu",
      confidence: 0.9,
    });
  });

  it("dua gia tri sai kieu ve mac dinh an toan", () => {
    expect(normalizeAiExpense(null)).toEqual({
      title: "",
      amount: 0,
      payerName: "",
      splitNames: [],
      note: "",
      confidence: 0,
    });
    expect(normalizeAiExpense({ amount: -5, confidence: 7 }).amount).toBe(0);
    expect(normalizeAiExpense({ confidence: 7 }).confidence).toBe(1);
  });
});

describe("resolveAiExpense", () => {
  const participants = [
    { id: "p1", name: "Huy" },
    { id: "p2", name: "Lan Anh" },
    { id: "p3", name: "Minh" },
  ];

  it("khop ten khong dau, khong phan biet hoa thuong", () => {
    const resolved = resolveAiExpense(
      normalizeAiExpense({
        title: "An toi",
        amount: 100,
        payerName: "huy",
        splitNames: ["HUY", "lan anh"],
      }),
      participants,
    );

    expect(resolved.payerParticipantId).toBe("p1");
    expect(resolved.splitParticipantIds).toEqual(["p1", "p2"]);
  });

  it("fallback chia cho tat ca khi khong khop duoc ai", () => {
    const resolved = resolveAiExpense(
      normalizeAiExpense({ title: "x", amount: 100, splitNames: ["nguoi la"] }),
      participants,
    );

    expect(resolved.payerParticipantId).toBe("");
    expect(resolved.splitParticipantIds).toEqual(["p1", "p2", "p3"]);
  });
});
