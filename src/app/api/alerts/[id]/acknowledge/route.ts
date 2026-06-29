import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { getCurrentUserProfile } from "@/lib/supabase-server";

// =============================================================================
//  POST /api/alerts/[id]/acknowledge — "I'm on it"
// =============================================================================
//  Any signed-in staffer can acknowledge. Idempotent: the (alert_id,
//  acknowledged_by) unique constraint means a double-tap is a no-op. An
//  optional note is stored / updated.
// =============================================================================

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const me = await getCurrentUserProfile().catch(() => null);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const alertId = params.id;
  let note: string | null = null;
  try {
    const body = (await request.json()) as { note?: string };
    note = body.note?.trim() ? body.note.trim() : null;
  } catch {
    // empty body is fine
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  // Ensure the alert exists (and lives in the caller's org).
  const { data: alert } = await supabase
    .from("alerts")
    .select("id, org_id")
    .eq("id", alertId)
    .maybeSingle();
  if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  if (me.org_id && alert.org_id && me.org_id !== alert.org_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Idempotent upsert keyed on the unique (alert_id, acknowledged_by) index.
  const { error } = await supabase
    .from("alert_acknowledgments")
    .upsert(
      {
        alert_id: alertId,
        acknowledged_by: me.id,
        note,
        acknowledged_at: new Date().toISOString(),
      },
      { onConflict: "alert_id,acknowledged_by" }
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { count } = await supabase
    .from("alert_acknowledgments")
    .select("id", { count: "exact", head: true })
    .eq("alert_id", alertId);

  return NextResponse.json({ ok: true, ackCount: count ?? 0 });
}
