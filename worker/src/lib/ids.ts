const GAME_CODE_LENGTH = 6;
const GAME_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
/** Chu, so, khong dau, khong ky tu de nham (0/O, 1/l/I) — token ngan cho de doc/nho. */
const SHARE_TOKEN_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
const SHARE_TOKEN_LENGTH = 4;

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function createGameCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(GAME_CODE_LENGTH));
  return Array.from(bytes, (byte) => GAME_CODE_ALPHABET[byte % GAME_CODE_ALPHABET.length]).join("");
}

/**
 * Token chi 4 ky tu (~55^4 ~ 9 trieu kha nang) nen KHONG an toan truoc
 * brute-force don le — bat buoc di kem rate-limit GET /api/share/:token
 * (xem SHARE_VIEW_RATE_LIMIT trong worker/src/index.ts).
 */
export function createShareToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(SHARE_TOKEN_LENGTH));
  return Array.from(bytes, (byte) => SHARE_TOKEN_ALPHABET[byte % SHARE_TOKEN_ALPHABET.length]).join(
    "",
  );
}

export function nowIso() {
  return new Date().toISOString();
}
