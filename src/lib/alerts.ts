import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabase";
import { pushToUsers, type PushPayload } from "@/lib/push";
import { sendBulkSms, isSmsConfigured } from "@/lib/sms";
import { TIERS, type AlertTier, type TierConfig } from "@/lib/alert-tiers";

// Re-export the pure tier table so existing server-side imports of TIERS /
// AlertTier / TierConfig from "@/lib/alerts" keep working unchanged.
export { TIERS, type AlertTier, type TierConfig };

// =============================================================================
//  Tiered emergency-notification engine
// =============================================================================
//  Three tiers, each fanning out over a fixed set of channels:
//
//    ROUTINE   (blue)   push only            · no ack
//    URGENT    (yellow) push + email         · supers tap "On it"
//    EMERGENCY (red)    push + email + SMS    · every super must ack; escalates
//
//  Channel→recipient reality of THIS schema:
//    • Staff are rows in `profiles` (push subscriptions + email + phone_number).
//    • Residents are rows in `units` (tenant_phone only — no app account, so
//      they are reachable by SMS only, on the EMERGENCY tier).
//
//  Consent (NY all-party disclosure): staff must opt in per channel
//  (profiles.push_consent / sms_consent). Resident EMERGENCY SMS is sent under
//  the life-safety / FDNY-supplementary purpose and always carries opt-out
//  language. Push/email/SMS are best-effort; SMS is the hard fallback so a
//  failed push never silently drops a life-safety message.
//
//  This is SUPPLEMENTARY to the building's required FDNY-posted notices.
// =============================================================================

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "SupersDeck <onboarding@resend.dev>";

const BRAND = "BoroDesk";

// ----------------------------------------------------------------------------
//  Row shapes
// ----------------------------------------------------------------------------
export interface AlertRow {
  id: string;
  org_id: string;
  tier: AlertTier;
  title: string;
  message: string;
  building_ids: string[];
  unit_ids: string[] | null;
  status: "active" | "resolved";
  created_at: string;
  escalated_at: string | null;
  owner_notified_at: string | null;
}

interface StaffRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  phone_number: string | null;
  push_consent: boolean | null;
  sms_consent: boolean | null;
}

interface ResidentRow {
  id: string;
  building_id: string;
  label: string;
  tenant_name: string | null;
  tenant_phone: string | null;
  occupied: boolean;
}

export interface DispatchSummary {
  tier: AlertTier;
  channels: Array<"push" | "email" | "sms">;
  staffCount: number;
  residentCount: number;
  push: { sent: number; failed: number };
  email: { sent: number; failed: number };
  sms: { sent: number; failed: number };
}

// ----------------------------------------------------------------------------
//  Recipient resolution
// ----------------------------------------------------------------------------
async function loadBuildingNames(
  supabase: SupabaseClient,
  buildingIds: string[]
): Promise<Record<string, string>> {
  if (buildingIds.length === 0) return {};
  const { data } = await supabase
    .from("buildings")
    .select("id, name")
    .in("id", buildingIds);
  return Object.fromEntries((data ?? []).map((b: any) => [b.id, b.name as string]));
}

/** Staff in the alert's org matching the tier's target roles. */
async function resolveStaff(
  supabase: SupabaseClient,
  alert: AlertRow
): Promise<StaffRow[]> {
  const cfg = TIERS[alert.tier];
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, phone_number, push_consent, sms_consent")
    .eq("org_id", alert.org_id)
    .in("role", cfg.staffRoles);
  return (data ?? []) as StaffRow[];
}

/** Occupied residents (with a phone) in the affected buildings/units. */
async function resolveResidents(
  supabase: SupabaseClient,
  alert: AlertRow
): Promise<ResidentRow[]> {
  if (alert.building_ids.length === 0) return [];
  let q = supabase
    .from("units")
    .select("id, building_id, label, tenant_name, tenant_phone, occupied")
    .in("building_id", alert.building_ids)
    .eq("occupied", true);
  // If specific units were chosen, narrow to them.
  if (alert.unit_ids && alert.unit_ids.length > 0) {
    q = q.in("id", alert.unit_ids);
  }
  const { data } = await q;
  return ((data ?? []) as ResidentRow[]).filter((u) => Boolean(u.tenant_phone));
}

/** Count of distinct supers in the org who are expected to acknowledge. */
export async function countExpectedSupers(
  supabase: SupabaseClient,
  orgId: string
): Promise<number> {
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("role", "super");
  return count ?? 0;
}

// ----------------------------------------------------------------------------
//  Preview (no send) — powers the composer's "This will notify X / Y" panel
// ----------------------------------------------------------------------------
export interface RecipientPreview {
  tier: AlertTier;
  channels: Array<"push" | "email" | "sms">;
  staffCount: number;
  residentCount: number;
  smsConfigured: boolean;
}

