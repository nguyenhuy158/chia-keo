import type { ApiBank, ApiParticipant } from "./api-types";

export type PaymentInfo = Pick<ApiParticipant, "bankId" | "accountNo" | "accountName">;

const QR_CONTENT_MAX_LENGTH = 50;
const QR_PROXY_PATH = "/api/qr";
/** So tai khoan cac ngan hang VN: chu so, vai ngan hang co them chu cai. */
export const VIETQR_ACCOUNT_PATTERN = /^[A-Za-z0-9]{4,32}$/;

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

// Danh ba ngan hang dong tu API VietQR (cache o D1). Danh sach tinh o tren chi
// la du phong khi chua tai duoc danh ba; dang ky them vao day de resolve/nhan
// dien du ~60 ngan hang ma khong phai cap nhat code moi lan VietQR them bank.
let dynamicBankLabels: ReadonlyMap<string, string> = new Map();

/** Dang ky danh ba ngan hang dong (goi lai se thay the toan bo danh ba cu). */
export function registerVietQrBanks(banks: readonly Pick<ApiBank, "code" | "shortName">[]) {
  const labels = new Map<string, string>();

  for (const bank of banks) {
    const code = normalizeBankId(bank.code);
    if (code) labels.set(code, bank.shortName);
  }

  dynamicBankLabels = labels;
}

/** Danh sach du phong (tu VIETQR_BANK_OPTIONS) khi chua co du lieu upstream. */
export function getFallbackVietQrBanks(): ApiBank[] {
  return VIETQR_BANK_OPTIONS.map(({ value, label }) => {
    const shortName = label.replace(/\s*\(.*\)$/, "");
    return { bin: "", code: value, shortName, name: shortName };
  });
}

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

  if (vietQrBankAliases.has(bankId) || vietQrBankIds.has(bankId)) {
    return vietQrBankAliases.get(bankId) || bankId;
  }

  return dynamicBankLabels.has(bankId) ? bankId : "";
}

/** Ten ngan hang de hien thi, tra ve chinh ma neu khong co trong danh sach. */
export function getVietQrBankLabel(bankId: string) {
  const resolved = resolveVietQrBankId(bankId);
  const option = VIETQR_BANK_OPTIONS.find((bank) => bank.value === resolved);
  if (option) return option.label.replace(/\s*\(.*\)$/, "");

  return dynamicBankLabels.get(resolved) || resolved || bankId;
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

/**
 * `amount` <= 0 nghia la QR khong gan san so tien, nguoi quet tu nhap. Dung
 * cho QR chung cua host khi moi nguoi chuyen ve mot dau moi voi so tien khac
 * nhau.
 */
export function buildVietQrUrl(payment: PaymentInfo, amount: number, gameCode: string) {
  const content = normalizeText(`CHIA KEO ${gameCode}`);
  const bankId = encodeURIComponent(resolveVietQrBankId(payment.bankId));
  const accountNo = encodeURIComponent(payment.accountNo.trim());
  const accountName = encodeURIComponent(payment.accountName.trim());
  const amountParam = amount > 0 ? `amount=${Math.round(amount)}&` : "";

  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?${amountParam}addInfo=${encodeURIComponent(
    content,
  )}&accountName=${accountName}`;
}

/**
 * Duong dan QR qua API cua chinh minh. Canvas khong ve duoc anh cross-origin
 * thieu CORS (anh bi "taint" va `toBlob` se loi), nen khi ve QR vao anh tom ket
 * phai lay qua origin cua minh thay vi goi thang img.vietqr.io.
 */
export function buildVietQrProxyPath(payment: PaymentInfo, amount: number, gameCode: string) {
  const params = new URLSearchParams({
    bank: resolveVietQrBankId(payment.bankId),
    account: payment.accountNo.trim(),
    amount: String(Math.round(amount)),
    name: payment.accountName.trim(),
    code: gameCode,
  });

  return `${QR_PROXY_PATH}?${params.toString()}`;
}
