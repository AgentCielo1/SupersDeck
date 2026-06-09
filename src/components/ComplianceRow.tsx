import Link from "next/link";
import clsx from "clsx";
import type { ComplianceItem, ComplianceStatus } from "@/types";
import { complianceTemplateById } from "@/data/compliance-templates";
import { formatDueLabel } from "@/lib/compliance";

const statusStyles: Record<ComplianceStatus, string> = {
  ok: "bg-ok-50 text-ok-800 border-ok-600/30",
  "due-soon": "bg-warn-50 text-warn-800 border-warn-600/40",
  overdue: "bg-danger-50 text-danger-800 border-danger-600/40",
  "in-progress": "bg-brand-50 text-brand-800 border-brand-400/40",
  "not-applicable": "bg-ink-100 text-ink-400 border-ink-200",
  "needs-scheduling": "bg-ink-100 text-ink-600 border-ink-200",
};

const statusLabels: Record<ComplianceStatus, string> = {
  ok: "On track",
  "due-soon": "Due soon",
  overdue: "Overdue",
  "in-progress": "In progress",
  "not-applicable": "N/A",
  "needs-scheduling": "Set date",
};

export interface ComplianceRowProps {
  item: ComplianceItem;
  buildingName: string;
}

export default function ComplianceRow({
  item,
  buildingName,
}: ComplianceRowProps) {
  const t = complianceTemplateById(item.template_id);
  if (!t) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-ink-200 px-4 py-3 last:border-b-0 hover:bg-ink-50">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-ink-900">{t.name}</span>
          <span
            className={clsx(
              "rounded-md border px-1.5 py-0.5 text-xs font-medium",
              statusStyles[item.status]
            )}
          >
            {statusLabels[item.status]}
          </span>
        </div>
        <div className="mt-0.5 truncate text-xs text-ink-400">
          {buildingName} · {t.agency} · {t.category}
          {t.statute && ` · ${t.statute}`}
        </div>
      </div>
      <div className="text-right text-sm">
        <div className="font-medium text-ink-900">
          {formatDueLabel(item.next_due)}
        </div>
        {item.next_due ? (
          <div className="text-xs text-ink-400">
            {new Date(item.next_due).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        ) : (
          <div className="text-xs text-ink-400">
            Enter last-completed date to schedule
          </div>
        )}
        {item.last_completed && (
          <div className="text-[10px] text-ink-400">
            Last done {new Date(item.last_completed).toLocaleDateString()}
          </div>
        )}
      </div>
      <Link
        href={`/compliance/${item.id}/complete`}
        className="rounded-md border border-ink-200 bg-white px-2 py-1 text-xs font-medium text-ink-600 hover:bg-brand-50 hover:text-brand-800"
      >
        ✓ Mark done
      </Link>
    </div>
  );
}
