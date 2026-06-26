import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { DOC_BUCKET } from "@/types/documents";

// =============================================================================
//  POST /api/documents/:id/duplicate — copy the file + its record
// =============================================================================

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!doc) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const slash = doc.path.lastIndexOf("/");
  const dir = slash >= 0 ? doc.path.slice(0, slash + 1) : "";
  const newPath = `${dir}copy-${crypto.randomUUID()}-${doc.path.slice(slash + 1)}`;

  const copy = await supabase.storage.from(DOC_BUCKET).copy(doc.path, newPath);
  if (copy.error) {
    return NextResponse.json({ error: copy.error.message }, { status: 400 });
  }

  const newName = String(doc.name).replace(/(\.[^.]+)?$/, (m: string) => ` (copy)${m}`);
  const { data, error } = await supabase
    .from("documents")
    .insert({
      name: newName,
      category: doc.category,
      building_id: doc.building_id,
      unit_id: doc.unit_id,
      path: newPath,
      mime: doc.mime,
      size: doc.size,
    })
    .select()
    .single();
  if (error) {
    await supabase.storage.from(DOC_BUCKET).remove([newPath]).catch(() => {});
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidatePath("/files");
  return NextResponse.json(data);
}
