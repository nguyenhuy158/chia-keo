import type { Participant } from "../types";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
}

export function canBuildVietQr(participant: Participant) {
  return Boolean(participant.bankId && participant.accountNo && participant.accountName);
}

export function buildVietQrUrl(participant: Participant, amount: number, gameCode: string) {
  const content = normalizeText(`CHIA KEO ${gameCode}`);
  const bankId = encodeURIComponent(participant.bankId.trim());
  const accountNo = encodeURIComponent(participant.accountNo.trim());
  const accountName = encodeURIComponent(participant.accountName.trim());

  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
    content,
  )}&accountName=${accountName}`;
}
