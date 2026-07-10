import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { getServerSupabase } from "@/lib/supabase";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { resolvePhotoUrls, PHOTO_BUCKET } from "@/lib/storage";
import { archiveCompletedWorkOrder } from "@/lib/wo-archive";
import type { WorkOrder } from "@/types";
import { requireRole, WRITE_ASMP, ADMIN_ONLY } from "@/lib/authz";
import { parseJson } from "@/lib/validation";
import { pushWorkOrderToFHI } from "@/lib/fhi-sync";
import { z } from "zod";

// Partial-update body: every field optional. A server-side whitelist
// (ALLOWED_FIELDS) filters what reaches the DB; the handler does its own
// empty-string→null normalization + photo validation. Strings are bounded but
// NOT trimmed to preserve that logic. Photos are bounded here and further
// checked (count/size/format) below.
const s = (max: number) => z.string().max(max);
const UpdateWorkOrderSchema = z.object({
  title: s(300).optional().nullable(),
  description: s(5000).optional().nullable(),
  category: s(100).optional().nullable(),
  priority: s(50).optional().nullable(),
  status: s(50).optional().nullable(),
  assigned_to: s(100).optional().nullable(),
  assigned_vendor_id: s(100).optional().nullable(),
  due_at: s(100).optional().nullable(),
  internal_notes: s(5000).optional().nullable(),
  hpd_risk: z.boolean().optional(),
  photos: z.array(z.string().max(2_000_000)).optional().nullable(),
  unit_id: s(100).optional().nullable(),
});

// =============================================================================
//  PATCH /api/work-orders/:id  — edit a work order
//  GET   /api/work-orders/:id  — fetch one (used by the edit form)
// =============================================================================

const ALLOWED_FIELDS = new Set([
  "title",
  "description",
  "category",
  "priority",
  "status",
  "assigned_to",
  "assigned_vendor_id",
  "due_at",
  "internal_notes",
  "hpd_risk",
  "photos",
  "unit_id",
]);

