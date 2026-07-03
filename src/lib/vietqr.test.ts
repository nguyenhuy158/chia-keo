import { describe, expect, it } from "vitest";
import { buildVietQrUrl, canBuildVietQr } from "./vietqr";

const fullPayment = {
  bankId: "VCB",
  accountNo: "0123456789",
  accountName: "NGUYEN VAN A",
};

describe("canBuildVietQr", () => {
  it("can du bankId, accountNo va accountName", () => {
    expect(canBuildVietQr(fullPayment)).toBe(true);
    expect(canBuildVietQr({ ...fullPayment, bankId: "" })).toBe(false);
    expect(canBuildVietQr({ ...fullPayment, accountNo: "" })).toBe(false);
    expect(canBuildVietQr({ ...fullPayment, accountName: "" })).toBe(false);
  });
});

describe("buildVietQrUrl", () => {
  it("tao URL vietqr.io voi amount va noi dung chuyen khoan", () => {
    const url = buildVietQrUrl(fullPayment, 150000, "ABC123");

    expect(url).toContain("https://img.vietqr.io/image/VCB-0123456789-compact2.png");
    expect(url).toContain("amount=150000");
    expect(url).toContain(`addInfo=${encodeURIComponent("CHIA KEO ABC123")}`);
    expect(url).toContain(`accountName=${encodeURIComponent("NGUYEN VAN A")}`);
  });

  it("loai bo dau tieng Viet va ky tu dac biet trong noi dung", () => {
    const url = buildVietQrUrl(fullPayment, 1000, "ĐÀ-NẴNG");
    const addInfo = new URL(url).searchParams.get("addInfo");

    expect(addInfo).toMatch(/^[a-zA-Z0-9 ]*$/);
  });
});
