const PARTICIPANT_NAME_LOCALE = "vi-VN";
const WORD_PATTERN = /[\p{L}\p{M}]+/gu;

export function toParticipantTitleCase(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(WORD_PATTERN, (word) => {
      const characters = Array.from(word);
      const firstCharacter = characters[0] || "";
      const rest = characters.slice(1).join("");

      return `${firstCharacter.toLocaleUpperCase(PARTICIPANT_NAME_LOCALE)}${rest.toLocaleLowerCase(
        PARTICIPANT_NAME_LOCALE,
      )}`;
    });
}
