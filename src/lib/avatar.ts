import { Avatar, Style } from "@dicebear/core";
import loreleiNeutral from "@dicebear/styles/lorelei-neutral.json";

const avatarStyle = new Style(loreleiNeutral);
const AVATAR_SIZE = 96;
const AVATAR_BORDER_RADIUS = 50;
const AVATAR_SUGGESTION_COUNT = 4;
const AVATAR_BACKGROUND_COLORS = ["d1fae5", "dbeafe", "fef3c7", "fce7f3"];

export function createAvatarSeed(name: string, index = 0) {
  const cleanName = name.trim() || "người dùng";

  return `${cleanName.toLowerCase()}-${index}`;
}

export function getAvatarSuggestionSeeds(name: string) {
  return Array.from({ length: AVATAR_SUGGESTION_COUNT }, (_, index) => createAvatarSeed(name, index));
}

export function buildAvatarDataUri(seed: string, title: string) {
  return new Avatar(avatarStyle, {
    seed,
    title,
    size: AVATAR_SIZE,
    borderRadius: AVATAR_BORDER_RADIUS,
    backgroundColor: AVATAR_BACKGROUND_COLORS,
  }).toDataUri();
}
