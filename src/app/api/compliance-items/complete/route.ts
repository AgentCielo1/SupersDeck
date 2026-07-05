import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";
import { complianceTemplateById } from "@/data/compliance-templates";
import { requireRole, WRITE_ASM } from "@/lib/authz";

// =============================================================================
//  POST /api/compliance-items/complete
// =============================================================================
//  Marks a compliance item as completed on a specific date. Upserts a row in
//  compliance_items keyed by (building_id, template_id). The generator then
//  recomputes next_due from this last_completed on subsequent reads.
//
//  Body:
//    {
//      building_id:    string (required),
//      template_id:    string (required, must exist in COMPLIANCE_TEMPLATES),
//      last_completed: string (required, ISO date — when the work was done),
//      vendor_id?:     string,
//      notes?:         string
//    }
// =============================================================================

export async function POST(request: Request) {
  const auth = await requireRole(WRITE_ASM);
  if (auth.response) return auth.response;
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const building_id = body.building_id ? String(body.building_id) : "";
  const template_id = body.template_id ? String(body.template_id) : "";
  const last_completed = body.last_completed
    ? String(body.last_completed)
    : "";

  if (!building_id || !template_id || !last_completed) {
    return NextResponse.json(
      { error: "building_id, template_id, and last_completed are required" },
      { status: 400 }
    );
  }
  if (!complianceTemplateById(template_id)) {
    return NextResponse.json(
      { error: `Unknown template_id: ${template_id}` },
      { status: 400 }
    );
  }

  // Stable composite id so upsert by (building_id, template_id) works.
  const id = `${building_id}-${template_id}`;

  const row = {
    id,
    building_id,
    template_id,
    last_completed,
    next_due: last_completed, // generator overrides next_due on read; this just satisfies NOT NULL
    status: "ok", // computed on read; this is a placeholder
    vendor_id: body.vendor_id ? String(body.vendor_id) : null,
    notes: body.notes ? String(body.notes) : null,
  };

  const { data, error } = await supabase
    .from("compliance_items")
    .upsert(row, { onConflict: "building_id,template_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message, hint: error.hint ?? undefined },
      { status: 500 }
    );
  }

  revalidatePath("/compliance");
  revalidatePath("/", "layout");

  return NextResponse.json(data, { status: 201 });
}
