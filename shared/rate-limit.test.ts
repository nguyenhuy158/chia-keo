import { describe, expect, it } from "vitest";
import { createFixedWindowLimiter } from "./rate-limit";

describe("createFixedWindowLimiter", () => {
  it("cho phep toi da `limit` request trong mot cua so", () => {
    const limiter = createFixedWindowLimiter({ limit: 3, windowMs: 1000 });

    expect(limiter.isAllowed("ip1", 0)).toBe(true);
    expect(limiter.isAllowed("ip1", 100)).toBe(true);
    expect(limiter.isAllowed("ip1", 200)).toBe(true);
    expect(limiter.isAllowed("ip1", 300)).toBe(false);
    expect(limiter.isAllowed("ip1", 999)).toBe(false);
  });

  it("reset sau khi het cua so", () => {
    const limiter = createFixedWindowLimiter({ limit: 1, windowMs: 1000 });

    expect(limiter.isAllowed("ip1", 0)).toBe(true);
    expect(limiter.isAllowed("ip1", 500)).toBe(false);
    expect(limiter.isAllowed("ip1", 1000)).toBe(true);
  });

  it("dem rieng tung key", () => {
    const limiter = createFixedWindowLimiter({ limit: 1, windowMs: 1000 });

    expect(limiter.isAllowed("ip1", 0)).toBe(true);
    expect(limiter.isAllowed("ip2", 0)).toBe(true);
    expect(limiter.isAllowed("ip1", 1)).toBe(false);
    expect(limiter.isAllowed("ip2", 1)).toBe(false);
  });
});
