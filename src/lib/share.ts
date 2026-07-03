import { parseGame } from "./schema";
import type { Game } from "../types";

export function encodeShareGame(game: Game) {
  const bytes = new TextEncoder().encode(JSON.stringify(game));
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function decodeShareGame(value: string) {
  try {
    const padded = value
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return parseGame(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}
