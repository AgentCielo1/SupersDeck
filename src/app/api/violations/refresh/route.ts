import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { lookupHpdViolationsForBuildings } from "@/lib/hpd";
import {
  attributeSummons,
  isDefaulted,
  isOpenSummons,
  lookupOathSummonsesForBbl,
  normalizeAgency,
  parseMoney,
} from "@/lib/oath";
import {
  checkBuildingIdentity,
  identityMismatches,
  type IdentityFinding,
} from "@/lib/building-identity";
import { getServerSupabase } from "@/lib/supabase";
import { requireRole, WRITE_ASM } from "@/lib/authz";
import type { Building } from "@/types";

// =============================================================================
//  POST /api/violations/refresh
// =============================================================================
//  Re-fetches BOTH enforcement feeds from NYC Open Data and persists them:
//    • HPD housing-maintenance violations (wvxf-dwi5), one lookup per
//      building by address → `violations` table.
//    • OATH/ECB summonses (jz4z-kudi) — DEP, DOB, FDNY, DSNY, DOHMH, … —
//      one lookup per distinct BBL (this portfolio is a shared-lot campus)
//      → `ecb_violations` table, rows attributed to buildings by house
//      number, campus-wide rows kept with building_id null.
//
//  Two callers:
//    1. The Refresh button on /violations (authenticated user).
//    2. The Vercel cron job (vercel.json) — runs daily. Caller provides
//       Authorization: Bearer <CRON_SECRET> to bypass auth.
//
//  Returns: per-building HPD counts + per-BBL ECB counts. A failed lookup is
//  reported as failed, never as zero rows.
// =============================================================================

export const dynamic = "force-dynamic";
export const maxDuration = 60; // can take a moment when many buildings × violations

// Two legitimate callers, each with its own credential — fail CLOSED for
// everyone else (building-fanout endpoint = cost/DoS amplifier):
//   • the Vercel cron, via Authorization: Bearer <CRON_SECRET>
//   • a signed-in staff member (admin/super/manager) tapping the Refresh
//     button. BUG (found 2026-09-24): this caller was documented above but
//     never admitted — the route demanded the cron secret from everyone, so
//     the button silently 401'd forever. Invisible while the page's HPD data
//     came from live lookups; fatal once the ECB section depended on it.
async function authorizedCaller(request: NextRequest): Promise<boolean> {
  const expected = process.env.CRON_SECRET;
  if (expected && request.headers.get("authorization") === `Bearer ${expected}`) {
    return true;
  }
  const auth = await requireRole(WRITE_ASM);
  return !auth.response;
}

