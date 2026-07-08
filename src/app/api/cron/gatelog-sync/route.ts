import { NextResponse, type NextRequest } from "next/server";
import { createHmac } from "crypto";
import { getServerSupabase } from "@/lib/supabase";

// =============================================================================
//  GET/POST /api/cron/gatelog-sync
// =============================================================================
//  Pulls contractor data from the standalone GateLog app (system of record for
//  contractor sign-in + COI compliance) and upserts it into SupersDeck's
//  existing tables, so the Contractors tab keeps working with ZERO UI changes:
//    GateLog companies  → vendors            (ven-gl-<id8>)
//    GateLog documents  → compliance_documents (cd-gl-<id8>)
//    GateLog visits     → contractor_visits  (cv-gl-<id8>)
//    GateLog blocked    → contractor_blocked_attempts (cb-gl-<id8>)
//  Mapping: GateLog Building.externalRef = SupersDeck buildings.id (set in the
//  GateLog dashboard). Visits for unmapped buildings are skipped and counted.
//  Deterministic ids make every upsert idempotent. Cursor lives on the GateLog
//  side (`since=cursor`), so replays after a partial failure re-send safely.
//
//  Config (Vercel env): GATELOG_SYNC_URL (e.g. https://gatelog.vercel.app),
//  GATELOG_SYNC_SECRET (matches GateLog's env). Absent config = quiet no-op.
// =============================================================================

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

const glId = (prefix: string, uuid: string) => `${prefix}-gl-${uuid.replaceAll("-", "").slice(0, 12)}`;

interface ExportPayload {
  exportedAt: string;
  companies: Array<{
    id: string; name: string; trade: string | null; phone: string | null;
    email: string | null; externalRef: string | null;
  }>;
  documents: Array<{
    id: string; companyId: string; docType: string; carrier: string | null;
    policyNumber: string | null; glPerOccurrence: string | number | null;
    glAggregate: string | number | null; effectiveDate: string | null;
    expiryDate: string | null; additionalInsured: boolean | null;
    exemptionType: string | null;
  }>;
  visits: Array<{
    id: string; companyId: string | null; fullName: string; phone: string | null;
    purpose: string | null; unitLabel: string | null; method: string;
    signInAt: string; signOutAt: string | null; complianceStatusAtEntry: string | null;
    building: { externalRef: string | null; name: string };
  }>;
  blockedAttempts: Array<{
    id: string; companyId: string | null; inlineName: string | null; reason: string;
    attemptedAt: string; building: { externalRef: string | null; name: string };
  }>;
}

