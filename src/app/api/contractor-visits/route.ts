import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";
import {
  coiStatus,
  isBlocked,
  type ComplianceDocument,
} from "@workorder/kit/contractor/contract";
import type { ComplianceDocumentRow } from "@/types/contractors";
import { findOrCreateContractorByPhone } from "@/lib/contractor-recognition";

// =============================================================================
//  GET  /api/contractor-visits        — who's on site now (?building=ID)
//  POST /api/contractor-visits         — staff-assisted sign-in (server gate)
// =============================================================================
//  The compliance gate is enforced HERE, server-side: we re-derive the
//  company's compliance status from compliance_documents and block an expired
//  COI (when gate_enforced). Never trust a client claim of "compliant".
//  Service-role path — org_id is set explicitly from the building (the
//  set_org_id trigger only stamps authenticated inserts).
// =============================================================================

export async function GET(request: Request) {
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json([]);

  const { searchParams } = new URL(request.url);
  const building = searchParams.get("building");

  let query = supabase
    .from("contractor_visits")
    .select("*")
    .is("sign_out_at", null);
  if (building) query = query.eq("building_id", building);

  const { data, error } = await query.order("sign_in_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

function rowToDoc(d: ComplianceDocumentRow): ComplianceDocument {
  return {
    docType: d.doc_type,
    carrier: d.carrier ?? undefined,
    policyNumber: d.policy_number ?? undefined,
    glPerOccurrence: d.gl_per_occurrence ?? undefined,
    glAggregate: d.gl_aggregate ?? undefined,
    issuingAgency: d.issuing_agency ?? undefined,
    effectiveDate: d.effective_date ?? undefined,
    expiryDate: d.expiry_date ?? undefined,
    additionalInsured: d.additional_insured,
    exemptionType: d.exemption_type ?? undefined,
    fileUrl: d.file_url ?? undefined,
  };
}

export async function POST(request: Request) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.building_id) {
    return NextResponse.json({ error: "building_id is required" }, { status: 400 });
  }
  if (!body.contractor_id && !body.inline_name) {
    return NextResponse.json(
      { error: "contractor_id or inline_name is required" },
      { status: 400 }
    );
  }

  // Resolve the building's org so service-role inserts satisfy org_id (NOT NULL).
  const { data: building } = await supabase
    .from("buildings")
    .select("id, org_id")
    .eq("id", body.building_id)
    .maybeSingle();
  if (!building) return NextResponse.json({ error: "Building not found" }, { status: 404 });
  const org_id = (building as any).org_id as string;

  const gateEnforced = body.gate_enforced ?? true;

  // --- compliance gate: derive status from the company's documents ---
  let status: ReturnType<typeof coiStatus> = "missing";
  if (body.company_id) {
    const { data: docs } = await supabase
      .from("compliance_documents")
      .select("*")
      .eq("company_id", body.company_id);
    status = coiStatus(((docs ?? []) as ComplianceDocumentRow[]).map(rowToDoc));
  }

  if (isBlocked(status, gateEnforced)) {
    await supabase.from("contractor_blocked_attempts").insert({
      id: `blk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      org_id,
      company_id: body.company_id ?? null,
      inline_name: body.inline_name ?? null,
      building_id: body.building_id,
      reason: "GL insurance expired / not on file",
    });
    return NextResponse.json(
      { error: "blocked", reason: "Company insurance is expired.", status },
      { status: 403 }
    );
  }

  const recog = await findOrCreateContractorByPhone(supabase, {
    orgId: org_id,
    phone: body.phone,
    name: body.inline_name,
    companyId: body.company_id,
    contractorId: body.contractor_id,
  });

  const row = {
    id: `cv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    org_id,
    contractor_id: recog.contractorId,
    inline_name: body.inline_name ?? null,
    phone: body.phone ?? null,
    company_id: body.company_id ?? null,
    building_id: String(body.building_id),
    unit_id: body.unit_id ?? null,
    work_order_id: body.work_order_id ?? null,
    purpose: body.purpose ?? null,
    method: body.method ?? "qr",
    photo_url: body.photo_url ?? null,
    signature_ref: body.signature_ref ?? null,
    compliance_status_at_entry: status,
  };

  const { data, error } = await supabase
    .from("contractor_visits")
    .insert(row)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/contractors/logbook");
  return NextResponse.json({ visit: data, status }, { status: 201 });
}
