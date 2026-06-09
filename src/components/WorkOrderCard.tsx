import Link from "next/link";
import clsx from "clsx";
import type { WorkOrder } from "@/types";
import { relativeTime } from "@/lib/format";

const priorityStyles: Record<WorkOrder["priority"], string> = {
  emergency: "bg-danger-50 text-danger-800 border-danger-600/40",
  high: "bg-warn-50 text-warn-800 border-warn-600/40",
  normal: "bg-ink-100 text-ink-600 border-ink-200",
  low: "bg-ink-100 text-ink-400 border-ink-200",
};

const statusStyles: Record<WorkOrder["status"], string> = {
  new: "bg-brand-50 text-brand-800 border-brand-400/40",
  triaged: "bg-warn-50 text-warn-800 border-warn-600/40",
  assigned: "bg-brand-50 text-brand-800 border-brand-400/40",
  "in-progress": "bg-brand-50 text-brand-800 border-brand-400/40",
  "waiting-on-vendor": "bg-warn-50 text-warn-800 border-warn-600/40",
  "waiting-on-parts": "bg-warn-50 text-warn-800 border-warn-600/40",
  completed: "bg-ok-50 text-ok-800 border-ok-600/30",
  cancelled: "bg-ink-100 text-ink-400 border-ink-200",
};

export default function WorkOrderCard({ wo }: { wo: WorkOrder }) {
  return (
    <Link
      href={`/work-orders/${wo.id}`}
      className="block rounded-xl2 border border-ink-200 bg-white p-4 transition hover:border-brand-400/50 hover:bg-brand-50/40"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-ink-400">
            {wo.ticket_number}
          </span>
          <span
            className={clsx(
              "rounded-md border px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide",
              priorityStyles[wo.priority]
            )}
          >
            {wo.priority}
          </span>
          {wo.hpd_risk && (
            <span className="rounded-md border border-danger-600/40 bg-danger-50 px-1.5 py-0.5 text-xs font-medium text-danger-800">
              HPD risk
            </span>
          )}
        </div>
        <span
          className={clsx(
            "rounded-md border px-1.5 py-0.5 text-xs font-medium",
            statusStyles[wo.status]
          )}
        >
          {wo.status.replace(/-/g, " ")}
        </span>
      </div>
      <div className="mt-2 font-semibold text-ink-900">{wo.title}</div>
      <div className="mt-1 line-clamp-2 text-sm text-ink-600">
        {wo.description}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-400">
        <span>
          {wo.reporter_name}
          {wo.assigned_to && <> → {wo.assigned_to}</>}
        </span>
        <span>{relativeTime(wo.reported_at)}</span>
      </div>
    </Link>
  );
}
