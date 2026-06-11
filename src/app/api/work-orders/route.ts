import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { getServerSupabase } from "@/lib/supabase";

// =============================================================================
//  POST /api/work-orders — create a work order
// =============================================================================
//  Used by:
//    - /work-orders/new           (super-side, requires auth)
//    - /intake/[buildingCode]     (tenant-facing, no auth)
//
//  We use the service-role client so the tenant intake (anonymous) can also
//  insert. Reasonable since the public intake page restricts the building
//  via URL and the API validates the building exists.
//
//  After insert: emails every admin (and super, if role=super) so the team
//  is notified the moment a tenant submits via the QR poster. Failure of the
//  email is logged but never fails the request — losing a notification is
//  recoverable; losing a tenant complaint is not.
//
//  Auto-generates the ticket number as WO-{epoch-base36} to avoid collisions.
// =============================================================================

const ALLOWED_CATEGORIES = new Set([
  "no-heat", "no-hot-water", "leak", "electrical", "appliance",
  "lock-key", "pest", "mold", "elevator", "intercom",
  "common-area", "lead-concern", "other",
]);

const HPD_RISK_CATEGORIES = new Set([
  "no-heat", "no-hot-water", "lead-concern", "mold", "leak",
]);

const CATEGORY_LABELS: Record<string, string> = {
  "no-heat": "No heat",
  "no-hot-water": "No hot water",
  leak: "Leak",
  electrical: "Electrical issue",
  appliance: "Broken appliance",
  "lock-key": "Lock / key issue",
  pest: "Pest",
  mold: "Mold",
  elevator: "Elevator",
  intercom: "Intercom",
  "common-area": "Common area issue",
  "lead-concern": "Lead concern",
  other: "Repair request",
};

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "SupersDeck <onboarding@resend.dev>";

function genTicketNumber(): string {
  // WO-{millis-base36} — short, sortable, ~unique enough for one building's
  // lifetime traffic. Collisions only matter if two tickets land in the same
  // millisecond, which we don't worry about.
  return `WO-${Date.now().toString(36).toUpperCase()}`;
}

export async function POST(request: Request) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.building_id || !body.reporter_name) {
    return NextResponse.json(
      { error: "building_id and reporter_name are required" },
      { status: 400 }
    );
  }

  // Validate the building exists (and is something the caller can target).
  const { data: bldg } = await supabase
    .from("buildings")
    .select("id, name, address")
    .eq("id", String(body.building_id))
    .maybeSingle();
  if (!bldg) {
    return NextResponse.json(
      { error: `Unknown building: ${body.building_id}` },
      { status: 404 }
    );
  }

  const category = ALLOWED_CATEGORIES.has(String(body.category))
    ? String(body.category)
    : "other";

  // If the tenant didn't provide a unit_id but did provide a unit_label, try
  // to resolve it. Best-effort: skip if no match (we don't want to reject the
  // ticket just because of a typo).
  let unit_id: string | null = body.unit_id ? String(body.unit_id) : null;
  if (!unit_id && body.unit_label) {
    const { data: u } = await supabase
      .from("units")
      .select("id")
      .eq("building_id", body.building_id)
      .ilike("label", String(body.unit_label).trim())
      .maybeSingle();
    if (u) unit_id = u.id;
  }

  // Derive a title if the caller didn't pass one. The tenant intake form
  // intentionally doesn't ask for a title — we craft one from category +
  // unit ("No heat — Apt 7C") that's scannable in a list.
  let title = body.title ? String(body.title).trim() : "";
  if (!title) {
    const categoryLabel = CATEGORY_LABELS[category] ?? "Repair request";
    const unitPart = body.unit_label
      ? ` — Apt ${String(body.unit_label).trim()}`
      : "";
    title = `${categoryLabel}${unitPart}`;
  }

  const ticket_number = genTicketNumber();
  const row = {
    id: `wo-${ticket_number.replace("WO-", "").toLowerCase()}`,
    building_id: String(body.building_id),
    unit_id,
    ticket_number,
    title,
    description: body.description ? String(body.description).trim() : null,
    category,
    priority: ["emergency", "high", "normal", "low"].includes(body.priority)
      ? String(body.priority)
      : "normal",
    status: "new",
    reporter_name: String(body.reporter_name).trim(),
    reporter_phone: body.reporter_phone ? String(body.reporter_phone).trim() : null,
    reporter_email: body.reporter_email ? String(body.reporter_email).trim() : null,
    reported_at: new Date().toISOString(),
    hpd_risk: HPD_RISK_CATEGORIES.has(category),
  };

  const { data, error } = await supabase
    .from("work_orders")
    .insert(row)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Seed the timeline with a creation event.
  await supabase.from("work_order_updates").insert({
    id: `wou-${row.id}-${Date.now()}-created`,
    work_order_id: row.id,
    message: `Reported: ${row.title}`,
    author: row.reporter_name,
  });

  // Notify admins + supers (fire and forget — failures don't fail the WO).
  await notifyAdmins(supabase, data, bldg).catch((e) =>
    console.error("[work-orders] notify admins failed:", e)
  );

  revalidatePath("/work-orders");
  revalidatePath("/", "layout");

  return NextResponse.json(data, { status: 201 });
}

