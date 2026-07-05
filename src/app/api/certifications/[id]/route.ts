import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";
import { requireRole, WRITE_ASM, ADMIN_ONLY } from "@/lib/authz";

// =============================================================================
//  PATCH  /api/certifications/:id — edit a certification's details
//  DELETE /api/certifications/:id — remove a cert (row + its scanned photo)
// =============================================================================

const ALLOWED = new Set([
  "holder_name", "type", "number", "issued_at", "expires_at", "agency", "notes", "cert_key",
]);

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(WRITE_ASM);
  if (auth.response) return auth.response;
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) update[k] = typeof v === "string" && v.trim() === "" ? null : v;
  }
  if (typeof update.type === "string" && !update.type.trim()) {
    return NextResponse.json({ error: "Type can't be empty." }, { status: 400 });
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("certifications")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  revalidatePath("/certifications");
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(ADMIN_ONLY);
  if (auth.response) return auth.response;
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  const { data: cert } = await supabase
    .from("certifications")
    .select("photo_path")
    .eq("id", params.id)
    .maybeSingle();

  const { error } = await supabase.from("certifications").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (cert?.photo_path) {
    await supabase.storage.from("documents").remove([cert.photo_path]).catch(() => {});
  }
  revalidatePath("/certifications");
  return NextResponse.json({ ok: true });
}
