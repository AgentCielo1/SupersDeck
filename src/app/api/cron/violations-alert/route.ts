import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { getServerSupabase } from "@/lib/supabase";

// =============================================================================
//  GET/POST /api/cron/violations-alert
// =============================================================================
//  Daily digest email to admins. Triggered by Vercel Cron (see vercel.json).
//  Pulls violations seen in the last 24 hours from the `violations` table
//  (which the violations-refresh cron populates), filters to Class C +
//  overdue + brand-new, and emails the admins.
//
//  Uses the Resend HTTP API directly — not Supabase SMTP. Bypasses the whole
//  SMTP-config rabbit hole. Requires RESEND_API_KEY env var.
//
//  Caveats while you're on Resend's test sender (`onboarding@resend.dev`):
//   - The sender is only allowed to send to the email that owns your Resend
//     account. So this digest will only reach you initially.
//   - To send to other admins, verify a domain in Resend → Domains and
//     change FROM_EMAIL below to noreply@yourdomain.com.
// =============================================================================

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "SupersDeck <onboarding@resend.dev>";

function authorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

function classRank(cls: string | null): number {
  return cls === "C" ? 3 : cls === "B" ? 2 : cls === "A" ? 1 : 0;
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

  // Find violations first_seen in the last 24 hours.
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: newRows, error: vErr } = await supabase
    .from("violations")
    .select(
      "id, building_id, class, status, description, apartment, nov_issued_date, first_seen_at"
    )
    .gte("first_seen_at", since)
    .order("class", { ascending: false })
    .order("nov_issued_date", { ascending: false });
  if (vErr) {
    return NextResponse.json({ error: vErr.message }, { status: 500 });
  }
  const newViolations = (newRows ?? []) as Array<{
    id: string;
    building_id: string;
    class: string | null;
    status: string | null;
    description: string | null;
    apartment: string | null;
    nov_issued_date: string | null;
    first_seen_at: string;
  }>;

  // Skip the email entirely if nothing new — cron quietly succeeds.
  // "New" now spans both feeds: HPD violations first seen in 24h, plus
  // OATH/ECB summonses first seen in 24h, hearings inside 7 days, and open
  // defaults (each default accrues until vacated, so it stays in the digest).
  type EcbDigestRow = {
    id: string;
    building_id: string | null;
    issuing_agency: string | null;
    charge: string | null;
    violation_date: string | null;
    hearing_date: string | null;
    hearing_status: string | null;
    balance_due: number | null;
    is_defaulted: boolean;
    first_seen_at: string;
  };
  const ecbSelect =
    "id, building_id, issuing_agency, charge, violation_date, hearing_date, hearing_status, balance_due, is_defaulted, first_seen_at";
  const in7d = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const nowIso = new Date().toISOString();
  // Table may predate the ECB migration — a query error degrades to an
  // HPD-only digest rather than failing the whole cron.
  const [newEcbQ, hearingsQ, defaultsQ] = await Promise.all([
    supabase.from("ecb_violations").select(ecbSelect).gte("first_seen_at", since).eq("is_open", true),
    supabase.from("ecb_violations").select(ecbSelect).eq("is_open", true).gte("hearing_date", nowIso).lte("hearing_date", in7d),
    supabase.from("ecb_violations").select(ecbSelect).eq("is_open", true).eq("is_defaulted", true),
  ]);
  const newEcb = (newEcbQ.data ?? []) as EcbDigestRow[];
  const hearingIds = new Set(newEcb.map((r) => r.id));
  const upcomingHearings = ((hearingsQ.data ?? []) as EcbDigestRow[]).filter(
    (r) => !hearingIds.has(r.id),
  );
  const openDefaults = (defaultsQ.data ?? []) as EcbDigestRow[];

  if (
    newViolations.length === 0 &&
    newEcb.length === 0 &&
    upcomingHearings.length === 0 &&
    openDefaults.length === 0
  ) {
    return NextResponse.json({
      sent: false,
      reason: "no new violations, summonses, hearings, or defaults",
    });
  }

  // Fetch building names so the email reads "Building 1" not "bldg-1".
  const buildingIds = Array.from(
    new Set([
      ...newViolations.map((v) => v.building_id),
      ...[...newEcb, ...upcomingHearings, ...openDefaults]
        .map((r) => r.building_id)
        .filter((id): id is string => Boolean(id)),
    ])
  );
  const { data: bldgs } = await supabase
    .from("buildings")
    .select("id, name, address")
    .in("id", buildingIds);
  const buildingById = Object.fromEntries(
    (bldgs ?? []).map((b: any) => [b.id, b])
  );

  // Fetch admin emails.
  const { data: adminProfiles } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("role", "admin");
  const admins = (adminProfiles ?? []) as Array<{
    email: string;
    full_name: string | null;
  }>;
  if (admins.length === 0) {
    return NextResponse.json({
      sent: false,
      reason: "no admin recipients configured",
    });
  }

  // Group by building, then sort by class severity (C first).
  const byBuilding: Record<string, typeof newViolations> = {};
  newViolations.forEach((v) => {
    (byBuilding[v.building_id] ??= []).push(v);
  });
  Object.values(byBuilding).forEach((vs) =>
    vs.sort((a, b) => classRank(b.class) - classRank(a.class))
  );

  const classCount = (cls: string) =>
    newViolations.filter((v) => v.class === cls).length;

  const subjectParts: string[] = [];
  if (newViolations.length > 0) {
    subjectParts.push(
      `${newViolations.length} new HPD violation${newViolations.length === 1 ? "" : "s"}${
        classCount("C") > 0 ? ` (${classCount("C")} Class C)` : ""
      }`
    );
  }
  if (newEcb.length > 0) {
    subjectParts.push(
      `${newEcb.length} new ECB summons${newEcb.length === 1 ? "" : "es"}`
    );
  }
  if (openDefaults.length > 0) {
    subjectParts.push(`${openDefaults.length} in DEFAULT`);
  } else if (upcomingHearings.length > 0) {
    subjectParts.push(
      `${upcomingHearings.length} hearing${upcomingHearings.length === 1 ? "" : "s"} this week`
    );
  }
  const subject = `SupersDeck: ${subjectParts.join(" · ")}`;

  const html = renderHtml({
    byBuilding,
    buildingById,
    classCount,
    hpdCount: newViolations.length,
    newEcb,
    upcomingHearings,
    openDefaults,
  });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: admins.map((a) => a.email),
    subject,
    html,
  });

  if (error) {
    return NextResponse.json(
      { sent: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    sent: true,
    message_id: data?.id,
    new_violations: newViolations.length,
    by_class: { C: classCount("C"), B: classCount("B"), A: classCount("A") },
    new_ecb: newEcb.length,
    upcoming_hearings: upcomingHearings.length,
    open_defaults: openDefaults.length,
    recipients: admins.length,
  });
}

