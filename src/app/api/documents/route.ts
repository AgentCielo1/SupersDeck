import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  createSupabaseServerClient,
  getCurrentUserProfile,
} from "@/lib/supabase-server";
import { parseJson, reqStr, optStr } from "@/lib/validation";

const CreateDocumentSchema = z.object({
  name: reqStr(300),
  path: reqStr(500),
  category: optStr(100),
  building_id: optStr(100),
  unit_id: optStr(100),
  mime: optStr(100),
  size: z.coerce.number().finite().optional().nullable(),
});

// =============================================================================
//  POST /api/documents — record an uploaded file in the repository
// =============================================================================
//  The file is uploaded client-side to the `documents` bucket; the body carries
//  its metadata. Session client → RLS enforces the admin/super/manager rule.
// =============================================================================

const ALLOWED = new Set([
  "category",
  "building_id",
  "unit_id",
  "mime",
  "size",
]);

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const parsed = await parseJson(request, CreateDocumentSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  const name = body.name;
  const path = body.path;

  const row: Record<string, unknown> = { name, path };
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) row[k] = v === "" ? null : v;
  }

  const me = await getCurrentUserProfile().catch(() => null);
  if (me) row.uploaded_by = me.id;

  const { data, error } = await supabase.from("documents").insert(row).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidatePath("/files");
  return NextResponse.json(data);
}
