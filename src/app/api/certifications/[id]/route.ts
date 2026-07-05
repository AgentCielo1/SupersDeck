import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";
import { requireRole, WRITE_ASM, ADMIN_ONLY } from "@/lib/authz";
import { parseJson } from "@/lib/validation";

// Partial-update body: every field optional. A server-side whitelist (ALLOWED)
// still filters what reaches the DB, and the handler does its own
// empty-string→null normalization + "type can't be empty" guard — so these are
// bounded but NOT trimmed, to preserve that downstream logic verbatim.
const s = (max: number) => z.string().max(max);
const UpdateCertSchema = z.object({
  holder_name: s(300).optional().nullable(),
  type: s(300).optional().nullable(),
  number: s(100).optional().nullable(),
  issued_at: s(100).optional().nullable(),
  expires_at: s(100).optional().nullable(),
  agency: s(300).optional().nullable(),
  notes: s(5000).optional().nullable(),
  cert_key: s(100).optional().nullable(),
});

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
  const parsed = await parseJson(request, UpdateCertSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;
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
