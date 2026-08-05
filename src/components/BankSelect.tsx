import { useMemo } from "react";
import { resolveVietQrBankId, VIETQR_BANK_OPTIONS } from "../adapters/browser/vietqr";
import { Dropdown, type DropdownOption } from "./Dropdown";

type BankSelectProps = {
  value: string;
  onChange: (bankId: string) => void;
  ariaLabel?: string;
};

/**
 * Chon ngan hang tu danh sach VietQR ho tro. Truoc day o day la o nhap chu:
 * go sai ma la QR khong sinh duoc, ma nguoi dung khong co cach nao biet ma
 * dung la gi ngoai doan.
 */
export function BankSelect({ value, onChange, ariaLabel }: BankSelectProps) {
  const resolved = resolveVietQrBankId(value);
  // Gia tri cu khong nam trong danh sach (go tay tu truoc, hoac ma 6 so cua
  // ngan hang chua liet ke) van phai co mot muc, khong thi o chon hien trong
  // nhu chua chon gi va nguoi dung tuong mat du lieu.
  const unknown = value.trim() !== "" && resolved === "";

  const options = useMemo<DropdownOption[]>(() => {
    const list = VIETQR_BANK_OPTIONS.map((bank) => ({ value: bank.value, label: bank.label }));
    return unknown ? [{ value, label: `${value} (không rõ)` }, ...list] : list;
  }, [unknown, value]);

  return (
    <Dropdown
      options={options}
      value={unknown ? value : resolved}
      onChange={onChange}
      placeholder="Chọn ngân hàng"
      ariaLabel={ariaLabel}
      // 32 ngan hang: cuon tim cham hon go "techcom".
      searchable
    />
  );
}
