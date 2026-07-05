import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";
import { requireRole, WRITE_ASM } from "@/lib/authz";
import { parseJson, reqStr, optStr } from "@/lib/validation";

// label is optional here: rows without a label are skipped below (filter),
// mirroring the pre-validation behavior of not rejecting the whole upload.
const UnitImportRowSchema = z.object({
  label: optStr(100),
  line: optStr(20),
  floor: z.coerce.number().finite().optional().nullable(),
  bedrooms: z.coerce.number().finite().optional().nullable(),
  bathrooms: z.coerce.number().finite().optional().nullable(),
  occupied: z.boolean().optional(),
  tenant_name: optStr(300),
  tenant_phone: optStr(100),
  is_section8: z.boolean().optional(),
  has_children_under_6: z.boolean().optional(),
  has_children_under_11: z.boolean().optional(),
  notes: optStr(5000),
});
const UnitImportSchema = z.object({
  building_id: reqStr(100),
  units: z.array(UnitImportRowSchema),
});

// =============================================================================
//  POST /api/units/import
// =============================================================================
//  Body: { building_id: string, units: Array<unit row> }
//  Each unit row already validated client-side. We do a server-side double
//  check and bulk-insert via the service role key.
//
//  Returns: { inserted: number, skipped: number, errors: string[] }
// =============================================================================

// Row shape is defined by UnitImportRowSchema above (Zod is the source of truth).

export async function POST(request: Request) {
  const auth = await requireRole(WRITE_ASM);
  if (auth.response) return auth.response;
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
      },
      { status: 500 }
    );
  }

  const parsed = await parseJson(request, UnitImportSchema);
  if (parsed.response) return parsed.response;
  const payload = parsed.data;

  // Make sure the building exists.
  const { data: bldg, error: bldgErr } = await supabase
    .from("buildings")
    .select("id")
    .eq("id", payload.building_id)
    .maybeSingle();
  if (bldgErr || !bldg) {
    return NextResponse.json(
      { error: `Unknown building: ${payload.building_id}` },
      { status: 404 }
    );
  }

  // Shape each row + assign stable id from building+label so re-imports
  // are idempotent (UNIQUE constraint on (building_id,label) does dedup).
  const rows = payload.units
    .filter((u): u is typeof u & { label: string } => !!u.label && u.label.trim().length > 0)
    .map((u) => ({
      id: `u-${payload.building_id.replace("bldg-", "")}-${u.label.toLowerCase()}`,
      building_id: payload.building_id,
      label: u.label.trim(),
      line: u.line ?? (u.label.replace(/[0-9]/g, "").trim() || null),
      floor:
        u.floor ??
        (parseInt(u.label.replace(/[^0-9]/g, ""), 10) || null),
      bedrooms: u.bedrooms ?? null,
      bathrooms: u.bathrooms ?? null,
      occupied: u.occupied ?? false,
      tenant_name: u.tenant_name ?? null,
      tenant_phone: u.tenant_phone ?? null,
      is_section8: u.is_section8 ?? false,
      has_children_under_6: u.has_children_under_6 ?? false,
      has_children_under_11: u.has_children_under_11 ?? false,
      notes: u.notes ?? null,
    }));

  if (rows.length === 0) {
    return NextResponse.json(
      { inserted: 0, skipped: 0, errors: ["No valid rows in upload"] },
      { status: 400 }
    );
  }

  // Upsert (id-based) so re-uploading the same CSV updates existing rows.
  const { data, error } = await supabase
    .from("units")
    .upsert(rows, { onConflict: "id" })
    .select("id");

  if (error) {
    return NextResponse.json(
      { error: error.message, hint: error.hint ?? undefined },
      { status: 500 }
    );
  }

  revalidatePath("/buildings");
  revalidatePath(`/buildings/${payload.building_id}/units/import`);
  revalidatePath("/", "layout");

  return NextResponse.json({
    inserted: data?.length ?? 0,
    skipped: payload.units.length - rows.length,
    errors: [],
  });
}
