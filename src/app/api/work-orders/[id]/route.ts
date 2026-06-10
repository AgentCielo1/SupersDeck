import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";
import { getCurrentUserProfile } from "@/lib/supabase-server";

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
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

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
    let vendorLabel = "no vendor";
    if (update.assigned_vendor_id) {
      const { data: v } = await supabase
        .from("vendors")
        .select("name")
        .eq("id", String(update.assigned_vendor_id))
        .maybeSingle();
      vendorLabel = v?.name ?? String(update.assigned_vendor_id);
    }
    updates.push({
      work_order_id: params.id,
      message: `Vendor: ${vendorLabel}`,
      author,
    });
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

  return NextResponse.json(data);
}
