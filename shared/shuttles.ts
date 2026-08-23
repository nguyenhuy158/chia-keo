// Kho cau (ong cau) cua tung nguoi: chi la phep cong tru tren mot so nguyen.
// Khong co IO o day — worker va FE dung chung dung mot luat.

/** Toi da moi lan them/bo, du cho mot thung cau ma van chan go sai (99999). */
export const MAX_SHUTTLE_QUANTITY = 999;
/** Chan kho phinh vo han khi bam "+" lien tuc; 1 thung ~ 12 trai nen du xa. */
export const MAX_SHUTTLE_STOCK = 100_000;
export const SHUTTLE_NOTE_MAX_LENGTH = 140;
/** So dong lich su tra ve cho FE: du de doi chieu vai buoi gan nhat. */
export const SHUTTLE_ENTRY_LIST_LIMIT = 50;

/**
 * Mot thao tac tren kho:
 * - "add": mua them / nguoi tra lai cau
 * - "use": danh het trong buoi
 * - "set": dem lai ong cau va chot con dung bao nhieu trai
 */
export const SHUTTLE_ENTRY_KINDS = ["add", "use", "set"] as const;

export type ShuttleEntryKind = (typeof SHUTTLE_ENTRY_KINDS)[number];

/** Mot dong lich su da luu: `delta` la thay doi thuc te len kho. */
export type ShuttleEntryLike = {
  delta: number;
};

/**
 * Kho hien tai = tong moi thay doi. Luu delta chu khong luu con so cuoi cung:
 * xoa mot dong go sai thi cac dong sau no van dung, khong phai tinh lai tay.
 */
export function computeShuttleStock(entries: ShuttleEntryLike[]) {
  return entries.reduce((total, entry) => total + entry.delta, 0);
}

/**
 * Doi mot thao tac thanh delta. "set" la hieu so voi kho hien tai — nho vay ca
 * ba loai cung mot duong ghi, va lich su van doc duoc ("chot lai 8 trai").
 */
export function shuttleDelta(kind: ShuttleEntryKind, quantity: number, currentStock: number) {
  if (kind === "add") return quantity;
  if (kind === "use") return -quantity;
  return quantity - currentStock;
}

/**
 * Kho khong duoc am (khong the "con -2 trai") va khong duoc vuot tran. Tra ve
 * ly do de tang tren bien thanh loi HTTP hoac cau canh bao tren man hinh.
 */
export function shuttleStockError(nextStock: number): "shuttle_stock_negative" | "shuttle_stock_too_large" | null {
  if (nextStock < 0) return "shuttle_stock_negative";
  if (nextStock > MAX_SHUTTLE_STOCK) return "shuttle_stock_too_large";
  return null;
}
