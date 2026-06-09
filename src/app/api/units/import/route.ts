import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";

// =============================================================================
//  POST /api/units/import
// =============================================================================
//  Body: { building_id: string, units: Array<unit row> }
//  Each unit row already validated client-side. We do a server-side double
//  check and bulk-insert via the service role key.
//
//  Returns: { inserted: number, skipped: number, errors: string[] }
// =============================================================================

interface UnitRow {
  label: string;
  line?: string;
  floor?: number;
  bedrooms?: number;
  bathrooms?: number;
  occupied?: boolean;
  tenant_name?: string;
  tenant_phone?: string;
  is_section8?: boolean;
  has_children_under_6?: boolean;
  has_children_under_11?: boolean;
  notes?: string;
}

export async function POST(request: Request) {
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

  let payload: { building_id: string; units: UnitRow[] };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload.building_id || !Array.isArray(payload.units)) {
    return NextResponse.json(
      { error: "Missing building_id or units array" },
      { status: 400 }
    );
  }

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
    .filter((u) => u.label && u.label.trim().length > 0)
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
