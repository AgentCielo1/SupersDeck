import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { dispatchAlert } from "@/lib/alerts";
import { parseJson } from "@/lib/validation";
import { CreateAlertSchema } from "@/lib/alert-schemas";

// =============================================================================
//  POST /api/alerts — create an alert and fan it out across its tier's channels
// =============================================================================
//  Auth: management (admin/super/manager). Persists the alert (service role,
//  org_id stamped from the caller's profile) then dispatches push/email/SMS.
//  Returns the created id + a delivery summary for the confirmation screen.
// =============================================================================

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";
const MANAGEMENT = new Set(["admin", "super", "manager"]);

export async function POST(request: Request) {
  const me = await getCurrentUserProfile().catch(() => null);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!MANAGEMENT.has(me.role)) {
    return NextResponse.json(
      { error: "Only management can send alerts" },
      { status: 403 }
    );
  }

  const parsed = await parseJson(request, CreateAlertSchema);
  if (parsed.response) return parsed.response;
  const { tier, title, message, building_ids } = parsed.data;
  const unit_ids = parsed.data.unit_ids ?? null;

  // Kept as an explicit check (rather than a schema .min(1)) so the composer
  // still shows this exact sentence when nothing is selected.
  if (building_ids.length === 0) {
    return NextResponse.json({ error: "Select at least one building" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const { data: inserted, error } = await supabase
    .from("alerts")
    .insert({
      tier,
      title,
      message,
      building_ids,
      unit_ids: unit_ids && unit_ids.length > 0 ? unit_ids : null,
      org_id: me.org_id ?? DEFAULT_ORG_ID,
      created_by: me.id,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create alert" },
      { status: 500 }
    );
  }

  // Fan out across the tier's channels. Best-effort per channel.
  const summary = await dispatchAlert(inserted.id).catch(() => null);

  return NextResponse.json({ id: inserted.id, summary }, { status: 201 });
}
