import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { DOC_BUCKET } from "@/types/documents";
import { parseJson } from "@/lib/validation";

// Partial-update body: every field optional. A server-side whitelist
// (PATCH_ALLOWED) filters what reaches the DB, and the handler does its own
// empty-string→null normalization + "name can't be empty" guard — so these are
// bounded but NOT trimmed, to preserve that downstream logic verbatim.
const s = (max: number) => z.string().max(max);
const UpdateDocumentSchema = z.object({
  name: s(300).optional().nullable(),
  building_id: s(100).optional().nullable(),
  unit_id: s(100).optional().nullable(),
  category: s(100).optional().nullable(),
});

// =============================================================================
//  GET    /api/documents/:id — redirect to a short-lived signed download URL
//  DELETE /api/documents/:id — remove a document (row + stored file)
// =============================================================================

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  const { data: doc } = await supabase
    .from("documents")
    .select("path,name")
    .eq("id", params.id)
    .maybeSingle();
  if (!doc?.path) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  // Default: inline (preview in-browser). ?download=1 forces a file download.
  // ?share=1 returns a 7-day signed URL as JSON (for the Share action).
  const sp = new URL(request.url).searchParams;
  const wantsDownload = sp.get("download") === "1";
  const wantsShare = sp.get("share") === "1";
  const expiry = wantsShare ? 60 * 60 * 24 * 7 : 120;
  const { data, error } = await supabase.storage
    .from(DOC_BUCKET)
    .createSignedUrl(doc.path, expiry, wantsDownload ? { download: doc.name ?? undefined } : {});
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Sign failed." }, { status: 500 });
  }
  if (wantsShare) return NextResponse.json({ url: data.signedUrl, name: doc.name });
  return NextResponse.redirect(data.signedUrl);
}

// PATCH /api/documents/:id — rename (name) or move (building_id / unit_id).
const PATCH_ALLOWED = new Set(["name", "building_id", "unit_id", "category"]);
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  const parsed = await parseJson(request, UpdateDocumentSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (PATCH_ALLOWED.has(k)) update[k] = v === "" ? null : v;
  }
  if (typeof update.name === "string" && !update.name.trim()) {
    return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("documents")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  revalidatePath("/files");
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  // Look up the object path first so we can remove the file too.
  const { data: doc } = await supabase
    .from("documents")
    .select("path")
    .eq("id", params.id)
    .maybeSingle();

  const { error } = await supabase.from("documents").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (doc?.path) {
    await supabase.storage.from(DOC_BUCKET).remove([doc.path]).catch(() => {});
  }

  revalidatePath("/files");
  return NextResponse.json({ ok: true });
}
