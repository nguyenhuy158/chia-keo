export const REPORT_TEXT = {
  unknownDate: "Không rõ",
  gameName: (name: string) => `Cuộc chơi: ${name}`,
  gameCode: (code: string) => `Mã: ${code}`,
  totalExpense: (amount: string) => `Tổng chi: ${amount}`,
  participantCount: (count: number) => `Số người: ${count}`,
  expenseCount: (count: number) => `Số khoản chi: ${count}`,
  expensesTitle: "Khoản chi:",
  balancesTitle: "Cân bằng:",
  receive: (name: string, amount: string) => `- ${name}: nhận ${amount}`,
  pay: (name: string, amount: string) => `- ${name}: còn trả ${amount}`,
  settled: (name: string) => `- ${name}: đủ`,
} as const;
