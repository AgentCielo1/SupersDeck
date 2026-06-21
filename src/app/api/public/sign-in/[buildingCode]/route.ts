import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import {
  coiStatus,
  isBlocked,
  type ComplianceDocument,
  type ComplianceStatus,
} from "@workorder/kit/contractor/contract";
import type { ComplianceDocumentRow } from "@/types/contractors";

// =============================================================================
//  PUBLIC contractor sign-in (QR target) — no auth.
//   GET  /api/public/sign-in/:buildingCode  — building + companies + status
//   POST /api/public/sign-in/:buildingCode  — sign in (server-enforced gate)
//  Whitelisted in middleware. Mirrors the public tenant-intake pattern.
// =============================================================================

function rowToDoc(d: ComplianceDocumentRow): ComplianceDocument {
  return {
    docType: d.doc_type,
    expiryDate: d.expiry_date ?? undefined,
    glPerOccurrence: d.gl_per_occurrence ?? undefined,
    glAggregate: d.gl_aggregate ?? undefined,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: { buildingCode: string } }
) {
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const { data: building } = await supabase
    .from("buildings")
    .select("id,name,address")
    .eq("id", params.buildingCode)
    .maybeSingle();
  if (!building) return NextResponse.json({ error: "Building not found" }, { status: 404 });

  const { data: vendors } = await supabase
    .from("vendors")
    .select("id,name")
    .eq("in_my_vendors", true)
    .order("name");
  const { data: docs } = await supabase.from("compliance_documents").select("*");
  const docRows = (docs ?? []) as ComplianceDocumentRow[];

  const companies = ((vendors ?? []) as { id: string; name: string }[]).map((v) => {
    const cdocs = docRows.filter((d) => d.company_id === v.id);
    const status: ComplianceStatus = cdocs.length
      ? coiStatus(cdocs.map(rowToDoc))
      : "missing";
    return { id: v.id, name: v.name, status };
  });

  return NextResponse.json({ building, companies });
}

export async function POST(
  request: Request,
  { params }: { params: { buildingCode: string } }
) {
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.inline_name && !body.contractor_id) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const building_id = params.buildingCode;
  const gateEnforced = body.gate_enforced ?? true;

  let status: ComplianceStatus = "missing";
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
      company_id: body.company_id ?? null,
      inline_name: body.inline_name ?? null,
      building_id,
      reason: "GL insurance expired / not on file",
    });
    return NextResponse.json(
      { error: "blocked", reason: "Company insurance is expired.", status },
      { status: 403 }
    );
  }

  const visitId = `cv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  // Optional verification photo (data URL). Service role bypasses storage RLS,
  // mirroring the public-intake model. Upload failures are non-fatal.
  let photoUrl: string | null = null;
  if (typeof body.photo_base64 === "string" && body.photo_base64.length > 0) {
    try {
      const b64 = body.photo_base64.replace(/^data:image\/\w+;base64,/, "");
      const bytes = Buffer.from(b64, "base64");
      const path = `${building_id}/${visitId}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("contractor-photos")
        .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
      if (!upErr) photoUrl = path;
    } catch {
      // proceed without a photo
    }
  }

  const row = {
    id: visitId,
    contractor_id: body.contractor_id ?? null,
    inline_name: body.inline_name ?? null,
    phone: body.phone ?? null,
    company_id: body.company_id ?? null,
    building_id,
    unit_id: body.unit_id ?? null,
    work_order_id: body.work_order_id ?? null,
    purpose: body.purpose ?? null,
    method: body.method ?? "qr",
    photo_url: photoUrl,
    compliance_status_at_entry: status,
  };

  const { data, error } = await supabase
    .from("contractor_visits")
    .insert(row)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ visit: data, status }, { status: 201 });
}
