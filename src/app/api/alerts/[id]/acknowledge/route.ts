import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { parseJson } from "@/lib/validation";
import { AckSchema } from "@/lib/alert-schemas";

// =============================================================================
//  POST /api/alerts/[id]/acknowledge — "I'm on it"
// =============================================================================
//  Any signed-in staffer can acknowledge. Idempotent: the (alert_id,
//  acknowledged_by) unique constraint means a double-tap is a no-op. An
//  optional note is stored / updated.
//
//  The note is free text a staffer types on their phone and it is written
//  straight to the DB, so it goes through the schema like every other body.
//  A body is now REQUIRED (AlertAckButton always sends at least `{}`); a
//  bodyless POST gets the standard 400 instead of being silently accepted.
// =============================================================================

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const me = await getCurrentUserProfile().catch(() => null);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const alertId = params.id;
  const parsed = await parseJson(request, AckSchema);
  if (parsed.response) return parsed.response;
  // optStr already trimmed it; "" and null both mean "no note".
  const note = parsed.data.note ? parsed.data.note : null;

  const supabase = createSupabaseServerClient();
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
