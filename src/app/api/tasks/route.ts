import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createSupabaseServerClient,
  getCurrentUserProfile,
} from "@/lib/supabase-server";

// =============================================================================
//  POST /api/tasks — create a backlog task
// =============================================================================
//  Auth-gated by middleware; the session client means RLS enforces the
//  admin/super/manager write rule. Files are uploaded client-side to the
//  task-files bucket; the body just carries their {path,name,type}.
// =============================================================================

const ALLOWED = new Set([
  "notes",
  "folder",
  "priority",
  "building_id",
  "unit_id",
  "due_date",
  "files",
  "assigned_to",
  "assigned_vendor_id",
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

  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  }

  const row: Record<string, unknown> = { title };
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) row[k] = v === "" ? null : v;
  }

  const me = await getCurrentUserProfile().catch(() => null);
  if (me) row.created_by = me.id;

  const { data, error } = await supabase.from("tasks").insert(row).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidatePath("/backlog");
  return NextResponse.json(data);
}
