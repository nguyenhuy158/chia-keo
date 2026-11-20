/**
 * Ghep class, bo qua gia tri rong / false / undefined.
 * Khong dedupe nhu tailwind-merge: giu zero-dependency. Muon override thi
 * dat class cua ban o cuoi (Tailwind uu tien thu tu trong file CSS, nen voi
 * hai class cung thuoc tinh hay dung bien the ro rang thay vi de chong nhau).
 */
// Nhan ca number/bigint vi `cond && "class"` voi cond kieu ReactNode se cho ra 0.
export type ClassValue = string | number | bigint | boolean | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter((value) => typeof value === "string" && value).join(" ");
}
