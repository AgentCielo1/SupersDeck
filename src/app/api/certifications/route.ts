import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";

// =============================================================================
//  POST /api/certifications — add a staff certification
// =============================================================================

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
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

  if (!body.holder_name || !body.type || !body.number || !body.expires_at) {
    return NextResponse.json(
      { error: "holder_name, type, number, and expires_at are required" },
      { status: 400 }
    );
  }

  const row = {
    id: `cert-${slug(`${body.holder_name}-${body.type}-${body.number}`)}-${Date.now().toString(36)}`,
    holder_name: String(body.holder_name).trim(),
    type: String(body.type).trim(),
    number: String(body.number).trim(),
    issued_at: body.issued_at || null,
    expires_at: String(body.expires_at),
    agency: body.agency ? String(body.agency).trim() : null,
    notes: body.notes ? String(body.notes).trim() : null,
  };

  const { data, error } = await supabase
    .from("certifications")
    .insert(row)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/certifications");
  revalidatePath("/", "layout");

  return NextResponse.json(data, { status: 201 });
}
