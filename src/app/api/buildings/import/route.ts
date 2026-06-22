import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// =============================================================================
//  POST /api/buildings/import — bulk create/update buildings from a CSV upload
// =============================================================================
//  Body: { buildings: BuildingRow[] }  (each row already validated client-side)
//
//  Idempotent: a stable id is derived from each row's explicit `id` (slugged)
//  or `bldg-<slug(name)>`, then upserted with onConflict "id" — so re-importing
//  the same file updates rows in place instead of duplicating. This mirrors
//  POST /api/units/import.
//
//  Optional per-row `generate_units` (+ `line_layout`) auto-creates the unit
//  roster exactly the way POST /api/buildings does for a single building.
//
//  Returns: { inserted, skipped, unitsInserted, errors[] }
// =============================================================================

const BOROUGHS = [
  "Manhattan",
  "Brooklyn",
  "Queens",
  "Bronx",
  "Staten Island",
] as const;
type Borough = (typeof BOROUGHS)[number];

// Bedroom count per line — kept in sync with POST /api/buildings + sample-data.ts.
const DEFAULT_LINE_BEDROOMS: Record<string, number> = {
  A: 2, B: 2, C: 3, D: 1, E: 1, F: 0,
  G: 1, H: 1, J: 2, K: 3, L: 2, M: 2,
};
const DEFAULT_LINES = Object.keys(DEFAULT_LINE_BEDROOMS);

interface BuildingRow {
  id?: string;
  name?: string;
  address?: string;
  borough?: string;
  year_built?: number;
  num_units?: number;
  num_floors?: number;
  square_footage?: number;
  bin?: string;
  bbl?: string;
  hpd_id?: string;
  community_district?: string;
  has_section8?: boolean;
  is_pact_rad?: boolean;
  has_oil_heat?: boolean;
  has_cooling_tower?: boolean;
  has_sprinkler?: boolean;
  has_known_lead?: boolean;
  heat_notes?: string;
  generate_units?: boolean;
  line_layout?: string[];
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// Accept the five legal boroughs plus the abbreviations supers actually type.
function normalizeBorough(v: unknown): Borough | null {
  if (!v) return null;
  const s = String(v).trim().toLowerCase();
  const map: Record<string, Borough> = {
    manhattan: "Manhattan", mn: "Manhattan", "new york": "Manhattan", nyc: "Manhattan",
    brooklyn: "Brooklyn", bk: "Brooklyn", bklyn: "Brooklyn", kings: "Brooklyn",
    queens: "Queens", qn: "Queens", qns: "Queens",
    bronx: "Bronx", bx: "Bronx", "the bronx": "Bronx",
    "staten island": "Staten Island", si: "Staten Island", richmond: "Staten Island",
  };
  return map[s] ?? null;
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 503 }
    );
  }

  let payload: { buildings: BuildingRow[] };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(payload.buildings)) {
    return NextResponse.json({ error: "Missing buildings array" }, { status: 400 });
  }

  const errors: string[] = [];
  const seen = new Set<string>();
  const rows: Record<string, unknown>[] = [];
  const unitRows: Record<string, unknown>[] = [];

  payload.buildings.forEach((b, i) => {
    const rowLabel = `Row ${i + 2}`; // +2: 1 header line + 1-indexed
    const name = (b.name ?? "").trim();
    const address = (b.address ?? "").trim();
    const borough = normalizeBorough(b.borough);

    if (!name) return void errors.push(`${rowLabel}: missing name — skipped`);
    if (!address)
      return void errors.push(`${rowLabel} (${name}): missing address — skipped`);
    if (!borough)
      return void errors.push(
        `${rowLabel} (${name}): unrecognized borough "${b.borough ?? ""}" — skipped`
      );

    const id = b.id ? slug(String(b.id)) : `bldg-${slug(name)}`;
    if (seen.has(id))
      return void errors.push(
        `${rowLabel} (${name}): duplicate id "${id}" within this file — skipped`
      );
    seen.add(id);

    const num_floors = Number(b.num_floors) || 0;
    const lines =
      Array.isArray(b.line_layout) && b.line_layout.length > 0
        ? b.line_layout
        : DEFAULT_LINES;
    const generate = Boolean(b.generate_units) && num_floors > 0;
    const num_units =
      Number(b.num_units) || (generate ? num_floors * lines.length : 0);

    rows.push({
      id,
      name,
      address,
      borough,
      year_built: Number(b.year_built) || null,
      num_units,
      num_floors,
      bin: b.bin ? String(b.bin).trim() : null,
      bbl: b.bbl ? String(b.bbl).trim() : null,
      hpd_id: b.hpd_id ? String(b.hpd_id).trim() : null,
      community_district: b.community_district
        ? String(b.community_district).trim()
        : null,
      has_section8: Boolean(b.has_section8),
      is_pact_rad: Boolean(b.is_pact_rad),
      has_oil_heat: Boolean(b.has_oil_heat),
      has_cooling_tower: Boolean(b.has_cooling_tower),
      has_sprinkler: b.has_sprinkler ?? true,
      has_known_lead: Boolean(b.has_known_lead),
      heat_notes: b.heat_notes ? String(b.heat_notes).trim() : null,
      square_footage: b.square_footage ? Number(b.square_footage) : null,
    });

    if (generate) {
      for (let f = 1; f <= num_floors; f++) {
        for (const line of lines) {
          const label = `${f}${line}`;
          unitRows.push({
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
    }
  });

  if (rows.length === 0) {
    return NextResponse.json(
      {
        inserted: 0,
        skipped: payload.buildings.length,
        unitsInserted: 0,
        errors: errors.length ? errors : ["No valid rows in upload"],
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("buildings")
    .upsert(rows, { onConflict: "id" })
    .select("id");

  if (error) {
    return NextResponse.json(
      { error: error.message, hint: error.hint ?? undefined },
      { status: 500 }
    );
  }

  let unitsInserted = 0;
  if (unitRows.length > 0) {
    const { data: uData, error: uErr } = await supabase
      .from("units")
      .upsert(unitRows, { onConflict: "id" })
      .select("id");
    if (uErr) {
      errors.push(`Buildings imported, but auto-generating units failed: ${uErr.message}`);
    } else {
      unitsInserted = uData?.length ?? 0;
    }
  }

  revalidatePath("/buildings");
  revalidatePath("/", "layout");

  return NextResponse.json({
    inserted: data?.length ?? 0,
    skipped: payload.buildings.length - rows.length,
    unitsInserted,
    errors,
  });
}