// Hard cap on a single WO's photo payload so we don't accidentally ship
// megabytes of base64 in a DB row.
const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 350_000; // ~250KB image after base64 inflation

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }
  const { data, error } = await supabase
    .from("work_orders")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(WRITE_ASMP);
  if (auth.response) return auth.response;
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const parsed = await parseJson(request, UpdateWorkOrderSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(k)) update[k] = v === "" ? null : v;
  }

  // Validate photos: each must be a data URL of a reasonable size.
  if (Array.isArray(update.photos)) {
    const photos = update.photos as unknown[];
    if (photos.length > MAX_PHOTOS) {
      return NextResponse.json(
        { error: `At most ${MAX_PHOTOS} photos per work order` },
        { status: 413 }
      );
    }
    for (const p of photos) {
      if (typeof p !== "string") {
        return NextResponse.json(
          { error: "Photos must be strings (data URLs or storage paths)" },
          { status: 400 }
        );
      }
      // Two valid formats: legacy base64 data URLs, or new storage paths.
      const isDataUrl = p.startsWith("data:image/");
      const isStoragePath = !p.startsWith("data:") && p.length < 500;
      if (!isDataUrl && !isStoragePath) {
        return NextResponse.json(
          { error: "Photo must be either a data URL or a storage path" },
          { status: 400 }
        );
      }
      if (isDataUrl && p.length > MAX_PHOTO_BYTES) {
        return NextResponse.json(
          { error: "Inline photo too large. Use Storage upload instead." },
          { status: 413 }
        );
      }
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No editable fields in body" },
      { status: 400 }
    );
  }

  // Snapshot the row BEFORE the update so we can diff and write a timeline
  // entry on status / assignee changes.
  const { data: before } = await supabase
    .from("work_orders")
    .select("status, assigned_to, assigned_vendor_id")
    .eq("id", params.id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("work_orders")
    .update(update)
    .eq("id", params.id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Work order not found" }, { status: 404 });
  }

  // If this edit closed the work order, auto-file its PDF into the Files tab.
  if ("status" in update && update.status === "completed") {
    await archiveCompletedWorkOrder(data as WorkOrder);
    revalidatePath("/files");
  }

  // Log meaningful changes to the timeline. Quiet for edits that only touch
  // the title/description/photos (those show up via the WO itself).
  const me = await getCurrentUserProfile().catch(() => null);
  const author = me?.full_name || me?.email || "system";
  const updates: { work_order_id: string; message: string; author: string }[] = [];
  if (before && "status" in update && update.status !== before.status) {
    updates.push({
      work_order_id: params.id,
      message: `Status changed: ${before.status ?? "(none)"} → ${update.status}`,
      author,
    });
  }
  if (before && "assigned_to" in update && update.assigned_to !== before.assigned_to) {
    const to = update.assigned_to ? String(update.assigned_to) : "unassigned";
    updates.push({
      work_order_id: params.id,
      message: `Assigned to ${to}`,
      author,
    });
  }
  if (
    before &&
    "assigned_vendor_id" in update &&
    update.assigned_vendor_id !== before.assigned_vendor_id
  ) {
    const newVendorId = update.assigned_vendor_id;
    let vendor: {
      name: string;
      email: string | null;
      phone: string | null;
    } | null = null;
    if (newVendorId) {
      const { data: v } = await supabase
        .from("vendors")
        .select("name, email, phone")
        .eq("id", String(newVendorId))
        .maybeSingle();
      vendor = (v as any) ?? null;
    }
    const vendorLabel = vendor?.name ?? (newVendorId ? String(newVendorId) : "no vendor");
    updates.push({
      work_order_id: params.id,
      message: `Vendor: ${vendorLabel}`,
      author,
    });

    // Notify vendor by email if we have one + Resend configured. Failure
    // is non-fatal — the assignment still saves, the timeline shows the
    // attempt, and the super can manually call the vendor.
    if (vendor?.email && process.env.RESEND_API_KEY && newVendorId) {
      try {
        const [{ data: bldg }, unitData] = await Promise.all([
          supabase
            .from("buildings")
            .select("name, address")
            .eq("id", data.building_id)
            .maybeSingle(),
          data.unit_id
            ? supabase
                .from("units")
                .select("label")
                .eq("id", data.unit_id)
                .maybeSingle()
            : Promise.resolve({ data: null as { label: string } | null }),
        ]);
        const buildingLabel = bldg
          ? `${bldg.name} (${bldg.address})`
          : data.building_id;
        const unitLabel = unitData.data?.label ?? "Common area";
        const photoUrls = await resolvePhotoUrls(
          Array.isArray(data.photos) ? data.photos : []
        );

        const fromEmail =
          process.env.RESEND_FROM_EMAIL ||
          "SupersDeck <onboarding@resend.dev>";
        const replyTo = me?.email ?? undefined;
        const subject = `[${data.priority.toUpperCase()}] ${data.ticket_number}: ${data.title}`;

        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: fromEmail,
          to: [vendor.email],
          replyTo,
          subject,
          html: renderVendorEmail({
            wo: data,
            vendor,
            buildingLabel,
            unitLabel,
            photoUrls,
            superName: me?.full_name ?? me?.email ?? "Your super",
          }),
        });
        updates.push({
          work_order_id: params.id,
          message: `Email sent to ${vendor.email}`,
          author: "system",
        });
      } catch (e) {
        console.error("[work-orders] vendor email failed:", e);
        updates.push({
          work_order_id: params.id,
          message: `Vendor email failed (${
            e instanceof Error ? e.message : "unknown"
          }) — please call ${vendor.phone ?? vendor.email}`,
          author: "system",
        });
      }
    }
  }
  if (updates.length > 0) {
    const rows = updates.map((u, i) => ({
      id: `wou-${params.id}-${Date.now()}-${i}`,
      ...u,
    }));
    const { error: timelineErr } = await supabase
      .from("work_order_updates")
      .insert(rows);
    if (timelineErr) {
      // Don't fail the whole request — the WO did update; the log is bonus.
      console.error("[work-orders] timeline insert failed:", timelineErr.message);
    }
  }

  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${params.id}`);
  revalidatePath(`/work-orders/${params.id}/edit`);
  revalidatePath(`/track/${data.ticket_number}`);
  revalidatePath("/", "layout");

  // Mirror the edit to the FHI replica (no-op until sync is configured).
  await pushWorkOrderToFHI("upsert", data);

  return NextResponse.json(data);
}

// =============================================================================
//  DELETE /api/work-orders/:id — permanently remove a work order (admin only)
// =============================================================================
//  Destructive: removes the WO, its timeline rows, and any Storage-backed
//  photos. Admin-gated like the other hard deletes (units/vendors/buildings).
//  SupersDeck is the master, so a delete here is authoritative; propagation of
//  the deletion to the FHI mirror is wired via the sync layer (added with the
//  SupersDeck→FHI push).
// =============================================================================
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(ADMIN_ONLY);
  if (auth.response) return auth.response;
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  // Load first: confirm it exists and grab photos for storage cleanup.
  const { data: wo } = await supabase
    .from("work_orders")
    .select("id, ticket_number, photos")
    .eq("id", params.id)
    .maybeSingle();
  if (!wo) {
    return NextResponse.json({ error: "Work order not found" }, { status: 404 });
  }

  // Best-effort: delete Storage-backed photos (skip legacy inline data: URLs).
  const paths = Array.isArray(wo.photos)
    ? (wo.photos as unknown[]).filter(
        (p): p is string => typeof p === "string" && !p.startsWith("data:")
      )
    : [];
  if (paths.length) {
    await supabase.storage.from(PHOTO_BUCKET).remove(paths).then(undefined, () => {});
  }

  // Remove timeline rows first (FK), then the work order itself.
  await supabase
    .from("work_order_updates")
    .delete()
    .eq("work_order_id", params.id)
    .then(undefined, () => {});

  const { error } = await supabase.from("work_orders").delete().eq("id", params.id);
  if (error) {
    const msg = /foreign key|violates/i.test(error.message)
      ? "Can't delete — this work order still has linked records."
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Mirror the deletion to the FHI replica (no-op until sync is configured).
  await pushWorkOrderToFHI("delete", { id: params.id });

  revalidatePath("/work-orders");
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, deleted: wo.ticket_number });
}

// =============================================================================
//  Email — assignment notification to vendor
// =============================================================================
function renderVendorEmail(input: {
  wo: any;
  vendor: { name: string; email: string | null; phone: string | null };
  buildingLabel: string;
  unitLabel: string;
  photoUrls: string[];
  superName: string;
}): string {
  const { wo, vendor, buildingLabel, unitLabel, photoUrls, superName } = input;
  const priorityColor =
    wo.priority === "emergency"
      ? "#791F1F"
      : wo.priority === "high"
      ? "#633806"
      : "#444";
  const photoBlock =
    photoUrls.length === 0
      ? ""
      : `<div style="margin-top:12px">
           <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px">Photos (${photoUrls.length})</div>
           <div>${photoUrls
             .map(
               (u) =>
                 `<a href="${u}" style="display:inline-block;margin-right:6px"><img src="${u}" alt="Photo" style="height:120px;border:1px solid #eee;border-radius:6px"></a>`
             )
             .join("")}</div>
           <div style="font-size:11px;color:#888;margin-top:4px">Photo links expire in 1 hour.</div>
         </div>`;

  return `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Inter,sans-serif;color:#1a1a18;background:#f7f7f6;margin:0;padding:24px">
  <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:12px;padding:24px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <div style="width:32px;height:32px;border-radius:6px;background:#1a3a8c;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:600">S</div>
      <strong>SupersDeck · Work order assignment</strong>
    </div>

    <p style="margin:0 0 16px 0">Hi ${vendor.name.split(" ")[0]},</p>
    <p style="margin:0 0 16px 0;color:#444">
      ${superName} assigned you a work order. Details below.
      Please reply to this email or call to coordinate scheduling.
    </p>

    <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden">
      <tbody>
        <tr><td style="padding:8px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.04em;background:#f7f7f6;width:120px">Ticket</td>
            <td style="padding:8px 12px;font-family:ui-monospace,Menlo,monospace;font-size:13px">${wo.ticket_number}</td></tr>
        <tr><td style="padding:8px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.04em;background:#f7f7f6">Priority</td>
            <td style="padding:8px 12px;font-size:13px;color:${priorityColor};font-weight:${
              wo.priority === "emergency" ? 700 : 500
            }">${String(wo.priority).toUpperCase()}</td></tr>
        <tr><td style="padding:8px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.04em;background:#f7f7f6">Category</td>
            <td style="padding:8px 12px;font-size:13px">${String(wo.category).replace(/-/g, " ")}</td></tr>
        <tr><td style="padding:8px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.04em;background:#f7f7f6">Building</td>
            <td style="padding:8px 12px;font-size:13px">${buildingLabel}</td></tr>
        <tr><td style="padding:8px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.04em;background:#f7f7f6">Unit</td>
            <td style="padding:8px 12px;font-size:13px">${unitLabel}</td></tr>
        <tr><td style="padding:8px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.04em;background:#f7f7f6">Reporter</td>
            <td style="padding:8px 12px;font-size:13px">${wo.reporter_name}${
              wo.reporter_phone ? ` · ${wo.reporter_phone}` : ""
            }</td></tr>
      </tbody>
    </table>

    <h3 style="margin:20px 0 6px;font-size:14px">${wo.title}</h3>
    <p style="margin:0;color:#444;font-size:13px;white-space:pre-wrap">${
      wo.description ?? "(no description)"
    }</p>

    ${photoBlock}

    <p style="margin-top:24px;color:#666;font-size:12px">
      Sent on behalf of ${superName}. Reply to this email to coordinate.
    </p>
  </div>
</body></html>`;
}
