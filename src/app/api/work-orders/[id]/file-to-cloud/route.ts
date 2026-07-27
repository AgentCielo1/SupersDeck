import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getServerSupabase } from "@/lib/supabase";
import { requireRole, WRITE_ASM } from "@/lib/authz";
import { toNormalized } from "@/lib/wo-adapter";
import { renderWorkOrderPdf } from "@/lib/wo-pdf";
import { DropboxProvider } from "@/lib/cloud/dropbox";
import { PHOTO_BUCKET } from "@/lib/storage";

// =============================================================================
//  POST /api/work-orders/:id/file-to-cloud — file a WO into the real Dropbox
// =============================================================================
//  The Super Logbook habit, ported: drops the finished work-order PDF (the
//  same sheet the email/print flow uses) PLUS its photos into the building's
//  actual Dropbox records at  /<Building>/<Apt|Common area>/Work Orders/.
//  Explicit action (button on the WO page), admin/super/manager only, and a
//  no-op 503 when no cloud drive is connected — the feature stays optional.
// =============================================================================

export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(WRITE_ASM);
  if (auth.response) return auth.response;

  const provider = await DropboxProvider.connect();
  if (!provider) {
    return NextResponse.json(
      { error: "No cloud drive connected. Connect Dropbox under Files → Cloud drive." },
      { status: 503 }
    );
  }

  const wo = await db.workOrder(params.id);
  if (!wo) return NextResponse.json({ error: "Work order not found." }, { status: 404 });

  const building = await db.building(wo.building_id);
  let aptLabel = "Common area";
  if (wo.unit_id) {
    const sb = createSupabaseServerClient();
    if (sb) {
      const { data } = await sb
        .from("units")
        .select("label")
        .eq("id", wo.unit_id)
        .maybeSingle();
      if (data?.label) aptLabel = data.label;
    }
  }

  // Folder: /<Building name>/<Apt>/Work Orders  (matches the existing MHA
  // Dropbox layout Super Logbook filed into).
  const clean = (s: string) => s.replace(/[\\/:*?"<>|]/g, "-").trim();
  const folder = `/${clean(building?.name ?? wo.building_id)}/${clean(aptLabel)}/Work Orders`;
  await provider.ensureFolder(folder);

  // 1. The work-order summary PDF (same renderer as print/email).
  const normalized = toNormalized(wo, {
    building,
    unit: wo.unit_id ? { label: aptLabel } : null,
  });
  const pdf = await renderWorkOrderPdf(normalized);
  const base = `${wo.ticket_number} — ${clean(wo.title_en || wo.title).slice(0, 60)}`;
  const filed: string[] = [];
  filed.push(await provider.upload(`${folder}/${base}.pdf`, pdf));

  // 2. Photos (storage-backed ones; skip legacy inline data: URLs).
  const supabase = getServerSupabase();
  const photoPaths = (Array.isArray(wo.photos) ? wo.photos : []).filter(
    (p): p is string => typeof p === "string" && !p.startsWith("data:")
  );
  if (supabase && photoPaths.length) {
    for (let i = 0; i < photoPaths.length; i++) {
      try {
        const { data } = await supabase.storage.from(PHOTO_BUCKET).download(photoPaths[i]);
        if (!data) continue;
        const ext = photoPaths[i].match(/\.([a-z0-9]{2,5})$/i)?.[1] ?? "jpg";
        filed.push(
          await provider.upload(
            `${folder}/${wo.ticket_number} photo ${i + 1}.${ext}`,
            await data.arrayBuffer()
          )
        );
      } catch (e) {
        console.error("[file-to-cloud] photo", photoPaths[i], e);
      }
    }
  }

  // Timeline note so the WO shows it was filed.
  if (supabase) {
    await supabase
      .from("work_order_updates")
      .insert({
        id: `wou-${wo.id}-${Date.now()}-filed`,
        work_order_id: wo.id,
        message: `Filed to Dropbox: ${folder} (${filed.length} file${filed.length === 1 ? "" : "s"})`,
        author: "system",
      })
      .then(undefined, () => {});
  }

  return NextResponse.json({ ok: true, folder, filed });
}
