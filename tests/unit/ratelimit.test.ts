import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getClientIp, isRateLimited } from "../../src/lib/ratelimit";

describe("isRateLimited", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("allows up to the limit inside the window, then blocks (429 semantics)", () => {
    vi.setSystemTime(1_700_000_000_000);
    const key = `k-${Math.random()}`;
    expect(isRateLimited(key, 3, 60_000)).toBe(false);
    expect(isRateLimited(key, 3, 60_000)).toBe(false);
    expect(isRateLimited(key, 3, 60_000)).toBe(false);
    expect(isRateLimited(key, 3, 60_000)).toBe(true);
    expect(isRateLimited(key, 3, 60_000)).toBe(true); // stays blocked in-window
  });

  it("resets once the window expires", () => {
    vi.setSystemTime(1_700_000_000_000);
    const key = `k-${Math.random()}`;
    expect(isRateLimited(key, 1, 60_000)).toBe(false);
    expect(isRateLimited(key, 1, 60_000)).toBe(true);
    vi.setSystemTime(1_700_000_000_000 + 60_001);
    expect(isRateLimited(key, 1, 60_000)).toBe(false);
  });

  it("tracks keys independently", () => {
    vi.setSystemTime(1_700_000_000_000);
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    expect(isRateLimited(a, 1, 60_000)).toBe(false);
    expect(isRateLimited(b, 1, 60_000)).toBe(false);
    expect(isRateLimited(a, 1, 60_000)).toBe(true);
    expect(isRateLimited(b, 1, 60_000)).toBe(true);
  });
});

describe("getClientIp", () => {
  it("takes the first hop of x-forwarded-for, trimmed", () => {
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": " 1.2.3.4 , 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip, then 'unknown'", () => {
    const real = new Request("http://x", { headers: { "x-real-ip": "9.8.7.6 " } });
    expect(getClientIp(real)).toBe("9.8.7.6");
    expect(getClientIp(new Request("http://x"))).toBe("unknown");
  });
});
