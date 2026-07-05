import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";
import { requireRole, WRITE_ASM } from "@/lib/authz";

// =============================================================================
//  PATCH /api/vendors/:id  — update a vendor
//  DELETE /api/vendors/:id — remove a vendor from My Vendors
// =============================================================================

const ALLOWED_FIELDS = new Set([
  "name",
  "category_id",
  "contact_name",
  "phone",
  "email",
  "address",
  "license_type",
  "license_number",
  "license_expires",
  "in_my_vendors",
  "notes",
  "rating",
]);

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(WRITE_ASM);
  if (auth.response) return auth.response;
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
  if (update.rating !== undefined && update.rating !== null) {
    const r = Number(update.rating);
    update.rating = Number.isFinite(r) ? Math.min(5, Math.max(1, r)) : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No editable fields in body" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("vendors")
    .update(update)
    .eq("id", params.id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  revalidatePath("/vendors");
  revalidatePath("/contractors");
  revalidatePath(`/vendors/${params.id}/edit`);
  revalidatePath("/", "layout");

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(WRITE_ASM);
  if (auth.response) return auth.response;
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const { error } = await supabase
    .from("vendors")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/vendors");
  revalidatePath("/contractors");
  revalidatePath("/", "layout");

  return NextResponse.json({ deleted: params.id });
}