export const GET = handler;
export const POST = handler;

// ---------- HTML rendering ----------
function renderHtml({
  byBuilding,
  buildingById,
  classCount,
  hpdCount,
  newEcb,
  upcomingHearings,
  openDefaults,
}: {
  byBuilding: Record<string, any[]>;
  buildingById: Record<string, any>;
  classCount: (cls: string) => number;
  hpdCount: number;
  newEcb: any[];
  upcomingHearings: any[];
  openDefaults: any[];
}): string {
  const money = (n: number | null) =>
    n == null ? "—" : `$${Number(n).toLocaleString("en-US")}`;
  const bName = (id: string | null) =>
    id ? buildingById[id]?.name ?? id : "Campus-wide";

  const ecbTable = (rows: any[], dateCol: "violation_date" | "hearing_date") =>
    rows.length === 0
      ? ""
      : `<table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:6px;overflow:hidden;margin-top:6px">
          <thead style="background:#f7f7f6;color:#888;font-size:10px;text-transform:uppercase;letter-spacing:0.04em">
            <tr>
              <th style="padding:6px 10px;text-align:left">Agency</th>
              <th style="padding:6px 10px;text-align:left">Building</th>
              <th style="padding:6px 10px;text-align:left">${dateCol === "hearing_date" ? "Hearing" : "Issued"}</th>
              <th style="padding:6px 10px;text-align:left">Balance</th>
              <th style="padding:6px 10px;text-align:left">Charge</th>
            </tr>
          </thead>
          <tbody>${rows
            .map(
              (r) => `
            <tr style="border-top:1px solid #eee">
              <td style="padding:8px 10px;vertical-align:top;font-size:12px;font-weight:600">${r.issuing_agency ?? "—"}</td>
              <td style="padding:8px 10px;vertical-align:top;font-size:12px">${bName(r.building_id)}</td>
              <td style="padding:8px 10px;vertical-align:top;font-size:12px;white-space:nowrap">${
                r[dateCol] ? new Date(r[dateCol]).toLocaleDateString() : "—"
              }</td>
              <td style="padding:8px 10px;vertical-align:top;font-size:12px">${money(r.balance_due)}</td>
              <td style="padding:8px 10px;vertical-align:top;font-size:12px;color:#333">${(r.charge ?? "").slice(0, 120)}</td>
            </tr>`
            )
            .join("")}</tbody>
        </table>`;

  const ecbSections = `
    ${
      openDefaults.length > 0
        ? `<div style="margin-top:24px;padding:12px;border:1px solid #e3b9b9;border-radius:8px;background:#fdecec">
             <div style="font-weight:600;font-size:14px;color:#791F1F">⚠ ${openDefaults.length} summons${openDefaults.length === 1 ? "" : "es"} in DEFAULT at OATH</div>
             <div style="color:#7d1d1d;font-size:12px;margin-top:2px">A missed hearing imposes the full penalty automatically — file a motion to vacate.</div>
             ${ecbTable(openDefaults, "hearing_date")}
           </div>`
        : ""
    }
    ${
      newEcb.length > 0
        ? `<div style="margin-top:24px">
             <div style="font-weight:600;font-size:14px">New OATH/ECB summonses (DEP · DOB · FDNY · …)</div>
             ${ecbTable(newEcb, "violation_date")}
           </div>`
        : ""
    }
    ${
      upcomingHearings.length > 0
        ? `<div style="margin-top:24px">
             <div style="font-weight:600;font-size:14px">Hearings in the next 7 days</div>
             <div style="color:#666;font-size:12px">Attend or resolve before the date — a no-show becomes a default judgment.</div>
             ${ecbTable(upcomingHearings, "hearing_date")}
           </div>`
        : ""
    }`;

  const buildingSections = Object.entries(byBuilding)
    .map(([bid, vs]) => {
      const b = buildingById[bid];
      const rows = vs
        .map(
          (v) => `
        <tr style="border-top:1px solid #eee">
          <td style="padding:8px 10px;vertical-align:top">
            <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;background:${
              v.class === "C" ? "#FCEBEB" : "#FAEEDA"
            };color:${v.class === "C" ? "#791F1F" : "#633806"}">${
              v.class ?? "—"
            }</span>
          </td>
          <td style="padding:8px 10px;vertical-align:top;color:#666;font-size:12px;white-space:nowrap">${
            v.nov_issued_date
              ? new Date(v.nov_issued_date).toLocaleDateString()
              : "—"
          }</td>
          <td style="padding:8px 10px;vertical-align:top;font-size:12px">${
            v.apartment ?? ""
          }</td>
          <td style="padding:8px 10px;vertical-align:top;font-size:12px;color:#333">${
            (v.description ?? "").slice(0, 140)
          }</td>
        </tr>`
        )
        .join("");
      return `
      <div style="margin-top:24px">
        <div style="font-weight:600;font-size:14px">${b?.name ?? bid}</div>
        <div style="color:#666;font-size:12px;margin-bottom:6px">${b?.address ?? ""}</div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:6px;overflow:hidden">
          <thead style="background:#f7f7f6;color:#888;font-size:10px;text-transform:uppercase;letter-spacing:0.04em">
            <tr>
              <th style="padding:6px 10px;text-align:left">Class</th>
              <th style="padding:6px 10px;text-align:left">Issued</th>
              <th style="padding:6px 10px;text-align:left">Apt</th>
              <th style="padding:6px 10px;text-align:left">Description</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    })
    .join("");

  return `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Inter,sans-serif;color:#1a1a18;background:#f7f7f6;margin:0;padding:24px">
  <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:12px;padding:24px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <div style="width:32px;height:32px;border-radius:6px;background:#1a3a8c;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:600">S</div>
      <strong>SupersDeck · Morning violations digest</strong>
    </div>

    ${
      hpdCount > 0
        ? `<p>New HPD violations posted on your buildings overnight:</p>
    <ul style="margin:8px 0 0;padding-left:20px;color:#444">
      <li><b>${classCount("C")}</b> Class C (24-hour cure)</li>
      <li><b>${classCount("B")}</b> Class B (30-day cure)</li>
      <li><b>${classCount("A")}</b> Class A (90-day cure)</li>
    </ul>

    ${buildingSections}`
        : `<p>No new HPD violations overnight.</p>`
    }

    ${ecbSections}

    <p style="margin-top:24px;color:#666;font-size:12px">
      View the full list and cure deadlines in
      <a href="https://hpdonline.hpdnyc.org/HPDonline/" style="color:#1a3a8c">HPD Online</a>
      or in SupersDeck at <code>/violations</code>.
    </p>
  </div>
</body></html>`;
}
