import { buildVietQrUrl, canBuildVietQr } from "../../../shared/vietqr";
import type { QrProviderPort } from "../../core/ports/qr-provider";

// Logic VietQR thuan nam o `shared/vietqr.ts` vi worker cung can no de proxy
// anh QR; file nay chi la adapter phia trinh duyet.
export {
  VIETQR_ACCOUNT_PATTERN,
  VIETQR_BANK_OPTIONS,
  buildVietQrProxyPath,
  buildVietQrUrl,
  canBuildVietQr,
  getVietQrBankLabel,
  getVietQrPaymentIssue,
  resolveVietQrBankId,
  type PaymentInfo,
} from "../../../shared/vietqr";

/** Adapter VietQR cho QrProviderPort. */
export const vietQrProvider: QrProviderPort = {
  canBuild: canBuildVietQr,
  buildUrl: buildVietQrUrl,
};
