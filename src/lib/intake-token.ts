import crypto from "crypto";

// =============================================================================
//  intake-token — signed guard for the PUBLIC tenant intake endpoints
// =============================================================================
//  POST /api/work-orders and POST /api/intake/photo must stay reachable without
//  a login (tenants don't have accounts — they arrive via the lobby QR poster).
//  But "public" shouldn't mean "any script on the internet can insert rows and
//  burn translate/email/storage spend". So the server-rendered intake page
//  mints a short-lived HMAC token bound to the building, and the API routes
//  refuse anonymous writes that don't carry it.
//
//  Token format:  {expiryEpochMs}.{base64url(HMAC_SHA256(secret, building.exp))}
//
//   • Building-scoped — a token minted for bldg-1 can't post to bldg-2.
//   • Expiring        — replay window is bounded (default 12 h, generous so a
//                       tenant can leave the form open).
//   • Stateless       — verify needs no DB round-trip; rotation = rotate the
//                       secret env var.
//
//  Same dormant-until-configured pattern as fhi-sync and the Upstash limiter:
//  until INTAKE_TOKEN_SECRET is set in env, the guard is OFF (routes log a
//  warning and fall back to rate-limit-only), so shipping this cannot break
//  the live intake flow before the env var lands in Vercel.
//
//    INTAKE_TOKEN_SECRET   generate with: openssl rand -hex 32
// =============================================================================

const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

// Read at call time (not module load) so tests and late-injected env work.
function secret(): string | undefined {
  return process.env.INTAKE_TOKEN_SECRET || undefined;
}

/** True once INTAKE_TOKEN_SECRET is configured — the guard is enforced. */
export function intakeTokensEnabled(): boolean {
  return Boolean(secret());
}

// Canonicalize the building id the same way on mint and verify so the URL
// param ("Bldg-1") and the stored id ("bldg-1") can't drift apart.
function canon(buildingId: string): string {
  return String(buildingId ?? "").trim().toLowerCase();
}

function sign(key: string, buildingId: string, exp: number): string {
  return crypto
    .createHmac("sha256", key)
    .update(`${canon(buildingId)}.${exp}`)
    .digest("base64url");
}

/**
 * Mint a building-scoped intake token. Returns "" when the guard is not
 * configured (callers just pass the empty string through; verify treats the
 * disabled state as open).
 */
export function mintIntakeToken(
  buildingId: string,
  ttlMs: number = DEFAULT_TTL_MS,
): string {
  const key = secret();
  if (!key) return "";
  const exp = Date.now() + ttlMs;
  return `${exp}.${sign(key, buildingId, exp)}`;
}

/**
 * Strict check: token is well-formed, unexpired, and signed for THIS building.
 * Returns false when the guard is disabled — gate calls with
 * `intakeTokensEnabled()` first (that's what the API routes do).
 */
export function verifyIntakeToken(
  token: string | null | undefined,
  buildingId: string,
): boolean {
  const key = secret();
  if (!key || !token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const exp = Number(token.slice(0, dot));
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const givenSig = token.slice(dot + 1);
  const wantSig = sign(key, buildingId, exp);
  const a = Buffer.from(givenSig);
  const b = Buffer.from(wantSig);
  // timingSafeEqual throws on length mismatch — check first (length is not
  // secret; both are base64url SHA-256 digests when legitimate).
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
