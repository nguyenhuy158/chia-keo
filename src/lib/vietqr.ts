// Lop re-export tuong thich: logic VietQR nam o `shared/vietqr.ts` de worker
// cung dung duoc khi proxy anh QR.
export {
  VIETQR_ACCOUNT_PATTERN,
  VIETQR_BANK_OPTIONS,
  buildVietQrProxyPath,
  buildVietQrUrl,
  canBuildVietQr,
  getVietQrPaymentIssue,
  resolveVietQrBankId,
  type PaymentInfo,
} from "../../shared/vietqr";