async function handle(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const baseUrl = process.env.GATELOG_SYNC_URL;
  const secret = process.env.GATELOG_SYNC_SECRET;
  if (!baseUrl || !secret) {
    return NextResponse.json({ ok: true, skipped: "gatelog sync not configured" });
  }
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  // --- Signed pull (HMAC over `${ts}:${path+query}`) --------------------------
  const pathAndQuery = "/api/sync/supersdeck?since=cursor";
  const ts = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret).update(`${ts}:${pathAndQuery}`).digest("hex");
  const res = await fetch(`${baseUrl}${pathAndQuery}`, {
    headers: { "x-gatelog-timestamp": String(ts), "x-gatelog-signature": signature },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: "gatelog_fetch_failed", status: res.status },
      { status: 502 },
    );
  }
  const payload = (await res.json()) as ExportPayload;

  // --- Vendor category for imports (vendors.category_id is NOT NULL) ----------
  await supabase.from("vendor_categories").upsert(
    [{ id: "cat-gatelog", name: "GateLog import", icon: "🛡️" }],
    { onConflict: "id" },
  );

  // --- Companies → vendors ------------------------------------------------------
  // Map by explicit externalRef first, then case-insensitive name, else create.
  const companyToVendor = new Map<string, string>();
  const { data: existingVendors } = await supabase.from("vendors").select("id,name");
  const vendorByName = new Map(
    (existingVendors ?? []).map((v: { id: string; name: string }) => [v.name.toLowerCase(), v.id]),
  );
  const vendorUpserts: Array<Record<string, unknown>> = [];
  for (const c of payload.companies) {
    const vendorId =
      c.externalRef ?? vendorByName.get(c.name.toLowerCase()) ?? glId("ven", c.id);
    companyToVendor.set(c.id, vendorId);
    vendorUpserts.push({
      id: vendorId,
      name: c.name,
      category_id: "cat-gatelog",
      phone: c.phone,
      email: c.email,
      in_my_vendors: true,
      notes: c.trade ? `Trade: ${c.trade} (GateLog)` : "Synced from GateLog",
    });
  }
  // Don't clobber richer local vendor rows: only insert missing ones.
  if (vendorUpserts.length > 0) {
    await supabase.from("vendors").upsert(vendorUpserts, { onConflict: "id", ignoreDuplicates: true });
  }

  // Resolve vendor mapping for documents/visits of companies NOT in this batch
  // (their vendor rows exist from an earlier sync via deterministic ids).
  const resolveVendor = (companyId: string | null): string | null =>
    companyId ? companyToVendor.get(companyId) ?? glId("ven", companyId) : null;

  // --- Documents → compliance_documents ----------------------------------------
  const docRows = payload.documents.map((d) => ({
    id: glId("cd", d.id),
    company_id: resolveVendor(d.companyId),
    doc_type: d.docType,
    carrier: d.carrier,
    policy_number: d.policyNumber,
    gl_per_occurrence: d.glPerOccurrence != null ? Number(d.glPerOccurrence) : null,
    gl_aggregate: d.glAggregate != null ? Number(d.glAggregate) : null,
    effective_date: d.effectiveDate?.slice(0, 10) ?? null,
    expiry_date: d.expiryDate?.slice(0, 10) ?? null,
    additional_insured: d.additionalInsured,
    exemption_type: d.exemptionType,
  }));
  if (docRows.length > 0) {
    await supabase.from("compliance_documents").upsert(docRows, { onConflict: "id" });
  }

  // --- Visits → contractor_visits (needs a mapped SupersDeck building) ----------
  const { data: buildings } = await supabase.from("buildings").select("id");
  const knownBuildings = new Set((buildings ?? []).map((b: { id: string }) => b.id));
  let skippedVisits = 0;
  const visitRows = payload.visits.flatMap((v) => {
    const buildingId = v.building.externalRef;
    if (!buildingId || !knownBuildings.has(buildingId)) {
      skippedVisits++;
      return [];
    }
    return [
      {
        id: glId("cv", v.id),
        inline_name: v.fullName,
        phone: v.phone,
        company_id: resolveVendor(v.companyId),
        building_id: buildingId,
        purpose: v.purpose ?? (v.unitLabel ? `@ ${v.unitLabel}` : null),
        method: v.method === "crew_code" ? "qr" : v.method, // schema CHECK allows qr|kiosk|phone|staff
        sign_in_at: v.signInAt,
        sign_out_at: v.signOutAt,
        compliance_status_at_entry: v.complianceStatusAtEntry,
      },
    ];
  });
  if (visitRows.length > 0) {
    await supabase.from("contractor_visits").upsert(visitRows, { onConflict: "id" });
  }

  // --- Blocked attempts -----------------------------------------------------------
  let skippedBlocked = 0;
  const blockedRows = payload.blockedAttempts.flatMap((b) => {
    const buildingId = b.building.externalRef;
    if (!buildingId || !knownBuildings.has(buildingId)) {
      skippedBlocked++;
      return [];
    }
    return [
      {
        id: glId("cb", b.id),
        company_id: resolveVendor(b.companyId),
        inline_name: b.inlineName,
        building_id: buildingId,
        reason: b.reason,
        attempted_at: b.attemptedAt,
      },
    ];
  });
  if (blockedRows.length > 0) {
    await supabase.from("contractor_blocked_attempts").upsert(blockedRows, { onConflict: "id" });
  }

  return NextResponse.json({
    ok: true,
    exportedAt: payload.exportedAt,
    upserted: {
      vendors: vendorUpserts.length,
      documents: docRows.length,
      visits: visitRows.length,
      blocked: blockedRows.length,
    },
    skipped: { visits: skippedVisits, blocked: skippedBlocked },
  });
}

export async function GET(request: NextRequest) {
  return handle(request);
}
export async function POST(request: NextRequest) {
  return handle(request);
}
