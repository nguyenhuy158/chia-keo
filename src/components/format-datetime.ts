const TIME_FORMAT = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" });

export function formatDateTime(iso: string, opts?: { includeYear?: boolean }) {
  const includeYear = opts?.includeYear !== false;
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: includeYear ? "numeric" : undefined,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso: string) {
  return TIME_FORMAT.format(new Date(iso));
}
