const GAME_CODE_LENGTH = 6;
const GAME_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
/** Chu, so, khong dau, khong ky tu de nham (0/O, 1/l/I) — token ngan cho de doc/nho. */
const SHARE_TOKEN_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
const SHARE_TOKEN_LENGTH = 4;

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

/** Chuoi `length` ky tu ngau nhien (crypto) lay tu `alphabet`. */
function randomFromAlphabet(alphabet: string, length: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function createGameCode() {
  return randomFromAlphabet(GAME_CODE_ALPHABET, GAME_CODE_LENGTH);
}

/**
 * Token chi 4 ky tu (~55^4 ~ 9 trieu kha nang) nen KHONG an toan truoc
 * brute-force don le — bat buoc di kem rate-limit GET /api/share/:token
 * (xem SHARE_VIEW_RATE_LIMIT trong worker/src/index.ts).
 */
export function createShareToken() {
  return randomFromAlphabet(SHARE_TOKEN_ALPHABET, SHARE_TOKEN_LENGTH);
}

export function nowIso() {
  return new Date().toISOString();
}
