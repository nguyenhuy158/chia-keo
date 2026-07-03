const GAME_CODE_LENGTH = 6;
const GAME_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const SHARE_TOKEN_BYTES = 24;

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function createGameCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(GAME_CODE_LENGTH));
  return Array.from(bytes, (byte) => GAME_CODE_ALPHABET[byte % GAME_CODE_ALPHABET.length]).join("");
}

export function createShareToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(SHARE_TOKEN_BYTES));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function nowIso() {
  return new Date().toISOString();
}
