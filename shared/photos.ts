import type { ApiPhoto } from "./api-types";

/** Dem so anh dinh kem theo tung khoan chi. */
export function countPhotosByExpenseId(photos: ApiPhoto[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const photo of photos) {
    if (!photo.expenseId) continue;
    counts.set(photo.expenseId, (counts.get(photo.expenseId) || 0) + 1);
  }
  return counts;
}

/** Lay cac anh dinh kem mot khoan chi, giu nguyen thu tu dau vao. */
export function filterPhotosByExpenseId(photos: ApiPhoto[], expenseId: string): ApiPhoto[] {
  return photos.filter((photo) => photo.expenseId === expenseId);
}

/**
 * Chi so anh ke tiep khi luot trong che do xem toan man hinh; quay vong o hai
 * dau danh sach. Tra ve -1 khi khong con anh nao.
 */
export function stepPhotoIndex(currentIndex: number, step: number, total: number): number {
  if (total <= 0) return -1;
  return (((currentIndex + step) % total) + total) % total;
}

/** Chi so nen mo sau khi xoa anh o vi tri `removedIndex`. */
export function indexAfterRemove(removedIndex: number, remainingTotal: number): number {
  if (remainingTotal <= 0) return -1;
  return Math.min(removedIndex, remainingTotal - 1);
}

/** Chuoi data URI dung truc tiep cho the img. */
export function toDataUrl(mimeType: string, base64: string): string {
  return `data:${mimeType};base64,${base64}`;
}
