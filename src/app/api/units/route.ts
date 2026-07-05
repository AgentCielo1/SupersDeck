import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";
import { requireRole, WRITE_ASM } from "@/lib/authz";
import { parseJson, reqStr, optStr } from "@/lib/validation";

const CreateUnitSchema = z.object({
  building_id: reqStr(100),
  label: reqStr(100),
  tenant_name: optStr(300),
  tenant_phone: optStr(100),
  tenant_phone2: optStr(100),
  emergency_contact_name: optStr(300),
  emergency_contact_relation: optStr(100),
  emergency_contact_phone: optStr(100),
  occupied: z.boolean().optional(),
  lease_start: optStr(100),
  lease_end: optStr(100),
  rent_status: optStr(100),
  line: optStr(20),
  floor: z.coerce.number().finite().optional().nullable(),
  notes: optStr(5000),
});

// =============================================================================
//  POST /api/units — add an apartment (used by the Tenant directory)
// =============================================================================

const ALLOWED = new Set([
  "tenant_name",
  "tenant_phone",
  "tenant_phone2",
  "emergency_contact_name",
  "emergency_contact_relation",
  "emergency_contact_phone",
  "occupied",
  "lease_start",
  "lease_end",
  "rent_status",
  "line",
  "floor",
  "notes",
]);

export async function POST(request: Request) {
  const auth = await requireRole(WRITE_ASM);
  if (auth.response) return auth.response;
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const parsed = await parseJson(request, CreateUnitSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  const building_id = body.building_id;
  const label = body.label.toUpperCase();

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
