import { describe, expect, it } from "vitest";
import {
  VIETQR_BANK_OPTIONS,
  buildVietQrUrl,
  canBuildVietQr,
  getVietQrPaymentIssue,
  resolveVietQrBankId,
} from "./vietqr";

const fullPayment = {
  bankId: "VCB",
  accountNo: "0123456789",
  accountName: "NGUYEN VAN A",
};

describe("resolveVietQrBankId", () => {
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
});

describe("canBuildVietQr", () => {
  it("cần bankId hợp lệ và accountNo", () => {
    expect(canBuildVietQr(fullPayment)).toBe(true);
    expect(canBuildVietQr({ ...fullPayment, bankId: "" })).toBe(false);
    expect(canBuildVietQr({ ...fullPayment, accountNo: "" })).toBe(false);
    expect(canBuildVietQr(undefined)).toBe(false);
  });

  it("không tạo QR khi mã ngân hàng không hỗ trợ", () => {
    const payment = { ...fullPayment, bankId: "khong-co" };

    expect(canBuildVietQr(payment)).toBe(false);
    expect(getVietQrPaymentIssue(payment)).toContain("chưa hỗ trợ VietQR");
  });
});

describe("buildVietQrUrl", () => {
  it("tạo URL vietqr.io với amount và nội dung chuyển khoản", () => {
    const url = buildVietQrUrl(fullPayment, 150000, "ABC123");

    expect(url).toContain("https://img.vietqr.io/image/VCB-0123456789-compact2.png");
    expect(url).toContain("amount=150000");
    expect(url).toContain(`addInfo=${encodeURIComponent("CHIA KEO ABC123")}`);
    expect(url).toContain(`accountName=${encodeURIComponent("NGUYEN VAN A")}`);
  });

  it("tạo URL bằng mã ngân hàng đã chuẩn hóa", () => {
    const payment = { ...fullPayment, bankId: "MBB", accountNo: "0000000000" };

    expect(buildVietQrUrl(payment, 100_000, "ABC123")).toContain(
      "/image/MB-0000000000-compact2.png",
    );
  });

  it("loại bỏ dấu tiếng Việt và ký tự đặc biệt trong nội dung", () => {
    const url = buildVietQrUrl(fullPayment, 1000, "ĐÀ-NẴNG");
    const addInfo = new URL(url).searchParams.get("addInfo");

    expect(addInfo).toMatch(/^[a-zA-Z0-9 ]*$/);
  });
});
