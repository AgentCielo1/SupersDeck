import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// =============================================================================
//  GET  /api/contractors  — list contractors (authed, org-scoped via RLS)
//  POST /api/contractors  — add a contractor (authed)
// =============================================================================
//  Uses the cookie (authed) client so the set_org_id trigger stamps org_id and
//  org-scoped RLS applies — service-role would bypass the trigger and hit the
//  org_id NOT NULL constraint.
// =============================================================================

export async function GET() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json([]);
  const { data, error } = await supabase
    .from("contractors")
    .select("id, full_name, company_id, phone, email, is_returning")
    .order("full_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.full_name) {
    return NextResponse.json({ error: "full_name is required" }, { status: 400 });
  }

  // org_id is auto-stamped by the set_org_id trigger from the caller's profile.
  const row = {
    id: `ct-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    full_name: String(body.full_name).trim(),
    company_id: body.company_id || null,
    phone: body.phone || null,
    email: body.email || null,
    is_returning: false,
  };

  const { data, error } = await supabase
    .from("contractors")
    .insert(row)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/contractors");
  return NextResponse.json(data, { status: 201 });
}
