import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";

// =============================================================================
//  POST /api/units — add an apartment (used by the Tenant directory)
// =============================================================================

const ALLOWED = new Set([
  "tenant_name",
  "tenant_phone",
  "occupied",
  "lease_start",
  "lease_end",
  "rent_status",
  "line",
  "floor",
  "notes",
]);

export async function POST(request: Request) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const building_id = String(body.building_id ?? "").trim();
  const label = String(body.label ?? "").trim().toUpperCase();
  if (!building_id || !label) {
    return NextResponse.json(
      { error: "Building and apartment are required." },
      { status: 400 }
    );
  }

  const num = building_id.replace(/^bldg-/, "");
  const row: Record<string, unknown> = {
    id: `u-${num}-${label.toLowerCase()}`,
    building_id,
    label,
    occupied: body.occupied === true || !!body.tenant_name,
  };
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) row[k] = v === "" ? null : v;
  }

  const { data, error } = await supabase.from("units").insert(row).select().single();
  if (error) {
    const msg = /duplicate|unique/i.test(error.message)
      ? `Apartment ${label} already exists in that building.`
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  revalidatePath("/tenants");
  revalidatePath("/leases");
  revalidatePath("/buildings");
  return NextResponse.json(data);
}
