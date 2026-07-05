import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";
import { requireRole, WRITE_ASM } from "@/lib/authz";

// =============================================================================
//  POST /api/buildings — create a building (and optionally auto-generate units)
// =============================================================================
//  Body:
//    {
//      id?:                string (slug; auto-derived from name if omitted)
//      name:               string (required)
//      address:            string (required)
//      borough:            "Manhattan" | "Brooklyn" | "Queens" | "Bronx" | "Staten Island"
//      year_built:         number
//      num_units:          number
//      num_floors:         number
//      bin?:               string
//      bbl?:               string
//      hpd_id?:            string
//      community_district?: string
//      has_section8?:      boolean
//      is_pact_rad?:       boolean
//      has_oil_heat?:      boolean
//      has_cooling_tower?: boolean
//      has_sprinkler?:     boolean
//      has_known_lead?:    boolean
//      heat_notes?:        string
//      square_footage?:    number
//      generate_units?:    boolean    // default false; if true, inserts num_floors × line_layout units
//      line_layout?:       string[]   // e.g. ["A","B","C",...,"M"]; default to LINE_BEDROOMS keys
//    }
// =============================================================================

// Real bedroom layout per line — kept in sync with sample-data.ts.
const DEFAULT_LINE_BEDROOMS: Record<string, number> = {
  A: 2, B: 2, C: 3, D: 1, E: 1, F: 0,
  G: 1, H: 1, J: 2, K: 3, L: 2, M: 2,
};
const DEFAULT_LINES = Object.keys(DEFAULT_LINE_BEDROOMS);

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

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

  if (!body.name || !body.address || !body.borough) {
    return NextResponse.json(
      { error: "name, address, and borough are required" },
      { status: 400 }
    );
  }

  const id = body.id ? slug(String(body.id)) : `bldg-${slug(String(body.name))}`;
  const num_floors = Number(body.num_floors) || 1;

  const building = {
    id,
    name: String(body.name),
    address: String(body.address),
    borough: String(body.borough),
    year_built: Number(body.year_built) || null,
    num_units: Number(body.num_units) || 0,
    num_floors,
    bin: body.bin || null,
    bbl: body.bbl || null,
    hpd_id: body.hpd_id || null,
    community_district: body.community_district || null,
    has_section8: Boolean(body.has_section8),
    is_pact_rad: Boolean(body.is_pact_rad),
    has_oil_heat: Boolean(body.has_oil_heat),
    has_cooling_tower: Boolean(body.has_cooling_tower),
    has_sprinkler: body.has_sprinkler ?? true,
    has_known_lead: Boolean(body.has_known_lead),
    heat_notes: body.heat_notes || null,
    square_footage: body.square_footage ? Number(body.square_footage) : null,
  };

  const { data: insertedBuilding, error: insertErr } = await supabase
    .from("buildings")
    .insert(building)
    .select()
    .single();
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  let unitsInserted = 0;
  if (body.generate_units) {
    const lines: string[] =
      Array.isArray(body.line_layout) && body.line_layout.length > 0
        ? body.line_layout
        : DEFAULT_LINES;
    const units = [];
    for (let f = 1; f <= num_floors; f++) {
      for (const line of lines) {
        const label = `${f}${line}`;
        units.push({
          id: `u-${id.replace("bldg-", "")}-${label.toLowerCase()}`,
          building_id: id,
          label,
          line,
          floor: f,
          bedrooms: DEFAULT_LINE_BEDROOMS[line] ?? 1,
          bathrooms: 1,
          occupied: false,
        });
      }
    }
    const { error: unitsErr } = await supabase
      .from("units")
      .upsert(units, { onConflict: "id" });
    if (unitsErr) {
      // Building was created but units failed — log and report partial success.
      return NextResponse.json(
        {
          building: insertedBuilding,
          unitsInserted: 0,
          warning: `Building created, but auto-generating units failed: ${unitsErr.message}`,
        },
        { status: 207 }
      );
    }
    unitsInserted = units.length;
  }

  revalidatePath("/buildings");
  revalidatePath("/", "layout");

  return NextResponse.json(
    { building: insertedBuilding, unitsInserted },
    { status: 201 }
  );
}
