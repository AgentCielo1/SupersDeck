// =============================================================================
//  production-env — variables whose ABSENCE silently disables a security guard
// =============================================================================
//  WHY THIS FILE EXISTS
//
//  src/lib/intake-token.ts implements a correct HMAC guard for the two public
//  intake endpoints. It was shipped "dormant until configured" so that adding it
//  could not break live intake before the env var landed in Vercel. The env var
//  never landed. Months later intakeTokensEnabled() still returned false, both
//  anonymous endpoints were rate-limit-only, and the single piece of evidence
//  was a console.warn in a serverless log nobody reads.
//
//  That is the failure mode this file exists to make impossible: a guard that
//  reads as present in the source and does nothing in production. The rule is
//  now that the absence REFUSES THE BOOT instead of warning.
//
//  The predicates below are pure and exported so a test can prove each one
//  actually fires in production and actually stands down under
//  SKIP_ENV_VALIDATION — a dormant boot check would be the same bug one level up.
//
//  SKIP_ENV_VALIDATION exists because CI has no real secrets and a build that
//  demanded them could not run. Which means: A GREEN CI RUN IS NOT EVIDENCE THAT
//  ANY OF THESE IS SET. Only the real deploy can tell, and it will, by failing
//  with the sentence below.
// =============================================================================

export interface EnvCheckInput {
  nodeEnv: string | undefined;
  hasSecret: boolean;
  skipValidation: boolean;
}

/**
 * True when INTAKE_TOKEN_SECRET must be present and is not.
 *
 * Production only: local dev and CI legitimately run without it, and the intake
 * routes' rate limiter still applies there.
 */
export function intakeGuardMustBeConfigured({
  nodeEnv,
  hasSecret,
  skipValidation,
}: EnvCheckInput): boolean {
  if (skipValidation) return false;
  if (nodeEnv !== "production") return false;
  return !hasSecret;
}

export const INTAKE_SECRET_MISSING_MESSAGE =
  "INTAKE_TOKEN_SECRET is required in production — without it intakeTokensEnabled() " +
  "returns false and POST /api/work-orders and POST /api/intake/photo accept " +
  "anonymous writes guarded by rate-limit alone. Generate one with " +
  "`openssl rand -hex 32`, set it in the Vercel project (Production), then redeploy.";

/**
 * THE VARIABLES PRODUCTION REQUIRES THAT NO GATE IN THIS REPOSITORY CAN CHECK.
 *
 * Deliberately does NOT include CLOUD_ALLOWED_ROOTS: the cloud drive is an
 * optional feature and its guard already fails CLOSED when unset (every path is
 * refused), so an absent value costs a dark file browser, not an open door.
 */
export const PRODUCTION_REQUIRED_ENV = [
  "INTAKE_TOKEN_SECRET",
  // Added 2026-09-02. src/lib/db.ts falls back to the bundled SAMPLE_* records
  // when Supabase is unconfigured, so an unconfigured production deployment does
  // not fail — it serves fictional buildings, units and work orders as if they
  // were the client's. That is BUG-002's shape, and src/env.ts cannot catch it:
  // every variable there is `.optional()`, so an environment with no Supabase at
  // all passes validation.
  //
  // Verified against production BEFORE requiring these: GET /api/health reported
  // servingRealData true, demo false.
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export const SUPABASE_MISSING_MESSAGE =
  "Supabase is not configured in production. src/lib/db.ts falls back to the " +
  "bundled sample data, so this deployment would serve fictional buildings and " +
  "work orders as real records. Set NEXT_PUBLIC_SUPABASE_URL and " +
  "NEXT_PUBLIC_SUPABASE_ANON_KEY in the Vercel project (Production), then redeploy.";

export interface SupabaseEnvInput {
  nodeEnv: string | undefined;
  hasUrl: boolean;
  hasAnonKey: boolean;
  skipValidation: boolean;
}

/**
 * True when production would serve seed data as real.
 *
 * Pure and exported so a test can prove it fires — the same discipline as the
 * intake guard, because a boot check nobody has watched fail is the bug it
 * exists to prevent, one level up.
 */
export function supabaseMustBeConfigured({
  nodeEnv,
  hasUrl,
  hasAnonKey,
  skipValidation,
}: SupabaseEnvInput): boolean {
  if (skipValidation) return false;
  if (nodeEnv !== "production") return false;
  return !hasUrl || !hasAnonKey;
}

/**
 * Called once at server boot (src/instrumentation.ts). Throws — which in a
 * Next.js server means the instance does not come up.
 */
export function assertProductionEnv(env: NodeJS.ProcessEnv = process.env): void {
  if (
    intakeGuardMustBeConfigured({
      nodeEnv: env.NODE_ENV,
      hasSecret: Boolean(env.INTAKE_TOKEN_SECRET),
      skipValidation: Boolean(env.SKIP_ENV_VALIDATION),
    })
  ) {
    throw new Error(INTAKE_SECRET_MISSING_MESSAGE);
  }

  if (
    supabaseMustBeConfigured({
      nodeEnv: env.NODE_ENV,
      hasUrl: Boolean(env.NEXT_PUBLIC_SUPABASE_URL),
      hasAnonKey: Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      skipValidation: Boolean(env.SKIP_ENV_VALIDATION),
    })
  ) {
    throw new Error(SUPABASE_MISSING_MESSAGE);
  }
}
