import {
  buildExpenseSheetModel,
  type ExpenseSheetInput,
  SHEET_AMOUNT_HEADER,
  SHEET_COUNT_HEADER,
  SHEET_FIRST_EXPENSE_ROW,
  SHEET_FIRST_PERSON_COLUMN,
  SHEET_PAID_LABEL,
  SHEET_TOTAL_LABEL,
} from "../../../shared/expense-sheet";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MONEY_FORMAT = "#,##0";
const TITLE_COLUMN_WIDTH = 32;
const NUMBER_COLUMN_WIDTH = 14;
const FROZEN_ROWS = 3;
const FIRST_SUMMARY_ROW = 1;
const HEADER_ROW = 2;
const TOTAL_ROW = 3;
const AMOUNT_COLUMN = 2;
const COUNT_COLUMN = 3;
const SHARE_COLUMN = 4;

export async function renderExpenseXlsx(
  input: ExpenseSheetInput,
  sheetName: string,
): Promise<Blob> {
  const { Workbook } = await import("exceljs");
  const model = buildExpenseSheetModel(input);
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31) || "Chia kèo", {
    views: [{ state: "frozen", ySplit: FROZEN_ROWS }],
  });

  const firstPerson = SHEET_FIRST_PERSON_COLUMN;

  sheet.getCell(FIRST_SUMMARY_ROW, 1).value = SHEET_PAID_LABEL;
  sheet.getCell(HEADER_ROW, 2).value = SHEET_AMOUNT_HEADER;
  sheet.getCell(HEADER_ROW, COUNT_COLUMN).value = SHEET_COUNT_HEADER;
  sheet.getCell(TOTAL_ROW, 1).value = SHEET_TOTAL_LABEL;

  model.names.forEach((name, index) => {
    const column = firstPerson + index;
    sheet.getCell(FIRST_SUMMARY_ROW, column).value = model.paid[index];
    sheet.getCell(HEADER_ROW, column).value = name;
    sheet.getCell(TOTAL_ROW, column).value = model.owed[index];
  });

  model.rows.forEach((row, index) => {
    const rowNumber = SHEET_FIRST_EXPENSE_ROW + index;
    sheet.getCell(rowNumber, 1).value = row.title;
    sheet.getCell(rowNumber, AMOUNT_COLUMN).value = row.amount;

    const first = sheet.getCell(rowNumber, firstPerson).address;
    const last = sheet.getCell(
      rowNumber,
      firstPerson + model.names.length - 1,
    ).address;
    const amountAddress = sheet.getCell(rowNumber, AMOUNT_COLUMN).address;
    const countAddress = sheet.getCell(rowNumber, COUNT_COLUMN).address;

    if (row.isEqual) {
      sheet.getCell(rowNumber, COUNT_COLUMN).value = {
        formula: `COUNTIF(${first}:${last},TRUE)`,
        result: row.count,
      };
      sheet.getCell(rowNumber, SHARE_COLUMN).value = {
        formula: `IF(${countAddress}=0,0,${amountAddress}/${countAddress})`,
        result: row.perPerson,
      };
    } else {
      sheet.getCell(rowNumber, COUNT_COLUMN).value = row.count;
      sheet.getCell(rowNumber, SHARE_COLUMN).value = row.perPerson;
    }

    row.included.forEach((included, personIndex) => {
      sheet.getCell(rowNumber, firstPerson + personIndex).value = included;
    });
  });

  sheet.getColumn(1).width = TITLE_COLUMN_WIDTH;
  for (let column = 2; column < firstPerson + model.names.length; column += 1) {
    sheet.getColumn(column).width = NUMBER_COLUMN_WIDTH;
  }
  for (const column of [AMOUNT_COLUMN, SHARE_COLUMN]) {
    sheet.getColumn(column).numFmt = MONEY_FORMAT;
  }
  for (let index = 0; index < model.names.length; index += 1) {
    for (const row of [FIRST_SUMMARY_ROW, TOTAL_ROW]) {
      sheet.getCell(row, firstPerson + index).numFmt = MONEY_FORMAT;
    }
  }
  sheet.getRow(HEADER_ROW).font = { bold: true };
  sheet.getRow(TOTAL_ROW).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: XLSX_MIME });
}
