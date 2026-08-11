import { forwardRef } from "react";

/** Nhom chu so theo dinh dang vi-VN (500000 -> 500.000) de de doc khi go. */
export function formatMoneyInput(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("vi-VN").format(Number(digits));
}

// Cho phep go bieu thuc +-*/ (vd 20000+30000) truoc khi chot gia tri.
const EXPRESSION_CHARS = /[^0-9+\-*/.\s]/g;
const HAS_OPERATOR = /[+\-*/]/;

function sanitizeMoneyExpression(raw: string) {
  return raw.replace(EXPRESSION_CHARS, "");
}

/** Tinh bieu thuc cong tru nhan chia nhap tho; tra null neu khong hop le hoac ket qua am. */
export function evaluateMoneyExpression(raw: string): number | null {
  const sanitized = sanitizeMoneyExpression(raw).trim();
  if (!sanitized) return null;
  // Dau "." o day la dau phan nhom nghin (vi-VN, vd 3.000 = 3000), khong phai
  // dau thap phan — VND khong co le. Bo het truoc khi tinh, khong thi
  // "3.000+4000" bi Number() hieu la 3 (dot thanh dau cham thap phan).
  const withoutThousandsDot = sanitized.replace(/\./g, "");
  if (/[+\-*/]{2,}|^[+\-*/]|[+\-*/]$/.test(withoutThousandsDot)) return null;
  const result = evalArithmetic(withoutThousandsDot);
  if (result === null || !Number.isFinite(result) || result < 0) return null;
  return Math.round(result);
}

/** Parser cong tru nhan chia thu cong (khong dung eval/Function), uu tien nhan chia truoc. */
function evalArithmetic(expr: string): number | null {
  const tokens = expr.match(/\d+|[+\-*/]/g);
  if (!tokens || tokens.length === 0) return null;

  // Rut gon * va / truoc theo thu tu toan hoc.
  const terms: number[] = [Number(tokens[0])];
  const addOps: string[] = [];
  let i = 1;
  while (i < tokens.length) {
    const op = tokens[i];
    const nextVal = Number(tokens[i + 1]);
    if (op === undefined || Number.isNaN(nextVal)) return null;
    if (op === "*" || op === "/") {
      const prev = terms.pop()!;
      terms.push(op === "*" ? prev * nextVal : prev / nextVal);
    } else if (op === "+" || op === "-") {
      addOps.push(op);
      terms.push(nextVal);
    } else {
      return null;
    }
    i += 2;
  }

  return terms.reduce((sum, term, idx) => {
    if (idx === 0) return term;
    return addOps[idx - 1] === "-" ? sum - term : sum + term;
  }, 0);
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
 * Input tien te tu dong them dau phan cach hang nghin khi go.
 * Ho tro go bieu thuc cong tru nhan chia (vd 20000+30000), tu tinh khi blur hoac Enter.
 * Gia tri tra ra la chuoi da format; dung parseMoney de lay so nguyen khi luu.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onChange, onBlur, placeholder, id, name, className = "", "aria-label": ariaLabel },
  ref,
) {
  const resolveExpression = () => {
    if (!HAS_OPERATOR.test(value)) return;
    const result = evaluateMoneyExpression(value);
    onChange(result === null ? "" : formatMoneyInput(String(result)));
  };

  return (
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
      onChange={(event) => {
        const sanitized = sanitizeMoneyExpression(event.target.value);
        onChange(HAS_OPERATOR.test(sanitized) ? sanitized : formatMoneyInput(sanitized));
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") resolveExpression();
      }}
      onBlur={() => {
        resolveExpression();
        onBlur?.();
      }}
    />
  );
});
