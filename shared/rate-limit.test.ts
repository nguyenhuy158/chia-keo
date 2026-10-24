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

  it("don cac key het han khi bo dem dat gioi han", () => {
    const limiter = createFixedWindowLimiter({ limit: 1, windowMs: 1000 });

    for (let index = 0; index < 10_000; index += 1) {
      expect(limiter.isAllowed(`ip${index}`, index === 0 ? 1 : 0)).toBe(true);
    }

    expect(limiter.isAllowed("new-ip", 1000)).toBe(true);
    expect(limiter.isAllowed("ip0", 1000)).toBe(false);
    expect(limiter.isAllowed("ip1", 1000)).toBe(true);
  });
});
