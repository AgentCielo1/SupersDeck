import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { getServerSupabase } from "@/lib/supabase";
import { generateComplianceItems } from "@/lib/compliance";
import { COMPLIANCE_TEMPLATES } from "@/data/compliance-templates";

// =============================================================================
//  GET/POST /api/cron/owner-report
// =============================================================================
//  Monthly report to the management company. Triggered by Vercel Cron on the
//  1st of every month (see vercel.json). For each building with a
//  manager_email on file, sends a one-page HTML summary covering the past 30
//  days:
//    • Work orders opened / closed / still open / emergencies
//    • Currently overdue compliance items (with cure dates)
//    • New HPD violations posted in the period (Class A/B/C counts)
//    • Staff certifications expiring within 60 days
//
//  Buildings that share a manager_email (e.g. one management company runs
//  all three) get a single combined email rather than three. That keeps the
//  manager's inbox sane.
//
//  Uses Resend HTTP API; same caveats as the daily violations digest about
//  needing a verified domain to reach non-Resend-owner addresses.
// =============================================================================

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "SupersDeck <onboarding@resend.dev>";

function authorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

type BuildingRow = {
  id: string;
  name: string;
  address: string;
  year_built: number | null;
  num_units: number | null;
  manager_name: string | null;
  manager_email: string | null;
  has_known_lead: boolean;
};

type WoRow = {
  id: string;
  ticket_number: string;
  title: string;
  priority: string;
  status: string;
  hpd_risk: boolean;
  building_id: string;
  reported_at: string;
  resolved_at: string | null;
};

type ViolationRow = {
  id: string;
  building_id: string;
  class: string | null;
  description: string | null;
  apartment: string | null;
  nov_issued_date: string | null;
  first_seen_at: string;
};

type CertRow = {
  id: string;
  holder_name: string;
  type: string;
  number: string;
  expires_at: string;
};

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

  // The "report period" is the trailing 30 days. We anchor to "today" so a
  // manual mid-month trigger still produces a coherent report.
  const periodDays = 30;
  const sinceIso = new Date(
    Date.now() - periodDays * 24 * 3600 * 1000
  ).toISOString();
  const periodLabel = new Date().toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  // ---- Pull everything in parallel ----
  const [
    bldgsResult,
    wosResult,
    violationsResult,
    certsResult,
    completedComplianceResult,
  ] = await Promise.all([
    supabase
      .from("buildings")
      .select(
        "id, name, address, year_built, num_units, manager_name, manager_email, has_known_lead"
      ),
    supabase
      .from("work_orders")
      .select(
        "id, ticket_number, title, priority, status, hpd_risk, building_id, reported_at, resolved_at"
      )
      .gte("reported_at", sinceIso),
    supabase
      .from("violations")
      .select(
        "id, building_id, class, description, apartment, nov_issued_date, first_seen_at"
      )
      .gte("first_seen_at", sinceIso),
    supabase
      .from("certifications")
      .select("id, holder_name, type, number, expires_at")
      .lte(
        "expires_at",
        new Date(Date.now() + 60 * 24 * 3600 * 1000)
          .toISOString()
          .slice(0, 10)
      )
      .order("expires_at"),
    supabase
      .from("compliance_items")
      .select("building_id, template_id, last_completed, vendor_id, notes"),
  ]);

  const buildings = (bldgsResult.data ?? []) as BuildingRow[];
  const wos = (wosResult.data ?? []) as WoRow[];
  const violations = (violationsResult.data ?? []) as ViolationRow[];
  const certs = (certsResult.data ?? []) as CertRow[];
  const completedRows = (completedComplianceResult.data ?? []) as Array<{
    building_id: string;
    template_id: string;
    last_completed: string | null;
    vendor_id: string | null;
    notes: string | null;
  }>;

  // Reuse the same generator the UI uses so the "overdue compliance" list in
  // the email matches what shows in the app. The generator wants Building
  // shape; the cast is safe because the columns we select are a subset.
  const complianceItems = generateComplianceItems(
    buildings as any,
    completedRows
      .filter((r) => r.last_completed)
      .map((r) => ({
        building_id: r.building_id,
        template_id: r.template_id,
        last_completed: r.last_completed!,
        vendor_id: r.vendor_id,
        notes: r.notes,
      }))
  );
  const templatesById = Object.fromEntries(
    COMPLIANCE_TEMPLATES.map((t) => [t.id, t])
  );

  // ---- Group by manager_email ----
  const buildingsByEmail: Record<string, BuildingRow[]> = {};
  for (const b of buildings) {
    if (b.manager_email) {
      (buildingsByEmail[b.manager_email] ??= []).push(b);
    }
  }
  const eligibleManagers = Object.entries(buildingsByEmail);
  if (eligibleManagers.length === 0) {
    return NextResponse.json({
      sent: false,
      reason: "no buildings have manager_email set",
      buildings: buildings.length,
    });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const sentLog: Array<{
    email: string;
    buildings: string[];
    message_id?: string;
    error?: string;
  }> = [];

  // ---- Send one email per manager ----
  for (const [email, bldgs] of eligibleManagers) {
    const buildingIds = new Set(bldgs.map((b) => b.id));

    const myWos = wos.filter((w) => buildingIds.has(w.building_id));
    const myViolations = violations.filter((v) =>
      buildingIds.has(v.building_id)
    );
    const myCompliance = complianceItems.filter((c) =>
      buildingIds.has(c.building_id)
    );

    const html = renderEmail({
      managerName: bldgs[0].manager_name ?? null,
      periodLabel,
      buildings: bldgs,
      wos: myWos,
      violations: myViolations,
      compliance: myCompliance,
      certs,                                  // staff certs are portfolio-wide
      templatesById,
    });

    const subject = `SupersDeck monthly report: ${bldgs
      .map((b) => b.name)
      .join(", ")} — ${periodLabel}`;

    const { data, error } = await resend.emails.send({
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
        message_id: data?.id,
      });
    }
  }

  return NextResponse.json({
    sent: true,
    period: periodLabel,
    recipients: eligibleManagers.length,
    detail: sentLog,
  });
}

