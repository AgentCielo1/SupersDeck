import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";
import type { ComplianceStatus } from "@workorder/kit/contractor/contract";
import {
  deriveCompanyStatus,
  gateBlocks,
  blockedReason,
  blockedMessage,
  recordBlockedAttempt,
} from "@/lib/contractor-gate";

// =============================================================================
//  GET  /api/contractor-visits        — who's on site now (?building=ID)
//  POST /api/contractor-visits         — sign a contractor in (server gate)
// =============================================================================
//  The compliance gate is enforced HERE, server-side: we re-derive the
//  company's compliance status from compliance_documents and block an expired
//  COI (when gate_enforced). Never trust a client claim of "compliant".
//  Gate logic is shared with the public QR route via src/lib/contractor-gate.
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

export async function POST(request: Request) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
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

  const gateEnforced = body.gate_enforced ?? true;

  // --- compliance gate: derive status from the company's documents ---
  let status: ComplianceStatus = "missing";
  if (body.company_id) {
    status = await deriveCompanyStatus(supabase, body.company_id);
  }

  if (gateBlocks(status, gateEnforced)) {
    await recordBlockedAttempt(supabase, {
      company_id: body.company_id ?? null,
      inline_name: body.inline_name ?? null,
      building_id: body.building_id,
      reason: blockedReason(status),
    });
    return NextResponse.json(
      { error: "blocked", reason: blockedMessage(status), status },
      { status: 403 }
    );
  }

  const row = {
    id: `cv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    contractor_id: body.contractor_id ?? null,
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
