import { z } from "zod";

/**
 * Zod-validated environment (Cielo Platform Standard §4). Import `env` from here
 * instead of reading `process.env` directly, so a malformed/empty var fails fast
 * and loud at boot instead of surfacing as a confusing runtime error deep in a
 * request. Vars that have a graceful fallback (SupersDeck runs in seed/demo mode
 * without Supabase) are `.optional()`; when present they must be non-empty.
 *
 * Full-conformance upgrade path: `@t3-oss/env-nextjs` with server/client split.
 */
const nonEmpty = z.string().min(1).optional();

const schema = z.object({
  // Every variable this app reads, derived from the source by
  // sim/envguard/envguard.mjs rather than maintained by hand — a
  // hand-written list drifts the day a feature lands, and this one had
  // drifted to 1 of 40.
  //
  // They are declared `.optional()` DELIBERATELY. This schema's job is
  // parity: to describe the app's real surface, and to reject a variable
  // that is present but empty. It is NOT the place that decides what
  // production must have — that lives in src/lib/production-env.ts,
  // which throws at boot and is proven able to fail by execution.
  // Making everything required here would refuse local development,
  // which legitimately runs without Stripe, Twilio or Dropbox.
  ANTHROPIC_API_KEY: nonEmpty,
  CRON_SECRET: nonEmpty,
  DATABASE_URL: nonEmpty,
  DROPBOX_APP_KEY: nonEmpty,
  FHI_INGEST_URL: nonEmpty,
  GATELOG_SIGNIN_MAP: nonEmpty,
  GATELOG_SYNC_SECRET: nonEmpty,
  GATELOG_SYNC_URL: nonEmpty,
  GATE_BLOCK_MISSING_COI: nonEmpty,
  INTAKE_TOKEN_SECRET: nonEmpty,
  KV_REST_API_TOKEN: nonEmpty,
  KV_REST_API_URL: nonEmpty,
  NEXT_PUBLIC_BASE_URL: nonEmpty,
  NEXT_PUBLIC_DEMO: nonEmpty,
  NEXT_PUBLIC_SENTRY_DSN: nonEmpty,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: nonEmpty,
  NEXT_PUBLIC_SUPABASE_URL: nonEmpty,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: nonEmpty,
  OWNER_ALERT_EMAIL: nonEmpty,
  OWNER_ALERT_PHONE: nonEmpty,
  PERF_DATABASE_URL: nonEmpty,
  RESEND_API_KEY: nonEmpty,
  RESEND_FROM_EMAIL: nonEmpty,
  SEED_DATABASE_URL: nonEmpty,
  SERVICE_ROLE_BUDGET: nonEmpty,
  SIGNATURE_VISION_MODEL: nonEmpty,
  STORAGE_REST_API_TOKEN: nonEmpty,
  STORAGE_REST_API_URL: nonEmpty,
  STRIPE_PRICE_ID_BUILDING_MONTHLY: nonEmpty,
  STRIPE_SECRET_KEY: nonEmpty,
  STRIPE_WEBHOOK_SECRET: nonEmpty,
  SUPABASE_SERVICE_ROLE_KEY: nonEmpty,
  SUPERSDECK_SYNC_SECRET: nonEmpty,
  TWILIO_ACCOUNT_SID: nonEmpty,
  TWILIO_AUTH_TOKEN: nonEmpty,
  TWILIO_FROM_NUMBER: nonEmpty,
  UPSTASH_REDIS_REST_TOKEN: nonEmpty,
  UPSTASH_REDIS_REST_URL: nonEmpty,
  VAPID_CONTACT_EMAIL: nonEmpty,
  VAPID_PRIVATE_KEY: nonEmpty,
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment variables:\n", parsed.error.message);
  throw new Error("Invalid environment variables — see logs above.");
}

export const env = parsed.data;