export const GET = handler;
export const POST = handler;

// =============================================================================
//  Email HTML
// =============================================================================
function renderEmail({
  managerName,
  periodLabel,
  buildings,
  wos,
  violations,
  compliance,
  certs,
  templatesById,
}: {
  managerName: string | null;
  periodLabel: string;
  buildings: BuildingRow[];
  wos: WoRow[];
  violations: ViolationRow[];
  compliance: ReturnType<typeof generateComplianceItems>;
  certs: CertRow[];
  templatesById: Record<string, any>;
}): string {
  const greeting = managerName ? `Hi ${managerName.split(" ")[0]},` : "Hi,";
  const bldgList = buildings
    .map((b) => `${b.name} (${b.address})`)
    .join("; ");

  // ---- Work-order section ----
  const opened = wos.length;
  const closed = wos.filter((w) => w.status === "completed").length;
  const stillOpen = wos.filter(
    (w) => w.status !== "completed" && w.status !== "cancelled"
  ).length;
  const emergencies = wos.filter((w) => w.priority === "emergency").length;
  const hpdRisk = wos.filter((w) => w.hpd_risk).length;

  // ---- Compliance section ----
  const overdue = compliance
    .filter((c) => c.status === "overdue")
    .sort((a, b) => {
      const ad = a.next_due ? +new Date(a.next_due) : Infinity;
      const bd = b.next_due ? +new Date(b.next_due) : Infinity;
      return ad - bd;
    });
  const dueSoon = compliance.filter((c) => c.status === "due-soon").length;
  const overdueRows = overdue
    .slice(0, 12)
    .map((c) => {
      const t = templatesById[c.template_id];
      const bname =
        buildings.find((b) => b.id === c.building_id)?.name ?? c.building_id;
      return `<tr style="border-top:1px solid #eee">
        <td style="padding:6px 10px;font-size:12px;color:#666">${bname}</td>
        <td style="padding:6px 10px;font-size:12px">${t?.name ?? c.template_id}</td>
        <td style="padding:6px 10px;font-size:12px;color:#791F1F;font-weight:600;white-space:nowrap">
          due ${c.next_due ?? "—"}
        </td>
      </tr>`;
    })
    .join("");

  // ---- Violations section ----
  const classCount = (cls: string) =>
    violations.filter((v) => v.class === cls).length;
  const violationsBlock =
    violations.length === 0
      ? `<p style="color:#666;font-size:12px;margin:6px 0 0">
           No new HPD violations posted in the last 30 days.
         </p>`
      : `<p style="margin:6px 0 0;color:#444;font-size:13px">
           <b>${classCount("C")}</b> Class C ·
           <b>${classCount("B")}</b> Class B ·
           <b>${classCount("A")}</b> Class A
         </p>`;

  // ---- Certifications section ----
  const expiringCerts = certs.filter((c) => {
    const days = Math.floor(
      (+new Date(c.expires_at) - Date.now()) / 86400000
    );
    return days <= 60;
  });
  const certRows = expiringCerts
    .map((c) => {
      const days = Math.floor(
        (+new Date(c.expires_at) - Date.now()) / 86400000
      );
      return `<tr style="border-top:1px solid #eee">
        <td style="padding:6px 10px;font-size:12px">${c.type}</td>
        <td style="padding:6px 10px;font-size:12px;color:#666">${c.holder_name} · ${c.number}</td>
        <td style="padding:6px 10px;font-size:12px;color:${
          days < 0 ? "#791F1F" : days < 30 ? "#633806" : "#444"
        };white-space:nowrap;font-weight:600">
          ${days < 0 ? `expired ${Math.abs(days)}d ago` : `${days}d left`}
        </td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Inter,sans-serif;color:#1a1a18;background:#f7f7f6;margin:0;padding:24px">
  <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:12px;padding:24px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <div style="width:32px;height:32px;border-radius:6px;background:#1a3a8c;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:600">S</div>
      <strong>SupersDeck · ${periodLabel} report</strong>
    </div>

    <p style="margin:0 0 8px 0">${greeting}</p>
    <p style="margin:0 0 16px 0;color:#444">
      Building${buildings.length === 1 ? "" : "s"}: <b>${bldgList}</b>
    </p>

    <h3 style="margin:20px 0 6px;font-size:14px">Work orders (last 30 days)</h3>
    <ul style="margin:6px 0 0;padding-left:20px;color:#444;font-size:13px">
      <li><b>${opened}</b> opened · <b>${closed}</b> completed · <b>${stillOpen}</b> still open</li>
      <li><b>${emergencies}</b> emergency priority</li>
      <li><b>${hpdRisk}</b> flagged as HPD risk (no-heat / no-hot-water / lead / mold / leak)</li>
    </ul>

    <h3 style="margin:20px 0 6px;font-size:14px">Compliance status</h3>
    <p style="margin:6px 0;color:#444;font-size:13px">
      <b>${overdue.length}</b> overdue · <b>${dueSoon}</b> due in the next 30 days
    </p>
    ${
      overdue.length > 0
        ? `<table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:6px;overflow:hidden;margin-top:6px">
             <thead style="background:#f7f7f6;color:#888;font-size:10px;text-transform:uppercase;letter-spacing:0.04em">
               <tr>
                 <th style="padding:6px 10px;text-align:left">Building</th>
                 <th style="padding:6px 10px;text-align:left">Item</th>
                 <th style="padding:6px 10px;text-align:left">Due</th>
               </tr>
             </thead>
             <tbody>${overdueRows}</tbody>
           </table>
           ${
             overdue.length > 12
               ? `<p style="color:#666;font-size:11px;margin-top:6px">
                    + ${overdue.length - 12} more — see /compliance.
                  </p>`
               : ""
           }`
        : `<p style="color:#666;font-size:12px;margin:6px 0 0">Nothing overdue. Nice.</p>`
    }

    <h3 style="margin:20px 0 6px;font-size:14px">HPD violations (last 30 days)</h3>
    ${violationsBlock}

    <h3 style="margin:20px 0 6px;font-size:14px">Staff certifications expiring soon</h3>
    ${
      expiringCerts.length === 0
        ? `<p style="color:#666;font-size:12px;margin:6px 0 0">None within 60 days.</p>`
        : `<table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:6px;overflow:hidden;margin-top:6px">
             <tbody>${certRows}</tbody>
           </table>`
    }

    <p style="margin-top:24px;color:#666;font-size:12px">
      Auto-generated by SupersDeck on the 1st of each month.
      Reply to this email if anything looks off — it's sent on behalf of your super.
    </p>
  </div>
</body></html>`;
}
