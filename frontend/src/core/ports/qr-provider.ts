// Port cho dich vu sinh anh QR chuyen khoan. Adapter hien tai la VietQR;
// doi nha cung cap QR chi can implement 2 ham nay.

export type QrPayment = {
  bankId: string;
  accountNo: string;
  accountName: string;
};

export type QrProviderPort = {
  /** Nguoi nhan co du thong tin de sinh QR khong. */
  canBuild(payment: QrPayment | undefined): boolean;
  /** URL anh QR chuyen `amount` cho `payment`, kem noi dung tham chieu. */
  buildUrl(payment: QrPayment, amount: number, reference: string): string;
};
