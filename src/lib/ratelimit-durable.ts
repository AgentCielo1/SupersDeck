import { getClientIp, isRateLimited } from "@/lib/ratelimit";

// =============================================================================
//  Durable rate limiter (Upstash Redis, with in-memory fallback)
// =============================================================================
//  The in-memory limiter in ratelimit.ts only holds within one warm serverless
//  instance — it resets on cold start and doesn't coordinate across the fleet.
//  This wrapper prefers a shared Upstash Redis counter (a fixed window via
//  INCR + EXPIRE) so the limit holds ACROSS instances, and transparently falls
//  back to the in-memory limiter when Upstash isn't provisioned or a call fails.
//
//  Dependency-free on purpose: talks to Upstash's REST API with plain fetch, so
//  there's no new package to install and nothing to break on the shared tree.
//  Provisions itself the moment UPSTASH_REDIS_REST_URL / _TOKEN land in env.
// =============================================================================

export { getClientIp };

// Accept either the native Upstash names (UPSTASH_REDIS_REST_*) or the names the
// Vercel Marketplace integration injects (KV_REST_API_* by default, or
// STORAGE_REST_API_* if left on the default prefix). Same Upstash REST endpoint
// and token either way — this just tolerates however the DB got wired up.
const UPSTASH_URL =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  process.env.STORAGE_REST_API_URL;
const UPSTASH_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  process.env.STORAGE_REST_API_TOKEN;

/** True if this key is OVER the limit in the current window (→ 429). Async. */
export async function isRateLimitedDurable(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return isRateLimited(key, limit, windowMs);
  }
  try {
    const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
    // Pipeline: INCR the counter, then (re)set its TTL. First hit creates the
    // key at 1; the window closes windowSec later.
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(windowSec)],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return isRateLimited(key, limit, windowMs);
    const out = (await res.json()) as Array<{ result?: unknown }>;
    const count = Array.isArray(out) ? Number(out[0]?.result ?? 0) : 0;
    if (!Number.isFinite(count) || count <= 0) {
      return isRateLimited(key, limit, windowMs);
    }
    return count > limit;
  } catch {
    // Network/Upstash hiccup — degrade to the local limiter rather than
    // fail-open (some cap is better than none) or hard-fail the upload.
    return isRateLimited(key, limit, windowMs);
  }
}
