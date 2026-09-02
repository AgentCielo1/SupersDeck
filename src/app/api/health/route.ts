import { NextResponse } from "next/server";

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
 * Names only. Never values.
 */
const present = (k: string) => Boolean(process.env[k] && process.env[k]!.length > 0);

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

  return NextResponse.json(
    { status: servingRealData ? "ok" : "degraded", app: "supersdeck", servingRealData, env, ts: new Date().toISOString() },
    { status: servingRealData ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
