import type { PaymentProfile } from "../types";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
}

export function canBuildVietQr(paymentProfile: PaymentProfile | undefined) {
  return Boolean(paymentProfile?.bankId && paymentProfile.accountNo);
}

export function buildVietQrUrl(paymentProfile: PaymentProfile, amount: number, gameCode: string) {
  const content = normalizeText(`CHIA KEO ${gameCode}`);
  const bankId = encodeURIComponent(paymentProfile.bankId.trim());
  const accountNo = encodeURIComponent(paymentProfile.accountNo.trim());
  const accountName = encodeURIComponent(paymentProfile.accountName.trim());

  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
    content,
  )}&accountName=${accountName}`;
}
