import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";

// =============================================================================
//  PATCH /api/units/:id  — edit a unit row
// =============================================================================
//  Used by the lead-paint XRF tracker (to set lead_xrf_completed) and the
//  general unit-edit affordances. Whitelist matches the columns supers need
//  to maintain after initial import (occupancy + tenant contact + kid flags
//  change; structural fields like floor/line/bedrooms don't, so they aren't
//  exposed here).
// =============================================================================

const ALLOWED_FIELDS = new Set([
  "occupied",
  "tenant_name",
  "tenant_phone",
  "is_section8",
  "has_children_under_6",
  "has_children_under_11",
  "lead_xrf_completed",
  "lease_start",
  "lease_end",
  "rent_status",
  "notes",
]);

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(k)) update[k] = v === "" ? null : v;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No editable fields in body" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("units")
    .update(update)
    .eq("id", params.id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Unit not found" }, { status: 404 });
  }

  revalidatePath("/lead-paint");
  revalidatePath("/leases");
  revalidatePath("/buildings");
  revalidatePath("/tenants");
  revalidatePath("/", "layout");

  return NextResponse.json(data);
}

// DELETE /api/units/:id — remove an apartment. Fails if work orders still
// reference it (FK), in which case the caller should vacate instead.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  const { error } = await supabase.from("units").delete().eq("id", params.id);
  if (error) {
    const msg = /foreign key|violates/i.test(error.message)
      ? "Can't delete — this apartment still has work orders or records. Vacate it instead."
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  revalidatePath("/tenants");
  revalidatePath("/leases");
  revalidatePath("/buildings");
  return NextResponse.json({ ok: true });
}
