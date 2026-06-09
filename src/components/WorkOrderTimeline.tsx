import { relativeTime } from "@/lib/format";

// =============================================================================
//  WorkOrderTimeline — vertical timeline of work_order_updates rows
// =============================================================================
//  Pure presentational. Caller is responsible for fetching the rows + adding
//  any synthetic "reported by" / "resolved at" pseudo-events.
// =============================================================================

export interface TimelineEvent {
  id: string;
  message: string;
  author: string;
  created_at: string;
  tone?: "default" | "ok" | "warn" | "danger" | "brand";
}

const dotTones: Record<NonNullable<TimelineEvent["tone"]>, string> = {
  default: "bg-ink-200",
  ok: "bg-ok-600",
  warn: "bg-warn-600",
  danger: "bg-danger-600",
  brand: "bg-brand-600",
};

export default function WorkOrderTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-ink-200 p-4 text-center text-xs text-ink-400">
        No activity yet.
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {events.map((e, i) => (
        <li key={e.id} className="flex items-start gap-3">
          <span className="relative flex h-5 w-2 flex-shrink-0 justify-center">
            <span
              className={`mt-1 inline-block h-2 w-2 rounded-full ${
                dotTones[e.tone ?? "default"]
              }`}
            />
            {i < events.length - 1 && (
              <span className="absolute left-1/2 top-3 h-full w-px -translate-x-1/2 bg-ink-200" />
            )}
          </span>
          <div className="min-w-0 flex-1 pb-2">
            <div className="text-sm text-ink-900">{e.message}</div>
            <div className="text-xs text-ink-400">
              {e.author} · {relativeTime(e.created_at)}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