// =============================================================================
//  Notification email — sent on every WO creation
// =============================================================================
async function notifyAdmins(
  supabase: ReturnType<typeof getServerSupabase>,
  wo: any,
  building: { name: string; address: string }
) {
  if (!supabase || !process.env.RESEND_API_KEY) return;

  // Pull admin + super profiles. RLS won't see anon callers, but service-role
  // bypasses RLS, which is what we want here — the email recipient list is
  // not tenant-controlled.
  const { data: recipients } = await supabase
    .from("profiles")
    .select("email, full_name, role")
    .in("role", ["admin", "super"]);

  const to = (recipients ?? [])
    .map((r: any) => r.email)
    .filter(Boolean);
  if (to.length === 0) return;

  const priorityTag =
    wo.priority === "emergency"
      ? "🚨 EMERGENCY"
      : wo.priority === "high"
      ? "⚠ HIGH"
      : "";
  const subject =
    `${priorityTag ? priorityTag + " · " : ""}New WO ${wo.ticket_number}: ${wo.title}` +
    ` — ${building.name}`;

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` ||
    "";
  const link = baseUrl ? `${baseUrl}/work-orders/${wo.id}` : "";

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html: renderNewWoEmail({ wo, building, link }),
  });
}

function renderNewWoEmail(input: {
  wo: any;
  building: { name: string; address: string };
  link: string;
}): string {
  const { wo, building, link } = input;
  const priorityColor =
    wo.priority === "emergency"
      ? "#791F1F"
      : wo.priority === "high"
      ? "#633806"
      : "#444";
  return `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Inter,sans-serif;color:#1a1a18;background:#f7f7f6;margin:0;padding:24px">
  <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:12px;padding:24px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <div style="width:32px;height:32px;border-radius:6px;background:#1a3a8c;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:600">S</div>
      <strong>SupersDeck · New work order</strong>
    </div>

    <h2 style="margin:0 0 8px 0;font-size:18px">${wo.title}</h2>
    <div style="color:#666;font-size:13px;margin-bottom:16px">
      <span style="font-family:ui-monospace,Menlo,monospace">${wo.ticket_number}</span> ·
      <span style="color:${priorityColor};font-weight:600">${String(wo.priority).toUpperCase()}</span> ·
      ${String(wo.category).replace(/-/g, " ")}
      ${wo.hpd_risk ? ' · <span style="color:#791F1F;font-weight:600">HPD risk</span>' : ""}
    </div>

    <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden;margin-bottom:16px">
      <tbody>
        <tr><td style="padding:8px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.04em;background:#f7f7f6;width:120px">Building</td>
            <td style="padding:8px 12px;font-size:13px">${building.name}<br><span style="color:#888">${building.address}</span></td></tr>
        ${
          wo.unit_id
            ? `<tr><td style="padding:8px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.04em;background:#f7f7f6">Unit</td>
                   <td style="padding:8px 12px;font-size:13px">${wo.unit_id}</td></tr>`
            : ""
        }
        <tr><td style="padding:8px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.04em;background:#f7f7f6">Reporter</td>
            <td style="padding:8px 12px;font-size:13px">${wo.reporter_name}${
              wo.reporter_phone ? ` · <a href="tel:${wo.reporter_phone}" style="color:#1a3a8c">${wo.reporter_phone}</a>` : ""
            }</td></tr>
      </tbody>
    </table>

    ${
      wo.description
        ? `<p style="margin:0;color:#444;font-size:13px;white-space:pre-wrap">${wo.description}</p>`
        : ""
    }

    ${
      link
        ? `<p style="margin-top:20px"><a href="${link}" style="display:inline-block;background:#1a3a8c;color:#fff;text-decoration:none;font-size:14px;font-weight:500;padding:10px 16px;border-radius:6px">Open in SupersDeck</a></p>`
        : ""
    }

    <p style="margin-top:24px;color:#888;font-size:11px">
      Auto-sent the moment a tenant submitted via the lobby QR poster (or
      when you create a WO from the dashboard).
    </p>
  </div>
</body></html>`;
}
