const moneyFormat = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

export function buildPaymentReminder(
  gameName: string,
  fromName: string,
  toName: string,
  amount: number,
): string {
  return `${fromName} ơi, bạn chuyển ${moneyFormat.format(amount)} ₫ cho ${toName} cho kèo "${gameName}" nhé.`;
}
