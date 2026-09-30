import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getServerSupabase } from "@/lib/supabase";
import {
  missingPolicies,
  tablesWithoutRead,
  type PolicyRow,
} from "@/lib/policy-manifest";

export const dynamic = "force-dynamic";

/**
 * Health, and specifically: is this deployment configured, or is it quietly
 * serving the bundled sample data as if it were real?
 *
 * src/lib/db.ts falls back to SAMPLE_* when Supabase is unconfigured, and
 * src/env.ts cannot catch that — every variable there is `.optional()`, so an
 * environment with no Supabase at all passes validation. This endpoint used to
 * return {status:"ok"} unconditionally, which made it impossible to tell a
 * working deployment from a demo one from the outside.
 *
 * It ALSO answers: are the RLS policies the app depends on actually present?
 * Four incidents were "a policy quietly missing" (units UPDATE, the cron's
 * building read, the work-orders storage bucket, work_orders UPDATE) — each
 * invisible until a person hit it. The live policy list (via
 * list_app_policies(), supabase/migration-policy-health.sql) is compared
 * against src/lib/policy-manifest.ts on every call, so drift turns this
 * endpoint degraded instead of waiting to be discovered in a hallway.
 *
 * Names only. Never values.
 */
const present = (k: string) => Boolean(process.env[k] && process.env[k]!.length > 0);

type PolicyHealth =
  | { checked: true; ok: boolean; missing: string[]; tables_without_read: string[] }
  | { checked: false; reason: string };

async function checkPolicies(): Promise<PolicyHealth> {
  const s = getServerSupabase();
  if (!s) return { checked: false, reason: "Supabase not configured" };
  const { data, error } = await s.rpc("list_app_policies");
  if (error) {
    return {
      checked: false,
      reason: `list_app_policies unavailable (${error.message}) — run supabase/migration-policy-health.sql`,
    };
  }
  const live = (data ?? []) as PolicyRow[];
  const missing = missingPolicies(live);
  const noRead = tablesWithoutRead(live);
  return {
    checked: true,
    ok: missing.length === 0 && noRead.length === 0,
    missing,
    tables_without_read: noRead,
  };
}

export async function GET() {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: present("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: present("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: present("SUPABASE_SERVICE_ROLE_KEY"),
    INTAKE_TOKEN_SECRET: present("INTAKE_TOKEN_SECRET"),
    CRON_SECRET: present("CRON_SECRET"),
    NEXT_PUBLIC_DEMO: process.env.NEXT_PUBLIC_DEMO ?? null,
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
  };

  // The question the old endpoint could not answer.
  const servingRealData =
    env.NEXT_PUBLIC_SUPABASE_URL &&
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    env.NEXT_PUBLIC_DEMO !== "1";

  const policies = await checkPolicies();
  // A verified missing policy degrades the deployment; "couldn't check" does
  // NOT (a broken checker must never fake an outage) but is reported.
  const policiesOk = policies.checked ? policies.ok : null;

  // The per-variable map enumerates which guards are configured, which is a
  // small but real disclosure — it tells an unauthenticated caller whether, say,
  // the intake HMAC secret is set. So the public answer is the aggregate only.
  // The detail is available to a caller holding CRON_SECRET, the same secret the
  // scheduled routes already authenticate with. Policy names follow the same
  // rule: the public sees the boolean, the secret-holder sees which are missing.
  const authorised =
    Boolean(process.env.CRON_SECRET) &&
    headers().get("authorization") === `Bearer ${process.env.CRON_SECRET}`;

  const healthy = Boolean(servingRealData) && policiesOk !== false;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      app: "supersdeck",
      servingRealData,
      demo: env.NEXT_PUBLIC_DEMO === "1",
      policiesOk,
      ...(authorised ? { env, policies } : {}),
      ts: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
