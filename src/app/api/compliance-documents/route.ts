import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";
import { getCurrentUserProfile } from "@/lib/supabase-server";

// =============================================================================
//  GET  /api/compliance-documents?expiringInDays=30 — manager action list
//  POST /api/compliance-documents                   — add a COI / license
// =============================================================================

export async function GET(request: Request) {
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json([]);

  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("expiringInDays") ?? "");

  let query = supabase.from("compliance_documents").select("*");

  if (Number.isFinite(days) && days > 0) {
    const cutoff = new Date(Date.now() + days * 86_400_000)
      .toISOString()
      .slice(0, 10);
    query = query.lte("expiry_date", cutoff);
  }

  const { data, error } = await query.order("expiry_date", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

const WRITER_ROLES = new Set(["admin", "super", "manager"]);

export async function POST(request: Request) {
  // Compliance docs gate contractor entry — only roles that manage vendors may
  // write them (mirrors the "cl write compdocs" RLS policy).
  const me = await getCurrentUserProfile();
  if (!me) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!WRITER_ROLES.has(me.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

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

  if (!body.doc_type || (!body.company_id && !body.contractor_id)) {
    return NextResponse.json(
      { error: "doc_type and one of company_id / contractor_id are required" },
      { status: 400 }
    );
  }

  const row = {
    id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    company_id: body.company_id ?? null,
    contractor_id: body.contractor_id ?? null,
    doc_type: String(body.doc_type),
    carrier: body.carrier ?? null,
    policy_number: body.policy_number ?? null,
    gl_per_occurrence: body.gl_per_occurrence ?? null,
    gl_aggregate: body.gl_aggregate ?? null,
    issuing_agency: body.issuing_agency ?? null,
    effective_date: body.effective_date ?? null,
    expiry_date: body.expiry_date ?? null,
    additional_insured: body.additional_insured ?? false,
    exemption_type: body.exemption_type ?? null,
    file_url: body.file_url ?? null,
  };

  const { data, error } = await supabase
    .from("compliance_documents")
    .insert(row)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/contractors");
  return NextResponse.json(data, { status: 201 });
}
