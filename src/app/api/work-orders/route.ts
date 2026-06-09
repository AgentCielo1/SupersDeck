import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";

// =============================================================================
//  POST /api/work-orders — create a work order
// =============================================================================
//  Used by:
//    - /work-orders/new           (super-side, requires auth)
//    - /intake/[buildingCode]     (tenant-facing, no auth)
//
//  We use the service-role client so the tenant intake (anonymous) can also
//  insert. Reasonable since the public intake page restricts the building
//  via URL and the API validates the building exists.
//
//  Auto-generates the ticket number as WO-{epoch-base36} to avoid collisions.
// =============================================================================

const ALLOWED_CATEGORIES = new Set([
  "no-heat", "no-hot-water", "leak", "electrical", "appliance",
  "lock-key", "pest", "mold", "elevator", "intercom",
  "common-area", "lead-concern", "other",
]);

const HPD_RISK_CATEGORIES = new Set([
  "no-heat", "no-hot-water", "lead-concern", "mold", "leak",
]);

function genTicketNumber(): string {
  // WO-{millis-base36} — short, sortable, ~unique enough for one building's
  // lifetime traffic. Collisions only matter if two tickets land in the same
  // millisecond, which we don't worry about.
  return `WO-${Date.now().toString(36).toUpperCase()}`;
}

export async function POST(request: Request) {
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

  if (!body.building_id || !body.title || !body.reporter_name) {
    return NextResponse.json(
      { error: "building_id, title, and reporter_name are required" },
      { status: 400 }
    );
  }

  // Validate the building exists (and is something the caller can target).
  const { data: bldg } = await supabase
    .from("buildings")
    .select("id")
    .eq("id", String(body.building_id))
    .maybeSingle();
  if (!bldg) {
    return NextResponse.json(
      { error: `Unknown building: ${body.building_id}` },
      { status: 404 }
    );
  }

  const category = ALLOWED_CATEGORIES.has(String(body.category))
    ? String(body.category)
    : "other";

  // If the tenant didn't provide a unit_id but did provide a unit_label, try
  // to resolve it. Best-effort: skip if no match (we don't want to reject the
  // ticket just because of a typo).
  let unit_id: string | null = body.unit_id ? String(body.unit_id) : null;
  if (!unit_id && body.unit_label) {
    const { data: u } = await supabase
      .from("units")
      .select("id")
      .eq("building_id", body.building_id)
      .ilike("label", String(body.unit_label).trim())
      .maybeSingle();
    if (u) unit_id = u.id;
  }

  const ticket_number = genTicketNumber();
  const row = {
    id: `wo-${ticket_number.replace("WO-", "").toLowerCase()}`,
    building_id: String(body.building_id),
    unit_id,
    ticket_number,
    title: String(body.title).trim(),
    description: body.description ? String(body.description).trim() : null,
    category,
    priority: ["emergency", "high", "normal", "low"].includes(body.priority)
      ? String(body.priority)
      : "normal",
    status: "new",
    reporter_name: String(body.reporter_name).trim(),
    reporter_phone: body.reporter_phone ? String(body.reporter_phone).trim() : null,
    reporter_email: body.reporter_email ? String(body.reporter_email).trim() : null,
    reported_at: new Date().toISOString(),
    hpd_risk: HPD_RISK_CATEGORIES.has(category),
  };

  const { data, error } = await supabase
    .from("work_orders")
    .insert(row)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Seed the timeline with a creation event.
  await supabase.from("work_order_updates").insert({
    id: `wou-${row.id}-${Date.now()}-created`,
    work_order_id: row.id,
    message: `Reported: ${row.title}`,
    author: row.reporter_name,
  });

  revalidatePath("/work-orders");
  revalidatePath("/", "layout");

  return NextResponse.json(data, { status: 201 });
}
