import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import WorkOrderTimeline, { type TimelineEvent } from "@/components/WorkOrderTimeline";
import { getServerSupabase } from "@/lib/supabase";
import { relativeTime } from "@/lib/format";

// =============================================================================
//  /track/[ticketNumber] — public tenant-facing work order tracker
// =============================================================================
//  No auth. Tenant gets a URL like /track/WO-1024 they can bookmark from
//  their original intake confirmation. Shows status, ETA, and timeline.
//
//  We deliberately use the service-role client server-side to fetch only the
//  exact info the tenant needs to see, then render — no RLS gymnastics for
//  the public anon role.
// =============================================================================

export const dynamic = "force-dynamic";

const FRIENDLY_STATUS: Record<string, { label: string; description: string; tone: string }> = {
  new: { label: "Received", description: "Your super has the report. Triage is next.", tone: "brand" },
  triaged: { label: "Triaged", description: "Your super has reviewed it and is figuring out who fixes it.", tone: "brand" },
  assigned: { label: "Assigned", description: "Someone is on the way to take a look.", tone: "warn" },
  "in-progress": { label: "In progress", description: "Work is underway.", tone: "warn" },
  "waiting-on-vendor": { label: "Waiting on vendor", description: "A licensed contractor (plumber, electrician, etc.) is scheduled.", tone: "warn" },
  "waiting-on-parts": { label: "Waiting on parts", description: "Materials have been ordered.", tone: "warn" },
  completed: { label: "Completed", description: "Job finished and signed off.", tone: "ok" },
  cancelled: { label: "Cancelled", description: "This ticket was cancelled.", tone: "default" },
};

export default async function TrackWorkOrderPage({
  params,
}: {
  params: { ticketNumber: string };
}) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return (
      <div className="mx-auto max-w-md p-8 text-center text-sm text-ink-400">
        Tracking isn't available right now. Please contact your super directly.
      </div>
    );
  }

  // Look up by ticket_number (e.g. "WO-1024"). Case insensitive.
  const ticketNumber = params.ticketNumber.toUpperCase();
  const { data: wo } = await supabase
    .from("work_orders")
    .select("id, ticket_number, title, description, status, category, priority, reporter_name, reported_at, assigned_to, resolved_at, signed_by_name, signed_at, due_at, building_id")
    .eq("ticket_number", ticketNumber)
    .maybeSingle();

  if (!wo) notFound();

  const [{ data: building }, { data: updates }] = await Promise.all([
    supabase
      .from("buildings")
      .select("name, address")
      .eq("id", wo.building_id)
      .maybeSingle(),
    supabase
      .from("work_order_updates")
      .select("id, message, author, created_at")
      .eq("work_order_id", wo.id)
      .order("created_at"),
  ]);

  const friendly = FRIENDLY_STATUS[wo.status] ?? { label: wo.status, description: "", tone: "default" };

  const timeline: TimelineEvent[] = [
    {
      id: `wo-${wo.id}-reported`,
      message: `You reported: ${wo.title}`,
      author: wo.reporter_name,
      created_at: wo.reported_at,
      tone: "default",
    },
    ...((updates ?? []) as any[]).map((r) => ({
      id: r.id,
      message: r.message,
      author: r.author,
      created_at: r.created_at,
      tone:
        /complete|signed/i.test(r.message) ? ("ok" as const) :
        /assigned/i.test(r.message) ? ("warn" as const) :
        ("brand" as const),
    })),
  ];

  const toneColors: Record<string, string> = {
    brand: "border-brand-400/40 bg-brand-50 text-brand-800",
    warn: "border-warn-600/40 bg-warn-50 text-warn-800",
    ok: "border-ok-600/40 bg-ok-50 text-ok-800",
    danger: "border-danger-600/40 bg-danger-50 text-danger-800",
    default: "border-ink-200 bg-ink-50 text-ink-600",
  };

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 py-8">
      {/* Tenant-friendly header (no super-side chrome) */}
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-sm font-semibold text-white">
          S
        </div>
        <div className="text-sm font-semibold">SupersDeck</div>
      </div>

      <h1 className="text-xl font-semibold">Ticket {wo.ticket_number}</h1>
      <p className="mt-1 text-sm text-ink-600">{wo.title}</p>
      {building && (
        <p className="mt-0.5 text-xs text-ink-400">
          {building.name} · {building.address}
        </p>
      )}

      {/* Status hero */}
      <div className={`mt-5 rounded-xl2 border p-4 ${toneColors[friendly.tone]}`}>
        <div className="text-xs font-medium uppercase tracking-wide opacity-70">
          Current status
        </div>
        <div className="mt-1 text-lg font-semibold">{friendly.label}</div>
        <p className="mt-1 text-sm">{friendly.description}</p>
        {wo.assigned_to && wo.status !== "completed" && (
          <p className="mt-2 text-xs">
            <span className="font-medium">Working on it:</span> {wo.assigned_to}
          </p>
        )}
        {wo.due_at && wo.status !== "completed" && (
          <p className="mt-1 text-xs">
            <span className="font-medium">ETA:</span>{" "}
            {new Date(wo.due_at).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="mt-5 rounded-xl2 border border-ink-200 bg-white p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-ink-400">
          What you reported
        </div>
        <p className="mt-1 text-sm text-ink-900">{wo.description}</p>
        <p className="mt-2 text-xs text-ink-400">
          Reported by {wo.reporter_name} · {relativeTime(wo.reported_at)}
        </p>
      </div>

      {/* Timeline */}
      <div className="mt-5 rounded-xl2 border border-ink-200 bg-white p-4">
        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-400">
          History
        </div>
        <WorkOrderTimeline events={timeline} />
      </div>

      {/* Completion confirmation */}
      {wo.status === "completed" && wo.signed_by_name && (
        <div className="mt-5 rounded-xl2 border border-ok-600/40 bg-ok-50 p-4 text-sm text-ok-800">
          <div className="font-semibold">
            ✓ Completed and signed by {wo.signed_by_name}
          </div>
          {wo.signed_at && (
            <div className="mt-0.5 text-xs">
              on {new Date(wo.signed_at).toLocaleString()}
            </div>
          )}
          <p className="mt-2 text-xs">
            If the work isn't actually done correctly, please open a new
            ticket via the QR poster in your lobby and reference this ticket
            number ({wo.ticket_number}) in the description.
          </p>
        </div>
      )}

      <p className="mt-8 text-center text-xs text-ink-400">
        This page auto-updates. Bookmark it to check on your ticket anytime.
        For emergencies (no heat, no hot water, leak, fire, gas smell, lockout)
        always call 311 or 911 first.
      </p>
    </div>
  );
}
