import { forwardRef } from "react";
import { formatMoney, parseMoney } from "../core/domain/money";

// Chi loc ky tu la; khong tu them dau phan nhom hay tu tinh vao chinh o nhap —
// nguoi dung go gi thay gi, ket qua cuoi xem o dong preview duoi o.
const ALLOWED_CHARS = /[^0-9+\-*/.\s]/g;

function sanitizeMoneyInput(raw: string) {
  return raw.replace(ALLOWED_CHARS, "");
}

type MoneyInputProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  id?: string;
  name?: string;
  className?: string;
  "aria-label"?: string;
};

/**
 * Input tien te: go tu do, khong bi tu dong them dau phan nhom hay doi dinh
 * dang giua luc go. Ho tro go bieu thuc cong tru nhan chia (vd 20000+30000);
 * ket qua cuoi hien o dong preview nho duoi o, gia tri thuc luc luu doc bang
 * `parseMoney` (xem core/domain/money.ts).
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onChange, onBlur, placeholder, id, name, className = "", "aria-label": ariaLabel },
  ref,
) {
  const showPreview = value.trim().length > 0;
  const preview = showPreview ? parseMoney(value) : 0;

  return (
    <div className="flex flex-col gap-0.5">
      <input
        ref={ref}
        id={id}
        name={name}
        aria-label={ariaLabel}
        className={`field tabular ${className}`}
        inputMode="text"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(sanitizeMoneyInput(event.target.value))}
        onBlur={onBlur}
      />
      {showPreview && (
        <span className="text-xs text-stone-500 dark:text-stone-400">
          {preview > 0 ? `= ${formatMoney(preview)}` : "Biểu thức chưa hợp lệ"}
        </span>
      )}
    </div>
  );
});
