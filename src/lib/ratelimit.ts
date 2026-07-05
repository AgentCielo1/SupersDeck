// Per-IP sliding-window rate limiter.
//
// NOTE (Cielo Platform Standard): the production standard is @upstash/ratelimit
// (Redis) so the limit holds ACROSS serverless instances. This in-memory version
// is the immediate mitigation — it caps abuse per warm Vercel instance and is a
// drop-in to swap for Upstash once creds are provisioned. Same call shape.

const buckets = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

/** Returns true if this key is OVER the limit in the current window (→ 429). */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  b.count += 1;
  return b.count > limit;
}
