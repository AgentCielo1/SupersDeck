import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  createSupabaseServerClient,
  getCurrentUserProfile,
} from "@/lib/supabase-server";
import { parseJson, reqStr, optStr } from "@/lib/validation";

const CreateTaskSchema = z.object({
  title: reqStr(300),
  notes: optStr(5000),
  folder: optStr(100),
  priority: optStr(50),
  building_id: optStr(100),
  unit_id: optStr(100),
  due_date: optStr(100),
  files: z.array(z.record(z.string(), z.any())).optional(),
  assigned_to: optStr(100),
  assigned_vendor_id: optStr(100),
});

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

  const parsed = await parseJson(request, CreateTaskSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  const title = body.title;

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
