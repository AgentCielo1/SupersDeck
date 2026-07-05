import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";
import { requireRole, WRITE_ASM } from "@/lib/authz";
import { parseJson, str, optStr } from "@/lib/validation";

// Partial-update body: every field optional. A server-side whitelist
// (ALLOWED_FIELDS) still filters what actually reaches the DB.
const UpdateVendorSchema = z.object({
  name: str(300).optional(),
  category_id: str(100).optional(),
  contact_name: optStr(300),
  phone: optStr(100),
  email: optStr(300),
  address: optStr(500),
  license_type: optStr(100),
  license_number: optStr(100),
  license_expires: optStr(100),
  in_my_vendors: z.boolean().optional(),
  notes: optStr(5000),
  rating: z.coerce.number().finite().optional().nullable(),
});

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

  const parsed = await parseJson(request, UpdateVendorSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

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
