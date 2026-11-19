const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MONTH_START = 8;
const MONTH_START = 5;
const MONTH_END = 7;
const DAY_END = 10;

export function isIsoDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function isValidPlayedRange(playedFrom: string, playedTo: string) {
  if (playedFrom === "") return playedTo === "";
  if (!isIsoDate(playedFrom)) return false;
  if (playedTo === "") return true;
  return isIsoDate(playedTo) && playedTo >= playedFrom;
}

function formatDayMonth(value: string) {
  return `${value.slice(DAY_MONTH_START, DAY_END)}/${value.slice(MONTH_START, MONTH_END)}`;
}

export function formatPlayedRange(playedFrom: string, playedTo: string) {
  if (playedFrom === "") return "";
  if (playedTo === "" || playedTo === playedFrom) {
    return `${formatDayMonth(playedFrom)}/${playedFrom.slice(0, 4)}`;
  }
  return `${formatDayMonth(playedFrom)} - ${formatDayMonth(playedTo)}/${playedTo.slice(0, 4)}`;
}
