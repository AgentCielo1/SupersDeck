import { getServerSupabase } from "@/lib/supabase";
import { toNormalized } from "@/lib/wo-adapter";
import { renderWorkOrderPdf } from "@/lib/wo-pdf";
import { DOC_BUCKET } from "@/types/documents";
import type { WorkOrder } from "@/types";

// =============================================================================
//  archiveCompletedWorkOrder — file a closed work order into the Files tab
// =============================================================================
//  When a work order is completed, render its PDF and drop it into the
//  `documents` repository, tagged with its building + apartment (category
//  "Work order"). It then shows up automatically under that unit's folder in
//  the Files tab. Idempotent (deterministic path) and fail-safe — archiving
//  problems never block the completion flow.
// =============================================================================

export async function archiveCompletedWorkOrder(wo: WorkOrder): Promise<void> {
  try {
    if (!wo || wo.status !== "completed" || !wo.building_id || !wo.ticket_number) return;
    const supabase = getServerSupabase();
    if (!supabase) return;

    const [bRes, uRes] = await Promise.all([
      supabase.from("buildings").select("name,address,legal_entity").eq("id", wo.building_id).maybeSingle(),
      wo.unit_id
        ? supabase.from("units").select("label").eq("id", wo.unit_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const normalized = toNormalized(wo, {
      building: bRes.data ?? null,
      unit: (uRes.data as { label: string } | null) ?? null,
    });
    const pdf = await renderWorkOrderPdf(normalized);

    const path = `completed/${wo.building_id}/${wo.unit_id ?? "building"}/WO-${wo.ticket_number}.pdf`;
    const up = await supabase.storage
      .from(DOC_BUCKET)
      .upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (up.error) {
      console.error("[wo-archive] upload:", up.error.message);
      return;
    }

    const { data: existing } = await supabase
      .from("documents")
      .select("id")
      .eq("path", path)
      .maybeSingle();
    if (existing) {
      await supabase.from("documents").update({ size: pdf.length }).eq("id", existing.id);
    } else {
      await supabase.from("documents").insert({
        name: `WO-${wo.ticket_number}.pdf`,
        category: "Work order",
        building_id: wo.building_id,
        unit_id: wo.unit_id ?? null,
        path,
        mime: "application/pdf",
        size: pdf.length,
      });
    }
  } catch (e) {
    console.error("[wo-archive]", e instanceof Error ? e.message : e);
  }
}
