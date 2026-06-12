import { notFound } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import WorkOrderTimeline, { type TimelineEvent } from "@/components/WorkOrderTimeline";
import { db } from "@/lib/db";
import { relativeTime } from "@/lib/format";
import { resolvePhotoUrls } from "@/lib/storage";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function fetchTimeline(workOrderId: string): Promise<TimelineEvent[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("work_order_updates")
    .select("id, message, author, created_at")
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((r: any) => {
    let tone: TimelineEvent["tone"] = "default";
    if (/complete|signed/i.test(r.message)) tone = "ok";
    else if (/status changed/i.test(r.message)) tone = "brand";
    else if (/assigned|vendor/i.test(r.message)) tone = "warn";
    return { ...r, tone };
  });
}

async function fetchAssignedVendor(vendorId: string | undefined) {
  if (!vendorId) return null;
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("vendors")
    .select("id, name, phone, email, license_type, license_number")
    .eq("id", vendorId)
    .maybeSingle();
  return data as
    | { id: string; name: string; phone: string | null; email: string | null; license_type: string | null; license_number: string | null }
    | null;
}

export default async function WorkOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const wo = await db.workOrder(params.id);
  if (!wo) notFound();

  const [building, units, photoUrls, timeline, vendor] = await Promise.all([
    db.building(wo.building_id),
    wo.unit_id ? db.units() : Promise.resolve([]),
    resolvePhotoUrls(wo.photos ?? []),
    fetchTimeline(wo.id),
    fetchAssignedVendor(wo.assigned_vendor_id),
  ]);
  const unit = wo.unit_id ? units.find((u) => u.id === wo.unit_id) : undefined;

  // Always prepend a synthetic "Reported" event so the timeline starts at the
  // beginning even on tickets created before timeline logging existed.
  const fullTimeline: TimelineEvent[] = [
    {
      id: `wo-${wo.id}-reported`,
      message: `Reported: ${wo.title}`,
      author: wo.reporter_name,
      created_at: wo.reported_at,
      tone: "default",
    },
    ...timeline,
  ];

  return (
    <>
      <PageHeader
        title={wo.title_en || wo.title}
        subtitle={`${wo.ticket_number} · ${building?.name}${unit ? ` · Unit ${unit.label}` : " · Common area"}${
          wo.source_language && wo.source_language !== "en"
            ? ` · 🌐 Translated from ${wo.source_language.toUpperCase()}`
            : ""
        }`}
        actions={
          <div className="flex gap-2">
            <Link
              href="/work-orders"
              className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
            >
              ← All
            </Link>
            <Link
              href={`/work-orders/${wo.id}/edit`}
              className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
            >
              ✎ Edit
            </Link>
            <Link
              href={`/work-orders/${wo.id}/print`}
              className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
              target="_blank"
            >
              🖨 Print
            </Link>
            {wo.status !== "completed" && wo.status !== "cancelled" && (
              <Link
                href={`/work-orders/${wo.id}/complete`}
                className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800"
              >
                ✓ Complete with signature
              </Link>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl2 border border-ink-200 bg-white p-5">
            <div className="flex flex-wrap gap-2 text-xs">
              <Pill>{wo.priority}</Pill>
              <Pill>{wo.status.replace(/-/g, " ")}</Pill>
              <Pill>{wo.category.replace(/-/g, " ")}</Pill>
              {wo.hpd_risk && <Pill tone="danger">HPD risk</Pill>}
            </div>
            <p className="mt-3 text-sm text-ink-900">
              {wo.description_en || wo.description}
            </p>
            {wo.source_language &&
              wo.source_language !== "en" &&
              wo.description && (
                <details className="mt-2 rounded-md border border-ink-200 bg-ink-50 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-medium text-ink-600">
                    Original ({wo.source_language.toUpperCase()})
                  </summary>
                  <p className="mt-2 text-sm text-ink-600 whitespace-pre-wrap">
                    {wo.description}
                  </p>
                </details>
              )}
            {photoUrls.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-400">
                  Photos ({photoUrls.length})
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {photoUrls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                    >
                      <img
                        src={url}
                        alt={`Photo ${i + 1}`}
                        className="aspect-square w-full rounded-md border border-ink-200 object-cover hover:opacity-80"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl2 border border-ink-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Activity timeline</h2>
              <Link
                href={`/track/${wo.ticket_number}`}
                target="_blank"
                className="text-xs text-brand-600 hover:underline"
              >
                Tenant view ↗
              </Link>
            </div>
            <WorkOrderTimeline events={fullTimeline} />
            <p className="mt-4 border-t border-ink-100 pt-3 text-xs text-ink-400">
              Tenants can track this ticket at{" "}
              <code className="rounded bg-ink-50 px-1 py-0.5">
                /track/{wo.ticket_number}
              </code>{" "}
              — no login required. Share the link with the tenant in your
              status text or in the QR-poster confirmation.
            </p>
          </div>
        </div>

        <aside className="space-y-3 text-sm">
          <SideInfo label="Building" value={building?.name ?? ""} />
          {unit && <SideInfo label="Unit" value={unit.label} />}
          <SideInfo
            label="Reporter"
            value={`${wo.reporter_name}${wo.reporter_phone ? ` · ${wo.reporter_phone}` : ""}`}
          />
          <SideInfo
            label="Assigned to (staff)"
            value={wo.assigned_to ?? "—"}
          />
          {vendor ? (
            <div className="rounded-xl2 border border-ink-200 bg-white px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-ink-400">
                Vendor
              </div>
              <div className="mt-0.5 text-sm font-semibold text-ink-900">
                {vendor.name}
              </div>
              {vendor.phone && (
                <a
                  href={`tel:${vendor.phone}`}
                  className="block text-xs text-brand-600 hover:underline"
                >
                  📞 {vendor.phone}
                </a>
              )}
              {vendor.email && (
                <a
                  href={`mailto:${vendor.email}`}
                  className="block text-xs text-brand-600 hover:underline"
                >
                  ✉ {vendor.email}
                </a>
              )}
              {vendor.license_number && (
                <div className="mt-1 text-xs text-ink-400">
                  {vendor.license_type ?? "License"}: {vendor.license_number}
                </div>
              )}
            </div>
          ) : (
            <SideInfo label="Vendor" value="—" />
          )}
          {wo.due_at && (
            <SideInfo label="Due" value={new Date(wo.due_at).toLocaleDateString()} />
          )}
          {wo.completion_signature && wo.signed_by_name && (
            <div className="rounded-xl2 border border-ok-600/40 bg-ok-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-ok-800">
                Signed by tenant
              </div>
              <div className="mt-1 text-sm font-semibold text-ok-800">
                {wo.signed_by_name}
              </div>
              {wo.signed_at && (
                <div className="text-xs text-ok-800">
                  {new Date(wo.signed_at).toLocaleString()}
                </div>
              )}
              <img
                src={wo.completion_signature}
                alt={`Signature of ${wo.signed_by_name}`}
                className="mt-2 max-h-24 w-full rounded border border-ok-600/30 bg-white"
              />
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  const cls =
    tone === "danger"
      ? "border-danger-600/40 bg-danger-50 text-danger-800"
      : "border-ink-200 bg-ink-100 text-ink-600";
  return (
    <span
      className={`rounded-md border px-1.5 py-0.5 font-medium uppercase tracking-wide ${cls}`}
    >
      {children}
    </span>
  );
}

function SideInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl2 border border-ink-200 bg-white px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-400">
        {label}
      </div>
      <div className="mt-0.5 text-sm text-ink-900">{value}</div>
    </div>
  );
}
