import { normalizeContactName } from "../../../../shared/contacts";

const EMPTY_NAME_SEED = "?";

const cache = new Map<string, string>();

async function buildAvatarUri(seed: string, size: number) {
  const { funEmoji } = await import("@dicebear/collection");
  const { createAvatar } = await import("@dicebear/core");
  return createAvatar(funEmoji, { seed, size }).toDataUri();
}

function cacheKey(seed: string, size: number) {
  return `${size}:${seed}`;
}

function toSeed(name: string) {
  return normalizeContactName(name) || EMPTY_NAME_SEED;
}

export function getCachedAvatarUri(name: string, size: number) {
  return cache.get(cacheKey(toSeed(name), size));
}

export async function loadAvatarUri(name: string, size: number) {
  const seed = toSeed(name);
  const key = cacheKey(seed, size);
  const cached = cache.get(key);
  if (cached) return cached;
  const uri = await buildAvatarUri(seed, size);
  cache.set(key, uri);
  return uri;
}
