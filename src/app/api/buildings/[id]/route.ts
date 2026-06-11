import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";

// =============================================================================
//  GET   /api/buildings/:id  — fetch one building (used by /intake and the
//                              QR poster, which need to render the building's
//                              name without dragging a server-component
//                              fetch into a client page)
//  PATCH /api/buildings/:id  — partial update from the building-edit form
// =============================================================================
//  GET is public so the tenant intake page (anonymous) can load the name.
//  Only safe-to-show columns are returned (no manager email / CO / financial
//  fields — those stay private).
// =============================================================================

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }
  const { data, error } = await supabase
    .from("buildings")
    .select("id, name, address, borough, num_units, num_floors, year_built")
    .eq("id", params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

const ALLOWED_FIELDS = new Set([
  "name",
  "address",
  "borough",
  "year_built",
  "num_units",
  "num_floors",
  "bin",
  "bbl",
  "hpd_id",
  "community_district",
  "has_section8",
  "is_pact_rad",
  "has_oil_heat",
  "has_cooling_tower",
  "has_sprinkler",
  "has_known_lead",
  "heat_notes",
  "square_footage",
  "manager_name",
  "manager_email",
  "co_number",
  "co_issued_at",
  "co_expires_at",
  "legal_entity",
]);

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Supabase is not configured. Edits aren't persisted in seed-only mode.",
      },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Whitelist allowed fields so the client can't smuggle in id/created_at.
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
    .from("buildings")
    .update(update)
    .eq("id", params.id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Building not found" }, { status: 404 });
  }

  // Bust Next.js's router cache so the dashboard, buildings list, and edit
  // form re-fetch fresh data on the next render.
  revalidatePath("/", "layout");
  revalidatePath("/buildings");
  revalidatePath(`/buildings/${params.id}/edit`);

  return NextResponse.json(data);
}
