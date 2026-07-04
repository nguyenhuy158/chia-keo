import { forwardRef } from "react";

/** Nhom chu so theo dinh dang vi-VN (500000 -> 500.000) de de doc khi go. */
export function formatMoneyInput(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("vi-VN").format(Number(digits));
}

type MoneyInputProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  id?: string;
  name?: string;
  className?: string;
};

/**
 * Input tien te tu dong them dau phan cach hang nghin khi go.
 * Gia tri tra ra la chuoi da format; dung parseMoney de lay so nguyen khi luu.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onChange, onBlur, placeholder, id, name, className = "" },
  ref,
) {
  return (
    <input
      ref={ref}
      id={id}
      name={name}
      className={`field tabular ${className}`}
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(formatMoneyInput(event.target.value))}
      onBlur={onBlur}
    />
  );
});
