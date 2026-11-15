import { Workbook } from "exceljs";
import { describe, expect, it } from "vitest";
import type { ApiExpense, ApiParticipant } from "../../../shared/api-types";
import { renderExpenseXlsx } from "./expense-xlsx";

const people: ApiParticipant[] = ["a", "b"].map((id) => ({
  id,
  name: id.toUpperCase(),
  bankId: "",
  accountNo: "",
  accountName: "",
}));

const expense: ApiExpense = {
  id: "1",
  kind: "expense",
  category: "",
  title: "Lẩu",
  amount: 200,
  note: "",
  payerParticipantId: "a",
  splitMode: "equal",
  splitParticipantIds: ["a", "b"],
  splits: [],
  excluded: false,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("renderExpenseXlsx", () => {
  it("writes the sheet layout with formulas for equal splits", async () => {
    const blob = await renderExpenseXlsx(
      {
        participants: people,
        expenses: [expense],
        summary: {
          totalExpense: 200,
          settlements: [],
          balances: [
            { participantId: "a", paid: 200, owed: 100, balance: 100 },
            { participantId: "b", paid: 0, owed: 100, balance: -100 },
          ],
        },
      },
      "Phú Yên",
    );
    const workbook = new Workbook();
    await workbook.xlsx.load(await blob.arrayBuffer());
    const sheet = workbook.getWorksheet("Phú Yên");
    expect(sheet?.getCell("A1").value).toBe("Đã chi");
    expect(sheet?.getCell("E1").value).toBe(200);
    expect(sheet?.getCell("E2").value).toBe("A");
    expect(sheet?.getCell("F3").value).toBe(100);
    expect(sheet?.getCell("A4").value).toBe("Lẩu");
    expect(sheet?.getCell("C4").value).toMatchObject({
      formula: "COUNTIF(E4:F4,TRUE)",
    });
    expect(sheet?.getCell("D4").value).toMatchObject({ result: 100 });
    expect(sheet?.getCell("F4").value).toBe(true);
  });
});
