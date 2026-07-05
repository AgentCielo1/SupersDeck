import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";
import { requireRole, WRITE_ASMP } from "@/lib/authz";

// =============================================================================
//  POST /api/heat-logs — record a heat / hot-water reading
// =============================================================================
//  Body:
//    {
//      building_id:     string (required),
//      unit_id?:        string,
//      indoor_temp_f:   number (required),
//      outdoor_temp_f?: number,
//      hot_water_temp_f?: number,
//      source?:         "manual" | "sensor"  (default "manual"),
//      notes?:          string,
//      recorded_at?:    ISO timestamp (default now)
//    }
//
//  HPD thresholds, for context (we don't reject readings, we just save them —
//  validation lives in the UI):
//    Heat day (6am-10pm) Oct 1–May 31: ≥ 68°F when outdoor < 55°F
//    Heat night (10pm-6am):            ≥ 62°F at all times
//    Hot water:                         ≥ 120°F year-round
// =============================================================================

export async function POST(request: Request) {
  const auth = await requireRole(WRITE_ASMP);
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

  if (!body.building_id) {
    return NextResponse.json(
      { error: "building_id is required" },
      { status: 400 }
    );
  }
  const indoor = Number(body.indoor_temp_f);
  if (!Number.isFinite(indoor)) {
    return NextResponse.json(
      { error: "indoor_temp_f must be a number" },
      { status: 400 }
    );
  }

  const row = {
    id: `heat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    building_id: String(body.building_id),
    unit_id: body.unit_id ? String(body.unit_id) : null,
    indoor_temp_f: indoor,
    outdoor_temp_f: Number.isFinite(Number(body.outdoor_temp_f))
      ? Number(body.outdoor_temp_f)
      : null,
    hot_water_temp_f: Number.isFinite(Number(body.hot_water_temp_f))
      ? Number(body.hot_water_temp_f)
      : null,
    source: body.source === "sensor" ? "sensor" : "manual",
    notes: body.notes ? String(body.notes) : null,
    recorded_at: body.recorded_at ?? new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("heat_logs")
    .insert(row)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/heat-log");
  revalidatePath("/", "layout");

  return NextResponse.json(data, { status: 201 });
}
