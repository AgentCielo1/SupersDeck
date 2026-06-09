import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { fetchHpdViolationsForBuildings } from "@/lib/hpd";
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
  if (!expected) return true; // No secret set → don't gate. Phase 5 demo.
  const got = request.headers.get("authorization");
  return got === `Bearer ${expected}`;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServerSupabase();
  const buildings = await db.buildings();
  const data = await fetchHpdViolationsForBuildings(buildings, {
    openOnly: false, // persist everything; UI filters
    limit: 500,
  });

  const summary: Record<string, { fetched: number; new: number }> = {};

  for (const b of buildings) {
    const rows = data[b.id] ?? [];
    summary[b.id] = { fetched: rows.length, new: 0 };

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
    summary[b.id].new = newCount;

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

  return NextResponse.json({
    refreshed_at: new Date().toISOString(),
    buildings: buildings.length,
    summary,
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
