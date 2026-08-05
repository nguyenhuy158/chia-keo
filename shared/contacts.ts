/**
 * Danh ba nguoi quen, gop tu hai nguon:
 *
 * 1. Bang `contacts` — nguoi dung tu nhap, sua/xoa duoc, luu duoc ca nguoi
 *    chua tham gia cuoc chia nao.
 * 2. Suy ra tu participant cac cuoc chia da tao (`buildContacts`) — khong ai
 *    phai nhap tay, va nhung ai da tung di cung deu co san.
 *
 * Hai nguon thi phai co luat uu tien ro rang, khong thi nguoi dung khong biet
 * so tai khoan nao la that: `mergeContacts` cho ban tu nhap thang, vi do la
 * thu vua duoc sua tay. Cac cuoc chia da xong khong bi sua theo danh ba —
 * so tien da chia roi thi khong duoc doi vi mot lan sua so tai khoan.
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
  /**
   * "book": co dong trong bang contacts nen sua/xoa duoc.
   * "history": chi suy ra tu cuoc chia cu — sua duoc nhung sua la tao dong moi
   * trong danh ba, khong doi lai du lieu cuoc chia da xong.
   */
  source: "book" | "history";
  /** id trong bang contacts; null voi nguoi chi suy ra tu lich su. */
  id: string | null;
};

/** Mot dong danh ba do user tu nhap. */
export type ContactBookRow = {
  id: string;
  name: string;
  bankId: string;
  accountNo: string;
  accountName: string;
  updatedAt: string;
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
          source: "history",
          id: null,
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

  return sortContacts([...byKey.values()].map((entry) => entry.contact));
}

/** Nguoi hay di cung len truoc; cung so lan thi nguoi moi nhat truoc. */
function sortContacts(contacts: Contact[]): Contact[] {
  return [...contacts].sort(
    (a, b) =>
      b.gameCount - a.gameCount ||
      b.lastUsedAt.localeCompare(a.lastUsedAt) ||
      a.name.localeCompare(b.name, "vi"),
  );
}

/**
 * Gop danh ba tu nhap voi danh sach suy ra tu lich su.
 *
 * Ban tu nhap thang: ten va so tai khoan trong bang `contacts` de len tren,
 * vi do la thu nguoi dung vua sua tay — con lich su la du lieu cu. Nguoc lai
 * `gameCount` van lay tu lich su, vi bang `contacts` khong biet gi ve so lan
 * di cung.
 */
export function mergeContacts(book: ContactBookRow[], derived: Contact[]): Contact[] {
  const byKey = new Map(derived.map((contact) => [contact.key, contact]));

  for (const row of book) {
    const name = capitalizeName(row.name.trim());
    if (!name) continue;

    const key = normalizeContactName(name);
    const fromHistory = byKey.get(key);

    byKey.set(key, {
      key,
      name,
      bankId: row.bankId,
      accountNo: row.accountNo,
      accountName: row.accountName,
      gameCount: fromHistory?.gameCount ?? 0,
      // Nguoi moi nhap chua di cuoc nao: lay luc sua de no khong tut cuoi cung.
      lastUsedAt: fromHistory?.lastUsedAt || row.updatedAt,
      source: "book",
      id: row.id,
    });
  }

  return sortContacts([...byKey.values()]);
}
