/**
 * Danh ba nguoi quen. Danh ba khong phai mot bang rieng: no duoc suy ra tu
 * chinh nhung participant da tung nhap o cac cuoc chia cua user.
 *
 * Ly do khong luu bang rieng: neu co ca bang `contacts` lan `participants` thi
 * sua so tai khoan o mot ben, ben kia van con so cu — va nguoi dung khong biet
 * ben nao la that. Suy ra tu lich su thi khong bao gio lech, va khong can ai
 * "them vao danh ba" bang tay.
 */

import { capitalizeName, QUICK_PARTICIPANT_PREFIX } from "./schemas";

/** Mot participant da tung ton tai, kem tai khoan nhan tien (neu co). */
export type ContactSourceRow = {
  name: string;
  bankId: string;
  accountNo: string;
  accountName: string;
  gameId: string;
  /** Luc participant duoc tao; dung de biet lan gan nhat va ban thong tin moi nhat. */
  createdAt: string;
};

export type Contact = {
  /** Ten da chuan hoa; on dinh nen dung lam key React va id luc chon. */
  key: string;
  name: string;
  bankId: string;
  accountNo: string;
  accountName: string;
  /** So cuoc chia da co nguoi nay — nguoi hay di cung se len dau danh sach. */
  gameCount: number;
  lastUsedAt: string;
};

/** "hồng " va "Hồng" la cung mot nguoi; khong bo dau vi "Hà" khac "Ha". */
export function normalizeContactName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Ten mac dinh luc tao nhanh ("Người 1") chua phai ten ai, khong vao danh ba. */
function isPlaceholderName(name: string): boolean {
  return new RegExp(`^${QUICK_PARTICIPANT_PREFIX} \\d+$`, "i").test(name.trim());
}

function hasAccount(row: { accountNo: string }): boolean {
  return row.accountNo.trim() !== "";
}

/**
 * Gop participant tu moi cuoc chia thanh danh ba, moi nguoi mot dong.
 *
 * Thong tin ngan hang lay tu lan gan nhat *co* so tai khoan, chu khong phai
 * lan gan nhat: mot cuoc chia sau do bo trong phan QR khong duoc xoa so tai
 * khoan da biet.
 */
export function buildContacts(rows: ContactSourceRow[]): Contact[] {
  const byKey = new Map<string, { contact: Contact; gameIds: Set<string>; accountAt: string }>();

  // Xu ly theo thu tu thoi gian de "lan sau ghi de lan truoc" dung cho moi field.
  const ordered = [...rows].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const row of ordered) {
    // Ten cu trong DB co the viet thuong (nhap truoc khi app tu hoa chu dau);
    // hoa lai cho danh ba hien dong deu.
    const name = capitalizeName(row.name.trim());
    if (!name || isPlaceholderName(name)) continue;

    const key = normalizeContactName(name);
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, {
        contact: {
          key,
          name,
          bankId: row.bankId,
          accountNo: row.accountNo,
          accountName: row.accountName,
          gameCount: 1,
          lastUsedAt: row.createdAt,
        },
        gameIds: new Set([row.gameId]),
        accountAt: hasAccount(row) ? row.createdAt : "",
      });
      continue;
    }

    existing.gameIds.add(row.gameId);
    existing.contact.gameCount = existing.gameIds.size;
    existing.contact.lastUsedAt = row.createdAt;
    // Cach viet ten moi nhat thang, de nguoi dung sua "hồng" -> "Hồng" duoc.
    existing.contact.name = name;

    if (hasAccount(row)) {
      existing.contact.bankId = row.bankId;
      existing.contact.accountNo = row.accountNo;
      existing.contact.accountName = row.accountName;
      existing.accountAt = row.createdAt;
    }
  }

  return [...byKey.values()]
    .map((entry) => entry.contact)
    .sort(
      (a, b) =>
        b.gameCount - a.gameCount ||
        b.lastUsedAt.localeCompare(a.lastUsedAt) ||
        a.name.localeCompare(b.name, "vi"),
    );
}
