/** Bo dau tieng Viet (tach to hop NFD roi xoa dau). "đ" khong tach nen giu nguyen. */
export function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Khoa so khop mo: bo dau, chu thuong, cat khoang trang hai dau ("Sacom" ~ "sacombank"). */
export function foldText(value: string): string {
  return stripDiacritics(value).toLowerCase().trim();
}