export async function previewRecipients(input: {
  orgId: string;
  tier: AlertTier;
  buildingIds: string[];
  unitIds?: string[] | null;
}): Promise<RecipientPreview> {
  const supabase = getServerSupabase();
  const cfg = TIERS[input.tier];
  if (!supabase) {
    return {
      tier: input.tier,
      channels: cfg.channels,
      staffCount: 0,
      residentCount: 0,
      smsConfigured: isSmsConfigured(),
    };
  }
  const fauxAlert: AlertRow = {
    id: "",
    org_id: input.orgId,
    tier: input.tier,
    title: "",
    message: "",
    building_ids: input.buildingIds,
    unit_ids: input.unitIds ?? null,
    status: "active",
    created_at: "",
    escalated_at: null,
    owner_notified_at: null,
  };
  const [staff, residents] = await Promise.all([
    resolveStaff(supabase, fauxAlert),
    cfg.channels.includes("sms")
      ? resolveResidents(supabase, fauxAlert)
      : Promise.resolve([] as ResidentRow[]),
  ]);
  return {
    tier: input.tier,
    channels: cfg.channels,
    staffCount: staff.length,
    residentCount: residents.length,
    smsConfigured: isSmsConfigured(),
  };
}

// ----------------------------------------------------------------------------
//  Message builders
// ----------------------------------------------------------------------------
function buildingLabel(
  buildingIds: string[],
  names: Record<string, string>
): string {
  const list = buildingIds.map((id) => names[id] ?? id);
  if (list.length === 0) return "your building";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} & ${list[1]}`;
  return `${list[0]} +${list.length - 1} more`;
}

function alertUrl(alertId: string): string {
  return `/alerts/${alertId}`;
}

function staffSmsBody(alert: AlertRow, bldg: string): string {
  if (alert.tier === "emergency") {
    return `EMERGENCY — ${bldg}: ${alert.message}. Reply SAFE when confirmed clear. — ${BRAND}`;
  }
  return `${TIERS[alert.tier].label.toUpperCase()} — ${bldg}: ${alert.message} — ${BRAND}`;
}

function residentSmsBody(alert: AlertRow, bldg: string): string {
  // Tenant-facing, life-safety. Reinforces the FDNY-posted notices.
  return `EMERGENCY — ${bldg}: ${alert.message}. Follow your building's posted FDNY emergency instructions. Reply STOP to opt out. — ${BRAND}`;
}

function emailHtml(alert: AlertRow, bldg: string): string {
  const tone =
    alert.tier === "emergency"
      ? { bg: "#fdecec", bar: "#c03030", label: "EMERGENCY" }
      : { bg: "#fff7e6", bar: "#b8730a", label: "URGENT" };
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,sans-serif;background:#f7f7f6;padding:24px">
    <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:12px;overflow:hidden">
      <div style="background:${tone.bg};border-left:6px solid ${tone.bar};padding:16px 20px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:${tone.bar}">${tone.label} · ${bldg}</div>
        <div style="font-size:18px;font-weight:700;margin-top:4px;color:#1a1a18">${escapeHtml(alert.title)}</div>
      </div>
      <div style="padding:20px">
        <p style="margin:0 0 16px;color:#2a2a28;font-size:15px;line-height:1.5">${escapeHtml(alert.message)}</p>
        ${
          TIERS[alert.tier].requiresAck
            ? `<a href="${absoluteUrl(alertUrl(alert.id))}" style="display:inline-block;background:${tone.bar};color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px">Acknowledge in ${BRAND}</a>`
            : ""
        }
        <p style="margin-top:20px;color:#888;font-size:12px;line-height:1.5">This operational alert is <strong>supplementary</strong> to your building's required FDNY-posted emergency notices. Sent via ${BRAND}.</p>
      </div>
    </div></body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function absoluteUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  return base ? `${base}${path}` : path;
}

// ----------------------------------------------------------------------------
//  Dispatch — the one place that fans an alert out over its tier's channels.
// ----------------------------------------------------------------------------
/**
 * Send an already-persisted alert across its tier's channels. Updates the
 * alert row with the channels fired + recipient counts. Best-effort per
 * channel: a Twilio/Resend failure is logged and does not throw, so push +
 * email still land even if SMS is down (and vice-versa).
 *
 * `resend` = true re-fires push + SMS for an unacknowledged emergency
 * (escalation); it skips the row-count bookkeeping.
 */
