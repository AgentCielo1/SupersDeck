import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { getServerSupabase } from "@/lib/supabase";
import { dispatchAlert, FROM_EMAIL, type AlertRow } from "@/lib/alerts";
import { sendSms, isSmsConfigured } from "@/lib/sms";

// =============================================================================
//  GET/POST /api/cron/alert-escalate  (Vercel Cron, every 5 minutes)
// =============================================================================
//  EMERGENCY auto-escalation:
//    For each ACTIVE emergency alert older than 10 minutes with NO super
//    acknowledgment yet, escalate ONCE:
//      • re-send push + SMS to staff/tenants (dispatchAlert resend)
//      • page the owner directly (SMS + email, if configured)
//      • stamp escalated_at + owner_notified_at so we don't repeat
//  Mirrors the existing cron auth pattern (Bearer CRON_SECRET).
// =============================================================================

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ESCALATE_AFTER_MS = 10 * 60 * 1000; // 10 minutes

function authorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

async function handler(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  // Active emergencies not yet escalated.
  const { data, error } = await supabase
    .from("alerts")
    .select(
      "id, org_id, tier, title, message, building_ids, unit_ids, status, created_at, escalated_at, owner_notified_at"
    )
    .eq("tier", "emergency")
    .eq("status", "active")
    .is("escalated_at", null);

  if (error) {
    return NextResponse.json({ ok: true, note: "alerts table unavailable", error: error.message });
  }

  const alerts = (data ?? []) as AlertRow[];
  const now = Date.now();
  const escalated: string[] = [];

  for (const alert of alerts) {
    const age = now - new Date(alert.created_at).getTime();
    if (age < ESCALATE_AFTER_MS) continue;

    // Has ANY super acknowledged? (super = role 'super' in the same org)
    const { data: supers } = await supabase
      .from("profiles")
      .select("id")
      .eq("org_id", alert.org_id)
      .eq("role", "super");
    const superIds = new Set((supers ?? []).map((s: { id: string }) => s.id));

    const { data: acks } = await supabase
      .from("alert_acknowledgments")
      .select("acknowledged_by")
      .eq("alert_id", alert.id);
    const anySuperAcked = (acks ?? []).some(
      (a: { acknowledged_by: string | null }) =>
        a.acknowledged_by && superIds.has(a.acknowledged_by)
    );

    if (anySuperAcked) continue; // someone's on it — no escalation

    // ---- Escalate ----
    // 1. Re-send push + SMS (skip email on re-send to avoid inbox spam).
    await dispatchAlert(alert.id, { resend: true }).catch(() => null);

    // 2. Page the owner directly.
    const ownerPhone = process.env.OWNER_ALERT_PHONE;
    const ownerEmail = process.env.OWNER_ALERT_EMAIL;
    const ownerMsg = `UNACKNOWLEDGED EMERGENCY: "${alert.title}" — ${alert.message}. No super has responded in 10 min. — BoroDesk`;

    if (ownerPhone && isSmsConfigured()) {
      await sendSms(ownerPhone, ownerMsg).catch(() => null);
    }
    if (ownerEmail && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: FROM_EMAIL,
          to: ownerEmail,
          subject: `ESCALATED EMERGENCY (no response): ${alert.title}`,
          html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;padding:20px">
            <h2 style="color:#c03030;margin:0 0 8px">Unacknowledged emergency</h2>
            <p style="font-size:15px;color:#2a2a28">${ownerMsg}</p>
            <p style="color:#888;font-size:12px">No superintendent acknowledged within 10 minutes. This is supplementary to FDNY-posted notices.</p>
          </div>`,
        });
      } catch {
        // best-effort
      }
    }

    // 3. Stamp so we escalate only once.
    await supabase
      .from("alerts")
      .update({
        escalated_at: new Date().toISOString(),
        owner_notified_at: new Date().toISOString(),
      })
      .eq("id", alert.id);

    escalated.push(alert.id);
  }

  return NextResponse.json({
    ok: true,
    scanned: alerts.length,
    escalated: escalated.length,
    escalated_ids: escalated,
  });
}

export const GET = handler;
export const POST = handler;
