import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { lookupHpdViolationsForBuildings } from "@/lib/hpd";
import { getServerSupabase } from "@/lib/supabase";

// =============================================================================
//  POST /api/violations/refresh
// =============================================================================
//  Re-fetches HPD violations from NYC Open Data for every building and
//  upserts them into the local `violations` table. Also records a row per
//  building in `violations_sync` so the UI can show "synced N minutes ago."
//
//  Two callers:
//    1. The Refresh button on /violations (authenticated user).
//    2. The Vercel cron job (vercel.json) — runs daily. Caller provides
//       Authorization: Bearer <CRON_SECRET> to bypass auth.
//
//  Returns: per-building counts of rows fetched + new rows seen.
// =============================================================================

export const dynamic = "force-dynamic";
export const maxDuration = 60; // can take a moment when many buildings × violations

function authorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  // Fail CLOSED — a missing/rotated secret must DENY, never open this
  // building-fanout endpoint to the public (cost/DoS amplifier otherwise).
  if (!expected) return false;
  const got = request.headers.get("authorization");
  return got === `Bearer ${expected}`;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServerSupabase();
  const buildings = await db.buildings();
  const data = await lookupHpdViolationsForBuildings(buildings, {
    openOnly: false, // persist everything; UI filters
    limit: 500,
  });

  // `fetched: 0` must mean "checked, and there were none" — never "we failed to
  // check". A cron summary that conflates them silently reports an all-clear.
  const summary: Record<
    string,
    | { status: "ok"; fetched: number; new: number }
    | { status: "failed"; reason: string; detail: string }
  > = {};

  for (const b of buildings) {
    const result = data[b.id];

    if (!result || !result.ok) {
      const failure = result?.failure ?? {
        kind: "network_error" as const,
        detail: "no result returned",
      };
      summary[b.id] = {
        status: "failed",
        reason: failure.kind,
        detail: failure.detail,
      };
      console.error(
        `[violations] lookup FAILED for ${b.id} (${failure.kind}): ${failure.detail}`
      );
      // Deliberately do NOT touch violations_sync — a failed lookup must not
      // advance "last synced", or the UI would claim fresh data it never got.
      continue;
    }

    const rows = result.violations;
    const entry = { status: "ok" as const, fetched: rows.length, new: 0 };
    summary[b.id] = entry;

    if (!supabase || rows.length === 0) continue;

    // Find which ids are already in our table — anything not in there is
    // "new" (a violation we hadn't seen before).
    const ids = rows.map((r) => r.violationid).filter(Boolean);
    const { data: existing } = await supabase
      .from("violations")
      .select("id")
      .in("id", ids);
    const existingIds = new Set((existing ?? []).map((r) => r.id));
    const newCount = ids.filter((id) => !existingIds.has(id)).length;
    entry.new = newCount;

    const upserts = rows.map((r) => ({
      id: r.violationid,
      building_id: b.id,
      class: r.violationclass ?? null,
      status: r.currentstatus ?? null,
      description: r.novdescription ?? null,
      apartment: r.apartment ?? null,
      story: r.story ?? null,
      nov_issued_date: r.novissueddate
        ? r.novissueddate.slice(0, 10)
        : null,
      current_status_date: r.currentstatusdate
        ? r.currentstatusdate.slice(0, 10)
        : null,
      approved_date: r.approveddate ? r.approveddate.slice(0, 10) : null,
      raw: r,
      fetched_at: new Date().toISOString(),
    }));

    const { error: upErr } = await supabase
      .from("violations")
      .upsert(upserts, { onConflict: "id" });
    if (upErr) {
      console.error(`[violations] upsert failed for ${b.id}:`, upErr.message);
      // We fetched fine but did not persist — report it as a failure rather
      // than leaving an "ok" row that implies the data landed.
      summary[b.id] = {
        status: "failed",
        reason: "persist_error",
        detail: upErr.message,
      };
      continue;
    }

    await supabase
      .from("violations_sync")
      .upsert(
        {
          building_id: b.id,
          last_synced_at: new Date().toISOString(),
          rows_fetched: rows.length,
          rows_new: newCount,
        },
        { onConflict: "building_id" }
      );
  }

  const failedCount = Object.values(summary).filter(
    (s) => s.status === "failed"
  ).length;

  return NextResponse.json(
    {
      refreshed_at: new Date().toISOString(),
      buildings: buildings.length,
      checked: buildings.length - failedCount,
      failed: failedCount,
      complete: failedCount === 0,
      summary,
    },
    // 207 Multi-Status when some buildings couldn't be checked, so cron
    // monitoring surfaces a partial sync instead of reading a silent 200.
    { status: failedCount > 0 ? 207 : 200 }
  );
}

export async function GET(request: NextRequest) {
  return POST(request);
}
