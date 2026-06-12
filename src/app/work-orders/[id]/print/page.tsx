import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { resolvePhotoUrls } from "@/lib/storage";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import PrintTrigger from "@/components/PrintTrigger";

// =============================================================================
//  /work-orders/[id]/print — printable Service Order form
// =============================================================================
//  Print-only layout that mirrors the FOREST HILLS MHA HDFC paper form
//  (header, RE/TO block, ORDER NO side panel, AS PER / S/O INITIATED, a big
//  area for handwritten field notes, and a WORK COMPLETED footer with
//  signature). Print via Cmd-P or the on-screen button (which is hidden
//  on print).
//
//  Header text is per-building (buildings.legal_entity). If unset, falls
//  back to a generic "FOREST HILLS MHA".
// =============================================================================

const STATUS_PRINT_LABELS: Record<string, string> = {
  new: "S/O ISSUED",
  triaged: "TRIAGED",
  assigned: "ASSIGNED",
  "in-progress": "IN PROGRESS",
  "waiting-on-vendor": "WAITING VENDOR",
  "waiting-on-parts": "WAITING PARTS",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d
    .getDate()
    .toString()
    .padStart(2, "0")}/${d.getFullYear()} ${d
    .getHours()
    .toString()
    .padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

async function fetchVendor(vendorId: string | undefined) {
  if (!vendorId) return null;
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("vendors")
    .select("name")
    .eq("id", vendorId)
    .maybeSingle();
  return (data as { name: string } | null) ?? null;
}

async function fetchUnit(unitId: string | undefined) {
  if (!unitId) return null;
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("units")
    .select("label, tenant_name, tenant_phone")
    .eq("id", unitId)
    .maybeSingle();
  return (
    (data as { label: string; tenant_name: string | null; tenant_phone: string | null } | null) ??
    null
  );
}

export default async function PrintWorkOrderPage({
  params,
}: {
  params: { id: string };
}) {
  const wo = await db.workOrder(params.id);
  if (!wo) notFound();

  const [building, unit, vendor, photoUrls] = await Promise.all([
    db.building(wo.building_id),
    fetchUnit(wo.unit_id),
    fetchVendor(wo.assigned_vendor_id),
    resolvePhotoUrls(wo.photos ?? []),
  ]);

  const header = building?.legal_entity || "FOREST HILLS MHA";
  const tenantName =
    unit?.tenant_name ||
    wo.reporter_name ||
    "(tenant)";
  const tenantPhone = wo.reporter_phone || unit?.tenant_phone || "";
  const apt = unit?.label ? `Apt# ${unit.label}` : "";
  const statusLabel = STATUS_PRINT_LABELS[wo.status] ?? wo.status.toUpperCase();
  const takenBy = "SUPER";
  const vendorCode = vendor?.name ?? "—";

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .form-sheet { margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; page-break-inside: avoid; }
          @page { size: letter; margin: 0.5in; }
        }
        .form-sheet { font-family: "Courier New", ui-monospace, Menlo, monospace; color: #000; }
        .form-sheet .label { letter-spacing: 0.04em; font-weight: 600; }
        .form-sheet .cell { padding: 6px 10px; }
        .form-sheet .br-1 { border: 1px solid #000; }
        .form-sheet .bb-1 { border-bottom: 1px solid #000; }
        .form-sheet .bt-1 { border-top: 1px solid #000; }
        .form-sheet .sig-line { height: 28px; border-bottom: 1px solid #000; }
      `}</style>

      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/work-orders/${wo.id}`}
          className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
        >
          ← Back to work order
        </Link>
        <PrintTrigger label="Print this work order" />
      </div>

      <div className="form-sheet mx-auto max-w-[8.5in] bg-white p-8 shadow-sm">
        {/* Header band */}
        <div className="br-1 bb-1 flex">
          <div className="flex-1 cell" />
          <div className="flex-[2] cell bb-1 text-center">
            <div className="label text-sm uppercase">{header}</div>
            <div className="label text-sm uppercase">RESIDENT SERVICE ORDER</div>
          </div>
        </div>

        {/* RE/TO + side info */}
        <div className="br-1 flex border-t-0">
          <div className="flex-1 cell">
            <div className="grid grid-cols-[60px_1fr_70px] gap-x-2 text-sm leading-snug">
              <div className="label">RE:</div>
              <div>
                <div className="uppercase">{tenantName}</div>
                <div className="uppercase">{building?.address ?? "—"}</div>
              </div>
              <div className="text-right uppercase">{apt}</div>

              <div className="label mt-3">TO:</div>
              <div className="mt-3 uppercase">
                {header} MGMT OFF
              </div>
              <div />
            </div>
          </div>

          <div className="cell bb-0 border-l border-l-black w-[260px] text-sm leading-snug">
            <div className="grid grid-cols-[100px_1fr] gap-y-1">
              <div className="label">ORDER NO.:</div>
              <div>{wo.ticket_number}</div>
              <div className="label">RESIDENT:</div>
              <div>—</div>
              <div className="label">VENDOR:</div>
              <div className="uppercase">{vendorCode}</div>
            </div>
          </div>
        </div>

        {/* AS PER + date/status side */}
        <div className="br-1 flex border-t-0">
          <div className="flex-1 cell text-sm">
            <div>
              <span className="label">AS PER: </span>RES.VERBAL
            </div>
          </div>
          <div className="cell border-l border-l-black w-[260px] text-sm leading-snug">
            <div className="grid grid-cols-[100px_1fr] gap-y-1">
              <div className="label">DATE:</div>
              <div>{formatDate(wo.reported_at)}</div>
              <div className="label">TAKEN BY:</div>
              <div>{takenBy}</div>
              <div className="label">STATUS:</div>
              <div className="uppercase">{statusLabel}</div>
              <div className="label">HOME PHONE:</div>
              <div>{tenantPhone || "—"}</div>
              <div className="label">BUSN PHONE:</div>
              <div>—</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="br-1 border-t-0 cell" style={{ minHeight: "4.5in" }}>
          <div className="text-sm">
            <span className="label">S/O INITIATED</span>
          </div>
          <div className="mt-1 text-sm">
            <div className="font-semibold uppercase">
              {wo.title_en || wo.title}
            </div>
            <div className="mt-1 whitespace-pre-wrap">
              {wo.description_en || wo.description || ""}
            </div>
            {wo.source_language &&
              wo.source_language !== "en" &&
              wo.description && (
                <div className="mt-3 border-t border-dashed border-black pt-2">
                  <div className="text-xs uppercase tracking-wide">
                    Original ({wo.source_language.toUpperCase()})
                  </div>
                  <div className="font-semibold uppercase">{wo.title}</div>
                  <div className="mt-1 whitespace-pre-wrap">
                    {wo.description}
                  </div>
                </div>
              )}
          </div>

          {wo.hpd_risk && (
            <div className="mt-3 inline-block border border-black px-2 py-0.5 text-xs uppercase">
              HPD risk · {wo.category.replace(/-/g, " ")}
            </div>
          )}

          {photoUrls.length > 0 && (
            <div className="mt-4">
              <div className="label mb-1 text-xs uppercase">
                Photos ({photoUrls.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {photoUrls.map((u, i) => (
                  <img
                    key={i}
                    src={u}
                    alt={`Photo ${i + 1}`}
                    className="h-32 border border-black object-cover"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom signature band */}
        <div className="br-1 border-t-0">
          <div className="flex justify-end px-3 py-1">
            <div className="border border-black px-3 py-0.5 text-sm uppercase">
              Work Completed
            </div>
          </div>
          <div className="grid grid-cols-3 gap-x-6 px-3 pb-3 text-sm">
            <div>
              <div className="label">TIME STARTED:</div>
              <div className="sig-line" />
            </div>
            <div>
              <div className="label">TIME STOPPED:</div>
              <div className="sig-line" />
            </div>
            <div>
              <div className="label">ELAPSED TIME:</div>
              <div className="sig-line" />
            </div>
          </div>

          <div className="px-3 pb-2 text-sm">
            <div>THE ABOVE REPAIR HAS BEEN COMPLETED TO MY SATISFACTION</div>
          </div>

          <div className="grid grid-cols-[2fr_1fr] gap-x-6 px-3 pb-3 text-sm">
            <div>
              <div className="label">RESIDENT SIGNATURE:</div>
              {wo.completion_signature ? (
                <img
                  src={wo.completion_signature}
                  alt={`Signature of ${wo.signed_by_name ?? "tenant"}`}
                  className="mt-1 h-12 border-b border-black"
                />
              ) : (
                <div className="sig-line" />
              )}
              {wo.signed_by_name && (
                <div className="text-xs">{wo.signed_by_name}</div>
              )}
            </div>
            <div>
              <div className="label">DATE:</div>
              <div className="sig-line" />
              {wo.signed_at && (
                <div className="text-xs">
                  {new Date(wo.signed_at).toLocaleDateString()}
                </div>
              )}
            </div>
            <div>
              <div className="label">WORK DONE BY:</div>
              <div className="sig-line" />
            </div>
            <div>
              <div className="label">DATE:</div>
              <div className="sig-line" />
            </div>
          </div>
        </div>

        <div className="mt-3 text-center text-[10px] uppercase tracking-widest text-ink-400">
          Powered by SupersDeck · {wo.ticket_number}
        </div>
      </div>
    </>
  );
}
