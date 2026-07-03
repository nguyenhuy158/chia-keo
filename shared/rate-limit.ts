export type FixedWindowConfig = {
  /** So request toi da trong mot cua so. */
  limit: number;
  /** Do dai cua so tinh bang ms. */
  windowMs: number;
};

const MAX_TRACKED_KEYS = 10_000;

/**
 * Rate limiter fixed-window giu trong bo nho. Luu y: tren Cloudflare Workers
 * bo dem chi song trong pham vi mot isolate va reset khi deploy — du de chan
 * brute-force tho, muon gioi han toan cuc thi dung Rate Limiting binding.
 */
export function createFixedWindowLimiter(config: FixedWindowConfig) {
  const windows = new Map<string, { count: number; resetAt: number }>();

  function prune(now: number) {
    for (const [key, window] of windows) {
      if (now >= window.resetAt) windows.delete(key);
    }
  }

  function isAllowed(key: string, now: number): boolean {
    const window = windows.get(key);

    if (!window || now >= window.resetAt) {
      if (windows.size >= MAX_TRACKED_KEYS) prune(now);
      windows.set(key, { count: 1, resetAt: now + config.windowMs });
      return true;
    }

    if (window.count >= config.limit) {
      return false;
    }

    window.count += 1;
    return true;
  }

  return { isAllowed };
}
