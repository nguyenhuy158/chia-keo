const moneyFormat = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

export function buildPaymentReminder(
  gameName: string,
  fromName: string,
  toName: string,
  amount: number,
  shareUrl?: string,
): string {
  const message = `${fromName} ơi, bạn chuyển ${moneyFormat.format(amount)} ₫ cho ${toName} cho kèo "${gameName}" nhé.`;
  return shareUrl ? `${message}\nXem chi tiết và QR: ${shareUrl}` : message;
}
