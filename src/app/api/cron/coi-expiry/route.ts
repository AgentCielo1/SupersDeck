import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { getServerSupabase } from "@/lib/supabase";
import { pushToAdminsAndSupers } from "@/lib/push";
import {
  daysUntil,
  complianceDocLabel,
  DEFAULT_REMINDER_DAYS,
  type ComplianceDocType,
} from "@workorder/kit/contractor/contract";

// =============================================================================
//  GET/POST /api/cron/coi-expiry
// =============================================================================
//  Daily scan for contractor COIs / licenses hitting the reminder cadence
//  (90/60/30/10 days out) or already expired. Pushes admins/supers and emails
//  a digest (Resend). Triggered by Vercel Cron (see vercel.json). Mirrors
//  /api/cron/violations-alert. Safe before the migration runs — a missing
//  table returns a quiet ok.
// =============================================================================

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "SupersDeck <onboarding@resend.dev>";

function authorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

type DocRow = {
  id: string;
  company_id: string | null;
  doc_type: ComplianceDocType;
  expiry_date: string;
  carrier: string | null;
};

async function handler(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const horizon = Math.max(...DEFAULT_REMINDER_DAYS); // 90
  const cutoff = new Date(Date.now() + horizon * 86_400_000).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("compliance_documents")
    .select("id, company_id, doc_type, expiry_date, carrier")
    .not("expiry_date", "is", null)
    .lte("expiry_date", cutoff)
    .order("expiry_date", { ascending: true });

  if (error) {
    // Most likely the contractor tables haven't been migrated yet.
    return NextResponse.json({ ok: true, note: "compliance_documents unavailable", error: error.message });
  }

  const docs = (data ?? []) as DocRow[];
  const windows = new Set(DEFAULT_REMINDER_DAYS);
  const due = docs.filter((d) => {
    const n = daysUntil(d.expiry_date);
    return n < 0 || windows.has(n);
  });

  if (due.length === 0) {
    return NextResponse.json({ sent: false, reason: "nothing due today", scanned: docs.length });
  }

  const ids = Array.from(new Set(due.map((d) => d.company_id).filter(Boolean))) as string[];
  const { data: vend } = ids.length
    ? await supabase.from("vendors").select("id,name").in("id", ids)
    : { data: [] as Array<{ id: string; name: string }> };
  const nameById: Record<string, string> = Object.fromEntries(
    (vend ?? []).map((v: any) => [v.id, v.name])
  );

  const expired = due.filter((d) => daysUntil(d.expiry_date) < 0).length;
  const summary = `${due.length} contractor document${due.length === 1 ? "" : "s"} need attention${
    expired ? ` · ${expired} expired` : ""
  }`;

  const push = await pushToAdminsAndSupers({
    title: "Contractor COI / license expiring",
    body: summary,
    url: "/contractors",
    tag: "coi-expiry",
    priority: expired ? "high" : "normal",
  });

  let emailed = false;
  if (process.env.RESEND_API_KEY) {
    const rows = due
      .map((d) => {
        const n = daysUntil(d.expiry_date);
        const when = n < 0 ? `expired ${-n}d ago` : `${n}d left`;
        const co = nameById[d.company_id || ""] || d.company_id || "—";
        return `<tr style="border-top:1px solid #eee"><td style="padding:8px 10px">${co}</td><td style="padding:8px 10px">${complianceDocLabel(
          d.doc_type
        )}</td><td style="padding:8px 10px;white-space:nowrap">${d.expiry_date}</td><td style="padding:8px 10px;color:${
          n < 0 ? "#791F1F" : "#633806"
        }">${when}</td></tr>`;
      })
      .join("");
    const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,sans-serif;background:#f7f7f6;padding:24px">
      <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:12px;padding:24px">
        <strong>SupersDeck · Contractor compliance</strong>
        <p>${summary}. Renew before lapse to keep contractors cleared at sign-in.</p>
        <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:6px;overflow:hidden">
          <thead style="background:#f7f7f6;color:#888;font-size:10px;text-transform:uppercase;letter-spacing:.04em">
            <tr><th style="padding:6px 10px;text-align:left">Company</th><th style="padding:6px 10px;text-align:left">Document</th><th style="padding:6px 10px;text-align:left">Expires</th><th style="padding:6px 10px;text-align:left">Status</th></tr>
          </thead><tbody>${rows}</tbody>
        </table>
        <p style="margin-top:16px;color:#666;font-size:12px">Manage in SupersDeck at <code>/contractors</code>.</p>
      </div></body></html>`;

    const { data: admins } = await supabase.from("profiles").select("email").eq("role", "admin");
    const to = (admins ?? []).map((a: any) => a.email).filter(Boolean) as string[];
    if (to.length) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { error: e } = await resend.emails.send({
          from: FROM_EMAIL,
          to,
          subject: `SupersDeck: ${summary}`,
          html,
        });
        emailed = !e;
      } catch {
        // best-effort
      }
    }
  }

  return NextResponse.json({ sent: true, due: due.length, expired, push, emailed });
}

export const GET = handler;
export const POST = handler;
