import type { ApiParticipant } from "../../shared/api-types";

export type PaymentInfo = Pick<ApiParticipant, "bankId" | "accountNo" | "accountName">;

const QR_CONTENT_MAX_LENGTH = 50;

export const VIETQR_BANK_OPTIONS = [
  { value: "VCB", label: "Vietcombank (VCB)" },
  { value: "TCB", label: "Techcombank (TCB)" },
  { value: "MB", label: "MB Bank (MB)" },
  { value: "ACB", label: "ACB (ACB)" },
  { value: "VIB", label: "VIB (VIB)" },
  { value: "VPB", label: "VPBank (VPB)" },
  { value: "TPB", label: "TPBank (TPB)" },
  { value: "BIDV", label: "BIDV (BIDV)" },
  { value: "ICB", label: "VietinBank (ICB)" },
  { value: "VBA", label: "Agribank (VBA)" },
  { value: "STB", label: "Sacombank (STB)" },
  { value: "HDB", label: "HDBank (HDB)" },
  { value: "OCB", label: "OCB (OCB)" },
  { value: "SHB", label: "SHB (SHB)" },
  { value: "EIB", label: "Eximbank (EIB)" },
  { value: "MSB", label: "MSB (MSB)" },
  { value: "SCB", label: "SCB (SCB)" },
  { value: "PVCB", label: "PVcomBank (PVCB)" },
  { value: "NCB", label: "NCB (NCB)" },
  { value: "ABB", label: "ABBank (ABB)" },
  { value: "VAB", label: "VietABank (VAB)" },
  { value: "NAB", label: "Nam A Bank (NAB)" },
  { value: "PGB", label: "PG Bank (PGB)" },
  { value: "VIETBANK", label: "VietBank (VIETBANK)" },
  { value: "BVB", label: "BaoViet Bank (BVB)" },
  { value: "SEAB", label: "SeABank (SEAB)" },
  { value: "LPB", label: "LPBank (LPB)" },
  { value: "KLB", label: "KienlongBank (KLB)" },
  { value: "CIMB", label: "CIMB Vietnam (CIMB)" },
  { value: "BAB", label: "Bac A Bank (BAB)" },
  { value: "SHBVN", label: "Shinhan Bank Vietnam (SHBVN)" },
] as const;

const vietQrBankIds: ReadonlyMap<string, string> = new Map(
  VIETQR_BANK_OPTIONS.map(({ value }) => [value, value]),
);

const vietQrBankAliases = new Map([
  ["AGRIBANK", "VBA"],
  ["BACABANK", "BAB"],
  ["BAOVIETBANK", "BVB"],
  ["EXIMBANK", "EIB"],
  ["HDBANK", "HDB"],
  ["MBB", "MB"],
  ["MBBANK", "MB"],
  ["MMB", "MB"],
  ["NAMABANK", "NAB"],
  ["PVCOMBANK", "PVCB"],
  ["SACOMBANK", "STB"],
  ["SHINHANBANK", "SHBVN"],
  ["TECHCOMBANK", "TCB"],
  ["TPBANK", "TPB"],
  ["VIETCOMBANK", "VCB"],
  ["VIETINBANK", "ICB"],
  ["VPBANK", "VPB"],
]);

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, QR_CONTENT_MAX_LENGTH);
}

function normalizeBankId(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Chuan hoa ma ngan hang nguoi dung nhap ve ma VietQR (ho tro alias nhu
 * MBB/MBBank -> MB); tra ve "" neu khong nhan ra.
 */
export function resolveVietQrBankId(value: string) {
  const bankId = normalizeBankId(value);
  if (/^\d{6}$/.test(bankId)) return bankId;

  return vietQrBankAliases.get(bankId) || vietQrBankIds.get(bankId) || "";
}

export function canBuildVietQr(payment: PaymentInfo | undefined) {
  return Boolean(payment?.bankId && payment.accountNo && resolveVietQrBankId(payment.bankId));
}

export function getVietQrPaymentIssue(payment: PaymentInfo | undefined) {
  if (!payment?.bankId || !payment.accountNo) {
    return "Người nhận chưa nhập mã ngân hàng và số tài khoản.";
  }

  if (!resolveVietQrBankId(payment.bankId)) {
    return `Mã ngân hàng "${payment.bankId}" chưa hỗ trợ VietQR. Với MBBank dùng MB, MBB hoặc MBBank.`;
  }

  return "";
}

export function buildVietQrUrl(payment: PaymentInfo, amount: number, gameCode: string) {
  const content = normalizeText(`CHIA KEO ${gameCode}`);
  const bankId = encodeURIComponent(resolveVietQrBankId(payment.bankId));
  const accountNo = encodeURIComponent(payment.accountNo.trim());
  const accountName = encodeURIComponent(payment.accountName.trim());

  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
    content,
  )}&accountName=${accountName}`;
}
