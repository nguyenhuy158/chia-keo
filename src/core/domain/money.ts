const VND_LOCALE = "vi-VN";
const VND_CURRENCY = "VND";
const VND_FRACTION_DIGITS = 0;
const NON_DIGIT_PATTERN = /[^\d]/g;
const SPACE_PATTERN = /\s+/g;

const vndFormatter = new Intl.NumberFormat(VND_LOCALE, {
  style: "currency",
  currency: VND_CURRENCY,
  currencyDisplay: "code",
  maximumFractionDigits: VND_FRACTION_DIGITS,
});

export function formatMoney(value: number) {
  return vndFormatter.format(value).replace(SPACE_PATTERN, " ");
}

export function formatMoneyInput(value: string) {
  const amount = parseMoney(value);

  return amount > 0 ? formatMoney(amount) : "";
}

export function parseMoney(value: string) {
  const digits = value.replace(NON_DIGIT_PATTERN, "");
  return digits ? Number(digits) : 0;
}
