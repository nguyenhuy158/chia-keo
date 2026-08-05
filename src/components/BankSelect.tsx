import { VIETQR_BANK_OPTIONS, resolveVietQrBankId } from "../adapters/browser/vietqr";

type BankSelectProps = {
  value: string;
  onChange: (bankId: string) => void;
  id?: string;
  className?: string;
  "aria-label"?: string;
};

/**
 * Chon ngan hang tu danh sach VietQR ho tro. Truoc day o day la o nhap chu:
 * go sai ma la QR khong sinh duoc, ma nguoi dung khong co cach nao biet ma
 * dung la gi ngoai doan.
 *
 * Dung <select> thuan chu khong dung combobox tu ve: 32 muc thi dien thoai mo
 * banh chon cua he thong, vua quen tay vua khong phai lo bat phim va focus.
 */
export function BankSelect({ value, onChange, id, className, ...rest }: BankSelectProps) {
  const resolved = resolveVietQrBankId(value);
  // Gia tri cu khong nam trong danh sach (go tay tu truoc, hoac ma 6 so cua
  // ngan hang chua liet ke) van phai co mot option, khong thi <select> tu nhay
  // sang muc dau tien va am tham doi ngan hang cua nguoi ta.
  const unknown = value.trim() !== "" && resolved === "";

  return (
    <select
      id={id}
      value={unknown ? value : resolved}
      onChange={(event) => onChange(event.target.value)}
      className={className}
      aria-label={rest["aria-label"]}
    >
      <option value="">Chọn ngân hàng</option>
      {unknown && <option value={value}>{value} (không rõ)</option>}
      {VIETQR_BANK_OPTIONS.map((bank) => (
        <option key={bank.value} value={bank.value}>
          {bank.label}
        </option>
      ))}
    </select>
  );
}