export async function dispatchAlert(
  alertId: string,
  opts: { resend?: boolean } = {}
): Promise<DispatchSummary> {
  const supabase = getServerSupabase();
  const empty: DispatchSummary = {
    tier: "routine",
    channels: [],
    staffCount: 0,
    residentCount: 0,
    push: { sent: 0, failed: 0 },
    email: { sent: 0, failed: 0 },
    sms: { sent: 0, failed: 0 },
  };
  if (!supabase) return empty;

  const { data: alertData } = await supabase
    .from("alerts")
    .select(
      "id, org_id, tier, title, message, building_ids, unit_ids, status, created_at, escalated_at, owner_notified_at"
    )
    .eq("id", alertId)
    .maybeSingle();
  if (!alertData) return empty;
  const alert = alertData as AlertRow;
  const cfg = TIERS[alert.tier];

  const [names, staff, residents] = await Promise.all([
    loadBuildingNames(supabase, alert.building_ids),
    resolveStaff(supabase, alert),
    cfg.channels.includes("sms")
      ? resolveResidents(supabase, alert)
      : Promise.resolve([] as ResidentRow[]),
  ]);
  const bldg = buildingLabel(alert.building_ids, names);

  const summary: DispatchSummary = {
    tier: alert.tier,
    channels: cfg.channels,
    staffCount: staff.length,
    residentCount: residents.length,
    push: { sent: 0, failed: 0 },
    email: { sent: 0, failed: 0 },
    sms: { sent: 0, failed: 0 },
  };

  // ---- PUSH (staff who opted in) ----
  if (cfg.channels.includes("push")) {
    const pushUserIds = staff
      .filter((s) => s.push_consent !== false) // null (legacy) or true → allow
      .map((s) => s.id);
    const payload: PushPayload = {
      title: `${cfg.label.toUpperCase()} · ${bldg}`,
      body: `${alert.title} — ${alert.message}`,
      url: alertUrl(alert.id),
      tag: `alert-${alert.id}`,
      priority: alert.tier === "emergency" ? "emergency" : alert.tier === "urgent" ? "high" : "normal",
      alertId: alert.id,
      actions: cfg.requiresAck ? [{ action: "acknowledge", title: "Acknowledge" }] : undefined,
    };
    const r = await pushToUsers(pushUserIds, payload).catch(() => null);
    if (r) {
      summary.push.sent = r.sent;
      summary.push.failed = r.failed;
    }
  }

  // ---- EMAIL (staff) — skipped on escalation re-send ----
  if (cfg.channels.includes("email") && !opts.resend && process.env.RESEND_API_KEY) {
    const to = staff.map((s) => s.email).filter(Boolean) as string[];
    if (to.length) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { error } = await resend.emails.send({
          from: FROM_EMAIL,
          to,
          subject: `${cfg.label.toUpperCase()}: ${alert.title} — ${bldg}`,
          html: emailHtml(alert, bldg),
        });
        if (error) summary.email.failed = to.length;
        else summary.email.sent = to.length;
      } catch {
        summary.email.failed = to.length;
      }
    }
  }

  // ---- SMS (emergency only): staff (opted-in) + residents ----
  if (cfg.channels.includes("sms") && isSmsConfigured()) {
    const staffSmsTargets = staff
      .filter((s) => s.sms_consent === true && s.phone_number)
      .map((s) => ({ phone: s.phone_number as string, profileId: s.id }));
    const residentSmsTargets = residents.map((r) => ({
      phone: r.tenant_phone as string,
      profileId: null as string | null,
    }));

    const staffResults = staffSmsTargets.length
      ? await sendBulkSms(staffSmsTargets, staffSmsBody(alert, bldg))
      : [];
    const residentResults = residentSmsTargets.length
      ? await sendBulkSms(residentSmsTargets, residentSmsBody(alert, bldg))
      : [];

    const all = [...staffResults, ...residentResults];
    summary.sms.sent = all.filter((r) => r.status === "sent").length;
    summary.sms.failed = all.filter((r) => r.status === "failed").length;

    // Log every per-recipient result (sent/failed).
    if (all.length) {
      const logRows = all.map((r) => ({
        alert_id: alert.id,
        profile_id: r.profileId ?? null,
        phone_number: r.to,
        status: r.status,
        provider_sid: r.sid ?? null,
        error: r.error ?? null,
      }));
      await supabase.from("alert_sms_log").insert(logRows);
    }
  }

  // ---- Bookkeeping on the alert row (skip on escalation re-send) ----
  if (!opts.resend) {
    await supabase
      .from("alerts")
      .update({
        channels: cfg.channels,
        recipient_staff_count: summary.staffCount,
        recipient_resident_count: summary.residentCount,
      })
      .eq("id", alert.id);
  }

  return summary;
}