export async function POST(request: NextRequest) {
  if (!(await authorizedCaller(request))) {
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

    if (!supabase) continue;
    if (rows.length === 0) {
      // BUG (2026-09-24): zero rows used to skip the sync stamp too, so the
      // UI couldn't tell "checked, clean" from "never checked". A successful
      // lookup advances last_synced whatever it found.
      await supabase.from("violations_sync").upsert(
        {
          building_id: b.id,
          last_synced_at: new Date().toISOString(),
          rows_fetched: 0,
          rows_new: 0,
        },
        { onConflict: "building_id" }
      );
      continue;
    }

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

  // ---------------------------------------------------------------------------
  //  OATH/ECB sync — one lookup per distinct BBL, then attribute per building.
  // ---------------------------------------------------------------------------
  const ecbSummary = await syncEcb(supabase, buildings);
  const ecbFailed = Object.values(ecbSummary).filter(
    (s) => s.status === "failed"
  ).length;

  // ---------------------------------------------------------------------------
  //  Identity cross-check — stored BIN/BBL vs what the city's rows carry.
  //  A mismatch is a data bug that silently poisons every lot-keyed lookup,
  //  so it fails the sync status (207) the same way a fetch failure does.
  // ---------------------------------------------------------------------------
  const identityWarnings: Array<IdentityFinding & { building_id: string }> = [];
  for (const b of buildings) {
    const result = data[b.id];
    if (!result?.ok || result.violations.length === 0) continue;
    for (const m of identityMismatches(checkBuildingIdentity(b, result.violations))) {
      identityWarnings.push({ ...m, building_id: b.id });
      console.error(
        `[violations] IDENTITY MISMATCH for ${b.id}: stored ${m.field} "${m.stored}" but ${m.observations} city rows carry "${m.observed}"`
      );
    }
  }

  return NextResponse.json(
    {
      refreshed_at: new Date().toISOString(),
      buildings: buildings.length,
      checked: buildings.length - failedCount,
      failed: failedCount,
      complete:
        failedCount === 0 && ecbFailed === 0 && identityWarnings.length === 0,
      summary,
      ecb: ecbSummary,
      identity_warnings: identityWarnings,
    },
    // 207 Multi-Status when any lookup couldn't be completed OR a stored
    // identifier contradicts city records, so cron monitoring surfaces it.
    {
      status:
        failedCount + ecbFailed + identityWarnings.length > 0 ? 207 : 200,
    }
  );
}

type EcbSyncEntry =
  | { status: "ok"; fetched: number; new: number; unattributed: number }
  | { status: "failed"; reason: string; detail: string }
  | { status: "skipped"; reason: string };

async function syncEcb(
  supabase: ReturnType<typeof getServerSupabase>,
  buildings: Building[]
): Promise<Record<string, EcbSyncEntry>> {
  const summary: Record<string, EcbSyncEntry> = {};

  // Group buildings by BBL. On this portfolio all three share one lot, so
  // this is one NYC Open Data call total. A building with no BBL is reported
  // (not silently skipped) — its enforcement state is unknown, not clean.
  const byBbl = new Map<string, Building[]>();
  for (const b of buildings) {
    const bbl = (b.bbl ?? "").trim();
    if (!bbl) {
      summary[`building:${b.id}`] = {
        status: "skipped",
        reason: "no BBL on file — set it under Buildings → Edit (see supabase/backfill-bin-bbl.sql)",
      };
      continue;
    }
    byBbl.set(bbl, [...(byBbl.get(bbl) ?? []), b]);
  }

  for (const [bbl, campus] of byBbl) {
    const result = await lookupOathSummonsesForBbl(bbl);
    if (!result.ok) {
      summary[bbl] = {
        status: "failed",
        reason: result.failure.kind,
        detail: result.failure.detail,
      };
      console.error(
        `[ecb] OATH lookup FAILED for BBL ${bbl} (${result.failure.kind}): ${result.failure.detail}`
      );
      // Do NOT advance ecb_sync — a failed lookup must not claim freshness.
      continue;
    }

    const rows = result.summonses.filter((r) => r.ticket_number);
    let unattributed = 0;
    const entry: EcbSyncEntry = {
      status: "ok",
      fetched: rows.length,
      new: 0,
      unattributed: 0,
    };
    summary[bbl] = entry;

    if (!supabase) continue;
    if (rows.length === 0) {
      // Same stamp-on-zero rule as HPD: a completed lookup that found
      // nothing is a real answer ("checked, clean"), and without the stamp
      // the /violations ECB section shows "Not synced yet" forever — which
      // is exactly the symptom that surfaced this bug.
      await supabase.from("ecb_sync").upsert(
        {
          bbl,
          last_synced_at: new Date().toISOString(),
          rows_fetched: 0,
          rows_new: 0,
        },
        { onConflict: "bbl" }
      );
      continue;
    }

    const ids = rows.map((r) => String(r.ticket_number));
    const { data: existing } = await supabase
      .from("ecb_violations")
      .select("id")
      .in("id", ids);
    const existingIds = new Set((existing ?? []).map((r) => r.id));
    entry.new = ids.filter((id) => !existingIds.has(id)).length;

    // org for RLS: from the matched building, else any campus building —
    // the lot is one org's property by definition.
    const orgOf = (b: Building | null): string | null =>
      ((b ?? campus[0]) as Building & { org_id?: string }).org_id ?? null;

    const upserts = rows.map((r) => {
      const b = attributeSummons(r, campus);
      if (!b) unattributed++;
      return {
        id: String(r.ticket_number),
        building_id: b?.id ?? null,
        bbl,
        org_id: orgOf(b),
        issuing_agency: normalizeAgency(r.issuing_agency),
        issuing_agency_raw: r.issuing_agency ?? null,
        charge: r.charge_1_code_description ?? null,
        charge_code: r.charge_1_code ?? null,
        violation_date: r.violation_date ? r.violation_date.slice(0, 10) : null,
        hearing_date: r.hearing_date ?? null,
        hearing_status: r.hearing_status ?? null,
        hearing_result: r.hearing_result ?? null,
        compliance_status: r.compliance_status ?? null,
        penalty_imposed: parseMoney(r.penalty_imposed),
        paid_amount: parseMoney(r.paid_amount),
        balance_due: parseMoney(r.balance_due),
        is_open: isOpenSummons(r),
        is_defaulted: isDefaulted(r),
        house: r.violation_location_house ?? null,
        street: r.violation_location_street_name ?? null,
        raw: r,
        fetched_at: new Date().toISOString(),
      };
    });
    entry.unattributed = unattributed;

    const { error: upErr } = await supabase
      .from("ecb_violations")
      .upsert(upserts, { onConflict: "id" });
    if (upErr) {
      console.error(`[ecb] upsert failed for BBL ${bbl}:`, upErr.message);
      summary[bbl] = {
        status: "failed",
        reason: "persist_error",
        detail: upErr.message,
      };
      continue;
    }

    await supabase.from("ecb_sync").upsert(
      {
        bbl,
        last_synced_at: new Date().toISOString(),
        rows_fetched: rows.length,
        rows_new: entry.new,
      },
      { onConflict: "bbl" }
    );
  }

  return summary;
}

export async function GET(request: NextRequest) {
  return POST(request);
}
