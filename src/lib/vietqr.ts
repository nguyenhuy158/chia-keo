import type { ApiParticipant } from "../../shared/api-types";

export type PaymentInfo = Pick<ApiParticipant, "bankId" | "accountNo" | "accountName">;

const QR_CONTENT_MAX_LENGTH = 50;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, QR_CONTENT_MAX_LENGTH);
}

export function canBuildVietQr(payment: PaymentInfo) {
  return Boolean(payment.bankId && payment.accountNo && payment.accountName);
}

export function buildVietQrUrl(payment: PaymentInfo, amount: number, gameCode: string) {
  const content = normalizeText(`CHIA KEO ${gameCode}`);
  const bankId = encodeURIComponent(payment.bankId.trim());
  const accountNo = encodeURIComponent(payment.accountNo.trim());
  const accountName = encodeURIComponent(payment.accountName.trim());

  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
    content,
  )}&accountName=${accountName}`;
}
