import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { dispatchAlert, TIERS, type AlertTier } from "@/lib/alerts";

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

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tier = String(body.tier ?? "") as AlertTier;
  const title = String(body.title ?? "").trim();
  const message = String(body.message ?? "").trim();
  const building_ids = Array.isArray(body.building_ids)
    ? (body.building_ids as unknown[]).map((b) => String(b))
    : [];
  const unit_ids = Array.isArray(body.unit_ids)
    ? (body.unit_ids as unknown[]).map((u) => String(u))
    : null;

  if (!TIERS[tier]) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });
  if (building_ids.length === 0) {
    return NextResponse.json({ error: "Select at least one building" }, { status: 400 });
  }

  const supabase = getServerSupabase();
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
