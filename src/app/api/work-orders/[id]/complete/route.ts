import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";
import { archiveCompletedWorkOrder } from "@/lib/wo-archive";
import type { WorkOrder } from "@/types";
import { requireRole, WRITE_ASMP } from "@/lib/authz";
import { parseJson, optStr } from "@/lib/validation";

// signature is bounded generously (NOT trimmed) so the handler's own
// data-URL-prefix + ~250KB size checks run verbatim.
const CompleteWorkOrderSchema = z.object({
  signature: z.string().min(1).max(400_000),
  signed_by_name: z.string().max(300),
  internal_notes: optStr(5000),
});

// =============================================================================
//  POST /api/work-orders/:id/complete
// =============================================================================
//  Body:
//    {
//      signature:      string,   // base64 data URL of PNG (required)
//      signed_by_name: string,   // tenant name (required)
//      internal_notes?: string,  // optional handyman note
//    }
//
//  Marks the work order completed and stores the tenant signature + name +
//  timestamp on the row. Used by the in-person completion flow at
//  /work-orders/[id]/complete.
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
  const signer = body.signed_by_name.trim();

  if (!sig.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "signature must be a PNG data URL" },
      { status: 400 }
    );
  }
  if (!signer) {
    return NextResponse.json(
      { error: "signed_by_name is required" },
      { status: 400 }
    );
  }
  if (sig.length > 250_000) {
    return NextResponse.json(
      { error: "signature too large (max ~250 KB)" },
      { status: 413 }
    );
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("work_orders")
    .update({
      status: "completed",
      resolved_at: now,
      completion_signature: sig,
      signed_by_name: signer,
      signed_at: now,
      internal_notes: body.internal_notes ?? null,
    })
    .eq("id", params.id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Work order not found" }, { status: 404 });
  }

  // Log completion to the timeline so the super and the tenant both see it.
  await supabase.from("work_order_updates").insert({
    id: `wou-${params.id}-${Date.now()}-complete`,
    work_order_id: params.id,
    message: `Completed and signed by ${signer}`,
    author: signer,
  });

  // Auto-file the completed work order into the Files tab (building/apartment).
  await archiveCompletedWorkOrder(data as WorkOrder);

  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${params.id}`);
  revalidatePath(`/track/${data.ticket_number}`);
  revalidatePath("/files");
  revalidatePath("/", "layout");

  return NextResponse.json(data);
}
