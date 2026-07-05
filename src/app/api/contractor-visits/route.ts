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
import { requireRole, WRITE_ASM } from "@/lib/authz";
import { parseJson, reqStr, optStr } from "@/lib/validation";
import { z } from "zod";

// building_id required; the "contractor_id or inline_name" rule is enforced by
// the handler's own 400 check below.
const SignInSchema = z.object({
  building_id: reqStr(100),
  contractor_id: optStr(100),
  inline_name: optStr(120),
  phone: optStr(32),
  company_id: optStr(100),
  unit_id: optStr(100),
  work_order_id: optStr(100),
  purpose: optStr(200),
  method: optStr(20),
  photo_url: optStr(1000),
  signature_ref: optStr(1000),
  gate_enforced: z.boolean().optional(),
});

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
  const auth = await requireRole(WRITE_ASM);
  if (auth.response) return auth.response;
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const parsed = await parseJson(request, SignInSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

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
