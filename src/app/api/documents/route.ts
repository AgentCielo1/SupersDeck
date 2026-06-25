import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createSupabaseServerClient,
  getCurrentUserProfile,
} from "@/lib/supabase-server";

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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const path = String(body.path ?? "").trim();
  if (!name || !path) {
    return NextResponse.json({ error: "name and path are required." }, { status: 400 });
  }

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
