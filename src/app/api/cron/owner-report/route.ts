import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { getServerSupabase } from "@/lib/supabase";
import {
  gatherOwnerReportData,
  buildingsByManager,
  renderOwnerReportHtml,
} from "@/lib/owner-report";

// =============================================================================
//  GET/POST /api/cron/owner-report
// =============================================================================
//  Monthly report to the management company. Triggered by Vercel Cron on the
//  1st of every month (see vercel.json). For each building with a
//  manager_email on file, sends a one-page HTML summary covering the past 30
//  days: WO stats, overdue compliance, new HPD violations, expiring certs.
//
//  Buildings that share a manager_email (e.g. one management company runs
//  all three) get a single combined email rather than three. The actual
//  data + HTML rendering lives in `src/lib/owner-report.ts` so the in-app
//  preview at /owner-report/preview can show exactly what the cron sends.
//
//  Uses Resend HTTP API; needs a verified domain in Resend to reach
//  non-Resend-owner addresses.
// =============================================================================

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "BoroDesk <onboarding@resend.dev>";

function authorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

async function handler(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not set" },
      { status: 503 }
    );
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const data = await gatherOwnerReportData(supabase, 30);
  const groups = buildingsByManager(data.buildings);

  if (groups.length === 0) {
    return NextResponse.json({
      sent: false,
      reason: "no buildings have manager_email set",
      buildings: data.buildings.length,
    });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const sentLog: Array<{
    email: string;
    buildings: string[];
    message_id?: string;
    error?: string;
  }> = [];

  for (const { email, buildings: bldgs } of groups) {
    const buildingIds = new Set(bldgs.map((b) => b.id));
    const myWos = data.wos.filter((w) => buildingIds.has(w.building_id));
    const myViolations = data.violations.filter((v) =>
      buildingIds.has(v.building_id)
    );
    const myCompliance = data.compliance.filter((c) =>
      buildingIds.has(c.building_id)
    );

    const html = renderOwnerReportHtml({
      managerName: bldgs[0].manager_name ?? null,
      periodLabel: data.periodLabel,
      buildings: bldgs,
      wos: myWos,
      violations: myViolations,
      compliance: myCompliance,
      certs: data.certs,
    });

    const subject = `BoroDesk monthly report: ${bldgs
      .map((b) => b.name)
      .join(", ")} — ${data.periodLabel}`;

    const { data: sendData, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject,
      html,
    });
    if (error) {
      sentLog.push({ email, buildings: bldgs.map((b) => b.name), error: error.message });
    } else {
      sentLog.push({
        email,
        buildings: bldgs.map((b) => b.name),
        message_id: sendData?.id,
      });
    }
  }

  return NextResponse.json({
    sent: true,
    period: data.periodLabel,
    recipients: groups.length,
    detail: sentLog,
  });
}

export const GET = handler;
export const POST = handler;
