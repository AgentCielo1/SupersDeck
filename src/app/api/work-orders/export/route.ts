import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// =============================================================================
//  GET /api/work-orders/export.csv  — CSV dump of all work orders
// =============================================================================
//  Used by the "Export CSV" button on /work-orders. Streams a text/csv body
//  with a Content-Disposition so the browser downloads it.
//
//  Joined in memory: WO + building name + unit label + vendor name. Includes
//  every column a management company / accountant tends to want.
//
//  Auth: piggy-backs on the same cookie-aware client the rest of the app
//  uses, so RLS sees the signed-in user. If the user can't see WOs in the
//  UI, the export will be empty/short — consistent.
// =============================================================================

export const dynamic = "force-dynamic";

const COLUMNS = [
  "ticket_number",
  "status",
  "priority",
  "category",
  "title",
  "description",
  "building",
  "unit",
  "reporter_name",
  "reporter_phone",
  "reporter_email",
  "assigned_to",
  "assigned_vendor",
  "hpd_risk",
  "reported_at",
  "due_at",
  "resolved_at",
  "signed_by_name",
  "signed_at",
];

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : String(v);
  // RFC 4180: wrap in quotes if contains comma, quote, CR, or LF. Inside,
  // escape quotes by doubling them.
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(values: unknown[]): string {
  return values.map(csvEscape).join(",");
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured." },
      { status: 503 }
    );
  }

  const [wosResult, bldgsResult, unitsResult, vendorsResult] = await Promise.all([
    supabase
      .from("work_orders")
      .select("*")
      .order("reported_at", { ascending: false }),
    supabase.from("buildings").select("id, name"),
    supabase.from("units").select("id, label"),
    supabase.from("vendors").select("id, name"),
  ]);

  if (wosResult.error) {
    return NextResponse.json(
      { error: wosResult.error.message },
      { status: 500 }
    );
  }

  const buildings = Object.fromEntries(
    (bldgsResult.data ?? []).map((b: any) => [b.id, b.name])
  );
  const units = Object.fromEntries(
    (unitsResult.data ?? []).map((u: any) => [u.id, u.label])
  );
  const vendors = Object.fromEntries(
    (vendorsResult.data ?? []).map((v: any) => [v.id, v.name])
  );

  const lines: string[] = [row(COLUMNS)];
  for (const w of (wosResult.data ?? []) as any[]) {
    lines.push(
      row([
        w.ticket_number,
        w.status,
        w.priority,
        w.category,
        w.title,
        w.description ?? "",
        buildings[w.building_id] ?? w.building_id,
        w.unit_id ? units[w.unit_id] ?? w.unit_id : "",
        w.reporter_name,
        w.reporter_phone ?? "",
        w.reporter_email ?? "",
        w.assigned_to ?? "",
        w.assigned_vendor_id ? vendors[w.assigned_vendor_id] ?? w.assigned_vendor_id : "",
        w.hpd_risk ? "yes" : "no",
        w.reported_at,
        w.due_at ?? "",
        w.resolved_at ?? "",
        w.signed_by_name ?? "",
        w.signed_at ?? "",
      ])
    );
  }

  const body = lines.join("\r\n") + "\r\n";
  const filename = `supersdeck-work-orders-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
