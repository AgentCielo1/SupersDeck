import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { DOC_BUCKET } from "@/types/documents";

// =============================================================================
//  GET    /api/documents/:id — redirect to a short-lived signed download URL
//  DELETE /api/documents/:id — remove a document (row + stored file)
// =============================================================================

export async function GET(
  _request: Request,
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
  const { data, error } = await supabase.storage
    .from(DOC_BUCKET)
    .createSignedUrl(doc.path, 120, { download: doc.name ?? undefined });
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Sign failed." }, { status: 500 });
  }
  return NextResponse.redirect(data.signedUrl);
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
