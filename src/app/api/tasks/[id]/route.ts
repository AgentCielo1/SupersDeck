import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { parseJson } from "@/lib/validation";

// Partial-update body: every field optional. A server-side whitelist (ALLOWED)
// filters what reaches the DB, and the handler does its own empty-string→null
// normalization — so strings are bounded but NOT trimmed to preserve it.
const s = (max: number) => z.string().max(max);
const UpdateTaskSchema = z.object({
  title: s(300).optional().nullable(),
  notes: s(5000).optional().nullable(),
  folder: s(100).optional().nullable(),
  status: s(50).optional().nullable(),
  priority: s(50).optional().nullable(),
  building_id: s(100).optional().nullable(),
  unit_id: s(100).optional().nullable(),
  due_date: s(100).optional().nullable(),
  files: z.array(z.record(z.string(), z.any())).optional().nullable(),
  assigned_to: s(100).optional().nullable(),
  assigned_vendor_id: s(100).optional().nullable(),
});

// =============================================================================
//  PATCH /api/tasks/:id  — edit a backlog task (status, assignee, folder, …)
//  DELETE /api/tasks/:id — remove it
// =============================================================================
//  Session client → RLS enforces the admin/super/manager write rule.
// =============================================================================

const ALLOWED = new Set([
  "title",
  "notes",
  "folder",
  "status",
  "priority",
  "building_id",
  "unit_id",
  "due_date",
  "files",
  "assigned_to",
  "assigned_vendor_id",
]);

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const parsed = await parseJson(request, UpdateTaskSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) update[k] = v === "" ? null : v;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No editable fields in body" }, { status: 400 });
  }

  // Stamp/clear completion when status flips.
  if (typeof update.status === "string") {
    update.completed_at = update.status === "done" ? new Date().toISOString() : null;
  }
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidatePath("/backlog");
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

  const { error } = await supabase.from("tasks").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidatePath("/backlog");
  return NextResponse.json({ ok: true });
}
