import { describe, expect, it } from "vitest";
import {
  VIETQR_BANK_OPTIONS,
  buildVietQrUrl,
  canBuildVietQr,
  getVietQrPaymentIssue,
  resolveVietQrBankId,
} from "./vietqr";

describe("vietqr", () => {
  it("chuẩn hóa alias MBBank về mã VietQR MB", () => {
    expect(resolveVietQrBankId("MMB")).toBe("MB");
    expect(resolveVietQrBankId("MBB")).toBe("MB");
    expect(resolveVietQrBankId("MBBank")).toBe("MB");
  });

  it("danh sách dropdown chỉ chứa mã ngân hàng tạo được VietQR", () => {
    for (const bank of VIETQR_BANK_OPTIONS) {
      expect(resolveVietQrBankId(bank.value)).toBe(bank.value);
    }
  });

  it("không tạo QR khi mã ngân hàng không hỗ trợ", () => {
    const profile = {
      bankId: "khong-co",
      accountNo: "0000000000",
      accountName: "NGUYEN VAN A",
    };

    expect(canBuildVietQr(profile)).toBe(false);
    expect(getVietQrPaymentIssue(profile)).toContain("chưa hỗ trợ VietQR");
  });

  it("tạo URL bằng mã ngân hàng đã chuẩn hóa", () => {
    const profile = {
      bankId: "MBB",
      accountNo: "0000000000",
      accountName: "NGUYEN VAN A",
    };

    expect(buildVietQrUrl(profile, 100_000, "ABC123")).toContain("/image/MB-0000000000-compact2.png");
  });
});
