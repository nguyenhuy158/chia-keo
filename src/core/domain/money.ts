export function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

// Cho phep go bieu thuc cong tru nhan chia (vd "20000+30000") thay vi chi so.
const EXPRESSION_CHARS = /[^0-9+\-*/.\s]/g;

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

/**
 * Doc so tien tu chuoi nhap tho: cho phep bieu thuc cong tru nhan chia. Dau
 * "." la dau phan nhom nghin (vi-VN, vd "3.000" = 3000) khong phai dau thap
 * phan — VND khong co le — nen bo di truoc khi tinh. Tra 0 neu rong, sai cu
 * phap, hoac ket qua am.
 */
export function parseMoney(value: string): number {
  const sanitized = value.replace(EXPRESSION_CHARS, "").replace(/\./g, "").trim();
  if (!sanitized) return 0;
  if (/[+\-*/]{2,}|^[+\-*/]|[+\-*/]$/.test(sanitized)) return 0;

  const result = evalArithmetic(sanitized);
  if (result === null || !Number.isFinite(result) || result < 0) return 0;
  return Math.round(result);
}
