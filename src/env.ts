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
  // Supabase (optional → demo/seed mode when absent)
  NEXT_PUBLIC_SUPABASE_URL: nonEmpty,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: nonEmpty,
  SUPABASE_SERVICE_ROLE_KEY: nonEmpty,
  // Integrations (features degrade when absent)
  ANTHROPIC_API_KEY: nonEmpty,
  RESEND_API_KEY: nonEmpty,
  CRON_SECRET: nonEmpty,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: nonEmpty,
  VAPID_PRIVATE_KEY: nonEmpty,
  NEXT_PUBLIC_BASE_URL: nonEmpty,
  NEXT_PUBLIC_SENTRY_DSN: nonEmpty,
  NEXT_PUBLIC_DEMO: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment variables:\n", parsed.error.message);
  throw new Error("Invalid environment variables — see logs above.");
}

export const env = parsed.data;
