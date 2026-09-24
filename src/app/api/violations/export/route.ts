import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { lookupHpdViolationsForBuildings, cureDeadline } from "@/lib/hpd";
import { csvBody, csvRow as row } from "@/lib/csv";

// =============================================================================
//  GET /api/violations/export — CSV of the full enforcement record
// =============================================================================
//  Used by the "Export CSV" button on /violations. One file, both feeds,
//  distinguished by the `feed` column:
//    • HPD housing-maintenance violations — pulled LIVE per building (same
//      source as the page, so the file matches what the screen shows).
//    • OATH/ECB summonses — from the synced ecb_violations table.
//
//  ?open=0 includes closed/resolved history too (default matches the page:
//  open only). Auth piggy-backs on the cookie-aware client, so RLS sees the
//  signed-in user — same posture as the work-orders export.
//
//  A feed that could not be checked is written into the file as an ERROR row,
//  never silently omitted: a printed report that quietly lacks a building is
//  false assurance in its most durable form.
// =============================================================================

export const dynamic = "force-dynamic";

const COLUMNS = [
  "feed",
  "building",
  "location",
  "class_or_agency",
  "id",
  "issued",
  "status",
  "deadline_or_hearing",
  "penalty",
  "paid",
  "balance_due",
  "description",
];

export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const openOnly = new URL(request.url).searchParams.get("open") !== "0";
  const buildings = await db.buildings();
  const nameById = new Map(buildings.map((b) => [b.id, b.name]));

  const [hpd, ecbResult] = await Promise.all([
    lookupHpdViolationsForBuildings(buildings, { openOnly, limit: 500 }),
    db.ecbViolations(),
  ]);

  const lines: string[] = [row(COLUMNS)];

  for (const b of buildings) {
    const result = hpd[b.id];
    if (!result) continue;
    if (!result.ok) {
      lines.push(
        row([
          "HPD",
          b.name,
          b.address,
          "ERROR",
          "",
          "",
          `NOT CHECKED — ${result.failure.kind}: ${result.failure.detail}`,
          "",
          "",
          "",
          "",
          "Status unknown for this building — verify in HPD Online before relying on this report.",
        ])
      );
      continue;
    }
    for (const v of result.violations) {
      lines.push(
        row([
          "HPD",
          b.name,
          v.apartment ? `Apt ${v.apartment}` : "",
          v.violationclass ?? "",
          v.violationid,
          v.novissueddate?.slice(0, 10) ?? "",
          v.currentstatus ?? "",
          cureDeadline(v).label,
          "",
          "",
          "",
          v.novdescription ?? "",
        ])
      );
    }
  }

  if (!ecbResult.ok) {
    lines.push(
      row([
        "OATH/ECB",
        "ALL",
        "",
        "ERROR",
        "",
        "",
        `NOT LOADED — ${ecbResult.detail}`,
        "",
        "",
        "",
        "",
        "ECB records could not be read — run the sync and re-export before relying on this report.",
      ])
    );
  } else {
    const rows = openOnly ? ecbResult.rows.filter((r) => r.is_open) : ecbResult.rows;
    for (const r of rows) {
      lines.push(
        row([
          "OATH/ECB",
          r.building_id ? nameById.get(r.building_id) ?? r.building_id : "Campus-wide",
          [r.house, r.street].filter(Boolean).join(" "),
          r.issuing_agency ?? "",
          r.id,
          r.violation_date ?? "",
          [r.hearing_status, r.hearing_result, r.is_defaulted ? "DEFAULTED" : null]
            .filter(Boolean)
            .join(" · "),
          r.hearing_date ? r.hearing_date.slice(0, 10) : "",
          r.penalty_imposed ?? "",
          r.paid_amount ?? "",
          r.balance_due ?? "",
          r.charge ?? "",
        ])
      );
    }
  }

  const filename = `supersdeck-violations-${openOnly ? "open" : "all"}-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  return new NextResponse(csvBody(lines), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
