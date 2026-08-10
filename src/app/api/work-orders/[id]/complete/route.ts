import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";
import { archiveCompletedWorkOrder } from "@/lib/wo-archive";
import type { WorkOrder } from "@/types";
import { requireRole, WRITE_ASMP } from "@/lib/authz";
import { parseJson, optStr } from "@/lib/validation";
import { pushWorkOrderToFHI } from "@/lib/fhi-sync";

// signature is bounded generously (NOT trimmed) so the handler's own
// data-URL-prefix + ~250KB size checks run verbatim.
const CompleteWorkOrderSchema = z.object({
  signature: z.string().min(1).max(400_000).optional(),
  signed_by_name: z.string().max(300).optional(),
  internal_notes: optStr(5000),
  // Storage path of the photographed signed paper WO (uploaded by the client
  // to the work-orders bucket first). Presence = "signed on paper" mode.
  paper_photo_path: optStr(500),
  // Explicit opt-in for closing with no signature at all. Never inferred —
  // an accidental empty submit must not silently close without proof.
  no_signature: z.boolean().optional(),
});

// =============================================================================
//  POST /api/work-orders/:id/complete — three EXPLICIT completion modes
// =============================================================================
//   1. In-app signature   { signature, signed_by_name }         (original flow)
//   2. Signed paper       { paper_photo_path, signed_by_name?,  (+ optional
//                           signature? }                          extracted sig)
//   3. No signature       { no_signature: true }
//  Exactly one basis must be present (paper may ALSO carry an extracted
//  signature image — the paper photo remains the authoritative record).
//  On success: status→completed, paper photo appended to wo.photos, timeline
//  entry per mode, auto-archive to Files, and mirror to FHI (the sync gap:
//  create/edit/delete pushed but completion didn't).
// =============================================================================

export async function POST(
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

  const parsed = await parseJson(request, CompleteWorkOrderSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  const sig = body.signature;
  const signer = (body.signed_by_name ?? "").trim();
  const paperPath = (body.paper_photo_path ?? "").trim();

  // Exactly one completion basis.
  const mode = paperPath ? "paper" : sig ? "signature" : body.no_signature ? "none" : null;
  if (!mode) {
    return NextResponse.json(
      { error: "Provide a signature, a paper_photo_path, or no_signature: true." },
      { status: 400 }
    );
  }

  if (sig) {
    if (!sig.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "signature must be a PNG data URL" },
        { status: 400 }
      );
    }
    if (sig.length > 250_000) {
      return NextResponse.json(
        { error: "signature too large (max ~250 KB)" },
        { status: 413 }
      );
    }
  }
  if (mode === "signature" && !signer) {
    return NextResponse.json(
      { error: "signed_by_name is required" },
      { status: 400 }
    );
  }
  if (paperPath && (paperPath.startsWith("data:") || paperPath.includes(".."))) {
    return NextResponse.json(
      { error: "paper_photo_path must be a storage path" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  // Paper mode appends the photo — read current photos first (never clobber).
  let photos: string[] | undefined;
  if (mode === "paper") {
    const { data: cur } = await supabase
      .from("work_orders")
      .select("photos")
      .eq("id", params.id)
      .maybeSingle();
    if (!cur) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 });
    }
    const existing = Array.isArray(cur.photos)
      ? (cur.photos as unknown[]).filter((p): p is string => typeof p === "string")
      : [];
    photos = existing.includes(paperPath) ? existing : [...existing, paperPath].slice(0, 12);
  }

  const update: Record<string, unknown> = {
    status: "completed",
    resolved_at: now,
    internal_notes: body.internal_notes ?? null,
  };
  if (sig) update.completion_signature = sig;
  if (signer) {
    update.signed_by_name = signer;
    update.signed_at = now;
  }
  if (photos) update.photos = photos;

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

  const message =
    mode === "paper"
      ? `Completed — signed paper work order attached${signer ? ` (signed by ${signer})` : ""}${sig ? "; signature captured from paper" : ""}`
      : mode === "signature"
      ? `Completed and signed by ${signer}`
      : "Completed without signature";

  await supabase.from("work_order_updates").insert({
    id: `wou-${params.id}-${Date.now()}-complete`,
    work_order_id: params.id,
    message,
    author: signer || "staff",
  });

  // Auto-file the completed work order into the Files tab (building/apartment).
  await archiveCompletedWorkOrder(data as WorkOrder);

  // Mirror completion to FHI (no-op until the sync env is set).
  await pushWorkOrderToFHI("upsert", data).catch((e) =>
    console.error("[complete] FHI sync failed:", e)
  );

  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${params.id}`);
  revalidatePath(`/track/${data.ticket_number}`);
  revalidatePath("/files");
  revalidatePath("/", "layout");

  return NextResponse.json(data);
}
